/**
 * The Explore level's drafts kept across a reload (src/design/explore-model.ts
 * `keptDraftsText`, `restoreKeptDrafts`; roadmap D02, D03): what goes in comes
 * back field for field and builds the same vehicle; anything this version
 * cannot take whole is refused (null), never half taken. The cases were fixed
 * before the first run.
 */
import { describe, expect, it } from 'vitest';
import {
  EXPLORE_DRAFTS_VERSION, designResult, keptDraftsText, newStage, partsDraft, remixDraft, restoreKeptDrafts, type ExploreState, type KeptDrafts,
} from '../src/design/explore-model';

const defaults = { remix: 'Falcon 9 Block 5 remix', parts: 'My rocket' };

function edited(): ExploreState {
  const remix = remixDraft('falcon9', 'my-remix-1', 'Stretched F9');
  remix.edit.stages[1].stretch = 1.3;
  remix.edit.addedGroups.push({ body: 'gem63', count: 2 });
  remix.payloadKg = 9000;
  remix.ratings = { signature: 'x', payloadLEO: 8870, payloadGTO: 0 };
  const parts = partsDraft('my-rocket-1', 'Two-stage');
  parts.edit.stages.push(newStage(2));
  parts.edit.groups.push({ body: 'gem63', count: 2 });
  parts.recordId = 'rec-1';
  return { mode: 'parts', remix, parts };
}

const signature = (s: ExploreState) => {
  const r = designResult(s);
  return r.ok ? r.signature : `refused ${r.refusal.code}`;
};

describe('the Explore level\'s drafts kept across a reload', () => {
  it('come back field for field, and build the same vehicle in both modes', () => {
    const kept: KeptDrafts = { state: edited(), defaults };
    const back = restoreKeptDrafts(keptDraftsText(kept));
    expect(back).toEqual(kept);
    expect(signature(back!.state)).toBe(signature(kept.state));
    expect(signature({ ...back!.state, mode: 'remix' })).toBe(signature({ ...kept.state, mode: 'remix' }));
  });

  it('keep an empty payload box as empty (NaN), which the builder refuses by name', () => {
    const state = edited();
    state.parts.payloadKg = Number.NaN;
    const back = restoreKeptDrafts(keptDraftsText({ state, defaults }))!;
    expect(back.state.parts.payloadKg).toBeNaN();
    const r = designResult(back.state);
    expect(r.ok ? 'built' : r.refusal.code).toBe('badPayload');
  });

  it('take a draft the builder refuses as it is: that is where the student left it', () => {
    const state = edited();
    state.remix.edit.stages[0].stretch = 5;
    state.mode = 'remix';
    const back = restoreKeptDrafts(keptDraftsText({ state, defaults }))!;
    expect(back.state.remix.edit.stages[0].stretch).toBe(5);
    expect(designResult(back.state).ok).toBe(false);
  });

  it('refuse, whole, what this version cannot take: nothing, junk, another version, an unknown part or shape', () => {
    const good = JSON.parse(keptDraftsText({ state: edited(), defaults }));
    const bad = (change: (o: any) => void): string => { const o = structuredClone(good); change(o); return JSON.stringify(o); };
    expect(restoreKeptDrafts(null)).toBeNull();
    expect(restoreKeptDrafts('')).toBeNull();
    expect(restoreKeptDrafts('{not json')).toBeNull();
    expect(restoreKeptDrafts('[]')).toBeNull();
    expect(restoreKeptDrafts(bad((o) => { o.v = EXPLORE_DRAFTS_VERSION + 1; }))).toBeNull();
    expect(restoreKeptDrafts(bad((o) => { o.state.mode = 'watch'; }))).toBeNull();
    expect(restoreKeptDrafts(bad((o) => { o.state.remix.edit.base = { kind: 'catalogue', id: 'no-such-rocket' }; }))).toBeNull();
    expect(restoreKeptDrafts(bad((o) => { o.state.remix.edit.stages[0].engine = { part: 'no-such-engine', count: 1 }; }))).toBeNull();
    expect(restoreKeptDrafts(bad((o) => { o.state.parts.edit.stages[0].body = { kind: 'catalogue', id: 'no-such-body' }; }))).toBeNull();
    expect(restoreKeptDrafts(bad((o) => { o.state.parts.edit.groups[0].body = 'no-such-strap-on'; }))).toBeNull();
    expect(restoreKeptDrafts(bad((o) => { o.state.parts.edit.fairing = { part: 'no-such-fairing' }; }))).toBeNull();
    expect(restoreKeptDrafts(bad((o) => { o.state.parts.edit.sites = ['atlantis']; }))).toBeNull();
    expect(restoreKeptDrafts(bad((o) => { delete o.state.parts.edit.stages; }))).toBeNull();
    expect(restoreKeptDrafts(bad((o) => { o.state.remix.id = 'falcon9'; }))).toBeNull();
    expect(restoreKeptDrafts(bad((o) => { o.state.parts.ratings = { signature: 'x', payloadLEO: 'a lot' }; }))).toBeNull();
    expect(restoreKeptDrafts(bad((o) => { delete o.defaults.parts; }))).toBeNull();
    // and the good one is still good
    expect(restoreKeptDrafts(JSON.stringify(good))).not.toBeNull();
  });
});
