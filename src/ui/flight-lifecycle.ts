/**
 * R2.1: the Engineer workspace's mission lifecycle.
 *
 * Three independent things used to be read off one flag (the setup panel's
 * `running`): the mission lifecycle, the live simulation clock and the
 * displayed cursor. Only the first decides what the shell shows:
 *
 *   setup → flight → analysis → (explicit) setup
 *
 * - `setup`: no flight launched yet, or the user explicitly went back to set
 *   up a new one (the setup panel's New mission). The configuration is open.
 * - `flight`: launched. Pausing the live clock, scrubbing back into a replay or
 *   changing the layout stays in `flight`; none of them reopens the setup.
 * - `analysis`: the simulation has finished. The result is read here; the
 *   configuration that was flown stays a frozen input.
 *
 * Outside `setup` the Engineer shell gives the setup column's width to the
 * scene. The setup can still be shown on request (read-only while a flight
 * exists, with Relaunch and New mission in it), which is `peek` here; it does
 * not change the lifecycle.
 */
export type MissionStage = 'setup' | 'flight' | 'analysis';

export function missionStage(s: { launched: boolean; done: boolean }): MissionStage {
  if (!s.launched) return 'setup';
  return s.done ? 'analysis' : 'flight';
}

/** Whether the setup column gives way to the scene. Only the Engineer level hides it (U11). */
export function setupCollapsed(mode: string, stage: MissionStage, peek: boolean): boolean {
  return mode === 'engineer' && stage !== 'setup' && !peek;
}

/**
 * How a change reached the setup. `edit`: a setting changed — one of the
 * setup's own fields, or the loop inspector's "Use for the next launch".
 * `replace`: the whole mission was replaced on purpose — a template, a launch
 * picked in a viewer, a saved or Monte Carlo mission restored.
 */
export type SetupChange = 'edit' | 'replace';

/**
 * LUI-01: whether a change to the setup rebuilds the pad preview.
 *
 * The preview builds a new simulation, so it replaces whatever flight is
 * shown. Nothing previews over a running clock. While setting up, every
 * change previews (roadmap U01). Once launched — flying, paused, replaying, or
 * finished in `analysis` — an edit is held in the setup as the configuration
 * of the next launch (Relaunch, New mission): the flight and its recording are
 * not touched. A mission replaced on purpose is a new mission in any stage.
 */
export function previewsChange(stage: MissionStage, playing: boolean, change: SetupChange): boolean {
  if (playing) return false;
  return change === 'replace' || stage === 'setup';
}
