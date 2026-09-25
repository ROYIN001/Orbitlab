/**
 * The attitude-loop inspector's tuning tabs (roadmap E04).
 *
 * Tuning: the loop linearised in flight (G04) with trial gains and feed-forward
 * — the plant does not change with them, so every trial is immediate — against
 * the gains flown, over the instant on screen and the flight so far; an
 * auto-tuner for a phase and a gain margin; and "use for the next launch",
 * which writes the trial into the mission setup.
 *
 * Flight test: a step or a doublet flown in the live loop about the axis
 * picked in the title bar, the attitude reached against what the loop
 * linearised at the start predicts, and which limiters held the axis.
 */
import { t } from '../i18n';
import { RAD } from '../physics/constants';
import { curveFromTable, linearModelAt, PLANE_OF, stepResponse, type LinearAxis, type LinearModel, type PlaneModel } from '../physics/rigid/linear';
import { autoTune, flownGains, tableOf, trialMargins, tuneCases, TUNE_DEFAULT_TARGETS, withGains, type TrialGains, type TuneResult } from '../physics/rigid/tuning';
import { ATTITUDE_TEST_LIMITS, attitudeTestAt, attitudeTestDuration, limiterShares, predictAttitudeTest, pulseMetrics, responseMismatch,
  type AttitudeTestKind, type AttitudeTestRecord, type AttitudeTestSpec } from '../physics/rigid/attitude-test';
import { CONTROL_LIMITS } from '../physics/rigid/control-config';
import type { TelemetrySample } from '../physics/sim/types';
import type { ControlConfig } from '../types';
import { drawChart, type ChartMarker, type Series } from './charts';
import { fmtTime } from './hud';
import { logTick } from './loop-analysis';
import { axisLetter, type LoopAxis } from './loop-view';
import { getNotation, simulatorRates } from './notation';

export interface LoopTuningHost {
  /** Write a tuning into the mission setup for the next launch; false when it cannot take one. */
  applyControl?(control: ControlConfig | undefined): boolean;
  /** The tuning the mission setup holds now. */
  currentControl?(): ControlConfig | undefined;
  /** Fly an attitude test in the live flight: its record, or why not. */
  startAttitudeTest?(spec: AttitudeTestSpec): AttitudeTestRecord | string;
}

type Channel = 'roll' | 'pitchYaw';
const CHANNEL_OF: Record<LoopAxis, Channel> = { roll: 'roll', pitch: 'pitchYaw', yaw: 'pitchYaw' };
const PLANES_OF: Record<Channel, readonly LinearAxis[]> = { roll: ['x'], pitchYaw: ['y', 'z'] };
const AXIS_NAME = { roll: 'loop.axis.roll', pitch: 'loop.axis.pitch', yaw: 'loop.axis.yaw' } as const;
const CHANNEL_NAME = { roll: 'tune.channel.roll', pitchYaw: 'tune.channel.pitchYaw' } as const;
const KIND_NAME = { step: 'ftest.kind.step', doublet: 'ftest.kind.doublet' } as const;
const REASON = { notSixDof: 'ftest.reason.notSixDof', notFlying: 'ftest.reason.notFlying', manual: 'ftest.reason.manual',
  running: 'ftest.reason.running', notLive: 'ftest.reason.notLive' } as const;
const STEP_RAD = 1 / RAD, STEP_S = 10, HISTORY_POINTS = 120;
const FLOWN = '#8193a6', TRIAL = '#ffcf6e';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
const fixed = (v: number | undefined, digits: number) => (v === undefined || !Number.isFinite(v) ? '—' : v.toFixed(digits));
/** A log-scaled slider's position (0–1000) for a value in [lo, hi], and back. */
const toSlider = (v: number, lo: number, hi: number) => String(Math.round(1000 * Math.log(v / lo) / Math.log(hi / lo)));
const fromSlider = (x: string, lo: number, hi: number) => lo * (hi / lo) ** (Number(x) / 1000);

/** The simulator's body axis of a standard's positive roll, pitch or yaw, and its sense. */
function simAxis(axis: LoopAxis): { axis: LinearAxis; sign: 1 | -1 } {
  const v = simulatorRates({ roll: axis === 'roll' ? 1 : 0, pitch: axis === 'pitch' ? 1 : 0, yaw: axis === 'yaw' ? 1 : 0 }, getNotation());
  const plane = PLANE_OF[axis];
  return { axis: plane, sign: v[plane] < 0 ? -1 : 1 };
}
/** The standard's axis and sense of a test flown about a simulator axis. */
function standardAxis(spec: AttitudeTestSpec): { axis: LoopAxis; sign: number } {
  const axis: LoopAxis = spec.axis === 'x' ? 'roll' : spec.axis === 'z' ? 'pitch' : 'yaw';
  return { axis, sign: spec.sign * simAxis(axis).sign };
}

export class LoopTuning {
  readonly tuningPanel = el('section', 'la-panel');
  readonly testPanel = el('section', 'la-panel');
  private onChange: () => void = () => {};
  private trial: Partial<Record<Channel, { kTheta: number; kOmega: number }>> = {};
  private trialFf?: number;
  private targets = { ...TUNE_DEFAULT_TARGETS };
  private scope: 'instant' | 'flight' = 'flight';
  private tuneMessage = '';
  private tuneBusy = false;
  private applyMessage = '';
  private testSpec = { kind: 'step' as AttitudeTestKind, amplitudeDeg: 1, holdS: 3 };
  private testMessage = '';
  private predictions = new WeakMap<AttitudeTestRecord, ReturnType<typeof predictAttitudeTest>>();
  private last: { axis: LoopAxis; samples: readonly TelemetrySample[]; cursor: number; live: boolean } = { axis: 'pitch', samples: [], cursor: 0, live: true };

  private tune = {
    channel: el('span', 'lt-channel'), flown: el('span', 'la-at'),
    kTheta: el('input'), kThetaOut: el('output'), kOmega: el('input'), kOmegaOut: el('output'), ff: el('input'), ffOut: el('output'),
    kThetaLabel: el('span'), kOmegaLabel: el('span'), ffLabel: el('span'),
    reset: el('button', 'lt-button'), apply: el('button', 'lt-button primary'), applied: el('span', 'lt-message'),
    targetsLabel: el('span'), pm: el('input'), gm: el('input'), pmLabel: el('span'), gmLabel: el('span'),
    scope: el('select'), auto: el('button', 'lt-button'), result: el('p', 'lt-result'),
    mag: el('canvas'), step: el('canvas'), history: el('canvas'), table: el('table', 'lt-table'), note: el('p', 'la-note'), none: el('p', 'la-none'),
  };
  private test = {
    kind: el('select'), amplitude: el('input'), hold: el('input'), kindLabel: el('span'), amplitudeLabel: el('span'), holdLabel: el('span'),
    run: el('button', 'lt-button primary'), message: el('span', 'lt-message'), header: el('p', 'la-at'),
    chart: el('canvas'), diff: el('canvas'), table: el('table', 'lt-table'), limiters: el('dl', 'la-margins'), note: el('p', 'la-note'), none: el('p', 'la-none'),
  };

  constructor(private host: LoopTuningHost = {}) {
    const u = this.tune;
    const slider = (input: HTMLInputElement) => { input.type = 'range'; input.min = '0'; input.max = '1000'; input.step = '1'; };
    slider(u.kTheta); slider(u.kOmega);
    u.ff.type = 'range'; u.ff.min = '0'; u.ff.max = '100'; u.ff.step = '5';
    const setGain = () => {
      const channel = CHANNEL_OF[this.last.axis];
      this.trial[channel] = { kTheta: fromSlider(u.kTheta.value, ...CONTROL_LIMITS.attitudeGain), kOmega: fromSlider(u.kOmega.value, ...CONTROL_LIMITS.rateGain) };
      this.applyMessage = ''; this.onChange();
    };
    u.kTheta.addEventListener('input', setGain); u.kOmega.addEventListener('input', setGain);
    u.ff.addEventListener('input', () => { this.trialFf = Number(u.ff.value) / 100; this.applyMessage = ''; this.onChange(); });
    u.reset.type = 'button'; u.apply.type = 'button'; u.auto.type = 'button';
    u.reset.addEventListener('click', () => { this.trial = {}; this.trialFf = undefined; this.tuneMessage = ''; this.applyMessage = ''; this.onChange(); });
    u.apply.addEventListener('click', () => this.applyTrial());
    for (const [input, key] of [[u.pm, 'pmDeg'], [u.gm, 'gmDb']] as const) {
      input.type = 'number'; input.step = key === 'pmDeg' ? '5' : '1'; input.min = '1'; input.max = key === 'pmDeg' ? '89' : '40';
      input.value = String(this.targets[key]);
      input.addEventListener('change', () => { const v = Number(input.value); if (v > 0) this.targets[key] = v; });
    }
    u.scope.addEventListener('change', () => { this.scope = u.scope.value === 'instant' ? 'instant' : 'flight'; });
    u.auto.addEventListener('click', () => this.runAutoTune());
    const row1 = el('div', 'la-toolbar lt-row'), row2 = el('div', 'la-toolbar lt-row');
    const labelled = (label: HTMLElement, ...inputs: HTMLElement[]) => { const l = el('label', 'la-ff'); l.append(label, ...inputs); return l; };
    row1.append(u.channel, labelled(u.kThetaLabel, u.kTheta, u.kThetaOut), labelled(u.kOmegaLabel, u.kOmega, u.kOmegaOut), labelled(u.ffLabel, u.ff, u.ffOut), u.reset, u.apply, u.applied);
    row2.append(u.flown, u.targetsLabel, labelled(u.pmLabel, u.pm), labelled(u.gmLabel, u.gm), u.scope, u.auto);
    const plots = el('div', 'la-plots'), side = el('div', 'la-side'), grid = el('div', 'la-grid');
    plots.append(u.mag, u.step); side.append(u.table, u.result, u.history); grid.append(plots, side);
    this.tuningPanel.append(row1, row2, u.none, grid, u.note);

    const f = this.test;
    f.amplitude.type = 'number'; f.amplitude.step = '0.5'; f.amplitude.min = String(-ATTITUDE_TEST_LIMITS.amplitudeDeg[1]); f.amplitude.max = String(ATTITUDE_TEST_LIMITS.amplitudeDeg[1]);
    f.amplitude.value = String(this.testSpec.amplitudeDeg);
    f.hold.type = 'number'; f.hold.step = '0.5'; f.hold.min = String(ATTITUDE_TEST_LIMITS.holdS[0]); f.hold.max = String(ATTITUDE_TEST_LIMITS.holdS[1]);
    f.hold.value = String(this.testSpec.holdS);
    f.kind.addEventListener('change', () => { this.testSpec.kind = f.kind.value === 'doublet' ? 'doublet' : 'step'; });
    f.amplitude.addEventListener('change', () => { this.testSpec.amplitudeDeg = Number(f.amplitude.value); });
    f.hold.addEventListener('change', () => { this.testSpec.holdS = Number(f.hold.value); });
    f.run.type = 'button';
    f.run.addEventListener('click', () => this.runTest());
    const trow = el('div', 'la-toolbar lt-row');
    trow.append(labelled(f.kindLabel, f.kind), labelled(f.amplitudeLabel, f.amplitude), labelled(f.holdLabel, f.hold), f.run, f.message);
    const tplots = el('div', 'la-plots'), tside = el('div', 'la-side'), tgrid = el('div', 'la-grid');
    tplots.append(f.chart, f.diff); tside.append(f.header, f.table, f.limiters); tgrid.append(tplots, tside);
    this.testPanel.append(trow, f.none, tgrid, f.note);
  }

  setOnChange(fn: () => void): void { this.onChange = fn; }

  // ─── tuning ──────────────────────────────────────────────────────────────

  private trialFor(p: PlaneModel, channel: Channel): TrialGains {
    const flown = flownGains(p), gains = this.trial[channel];
    return { kTheta: gains?.kTheta ?? flown.kTheta, kOmega: gains?.kOmega ?? flown.kOmega, feedForward: this.trialFf ?? flown.feedForward };
  }

  private applyTrial(): void {
    const current: ControlConfig = { ...(this.host.currentControl?.() ?? {}) };
    for (const channel of ['roll', 'pitchYaw'] as const) {
      const g = this.trial[channel];
      if (g) current[channel] = { ...(current[channel] ?? {}), attitudeGain: +g.kTheta.toFixed(3), rateGain: +g.kOmega.toFixed(3) };
    }
    if (this.trialFf !== undefined) current.feedForward = this.trialFf;
    const ok = this.host.applyControl?.(Object.keys(current).length ? current : undefined) ?? false;
    this.applyMessage = t(ok ? 'tune.applied' : 'tune.applyFailed');
    this.onChange();
  }

  private runAutoTune(): void {
    if (this.tuneBusy) return;
    const { axis, samples, cursor } = this.last, channel = CHANNEL_OF[axis], planes = PLANES_OF[channel];
    const here = linearModelAt(samples, cursor);
    const models: LinearModel[] = [];
    if (this.scope === 'instant') { if (here) models.push(here); } else {
      let prev: LinearModel | undefined;
      for (const s of samples) { const m = s.rigid?.linearModel; if (m && m !== prev && m.t <= cursor) { models.push(m); prev = m; } }
    }
    const cases = tuneCases(models, planes, 16);
    if (!cases.length || !here) { this.tuneMessage = t('freq.none'); this.onChange(); return; }
    const ff = this.trialFf ?? flownGains(here.planes[PLANE_OF[axis]]).feedForward;
    this.tuneBusy = true; this.tuneMessage = t('tune.working'); this.onChange();
    // Let the message paint before the search (a second or so) runs.
    setTimeout(() => {
      let result: TuneResult;
      try { result = autoTune(cases, here.T, this.targets, ff, tuneCases(models, planes, Infinity)); } finally { this.tuneBusy = false; }
      this.trial[channel] = { kTheta: result.gains.kTheta, kOmega: result.gains.kOmega };
      const w = result.worst, params = { kt: fixed(result.gains.kTheta, 2), kw: fixed(result.gains.kOmega, 2), n: result.cases, t: fmtTime(w.t),
        pm: fixed(w.pmDeg, 1), gm: w.gmDb === undefined ? '∞' : fixed(w.gmDb, 1), wc: fixed(result.crossoverRadS, 2), pmT: this.targets.pmDeg, gmT: this.targets.gmDb };
      this.tuneMessage = t(result.feasible ? 'tune.found' : 'tune.notFound', params);
      this.onChange();
    }, 30);
  }

  renderTuning(axis: LoopAxis, samples: readonly TelemetrySample[], cursor: number, live: boolean): void {
    this.last = { axis, samples, cursor, live };
    const u = this.tune, channel = CHANNEL_OF[axis], model = linearModelAt(samples, cursor), plane = model?.planes[PLANE_OF[axis]];
    u.kThetaLabel.textContent = 'K_θ'; u.kOmegaLabel.textContent = 'K_ω'; u.ffLabel.textContent = t('tune.ff');
    u.reset.textContent = t('tune.reset'); u.apply.textContent = t('tune.apply'); u.auto.textContent = t('tune.auto');
    u.auto.disabled = this.tuneBusy; u.apply.disabled = !this.host.applyControl;
    u.targetsLabel.textContent = t('tune.targets'); u.pmLabel.textContent = t('tune.pmTarget'); u.gmLabel.textContent = t('tune.gmTarget');
    u.scope.replaceChildren(...(['flight', 'instant'] as const).map((v) => { const o = el('option', undefined, t(v === 'flight' ? 'tune.scope.flight' : 'tune.scope.instant')); o.value = v; return o; }));
    u.scope.value = this.scope;
    u.channel.textContent = `${t(CHANNEL_NAME[channel])} · ${t(AXIS_NAME[axis])} (${axisLetter(axis)})`;
    u.note.textContent = t('tune.note'); u.none.textContent = t('freq.none');
    u.applied.textContent = this.applyMessage; u.result.textContent = this.tuneMessage;
    const active = !!plane && plane.actuator !== 'none';
    if (model && !active) u.none.textContent = t('freq.noActuator');
    u.none.hidden = active;
    (u.mag.parentElement!.parentElement as HTMLElement).hidden = !active;
    if (!model || !plane || !active) { u.flown.textContent = ''; return; }
    const flown = flownGains(plane), trial = this.trialFor(plane, channel), T = model.T;
    u.flown.textContent = t('tune.flown', { kt: fixed(flown.kTheta, 2), kw: fixed(flown.kOmega, 2), ff: Math.round(flown.feedForward * 100) });
    u.kTheta.value = toSlider(trial.kTheta, ...CONTROL_LIMITS.attitudeGain); u.kThetaOut.textContent = fixed(trial.kTheta, 2);
    u.kOmega.value = toSlider(trial.kOmega, ...CONTROL_LIMITS.rateGain); u.kOmegaOut.textContent = fixed(trial.kOmega, 2);
    u.ff.value = String(Math.round(trial.feedForward * 100)); u.ffOut.textContent = `${Math.round(trial.feedForward * 100)} %`;
    // Bode magnitude and step, flown against trial.
    const table = tableOf(plane, T), cf = curveFromTable(plane, table, 0), ct = curveFromTable(withGains(plane, trial), table, 0);
    const x = cf.map((p) => Math.log10(p.omega));
    const mf = trialMargins(plane, T, flown), mt = trialMargins(plane, T, trial);
    const markers: ChartMarker[] = [];
    if (mf.wcRadS) markers.push({ x: Math.log10(mf.wcRadS), color: FLOWN, label: 'ω_c' });
    if (mt.wcRadS) markers.push({ x: Math.log10(mt.wcRadS), color: TRIAL, label: 'ω_c′' });
    drawChart(u.mag, [
      { x: [x[0], x[x.length - 1]], y: [0, 0], color: '#3e5165' },
      { x, y: cf.map((p) => p.magDb), color: FLOWN, label: t('tune.series.flown'), dash: [4, 3] },
      { x, y: ct.map((p) => p.magDb), color: TRIAL, label: t('tune.series.trial') },
    ], { title: t('freq.mag'), xMin: x[0], xMax: x[x.length - 1], xFormat: logTick, xLabel: t('freq.xAxis'), markers });
    const sf = stepResponse(plane, T, 0, STEP_RAD, STEP_S), st = stepResponse(withGains(plane, trial), T, 0, STEP_RAD, STEP_S);
    const deg = (v: number[]) => v.map((a) => a * RAD);
    drawChart(u.step, [
      { x: [0, STEP_S], y: [1, 1], color: '#3e5165' },
      { x: sf.t, y: deg(sf.angle), color: FLOWN, label: t('tune.series.flown'), dash: [4, 3] },
      { x: st.t, y: deg(st.angle), color: TRIAL, label: t('tune.series.trial') },
    ], { title: t('tune.step'), xLabel: t('step.xAxis'), yMin: 0 });
    // The margins at this instant, flown and trial.
    const cell = (tag: 'th' | 'td', text: string, cls?: string) => el(tag, cls, text);
    const verdict = (m: typeof mf) => t(m.stable ? 'tune.stable' : 'tune.unstable');
    const rows: [string, string, string, boolean][] = [
      [t('tune.row.loop'), verdict(mf), verdict(mt), mt.stable],
      [t('freq.pm'), `${fixed(mf.pmDeg, 1)}°`, `${fixed(mt.pmDeg, 1)}°`, (mt.pmDeg ?? 0) >= this.targets.pmDeg],
      [t('freq.gm'), mf.gmDb === undefined ? '∞' : `${fixed(mf.gmDb, 1)} ${t('freq.dB')}`, mt.gmDb === undefined ? '∞' : `${fixed(mt.gmDb, 1)} ${t('freq.dB')}`, (mt.gmDb ?? Infinity) >= this.targets.gmDb],
      [t('freq.gmLow'), mf.gmLowDb === undefined ? '—' : `${fixed(mf.gmLowDb, 1)} ${t('freq.dB')}`, mt.gmLowDb === undefined ? '—' : `${fixed(mt.gmLowDb, 1)} ${t('freq.dB')}`, (mt.gmLowDb ?? -Infinity) <= -this.targets.gmDb],
      [t('tune.row.crossover'), fixed(mf.wcRadS, 2), fixed(mt.wcRadS, 2), true],
      ['K_θ / K_ω', `${fixed(flown.kTheta, 2)} / ${fixed(flown.kOmega, 2)}`, `${fixed(trial.kTheta, 2)} / ${fixed(trial.kOmega, 2)}`, true],
    ];
    const head = el('tr'); head.append(cell('th', ''), cell('th', t('tune.series.flown')), cell('th', t('tune.series.trial')));
    u.table.replaceChildren(head, ...rows.map(([k, a, b, ok]) => { const tr = el('tr'); tr.append(cell('th', k), cell('td', a), cell('td', b, ok ? 'ok' : 'bad')); return tr; }));
    // The phase margin over the flight, flown and trial (Bode only; the table has stability at the cursor).
    const models: LinearModel[] = [];
    let prev: LinearModel | undefined;
    for (const s of samples) { const m = s.rigid?.linearModel; if (m && m !== prev && m.t <= cursor) { models.push(m); prev = m; } }
    const stride = Math.max(1, Math.ceil(models.length / HISTORY_POINTS)), picked = models.filter((_, i) => i % stride === 0 || i === models.length - 1);
    const hx: number[] = [], pf: number[] = [], pt: number[] = [];
    for (const m of picked) {
      const p = m.planes[PLANE_OF[axis]];
      if (p.actuator === 'none') continue;
      hx.push(m.t);
      pf.push(m.margins[PLANE_OF[axis]].pmDeg ?? NaN);
      pt.push(trialMargins(p, m.T, this.trialFor(p, channel), 0, false).pmDeg ?? NaN);
    }
    drawChart(u.history, [
      { x: hx, y: pf, color: FLOWN, label: t('tune.series.flown'), dash: [4, 3] },
      { x: hx, y: pt, color: TRIAL, label: t('tune.series.trial') },
    ], { title: t('tune.history'), timeAxis: true, xLabel: t('tel.xAxis'), cursor, yMin: 0 });
  }

  // ─── flight test ─────────────────────────────────────────────────────────

  private runTest(): void {
    const { axis, live } = this.last;
    const amplitude = this.testSpec.amplitudeDeg, hold = this.testSpec.holdS;
    const [aMin, aMax] = ATTITUDE_TEST_LIMITS.amplitudeDeg, [hMin, hMax] = ATTITUDE_TEST_LIMITS.holdS;
    if (!(Math.abs(amplitude) >= aMin && Math.abs(amplitude) <= aMax) || !(hold >= hMin && hold <= hMax)) {
      this.testMessage = t('ftest.invalid', { aMin, aMax, hMin, hMax }); this.onChange(); return;
    }
    if (!live || !this.host.startAttitudeTest) { this.testMessage = t(REASON.notLive); this.onChange(); return; }
    const sim = simAxis(axis);
    const result = this.host.startAttitudeTest({ axis: sim.axis, sign: (Math.sign(amplitude) * sim.sign) as 1 | -1, kind: this.testSpec.kind,
      amplitudeRad: Math.abs(amplitude) / RAD, holdS: hold });
    this.testMessage = typeof result === 'string' ? t(REASON[result as keyof typeof REASON] ?? REASON.notFlying) : '';
    this.onChange();
  }

  renderTest(axis: LoopAxis, samples: readonly TelemetrySample[], cursor: number, live: boolean): void {
    this.last = { axis, samples, cursor, live };
    const f = this.test;
    f.kindLabel.textContent = t('ftest.kind'); f.amplitudeLabel.textContent = t('ftest.amplitude');
    f.holdLabel.textContent = t(this.testSpec.kind === 'doublet' ? 'ftest.holdHalf' : 'ftest.hold');
    f.kind.replaceChildren(...(['step', 'doublet'] as const).map((k) => { const o = el('option', undefined, t(KIND_NAME[k])); o.value = k; return o; }));
    f.kind.value = this.testSpec.kind;
    f.run.textContent = t('ftest.run', { axis: `${t(AXIS_NAME[axis])} (${axisLetter(axis)})` });
    f.run.disabled = !live || !this.host.startAttitudeTest;
    f.message.textContent = this.testMessage;
    f.note.textContent = t('ftest.note');
    const record = attitudeTestAt(samples, cursor);
    f.none.textContent = t('ftest.none');
    f.none.hidden = !!record;
    (f.chart.parentElement!.parentElement as HTMLElement).hidden = !record;
    if (!record) return;
    const spec = record.spec, std = standardAxis(spec), sign = std.sign;
    const header = t('ftest.header', { kind: t(KIND_NAME[spec.kind]), amp: fixed(spec.amplitudeRad * RAD * sign, 1),
      axis: `${t(AXIS_NAME[std.axis])} (${axisLetter(std.axis)})`, t: fmtTime(record.startS), hold: fixed(spec.holdS, 1) });
    // While it runs, a physics worker sends only a stub: the samples come when it ends.
    if (!record.done && !record.t.length) {
      f.header.textContent = `${header} · ${t('ftest.recording', { s: fixed(record.progressS ?? 0, 1), d: fixed(attitudeTestDuration(spec), 1) })}`;
      (f.chart.parentElement!.parentElement as HTMLElement).hidden = false;
      f.chart.hidden = true; f.diff.hidden = true; f.table.replaceChildren(); f.limiters.replaceChildren();
      return;
    }
    f.chart.hidden = false;
    // Up to the cursor (in replay the record may run past it).
    const n = record.t.filter((tau) => record.startS + tau <= cursor + 1e-9).length;
    const tt = record.t.slice(0, n), deg = (v: readonly number[]) => v.slice(0, n).map((a) => a * RAD * sign);
    let prediction = this.predictions.get(record);
    if (!this.predictions.has(record)) { prediction = predictAttitudeTest(record); this.predictions.set(record, prediction); }
    const duration = attitudeTestDuration(spec);
    const running = !record.done && n === record.t.length;
    f.header.textContent = header
      + (running ? ` · ${t('ftest.recording', { s: fixed(tt[tt.length - 1] ?? 0, 1), d: fixed(duration, 1) })}` : '')
      + (record.aborted === 'manual' ? ` · ${t('ftest.aborted')}` : '');
    const series: Series[] = [
      { x: tt, y: deg(record.command), color: '#8193a6', label: t('ftest.series.command'), dash: [5, 4] },
      ...(prediction ? [{ x: prediction.t, y: prediction.response.map((a) => a * RAD * sign), color: '#6ec8ff', label: t('ftest.series.predicted'), dash: [3, 3] }] : []),
      { x: tt, y: deg(record.response), color: '#e7edf4', label: t('ftest.series.measured') },
    ];
    drawChart(f.chart, series, { title: t('ftest.chart'), xLabel: t('step.xAxis'), xMin: 0, xMax: duration });
    f.diff.hidden = !prediction; // before drawing: a hidden canvas has no size
    if (prediction) {
      const m = Math.min(n, prediction.response.length);
      drawChart(f.diff, [
        { x: [0, duration], y: [0, 0], color: '#3e5165' },
        { x: tt.slice(0, m), y: tt.slice(0, m).map((_, i) => (record.response[i] - prediction!.response[i]) * RAD * sign), color: '#efa47e', label: t('ftest.series.diff') },
      ], { title: t('ftest.diff'), xLabel: t('step.xAxis'), xMin: 0, xMax: duration });
    }
    const cut = { ...record, t: tt, response: record.response.slice(0, n), command: record.command.slice(0, n), limits: record.limits.slice(0, n) };
    const mm = pulseMetrics(cut.t, cut.response, spec), mp = prediction ? pulseMetrics(prediction.t, prediction.response, spec) : undefined;
    const cell = (tag: 'th' | 'td', text: string) => el(tag, undefined, text);
    const head = el('tr'); head.append(cell('th', ''), cell('th', t('ftest.series.measured')), cell('th', t('ftest.series.predicted')));
    const rows: [string, string, string][] = [
      [t('step.rise'), mm.riseS === undefined ? '—' : `${fixed(mm.riseS, 2)} ${t('u.s')}`, mp?.riseS === undefined ? '—' : `${fixed(mp.riseS, 2)} ${t('u.s')}`],
      [t('step.overshoot'), `${fixed(mm.overshootPct, 1)} %`, mp ? `${fixed(mp.overshootPct, 1)} %` : '—'],
      [t('ftest.peak'), fixed(mm.peak, 3), mp ? fixed(mp.peak, 3) : '—'],
    ];
    f.table.replaceChildren(head, ...rows.map(([k, a, b]) => { const tr = el('tr'); tr.append(cell('th', k), cell('td', a), cell('td', b)); return tr; }));
    const shares = limiterShares(cut), pct = (x: number) => `${Math.round(x * 100)} %`;
    const lim: [string, string][] = [
      [t('ftest.mismatch'), prediction ? fixed(responseMismatch(cut.response, prediction.response, spec.amplitudeRad), 3) : t('ftest.noModel')],
      [t('ftest.lim.stopping'), pct(shares.stopping)], [t('ftest.lim.rate'), pct(shares.rate)], [t('ftest.lim.acceleration'), pct(shares.acceleration)],
      [t('ftest.model'), record.model ? fmtTime(record.model.t) : '—'],
    ];
    f.limiters.replaceChildren(...lim.flatMap(([k, v]) => [el('dt', undefined, k), el('dd', undefined, v)]));
  }
}
