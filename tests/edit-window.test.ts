import { describe, expect, it } from 'vitest';
import { EDIT_FIELDS, editWindow, type EditFlight } from '../src/ui/edit-window';

/**
 * D-36.A3 (owner, 2026-10-05), CO-4: in flight a value that can still really be
 * adjusted is editable and is used only when confirmed ("Use now"); a value past
 * its window is locked and needs a restart. One table says which is which.
 */
const flight = (patch: Partial<EditFlight> = {}): EditFlight => ({ stage: 'flight', sixDof: true, live: true, failed: false, ...patch });

describe('D-36.A3: when a setup value can be changed', () => {
  it('locks the vehicle in flight: its window has passed', () => {
    expect(editWindow('vehicle', flight())).toEqual({ when: 'locked', reason: 'pastWindow' });
  });

  it('takes a new failure now in a live six-DOF flight', () => {
    expect(editWindow('faults', flight())).toEqual({ when: 'now' });
  });

  it('takes no failure in a point-mass flight', () => {
    expect(editWindow('faults', flight({ sixDof: false }))).toEqual({ when: 'locked', reason: 'notSixDof' });
  });

  it('takes no failure while the cursor is scrubbed back into the recording', () => {
    expect(editWindow('faults', flight({ live: false }))).toEqual({ when: 'locked', reason: 'notLive' });
  });

  it('takes no failure once the flight has failed', () => {
    expect(editWindow('faults', flight({ failed: true }))).toEqual({ when: 'locked', reason: 'finished' });
  });

  it('locks everything once the flight is over', () => {
    for (const field of EDIT_FIELDS) expect(editWindow(field, flight({ stage: 'analysis' }))).toEqual({ when: 'locked', reason: 'finished' });
  });

  it('previews every change while setting up, for the next launch', () => {
    for (const field of EDIT_FIELDS) expect(editWindow(field, flight({ stage: 'setup' }))).toEqual({ when: 'next-launch' });
  });

  it('keeps gains, guidance and the rendezvous locked in flight in this step', () => {
    for (const field of ['control', 'guidance', 'explicit', 'rendezvous'] as const) {
      expect(editWindow(field, flight())).toEqual({ when: 'locked', reason: 'pastWindow' });
    }
    expect(EDIT_FIELDS.filter((f) => editWindow(f, flight()).when === 'now')).toEqual(['faults']);
  });
});
