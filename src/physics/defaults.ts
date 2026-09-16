import type { GuidanceParams, FailureConfig } from '../types';

export const DEFAULT_GUIDANCE: GuidanceParams = {
  pitchOverAltitude: 200,
  kickAngle: 6,
  kickDuration: 8,
  gravityTurnEnd: 65e3,
  parkingAltitude: 0,
  maxTimeToGo: 1500,
  maxTurnRate: 0.7,
  loftAltitude: 0,
  pitchMax: 35,
  pitchMin: -15,
  slewRate: 3,
  maxAccel: 0,
};

export const DEFAULT_FAILURE: FailureConfig = { mode: 'none', time: 60, stage: 0 };
