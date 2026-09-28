/**
 * Which lesson each flight was flown in (roadmap E03, for E05's worksheets):
 * a flight that leaves the pad while a flight lesson is open is that
 * lesson's for good. The Worksheets tab titles a flight's sheet — and seeds
 * its students' numbers — with the lesson the flight belongs to, or with
 * none, never with whatever lesson happens to be open when the sheet is made
 * (a case lesson opened afterwards, say, flies nothing of its own).
 *
 * DOM-free; the flights are held weakly, so a flight let go of is forgotten.
 */
export class FlightLessons<F extends object, L> {
  private readonly owner = new WeakMap<F, L>();

  /** The flight left the pad in this lesson: the first lesson to claim it keeps it. */
  claim(flight: F, lesson: L): void {
    if (!this.owner.has(flight)) this.owner.set(flight, lesson);
  }

  /** The lesson the flight was flown in, or null for a flight flown outside any. */
  lessonOf(flight: F | null | undefined): L | null {
    return flight ? this.owner.get(flight) ?? null : null;
  }
}
