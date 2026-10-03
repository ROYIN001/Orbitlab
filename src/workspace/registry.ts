/** Explicit ownership registry. Device caches and unrelated browser storage are never swept. */
export const WORKSPACE_KEYS = [
  'orbitlab.mission', 'orbitlab.designs', 'orbitlab.lessons', 'orbitlab.student',
  'orbitlab.experiments.v1', 'orbitlab.build.explore.v1', 'orbitlab.build.satellite.v1',
  'orbitlab.build.requirements.v1', 'orbitlab.numeric-drafts.v1', 'orbitlab.build.craft.v1', 'orbitlab.author.draft',
  'orbitlab.author.design', 'orbitlab.author.kind', 'orbitlab.worksheets',
  'orbitlab.project-import.recovery.v1', 'orbitlab.import.quarantine.v1', 'orbitlab.dataMode', 'orbitlab.homeCity',
  'orbitlab.hudLayout', 'orbitlab.hudMode', 'orbitlab.sound', 'orbitlab.experience',
  'orbitlab.mode', 'orbitlab.section', 'orbitlab.frames', 'orbitlab.notation',
  'orbitlab.guide.v1', 'orbitlab.lang', 'orbitlab.glow',
] as const;
export function isWorkspaceKey(key: string): boolean {
  return (WORKSPACE_KEYS as readonly string[]).includes(key)
    || /^orbitlab\.lessons\.recovery(?:\.[1-9][0-9]*)?$/.test(key);
}
export interface RawStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  readonly length?: number;
  key?(index: number): string | null;
}
export function legacyValues(storage: RawStorage): Record<string, string> {
  const keys = [...WORKSPACE_KEYS] as string[];
  if (storage.key && storage.length !== undefined) {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && isWorkspaceKey(key) && !keys.includes(key)) keys.push(key);
    }
  }
  const values: Record<string, string> = {};
  for (const key of keys) {
    const raw = storage.getItem(key);
    if (raw !== null) values[key] = raw;
  }
  return values;
}
