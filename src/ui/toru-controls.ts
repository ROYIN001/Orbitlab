/**
 * G07: the TORU hand controllers in the Engineer mode — the station crew's
 * remote control of an approaching Soyuz or Progress, flown on the docking TV
 * camera's picture.
 *
 * Taking over hands the approach from Kurs to the operator wherever it is;
 * from then on the spacecraft flies the velocity the translation controller
 * asks for along the port's axes (in the TV picture's terms: in toward the
 * port, right, up) and turns at the rates the rotation controller asks for,
 * holding its attitude in the station's frame when they are zero. Handing
 * back lets Kurs fly it back to the stationkeeping point and in again. Each
 * press steps a command, as the real controllers' detents do; the keyboard
 * does the same while the panel is in charge.
 */
import { t } from '../i18n';
import type { VisualFrame } from '../physics/frame';
import type { ToruCommand } from '../physics/sim/rendezvous';
import { DEG, RAD } from '../physics/constants';

/** Steps of the translation (m/s) and rotation (rad/s) commands. */
const AXIAL_STEP = 0.05, LATERAL_STEP = 0.02, RATE_STEP = 0.1 * DEG;
const AXIAL_MAX = 0.6, LATERAL_MAX = 0.2, RATE_MAX = 1 * DEG;

type Axis = 'x' | 'y' | 'z';

export class ToruControls {
  private cmd: ToruCommand = { translate: { x: 0, y: 0, z: 0 }, rotate: { x: 0, y: 0, z: 0 } };
  private manual = false;
  private live = true;
  private status = document.createElement('p');
  private readout = document.createElement('p');
  private takeBtn = document.createElement('button');
  private buttons: HTMLButtonElement[] = [];

  constructor(private host: HTMLElement, private send: (cmd: ToruCommand | null) => void) {
    this.host.classList.add('toru-controls');
    this.host.hidden = true;
    this.render();
    // captured, so that while TORU flies the arrows move the spacecraft rather than the timeline
    window.addEventListener('keydown', (e) => this.key(e), { capture: true });
  }

  reset(): void {
    this.manual = false;
    this.cmd = { translate: { x: 0, y: 0, z: 0 }, rotate: { x: 0, y: 0, z: 0 } };
    this.host.hidden = true;
    this.render();
  }

  /** Rebuild the labels (language change). */
  render(): void {
    const details = document.createElement('details');
    details.open = true;
    const summary = document.createElement('summary');
    summary.textContent = t('toru.title');
    details.append(summary, this.status);
    this.takeBtn.type = 'button';
    this.takeBtn.className = 'btn toru-take';
    this.takeBtn.onclick = () => this.toggle();
    this.buttons = [];
    const pad = (cls: string, items: [string, () => void][]): HTMLElement => {
      const box = document.createElement('div');
      box.className = `toru-pad ${cls}`;
      for (const [key, act] of items) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn';
        b.textContent = t(key);
        b.addEventListener('click', act);
        this.buttons.push(b);
        box.append(b);
      }
      return box;
    };
    const tr = (axis: Axis, step: number, max: number) => () => this.nudge('translate', axis, step, max);
    const rot = (axis: Axis, step: number) => () => this.nudge('rotate', axis, step, RATE_MAX);
    const translation = pad('toru-translate', [
      ['toru.forward', tr('x', AXIAL_STEP, AXIAL_MAX)], ['toru.back', tr('x', -AXIAL_STEP, AXIAL_MAX)],
      ['toru.up', tr('z', LATERAL_STEP, LATERAL_MAX)], ['toru.down', tr('z', -LATERAL_STEP, LATERAL_MAX)],
      // the TV picture's right is the port's −y
      ['toru.left', tr('y', LATERAL_STEP, LATERAL_MAX)], ['toru.right', tr('y', -LATERAL_STEP, LATERAL_MAX)],
      ['toru.stop', () => this.zero('translate')],
    ]);
    const rotation = pad('toru-rotate', [
      ['toru.pitchUp', rot('y', -RATE_STEP)], ['toru.pitchDown', rot('y', RATE_STEP)],
      ['toru.yawLeft', rot('z', -RATE_STEP)], ['toru.yawRight', rot('z', RATE_STEP)],
      ['toru.rollLeft', rot('x', -RATE_STEP)], ['toru.rollRight', rot('x', RATE_STEP)],
      ['toru.hold', () => this.zero('rotate')],
    ]);
    const h1 = document.createElement('h4'); h1.textContent = t('toru.translation');
    const h2 = document.createElement('h4'); h2.textContent = t('toru.rotation');
    const help = document.createElement('p');
    help.className = 'toru-help';
    help.textContent = t('toru.help');
    details.append(this.takeBtn, h1, translation, h2, rotation, this.readout, help);
    this.host.replaceChildren(details);
    this.refresh();
  }

  /** Show for a rendezvous's approach, live; follow what the recording says the operator is doing. */
  update(frame: VisualFrame | null, live: boolean, engineer: boolean): void {
    const rv = frame?.rendezvous;
    const approach = !!rv && (rv.phase === 'approach' || rv.phase === 'flyaround' || rv.phase === 'stationkeeping' || rv.phase === 'final' || rv.phase === 'retreat');
    this.host.hidden = !engineer || !approach;
    this.live = live;
    if (rv && live && rv.manual !== this.manual && !this.pending) this.manual = rv.manual;
    this.pending = false;
    if (rv) this.status.textContent = t(this.manual ? 'toru.statusManual' : 'toru.statusKurs', { phase: t(`hud.rv.${rv.phase}`) });
    this.refresh();
  }
  private pending = false;

  private toggle(): void {
    if (!this.live) return;
    this.manual = !this.manual;
    this.pending = true;
    if (this.manual) {
      this.cmd = { translate: { x: 0, y: 0, z: 0 }, rotate: { x: 0, y: 0, z: 0 } };
      this.send(this.copy());
    } else this.send(null);
    this.refresh();
  }

  private nudge(kind: 'translate' | 'rotate', axis: Axis, step: number, max: number): void {
    if (!this.live || !this.manual) return;
    const v = this.cmd[kind];
    v[axis] = Math.max(-max, Math.min(max, Math.round((v[axis] + step) / Math.abs(step)) * Math.abs(step)));
    this.send(this.copy());
    this.refresh();
  }

  private zero(kind: 'translate' | 'rotate'): void {
    if (!this.live || !this.manual) return;
    this.cmd[kind] = { x: 0, y: 0, z: 0 };
    this.send(this.copy());
    this.refresh();
  }

  private copy(): ToruCommand {
    return { translate: { ...this.cmd.translate }, rotate: { ...this.cmd.rotate } };
  }

  private refresh(): void {
    this.takeBtn.textContent = t(this.manual ? 'toru.release' : 'toru.take');
    this.takeBtn.disabled = !this.live;
    for (const b of this.buttons) b.disabled = !this.live || !this.manual;
    const f = (x: number) => x.toFixed(2);
    this.readout.textContent = this.manual ? t('toru.readout', {
      x: f(this.cmd.translate.x), right: f(-this.cmd.translate.y), up: f(this.cmd.translate.z),
      roll: f(this.cmd.rotate.x * RAD), pitch: f(this.cmd.rotate.y * RAD), yaw: f(this.cmd.rotate.z * RAD),
    }) : '';
  }

  /** W/S in and out, arrows across, X stops (while TORU flies and no field has the focus). */
  private key(e: KeyboardEvent): void {
    if (this.host.hidden || !this.manual || !this.live) return;
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA')) return;
    const act: Record<string, () => void> = {
      w: () => this.nudge('translate', 'x', AXIAL_STEP, AXIAL_MAX), s: () => this.nudge('translate', 'x', -AXIAL_STEP, AXIAL_MAX),
      ArrowUp: () => this.nudge('translate', 'z', LATERAL_STEP, LATERAL_MAX), ArrowDown: () => this.nudge('translate', 'z', -LATERAL_STEP, LATERAL_MAX),
      ArrowLeft: () => this.nudge('translate', 'y', LATERAL_STEP, LATERAL_MAX), ArrowRight: () => this.nudge('translate', 'y', -LATERAL_STEP, LATERAL_MAX),
      x: () => this.zero('translate'),
    };
    const fn = act[e.key];
    if (!fn) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    fn();
  }
}
