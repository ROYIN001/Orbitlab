/**
 * A lesson listed in the catalogue before its roadmap item is there (roadmap
 * E03): 5.3 needs the historical missions (C01). The placement test can
 * already point at it; its start never does.
 */
import { missionDoc } from './common';

const soon = (id: string, track: number, order: number, mode: 'explore' | 'engineer', domains: number[], tags: string[],
  title: { en: string; ru: string; th: string }, brief: { en: string; ru: string; th: string }) => ({
  id, track, order, mode, domains, tags, title, brief, comingSoon: true, criteria: [], hints: [], locked: [],
  mission: missionDoc({ vehicleId: 'falcon9', siteId: 'cape', satelliteId: 'cubesats', payloadMass: 10000, orbitId: 'leo' }),
});

export const COMING: readonly unknown[] = [
  soon('adv-history', 5, 3, 'explore', [2, 1], ['C01'],
    { en: 'Historical missions', ru: 'Исторические миссии', th: 'ภารกิจประวัติศาสตร์' },
    { en: 'Sputnik-1, Vostok-1 and Apollo 11, flown as they were.', ru: 'Спутник-1, «Восток-1» и «Аполлон-11» — так, как они летали.', th: 'สปุตนิก-1 วอสตอค-1 และอะพอลโล 11 บินตามที่เกิดขึ้นจริง' }),
];
