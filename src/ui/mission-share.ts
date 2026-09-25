/**
 * The setup panel's "Share & save" row (roadmap U01): copy a link that carries
 * the mission, save it as a file, open a saved file — and the notice that says
 * what a link or a file held that could not be used.
 */
import { t } from '../i18n';
import {
  MISSION_FILE_EXTENSION, MISSION_PARAM, encodeMissionParam, missionDocument, missionFileName, missionFileText,
  parseMissionDocument, readMissionFileText, type MissionIssue, type MissionState, type ParsedMission,
} from '../config/mission-file';
import { downloadBlob } from './download';

export interface MissionShareHost {
  missionState(): MissionState;
  restoreMission(state: MissionState): void;
  isRunning(): boolean;
}

/** Where a mission came from, for the notice. */
export type MissionSource = 'link' | 'file' | 'stored';

interface Notice { level: 'ok' | 'warn' | 'error'; text: string; details: string[] }

/** The label of the setting an issue names, in the panel's own words. */
export function missionIssueLabel(issue: MissionIssue): string {
  const f = issue.field;
  if (f === 'setup.orbit') return t('setup.step.orbit');
  if (f.startsWith('setup.failure')) return t('setup.failure');
  for (const group of ['flex', 'control', 'nav', 'faults', 'explicit']) {
    if (f.startsWith(`setup.${group}.`)) return t(`setup.${group}.title`);
  }
  const label = t(f);
  return label === f ? t('setup.guidance') : label;
}

/** The notice for a mission read from a link, a file or the page's own copy. */
export function missionNotice(parsed: ParsedMission, source: MissionSource): Notice | null {
  const from = source === 'link' ? t('share.source.link') : source === 'file' ? t('share.source.file') : t('share.source.stored');
  if (!parsed.usable) {
    return { level: 'error', text: t('share.notice.unusable', { source: from }), details: [] };
  }
  const newer = parsed.issues.some((i) => i.code === 'newerVersion');
  const fields = [...new Set(parsed.issues.filter((i) => i.field !== 'document').map(missionIssueLabel))];
  if (!fields.length && !newer) {
    return source === 'stored' ? null : { level: 'ok', text: t('share.notice.loaded', { source: from }), details: [] };
  }
  const details = [...(newer ? [t('share.notice.newer')] : []), ...fields];
  return { level: 'warn', text: t('share.notice.reset', { source: from }), details };
}

export class MissionShare {
  private notice: Notice | null = null;
  private busy = false;
  /** the section on the page, to repaint the notice without a panel render */
  private node: HTMLElement | null = null;

  constructor(private readonly host: MissionShareHost) {}

  /** The link that opens this page on the given mission, keeping the mode in the hash. */
  async link(state: MissionState = this.host.missionState()): Promise<string> {
    const url = new URL(location.href);
    url.search = '';
    url.searchParams.set(MISSION_PARAM, await encodeMissionParam(missionDocument(state)));
    return url.toString();
  }

  /** Load a document (from a link, a file or the page's copy) and say what could not be used. */
  apply(raw: unknown, source: MissionSource): ParsedMission {
    const parsed = parseMissionDocument(raw, this.host.missionState());
    if (parsed.usable) this.host.restoreMission(parsed.state);
    this.setNotice(missionNotice(parsed, source));
    return parsed;
  }

  setNotice(notice: Notice | null): void {
    this.notice = notice;
    if (this.node) this.paintNotice(this.node.querySelector('.share-notice')!);
  }

  section(): HTMLElement {
    const section = document.createElement('section');
    section.className = 'config-section mission-share';
    section.id = 'mission-share';
    const heading = document.createElement('h2');
    heading.id = 'mission-share-title';
    heading.textContent = t('share.title');
    section.setAttribute('aria-labelledby', heading.id);
    const row = document.createElement('div');
    row.className = 'share-actions';
    const button = (key: string, id: string, onClick: () => void): HTMLButtonElement => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ghost-button';
      b.id = id;
      b.textContent = t(key);
      b.addEventListener('click', onClick);
      return b;
    };
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = `${MISSION_FILE_EXTENSION},.json,application/json`;
    fileInput.hidden = true;
    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      fileInput.value = '';
      if (file) void this.openFile(file);
    });
    const open = button('share.open', 'btn-mission-open', () => fileInput.click());
    open.disabled = this.host.isRunning();
    row.append(
      button('share.copyLink', 'btn-mission-link', () => void this.copyLink()),
      button('share.save', 'btn-mission-save', () => this.saveFile()),
      open,
      fileInput,
    );
    const notice = document.createElement('div');
    notice.className = 'share-notice';
    notice.setAttribute('role', 'status');
    section.append(heading, row, notice);
    this.paintNotice(notice);
    this.node = section;
    return section;
  }

  private paintNotice(el: HTMLElement): void {
    el.replaceChildren();
    el.hidden = !this.notice;
    if (!this.notice) return;
    el.dataset.level = this.notice.level;
    const p = document.createElement('p');
    p.textContent = this.notice.text;
    el.append(p);
    if (this.notice.details.length) {
      const list = document.createElement('ul');
      for (const d of this.notice.details) {
        const li = document.createElement('li');
        li.textContent = d;
        list.append(li);
      }
      el.append(list);
    }
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'share-notice-close';
    close.setAttribute('aria-label', t('share.dismiss'));
    close.textContent = '×';
    close.addEventListener('click', () => this.setNotice(null));
    el.append(close);
  }

  async copyLink(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    try {
      const url = await this.link();
      let copied = false;
      try { await navigator.clipboard.writeText(url); copied = true; } catch { /* no clipboard permission */ }
      if (copied) this.setNotice({ level: 'ok', text: t('share.notice.copied'), details: [] });
      else {
        // No clipboard: put the link where it can be copied by hand.
        history.replaceState(history.state, '', url);
        this.setNotice({ level: 'ok', text: t('share.notice.inAddressBar'), details: [] });
      }
    } finally { this.busy = false; }
  }

  saveFile(): void {
    const state = this.host.missionState();
    downloadBlob(new Blob([missionFileText(missionDocument(state))], { type: 'application/json' }), missionFileName(state));
    this.setNotice({ level: 'ok', text: t('share.notice.saved'), details: [] });
  }

  async openFile(file: File): Promise<void> {
    if (this.host.isRunning()) return;
    const raw = readMissionFileText(await file.text());
    this.apply(raw, 'file');
  }
}
