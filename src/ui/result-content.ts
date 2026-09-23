import type { Lang } from '../i18n';
import { orbitResiduals, type OrbitMissParam, type ResolvedTarget } from '../physics/mission';
import { RAD } from '../physics/constants';
import type { Debris, SimEvent, SimState } from '../physics/simulation';

export type ResultOutcome = 'target' | 'offTarget' | 'failed';
export type ResultCause = 'target' | 'window' | 'shape' | 'inclination' | 'incomplete' | 'pointing' | 'prediction'
  | 'engine' | 'thrust' | 'separation' | 'structure' | 'fuel' | 'range' | 'liftoff' | 'impact' | 'reentry';
export type RecoveryResult = 'notRequested' | 'pending' | 'flying' | 'landed' | 'failed' | 'partial';

/** Only fields that createFrameSimView rewinds; never read live burn internals. */
export interface ResultInput {
  state: Pick<SimState, 't' | 'status' | 'elements' | 'payloadSeparated'>;
  events: readonly SimEvent[];
  debris: readonly Pick<Debris, 'name' | 'createdAt' | 'recovery' | 'outcome'>[];
  plan: { target: ResolvedTarget };
  cfg: { boosterRecovery: boolean };
}

export interface ResultMetric {
  key: OrbitMissParam;
  target: number | null;
  actual: number | null;
  delta: number | null;
  unit: 'km' | 'deg';
  outside: boolean | null;
}

export interface MissionResultModel {
  outcome: ResultOutcome;
  cause: ResultCause;
  displayedTime: number;
  outcomeTime: number;
  reviewTime: number;
  metrics: ResultMetric[];
  recovery: RecoveryResult;
  payloadSeparated: boolean;
  issPlaneOnly: boolean;
  /** Persist recorded limitations while respecting the displayed replay time. */
  aeroWarnings: { time: number; scope: 'vehicle' | 'debris'; angleOfAttackRad: number; sideslipRad: number }[];
}

const finite = (value: number | null): number | null => value !== null && Number.isFinite(value) ? value : null;
const CAUSES: Partial<Record<string, ResultCause>> = {
  'evt.engineOut': 'engine', 'evt.thrustLoss': 'thrust', 'evt.prematureSep': 'separation',
  'evt.structuralFailure': 'structure', 'evt.outOfPropellant': 'fuel',
  'evt.insertionAbandoned': 'fuel', 'evt.ftsCommanded': 'range', 'evt.rangeSafety': 'range',
  'evt.noLiftoff': 'liftoff', 'evt.reentry': 'reentry',
};

/** Assess the displayed instant. Future events must never leak into a replay. */
export function assessMissionResult(input: ResultInput): MissionResultModel | null {
  const { state, plan, cfg } = input;
  const events = input.events.filter(event => event.t <= state.t + 1e-6).sort((a, b) => a.t - b.t);
  const completed = [...events].reverse().find(event => event.key === 'evt.targetOrbit' || event.key === 'evt.offTargetOrbit');
  if (state.status !== 'failed' && !completed) return null;

  const outcome: ResultOutcome = state.status === 'failed' ? 'failed'
    : completed!.key === 'evt.targetOrbit' ? 'target' : 'offTarget';
  const terminalFailure = [...events].reverse().find(event => event.severity === 'fail');
  const outcomeTime = outcome === 'failed' ? terminalFailure?.t ?? state.t : completed!.t;
  // Orbital numbers are explicitly the displayed frame, not rounded event
  // params or the live simulation's eventual orbit.
  const target = plan.target;
  // A six-DOF verdict is reached on the lowest and highest altitude of the
  // next revolution under J2, which the event carries; the frame's osculating
  // apsides swing kilometres round that orbit and would contradict it.
  const judged = completed?.params;
  const elements = judged && typeof judged.apAltM === 'number' && typeof judged.peAltM === 'number'
    ? { ...state.elements, apoapsisAlt: judged.apAltM, periapsisAlt: judged.peAltM } : state.elements;
  const residual = orbitResiduals(target, elements, true);
  const misses = new Set(residual.misses.map(miss => miss.param));
  const metric = (key: OrbitMissParam, wanted: number | null, actual: number, delta: number | null, unit: 'km' | 'deg'): ResultMetric => ({
    key, target: finite(wanted), actual: finite(actual), delta: finite(delta), unit,
    outside: wanted === null ? null : misses.has(key),
  });
  const metrics = [
    metric('perigee', target.perigee / 1000, elements.periapsisAlt / 1000, residual.perigee / 1000, 'km'),
    metric('apogee', target.apogee / 1000, elements.apoapsisAlt / 1000, residual.apogee / 1000, 'km'),
    metric('inclination', target.inclination * RAD, elements.i * RAD, residual.inclination, 'deg'),
    metric('raan', target.raan === null ? null : target.raan * RAD, elements.raan * RAD, residual.raan, 'deg'),
  ];

  let cause: ResultCause = outcome === 'target' ? 'target' : 'incomplete';
  let reviewTime = outcomeTime;
  if (outcome === 'failed') {
    const event = [...events].reverse().find(event => event.t <= outcomeTime + 1e-6 && CAUSES[event.key]);
    if (event) { cause = CAUSES[event.key]!; reviewTime = event.t; }
    else {
      const impact = [...events].reverse().find(event => event.key === 'evt.impact');
      if (impact) { cause = 'impact'; reviewTime = impact.t; }
    }
  } else if (outcome === 'offTarget') {
    const pointing = [...events].reverse().find(event => event.key === 'evt.burnAlignmentTimeout' && event.t <= outcomeTime + 1e-6);
    const prediction = [...events].reverse().find(event => event.key === 'evt.burnPredictionUnavailable' && event.t <= outcomeTime + 1e-6);
    if (prediction && (!pointing || prediction.t >= pointing.t)) { cause = 'prediction'; reviewTime = prediction.t; }
    else if (pointing) { cause = 'pointing'; reviewTime = pointing.t; }
    else if (misses.has('raan')) cause = 'window';
    else if (misses.has('perigee') || misses.has('apogee')) cause = 'shape';
    else if (misses.has('inclination')) cause = 'inclination';
  }

  let recovery: RecoveryResult = 'notRequested';
  if (cfg.boosterRecovery) {
    const boosters = input.debris.filter(body => body.createdAt <= state.t + 1e-6 && body.recovery);
    // The view supplies frame-backed debris. Require the visible outcome event
    // as well, so accidentally supplied future landed/impact flags cannot leak.
    const landed = boosters.filter(body => events.some(event => (event.key === 'evt.boosterLanded' || event.key === 'evt.boosterLandedZone'
      || event.key === 'evt.boosterLandedShip') && event.params?.name === body.name));
    const lost = boosters.filter(body => events.some(event => event.key === 'evt.stageImpact' && event.params?.name === body.name));
    if (boosters.length === 0) recovery = 'pending';
    else if (landed.length === boosters.length) recovery = 'landed';
    else if (lost.length === boosters.length) recovery = 'failed';
    else if (landed.length + lost.length === boosters.length) recovery = 'partial';
    else recovery = 'flying';
  }
  return {
    outcome, cause, displayedTime: state.t, outcomeTime, reviewTime, metrics, recovery,
    payloadSeparated: state.payloadSeparated, issPlaneOnly: target.raanMode === 'iss',
    aeroWarnings: events.flatMap(event => {
      const p = event.params;
      if ((event.key !== 'evt.aeroEnvelopeExceeded' && event.key !== 'evt.debrisSeparated')
        || !p || (p.scope !== 'vehicle' && p.scope !== 'debris')
        || typeof p.angleOfAttackRad !== 'number' || !Number.isFinite(p.angleOfAttackRad)
        || typeof p.sideslipRad !== 'number' || !Number.isFinite(p.sideslipRad)) return [];
      return [{ time: event.t, scope: p.scope, angleOfAttackRad: p.angleOfAttackRad, sideslipRad: p.sideslipRad }];
    }),
  };
}

interface ResultCopy {
  heading: string;
  outcome: Record<ResultOutcome, string>;
  cause: Record<ResultCause, { detail: string; next: string }>;
  recovery: Record<RecoveryResult, string>;
  metric: Record<OrbitMissParam, string>;
  orbitTable: string; parameter: string; target: string; actual: string; delta: string;
  free: string; unavailable: string; deltaNote: string; displayed: string; assessed: string;
  next: string; review: string; booster: string; separate: string; pendingPayload: string; iss: string; outside: string;
}

export const RESULT_COPY: Record<Lang, ResultCopy> = {
  en: {
    heading: 'Mission result', outcome: { target: 'Target orbit reached', offTarget: 'Orbit reached, target missed', failed: 'Flight ended in failure' },
    cause: {
      target: { detail: 'The mission met the simulator’s target-orbit checks.', next: 'Review the flight timeline or change one mission parameter to compare another attempt.' },
      window: { detail: 'The orbital plane misses the requested RAAN. This simulator sets that plane through launch timing.', next: 'Choose a matching launch window in Mission setup, then launch again; pitch tuning alone will not correct RAAN.' },
      shape: { detail: 'The displayed perigee or apogee is outside the target band.', next: 'Review the final burn and remaining propellant. Try a lighter payload, a lower target, or Auto-tune for this mission.' },
      inclination: { detail: 'The displayed orbit has the wrong inclination.', next: 'Check the launch site’s inclination range and the fuel needed for the planned plane change.' },
      incomplete: { detail: 'The target was not confirmed before the mission ended.', next: 'Review the last flight events and the target settings before another attempt.' },
      pointing: { detail: 'The final manoeuvre was cancelled because the vehicle could not acquire the required pointing direction in time. The achieved orbit is retained.', next: 'Review the pointing timeout, angular rates and remaining attitude-control propellant before another attempt.' },
      prediction: { detail: 'The coast predictor could not find a feasible next burn. The achieved orbit is retained.', next: 'Review the last burn and target geometry. This result does not establish a main-propellant shortage.' },
      engine: { detail: 'An engine-out event occurred during this attempt, and the mission did not finish.', next: 'Review engine-out in the timeline. Compare a run with failures disabled or reduce payload before repeating the scenario.' },
      thrust: { detail: 'A thrust-loss event occurred before mission completion.', next: 'Inspect the thrust-loss event and failure settings; compare with a nominal launch.' },
      separation: { detail: 'Premature stage separation occurred before mission completion.', next: 'Review the separation event and selected failure time before repeating the scenario.' },
      structure: { detail: 'The simulator recorded a structural failure under aerodynamic load.', next: 'Review maximum dynamic pressure and the ascent profile; try Auto-tune or a less aggressive pitch program.' },
      fuel: { detail: 'The vehicle ran out of usable propulsion or abandoned insertion before completing the target.', next: 'Reduce payload or target-orbit demand, or choose a launcher with more capability; inspect the final burn.' },
      range: { detail: 'A range-safety event ended the flight.', next: 'Check the selected failure scenario, launch site and trajectory limits, then review the termination event.' },
      liftoff: { detail: 'The vehicle did not produce enough thrust to lift off.', next: 'Reduce payload or select a launcher with a higher liftoff thrust-to-weight ratio.' },
      impact: { detail: 'The tracked vehicle impacted before completing its mission.', next: 'Review the descent and the preceding burn events; check payload and ascent guidance.' },
      reentry: { detail: 'The tracked orbit decayed into the atmosphere.', next: 'Raise the perigee or reduce the target demand so the final burn can establish a sustainable orbit.' },
    },
    recovery: { notRequested: 'Not requested', pending: 'No recovery outcome at this time', flying: 'Recovery still in progress', landed: 'Landing recorded', failed: 'Impact recorded; recovery unsuccessful', partial: 'Mixed landing and impact outcomes' },
    metric: { perigee: 'Perigee altitude', apogee: 'Apogee altitude', inclination: 'Inclination', raan: 'RAAN' },
    orbitTable: 'Orbit at the displayed time', parameter: 'Parameter', target: 'Target', actual: 'Actual', delta: 'Actual − target',
    free: 'Unconstrained', unavailable: 'Unavailable', deltaNote: 'Highlighted differences exceed the simulator’s target band. “—” means unavailable; it does not mean zero.',
    displayed: 'Displayed time', assessed: 'Outcome recorded at', next: 'Next step', review: 'Review relevant event', booster: 'Booster recovery',
    separate: 'Booster landing is assessed separately from the payload’s orbit.', pendingPayload: 'Payload separation has not yet been recorded at this time.',
    iss: 'The ISS preset targets an orbital plane. Rendezvous and docking are not confirmed by this result.', outside: 'Outside the target band',
  },
  th: {
    heading: 'สรุปผลภารกิจ', outcome: { target: 'เข้าสู่วงโคจรเป้าหมายแล้ว', offTarget: 'เข้าสู่วงโคจรแล้ว แต่ยังไม่ตรงเป้าหมาย', failed: 'เที่ยวบินสิ้นสุดด้วยความล้มเหลว' },
    cause: {
      target: { detail: 'ผลภารกิจผ่านเกณฑ์วงโคจรเป้าหมายของเครื่องจำลอง', next: 'ย้อนดูเหตุการณ์การบิน หรือเปลี่ยนค่าภารกิจหนึ่งค่าเพื่อเปรียบเทียบการปล่อยครั้งถัดไป' },
      window: { detail: 'ระนาบวงโคจรมีค่า RAAN ไม่ตรงเป้าหมาย เครื่องจำลองนี้กำหนดระนาบดังกล่าวจากเวลาปล่อย', next: 'เลือกช่วงเวลาปล่อยที่ตรงเป้าหมายในส่วนตั้งค่าภารกิจแล้วทดลองใหม่ การปรับมุมเงยเพียงอย่างเดียวแก้ค่า RAAN ไม่ได้' },
      shape: { detail: 'ระดับจุดใกล้โลกหรือจุดไกลโลกในภาพที่กำลังดูอยู่นอกช่วงยอมรับของเป้าหมาย', next: 'ตรวจการเผาไหม้ครั้งสุดท้ายและเชื้อเพลิงที่เหลือ ลองลดมวลบรรทุก ลดระดับวงโคจรเป้าหมาย หรือปรับวิถีอัตโนมัติสำหรับภารกิจนี้' },
      inclination: { detail: 'มุมเอียงวงโคจรในภาพที่กำลังดูไม่ตรงเป้าหมาย', next: 'ตรวจช่วงมุมเอียงที่ฐานปล่อยรองรับ และเชื้อเพลิงสำหรับการเปลี่ยนระนาบวงโคจรตามแผน' },
      incomplete: { detail: 'ยังไม่มีการยืนยันว่าเข้าสู่วงโคจรเป้าหมายก่อนภารกิจสิ้นสุด', next: 'ตรวจเหตุการณ์ท้ายเที่ยวบินและค่าเป้าหมายก่อนทดลองใหม่' },
      pointing: { detail: 'ยกเลิกการปรับวงโคจรครั้งสุดท้าย เพราะยานจัดแนวไปยังทิศที่ต้องการไม่ทันเวลาที่กำหนด จึงคงอยู่ในวงโคจรที่ทำได้', next: 'ย้อนดูเหตุการณ์หมดเวลาจัดแนว อัตราการหมุน และเชื้อเพลิงควบคุมท่าทางที่เหลือก่อนทดลองใหม่' },
      prediction: { detail: 'ตัวคาดการณ์การโคจรไม่พบการเผาไหม้ครั้งถัดไปที่ทำได้ จึงคงอยู่ในวงโคจรที่ทำได้', next: 'ย้อนดูการเผาไหม้ครั้งล่าสุดและรูปทรงวงโคจรเป้าหมาย ผลนี้ยังไม่ได้ยืนยันว่าเชื้อเพลิงหลักไม่เพียงพอ' },
      engine: { detail: 'มีเหตุการณ์เครื่องยนต์ดับระหว่างการทดลองนี้ และภารกิจไม่สำเร็จ', next: 'ย้อนดูเหตุการณ์เครื่องยนต์ดับ แล้วเปรียบเทียบกับการปล่อยที่ปิดโหมดความขัดข้อง หรือลดมวลบรรทุกก่อนทดสอบซ้ำ' },
      thrust: { detail: 'เกิดการสูญเสียแรงขับก่อนภารกิจสำเร็จ', next: 'ตรวจเหตุการณ์สูญเสียแรงขับและค่าความขัดข้อง แล้วเปรียบเทียบกับการปล่อยปกติ' },
      separation: { detail: 'เกิดการแยกท่อนจรวดก่อนกำหนด ก่อนภารกิจสำเร็จ', next: 'ย้อนดูเหตุการณ์แยกท่อนจรวดและเวลาความขัดข้องที่เลือกไว้ก่อนทดสอบซ้ำ' },
      structure: { detail: 'เครื่องจำลองบันทึกความเสียหายของโครงสร้างจากแรงอากาศพลศาสตร์', next: 'ตรวจความดันพลวัตสูงสุดและวิถีไต่ระดับ ลองปรับวิถีอัตโนมัติหรือใช้โปรแกรมมุมเงยที่เปลี่ยนช้าลง' },
      fuel: { detail: 'ยานหมดความสามารถขับเคลื่อนที่ใช้งานได้ หรือยุติการแทรกเข้าสู่วงโคจรก่อนถึงเป้าหมาย', next: 'ลดมวลบรรทุก ลดความต้องการของวงโคจรเป้าหมาย หรือเลือกจรวดที่มีขีดความสามารถสูงขึ้น แล้วตรวจการเผาไหม้ครั้งสุดท้าย' },
      range: { detail: 'เหตุการณ์ด้านความปลอดภัยเขตปล่อยทำให้เที่ยวบินสิ้นสุด', next: 'ตรวจสถานการณ์ความขัดข้อง ฐานปล่อย และข้อจำกัดวิถี แล้วดูเหตุการณ์ยุติเที่ยวบิน' },
      liftoff: { detail: 'ยานมีแรงขับไม่เพียงพอสำหรับยกตัวจากฐานปล่อย', next: 'ลดมวลบรรทุก หรือเลือกจรวดที่มีอัตราส่วนแรงขับต่อน้ำหนักขณะยกตัวสูงขึ้น' },
      impact: { detail: 'ยานที่กำลังติดตามกระแทกพื้นก่อนภารกิจสำเร็จ', next: 'ย้อนดูช่วงตกและการเผาไหม้ก่อนหน้านั้น พร้อมตรวจมวลบรรทุกและการนำวิถีไต่ระดับ' },
      reentry: { detail: 'วงโคจรที่กำลังติดตามลดระดับเข้าสู่บรรยากาศ', next: 'ยกระดับจุดใกล้โลก หรือลดความต้องการของเป้าหมายเพื่อให้การเผาไหม้ครั้งสุดท้ายสร้างวงโคจรที่คงอยู่ได้' },
    },
    recovery: { notRequested: 'ไม่ได้ร้องขอ', pending: 'ยังไม่มีผลการกลับลงจอด ณ เวลานี้', flying: 'กำลังกลับลงจอด', landed: 'บันทึกการลงจอดแล้ว', failed: 'บันทึกการกระแทกพื้น — กลับลงจอดไม่สำเร็จ', partial: 'มีทั้งท่อนที่ลงจอดและท่อนที่กระแทกพื้น' },
    metric: { perigee: 'ระดับจุดใกล้โลก', apogee: 'ระดับจุดไกลโลก', inclination: 'มุมเอียงวงโคจร', raan: 'RAAN' },
    orbitTable: 'วงโคจร ณ เวลาที่กำลังแสดง', parameter: 'พารามิเตอร์', target: 'เป้าหมาย', actual: 'ค่าจริง', delta: 'ค่าจริง − เป้าหมาย',
    free: 'ไม่กำหนด', unavailable: 'ไม่มีข้อมูล', deltaNote: 'ผลต่างที่เน้นสีอยู่นอกเกณฑ์ยอมรับของเครื่องจำลอง “—” หมายถึงไม่มีข้อมูล ไม่ใช่ค่าศูนย์',
    displayed: 'เวลาที่กำลังแสดง', assessed: 'เวลาที่บันทึกผล', next: 'ขั้นตอนถัดไป', review: 'ย้อนดูเหตุการณ์ที่เกี่ยวข้อง', booster: 'ผลกลับลงจอดของบูสเตอร์',
    separate: 'ประเมินการลงจอดของบูสเตอร์แยกจากวงโคจรของส่วนบรรทุก', pendingPayload: 'ยังไม่มีการบันทึกการแยกส่วนบรรทุก ณ เวลานี้',
    iss: 'ค่าตั้ง ISS ใช้เป้าหมายระนาบวงโคจร ผลนี้ไม่ได้ยืนยันการนัดพบหรือเชื่อมต่อกับสถานี', outside: 'อยู่นอกช่วงยอมรับของเป้าหมาย',
  },
  ru: {
    heading: 'Итог миссии', outcome: { target: 'Целевая орбита достигнута', offTarget: 'Орбита достигнута, цель не выполнена', failed: 'Полёт завершился неудачей' },
    cause: {
      target: { detail: 'Результат удовлетворяет критериям целевой орбиты симулятора.', next: 'Просмотрите события полёта или измените один параметр миссии для сравнения следующего запуска.' },
      window: { detail: 'Плоскость орбиты не соответствует заданной долготе восходящего узла. В симуляторе она определяется временем запуска.', next: 'Выберите подходящее окно запуска в настройках миссии и повторите полёт. Одной настройкой тангажа эту ошибку не устранить.' },
      shape: { detail: 'Показанные высоты перигея или апогея выходят за допустимые отклонения от цели.', next: 'Проверьте последнее включение двигателя и остаток топлива. Уменьшите полезную нагрузку, снизьте требования к орбите или выполните автонастройку этой миссии.' },
      inclination: { detail: 'Наклонение показанной орбиты не соответствует цели.', next: 'Проверьте допустимый диапазон наклонений для космодрома и запас топлива на изменение плоскости орбиты.' },
      incomplete: { detail: 'Достижение целевой орбиты не подтверждено до завершения миссии.', next: 'Проверьте последние события полёта и параметры цели перед следующей попыткой.' },
      pointing: { detail: 'Последний манёвр отменён: аппарат не успел принять требуемую ориентацию. Сохраняется достигнутая орбита.', next: 'Просмотрите событие истечения времени ориентации, угловые скорости и остаток топлива системы ориентации перед следующей попыткой.' },
      prediction: { detail: 'Прогноз движения не нашёл выполнимый следующий манёвр. Сохраняется достигнутая орбита.', next: 'Проверьте последний манёвр и геометрию цели. Этот результат не доказывает нехватку основного топлива.' },
      engine: { detail: 'В этой попытке произошло отключение двигателя, и миссия не была завершена.', next: 'Просмотрите отключение двигателя. Сравните с запуском без отказов или уменьшите полезную нагрузку перед повторением сценария.' },
      thrust: { detail: 'До завершения миссии произошла потеря тяги.', next: 'Проверьте событие потери тяги и настройки отказа; сравните с нормальным запуском.' },
      separation: { detail: 'До завершения миссии произошло преждевременное отделение ступени.', next: 'Просмотрите отделение ступени и выбранное время отказа перед повторением сценария.' },
      structure: { detail: 'Симулятор зарегистрировал разрушение конструкции под аэродинамической нагрузкой.', next: 'Проверьте максимальный скоростной напор и профиль подъёма. Попробуйте автонастройку или более плавную программу тангажа.' },
      fuel: { detail: 'Доступная тяга и топливо исчерпаны либо выведение прекращено до достижения цели.', next: 'Уменьшите полезную нагрузку или требования к орбите, выберите более мощный носитель и проверьте последнее включение двигателя.' },
      range: { detail: 'Полёт завершён событием системы безопасности.', next: 'Проверьте сценарий отказа, космодром и ограничения траектории, затем просмотрите событие прекращения полёта.' },
      liftoff: { detail: 'Тяги не хватило для отрыва от стартовой площадки.', next: 'Уменьшите полезную нагрузку или выберите носитель с большей стартовой тяговооружённостью.' },
      impact: { detail: 'Отслеживаемый аппарат столкнулся с поверхностью до завершения миссии.', next: 'Просмотрите снижение и предшествующие включения двигателя; проверьте полезную нагрузку и программу выведения.' },
      reentry: { detail: 'Отслеживаемая орбита снизилась до входа в атмосферу.', next: 'Поднимите перигей или снизьте требования к цели, чтобы последнее включение двигателя сформировало устойчивую орбиту.' },
    },
    recovery: { notRequested: 'Не запрошено', pending: 'На этот момент результата возвращения нет', flying: 'Возвращение ещё продолжается', landed: 'Посадка зарегистрирована', failed: 'Зарегистрировано падение; возвращение не удалось', partial: 'Есть и посадки, и падения ступеней' },
    metric: { perigee: 'Высота перигея', apogee: 'Высота апогея', inclination: 'Наклонение', raan: 'Долгота восходящего узла (RAAN)' },
    orbitTable: 'Орбита в отображаемый момент', parameter: 'Параметр', target: 'Цель', actual: 'Факт', delta: 'Факт − цель',
    free: 'Не задано', unavailable: 'Нет данных', deltaNote: 'Выделенные отклонения превышают допуск симулятора. «—» означает отсутствие данных, а не ноль.',
    displayed: 'Отображаемое время', assessed: 'Результат зарегистрирован в', next: 'Следующий шаг', review: 'Просмотреть связанное событие', booster: 'Возвращение ускорителя',
    separate: 'Посадка ускорителя оценивается отдельно от орбиты полезной нагрузки.', pendingPayload: 'На этот момент отделение полезной нагрузки ещё не зарегистрировано.',
    iss: 'Настройка МКС задаёт плоскость орбиты. Этот результат не подтверждает сближение или стыковку со станцией.', outside: 'За пределами допуска цели',
  },
};
