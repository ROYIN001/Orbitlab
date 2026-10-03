/** A page may report ordinary save failure without throwing. A profile
 * transition must stop until that same in-memory learning state is saved. */
export function lessonTransitionFlush(lastSave: () => boolean | null, save: () => boolean, failureMessage: () => string): () => void {
  return () => {
    // null is an untouched view, including a fallback for unsupported data.
    // All ordinary learning mutations save immediately; only a failed save
    // leaves changed in-memory progress that must be retried before switching.
    if (lastSave() === false && !save()) throw new Error(failureMessage());
  };
}
