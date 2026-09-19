import type { SimEvent } from '../simulation';
import type { RigidTelemetry } from './telemetry';

export type AeroEnvelopeScope = 'vehicle' | 'debris';
type EnvelopeTelemetry = Pick<RigidTelemetry, 'modelVersion' | 'bodyId' | 'configurationId'
  | 'angleOfAttack' | 'sideslip' | 'aeroWithinEnvelope'>;

/** One first exceedance per tracked body, for the lifetime of one flight.
 * This records the model's angle/Mach envelope flag, not a structural failure.
 * Call only after an accepted physical step, never from trial RK evaluations.
 * Use a stable id across vehicle staging and a distinct id for each debris body.
 */
export class AeroEnvelopeEvents {
  private readonly recorded = new Set<string>();

  observe(time: number, telemetry: EnvelopeTelemetry | undefined,
    body: { id: string; name: string; scope: AeroEnvelopeScope }): SimEvent | undefined {
    if (!telemetry || telemetry.aeroWithinEnvelope || this.recorded.has(body.id)) return undefined;
    if (!Number.isFinite(time) || !Number.isFinite(telemetry.angleOfAttack) || !Number.isFinite(telemetry.sideslip)) {
      throw new RangeError('Aerodynamic envelope observation requires a finite time and angles');
    }
    this.recorded.add(body.id);
    return {
      t: time, key: 'evt.aeroEnvelopeExceeded', severity: 'warn',
      params: {
        scope: body.scope, name: body.name, bodyId: telemetry.bodyId ?? body.id,
        configurationId: telemetry.configurationId ?? '', modelVersion: telemetry.modelVersion,
        angleOfAttackRad: telemetry.angleOfAttack, sideslipRad: telemetry.sideslip,
      },
    };
  }
}
