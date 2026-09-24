/**
 * The words for the control system's failures (roadmap G08): each kind's name, and where it
 * struck — engines, jets, IMU units and an axis — for the event log, the setup panel and the
 * attitude-loop inspector.
 */
import { t } from '../i18n';
import { CONTROL_FAULT_KINDS } from '../physics/rigid/fault-config';
import type { ControlFaultKind } from '../types';

const AXIS_NAME = { roll: 'loop.axis.roll', pitch: 'loop.axis.pitch', yaw: 'loop.axis.yaw' } as const;

export const isFaultKind = (v: unknown): v is ControlFaultKind => typeof v === 'string' && (CONTROL_FAULT_KINDS as readonly string[]).includes(v);
export const faultKindName = (kind: ControlFaultKind): string => t(`fault.kind.${kind}`);
export const faultAxisName = (axis: string): string | null => (axis === 'roll' || axis === 'pitch' || axis === 'yaw' ? t(AXIS_NAME[axis]) : null);

/** "engine 1", "all engines", "IMU 1, 2", "IMUs (all — common mode)", "yaw", joined; '' for nothing. */
export function faultTargetText(p: { engine?: unknown; jet?: unknown; units?: unknown; axis?: unknown }): string {
  const list = (v: unknown) => (Array.isArray(v) ? v.join(', ') : String(v).split(',').join(', '));
  const parts: string[] = [];
  if (p.engine !== undefined) parts.push(p.engine === 'all' ? t('fault.target.allEngines') : t('fault.target.engine', { n: list(p.engine) }));
  if (p.jet !== undefined) parts.push(p.jet === 'all' ? t('fault.target.allJets') : t('fault.target.jet', { n: list(p.jet) }));
  if (p.units !== undefined) parts.push(p.units === 'all' ? t('fault.target.allUnits') : t('fault.target.unit', { n: list(p.units) }));
  if (typeof p.axis === 'string') { const a = faultAxisName(p.axis); if (a) parts.push(a); }
  return parts.join(' · ');
}
