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
    // A detached body has no attitude control and no aerodynamic stabilisation, so it
    // tumbles past the model's disclosed envelope almost immediately after every normal
    // separation — that is expected, not a flight anomaly. It gets its own key at
    // 'info' severity and a plain confirmation ("separated successfully"), instead of
    // reusing the technical disclosure text next to a real 'warn' (an attached,
    // controlled vehicle exceeding the same envelope is a different story and keeps
    // both the original key and its 'warn' severity). The angle/Mach detail stays in
    // `params` either way, for the post-flight model-limit summary and CSV export.
    const debris = body.scope === 'debris';
    return {
      t: time, key: debris ? 'evt.debrisSeparated' : 'evt.aeroEnvelopeExceeded', severity: debris ? 'info' : 'warn',
      params: {
        scope: body.scope, name: body.name, bodyId: telemetry.bodyId ?? body.id,
        configurationId: telemetry.configurationId ?? '', modelVersion: telemetry.modelVersion,
        angleOfAttackRad: telemetry.angleOfAttack, sideslipRad: telemetry.sideslip,
      },
    };
  }
}
