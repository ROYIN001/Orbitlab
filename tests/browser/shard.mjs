/** Partition the already selected, sorted journeys; never silently run an empty shard. */
export function selectShard(journeys, shard = null) {
  if (shard === null) return journeys;
  const match = /^(\d+)\/(\d+)$/.exec(shard);
  if (!match) throw new Error('shard must be N/M, for example 1/2');
  const part = Number(match[1]), total = Number(match[2]);
  if (!Number.isSafeInteger(part) || !Number.isSafeInteger(total) || part < 1 || part > total) {
    throw new Error('shard requires 1 <= N <= M');
  }
  if (total > journeys.length) throw new Error('shard count exceeds selected journeys');
  return journeys.filter((_, index) => index % total === part - 1);
}
