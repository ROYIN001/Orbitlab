/**
 * The Explore level's card at the end of a flight.
 *
 * A moment after the live flight records its outcome — the target orbit, an
 * orbit off the target, or a failure — a card over the picture says so: what
 * happened and why (the same assessment as the result panel under the
 * controls, src/ui/result-content.ts), the orbit reached against the target,
 * the Δv left and where the ascent's went, and the next step. It offers to fly
 * again with a changed setting, to go on watching, to see every number at the
 * Engineer level, and to carry an orbit on into the Orbit section.
 *
 * Once per flight, only while the flight is live (never over a replay), and
 * never during a lesson, which grades the flight in its own strip.
 */
import { getLang, onLangChange, t } from '../i18n';
import type { Simulation } from '../physics/simulation';
import { assessMissionResult, RESULT_COPY, type MissionResultModel } from './result-content';
import { debriefModel } from './explore';
import { fmtTime } from './hud';

export interface DebriefHost {
  /** back to the set-up, the rocket on the pad */
  again(): void;
  engineer(): void;
  /** the orbit reached, carried on in the Orbit section (S03) */
  orbit(): void;
}

/** How long the outcome stays on the picture before the card covers it, ms. */
const SETTLE_MS = 2500;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

const LOSS_KEY = { gravity: 'tel.loss.gravity', drag: 'tel.loss.drag', steering: 'tel.loss.steering' } as const;

export class ExploreDebrief {
  /** the flight the card belongs to (the app's flight number), shown or not */
  private flight = -1;
  /** when that flight's outcome was first seen, ms, or null before it */
  private since: number | null = null;
  private shown = false;
  /** put aside with "Keep watching": a tab over the picture brings it back */
  private minimized = false;
  private last: { view: Simulation; result: MissionResultModel; title: string } | null = null;

  constructor(private readonly host: HTMLElement, private readonly actions: DebriefHost) {
    host.hidden = true;
    onLangChange(() => {
      if (this.host.hidden || !this.last) return;
      if (this.minimized) this.minimize(); else this.render(this.last.view, this.last.result, this.last.title);
    });
  }

  /**
   * One tick of the app. `flight` numbers the flight, so a new one starts
   * over; `view` is the flight at the displayed instant; `live` says that
   * instant is the live head; `active` that Explore is on screen with no
   * lesson running.
   */
  update(flight: number, view: Simulation | null, live: boolean, active: boolean, title: string, now: number): void {
    if (flight !== this.flight) {
      this.flight = flight;
      this.since = null;
      this.shown = false;
      this.minimized = false;
      this.close();
    }
    if (!active) { this.close(); return; }
    if (this.shown || !view || !live) return;
    const result = assessMissionResult(view);
    if (!result) return;
    if (this.since === null) { this.since = now; return; }
    if (now - this.since < SETTLE_MS) return;
    this.shown = true;
    this.render(view, result, title);
  }

  /** Off the screen: a new flight, another level, a lesson. The card is not offered again for this flight. */
  close(): void {
    if (this.host.hidden) return;
    this.host.hidden = true;
    this.host.replaceChildren();
    this.last = null;
  }

  /** "Keep watching": the card gives way to a tab that brings it back. */
  private minimize(): void {
    if (!this.last) return;
    this.minimized = true;
    const tab = el('button', 'explore-debrief-tab', `${RESULT_COPY[getLang()].heading} ▸`);
    tab.type = 'button';
    tab.addEventListener('click', () => {
      this.minimized = false;
      if (this.last) this.render(this.last.view, this.last.result, this.last.title);
    });
    this.host.replaceChildren(tab);
  }

  private render(view: Simulation, result: MissionResultModel, title: string): void {
    this.last = { view, result, title };
    const copy = RESULT_COPY[getLang()];
    const model = debriefModel(result, view.state.losses, view.telemetry);
    const card = el('section', `watch-card watch-end explore-debrief-card ${result.outcome}`);
    card.setAttribute('role', 'dialog');
    const heading = el('h2', undefined, title);
    heading.id = 'explore-debrief-title';
    card.setAttribute('aria-labelledby', heading.id);
    card.append(el('span', 'eyebrow', copy.outcome[result.outcome]), heading, el('p', undefined, copy.cause[result.cause].detail));

    // the orbit reached, against the target (a flight that failed reached none)
    const metrics = el('dl', 'debrief-metrics');
    if (result.outcome !== 'failed') for (const m of result.metrics) {
      if (m.key === 'raan' || m.target === null) continue;
      const fmt = (v: number | null): string => v === null ? '—' : m.unit === 'deg' ? `${v.toFixed(1)}°` : `${Math.round(v).toLocaleString(getLang())} km`;
      const dd = el('dd', m.outside ? 'outside' : undefined, fmt(m.actual));
      dd.append(el('small', undefined, ` · ${copy.target} ${fmt(m.target)}`));
      metrics.append(el('dt', undefined, copy.metric[m.key]), dd);
    }
    if (metrics.childElementCount) card.append(metrics);

    // the Δv left, and where the ascent's went
    if (model.dvLeft !== null && model.dvStart !== null && model.dvStart > 0) {
      card.append(el('p', 'watch-end-fact', t('debrief.dvLeft', {
        t: fmtTime(result.outcomeTime), dv: Math.round(model.dvLeft).toLocaleString(getLang()), start: Math.round(model.dvStart).toLocaleString(getLang()),
      })));
    }
    if (model.losses.some((l) => l.dv > 0)) {
      const losses = el('div', 'debrief-losses');
      losses.append(el('h3', undefined, t('debrief.losses')));
      for (const loss of model.losses) {
        const row = el('div', 'debrief-loss');
        const bar = el('span', 'debrief-loss-bar');
        bar.style.setProperty('--share', loss.share.toFixed(3));
        row.append(el('span', 'k', t(LOSS_KEY[loss.key])), bar, el('span', 'v', `${Math.round(loss.dv).toLocaleString(getLang())} m/s`));
        losses.append(row);
      }
      card.append(losses);
    }
    card.append(el('p', 'watch-end-fact debrief-next', `${copy.next}: ${copy.cause[result.cause].next}`));

    const actions = el('div', 'watch-end-actions');
    const button = (label: string, cls: string, act: () => void): void => {
      const b = el('button', cls, label);
      b.type = 'button';
      b.addEventListener('click', act);
      actions.append(b);
    };
    button(t('debrief.again'), 'watch-btn primary', () => { this.close(); this.actions.again(); });
    button(t('debrief.watch'), 'watch-btn', () => this.minimize());
    if (result.outcome !== 'failed') button(t('handoff.continue'), 'watch-btn', () => { this.close(); this.actions.orbit(); });
    button(t('debrief.engineer'), 'watch-btn link', () => { this.close(); this.actions.engineer(); });
    card.append(actions);
    this.host.replaceChildren(card);
    this.host.hidden = false;
  }
}
