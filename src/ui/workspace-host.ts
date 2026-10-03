import type { MissionDocument } from '../config/mission-file';
import type { ExperimentRunInput } from '../experiments/notebook';

export interface WorkHost {
  capture(): ExperimentRunInput | null;
  restoreMission(mission: MissionDocument): boolean;
  isBusy(): boolean;
  onImported(): void;
}
