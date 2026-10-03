/** Bounded binary backups; JSON workspace archives explicitly omit this separately owned media. */
import { profileMedia, mediaTransaction, trackKey, type ProfileTrack } from './media';
import { WorkspaceError, type WorkspaceBinding } from './repository';
export const MEDIA_MAX_BYTES = 128_000_000;
const MAX_HEADER = 100_000;
const MAGIC = new TextEncoder().encode('ORBITLAB-MEDIA-1\n');
interface TrackManifest { missionId: string; name: string; t0: number; type: string; bytes: number }
export interface MediaArchivePreview { profileId: string; profileName: string; tracks: TrackManifest[]; totalBytes: number }
function object(v: unknown): v is Record<string, unknown> { return !!v && typeof v === 'object' && !Array.isArray(v); }
async function readHeader(blob: Blob): Promise<{ preview: MediaArchivePreview; start: number }> {
  if (blob.size > MEDIA_MAX_BYTES) throw new WorkspaceError('oversize');
  const prefix = new Uint8Array(await blob.slice(0, MAGIC.length + 4).arrayBuffer());
  if (prefix.length !== MAGIC.length + 4 || MAGIC.some((v, i) => prefix[i] !== v)) throw new WorkspaceError('invalid');
  const length = new DataView(prefix.buffer).getUint32(MAGIC.length, true), start = MAGIC.length + 4 + length;
  if (length > MAX_HEADER || start > blob.size) throw new WorkspaceError('invalid');
  let header: unknown;
  try { header = JSON.parse(await blob.slice(MAGIC.length + 4, start).text()); } catch { throw new WorkspaceError('invalid'); }
  if (!object(header) || header.version !== 1 || typeof header.profileId !== 'string' || header.profileId.length > 80
    || typeof header.profileName !== 'string' || header.profileName.length > 100 || !Array.isArray(header.tracks) || header.tracks.length > 100
    || header.tracks.some((t: unknown) => !object(t) || typeof t.missionId !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(t.missionId)
      || typeof t.name !== 'string' || t.name.length > 500 || typeof t.type !== 'string' || t.type.length > 100
      || typeof t.t0 !== 'number' || !Number.isFinite(t.t0) || !Number.isSafeInteger(t.bytes) || (t.bytes as number) < 0)) throw new WorkspaceError('invalid');
  const tracks = header.tracks as TrackManifest[];
  if (new Set(tracks.map((t) => t.missionId)).size !== tracks.length || tracks.reduce((n, t) => n + t.bytes, start) !== blob.size) throw new WorkspaceError('invalid');
  return { start, preview: { profileId: header.profileId, profileName: header.profileName, tracks, totalBytes: blob.size } };
}
export async function previewMediaArchive(blob: Blob): Promise<MediaArchivePreview> { return (await readHeader(blob)).preview; }
export async function exportProfileMediaArchive(profileId: string, profileName: string): Promise<Blob> {
  const tracks = await profileMedia(profileId);
  const header = new TextEncoder().encode(JSON.stringify({ version: 1, profileId, profileName,
    tracks: tracks.map((t) => ({ missionId: t.missionId, name: t.name, t0: t.t0, type: t.blob.type, bytes: t.blob.size })) }));
  const size = tracks.reduce((n, t) => n + t.blob.size, MAGIC.length + 4 + header.length);
  if (size > MEDIA_MAX_BYTES || header.length > MAX_HEADER) throw new WorkspaceError('oversize');
  const length = new Uint8Array(4); new DataView(length.buffer).setUint32(0, header.length, true);
  const blob = new Blob([MAGIC, length, header, ...tracks.map((t) => t.blob)], { type: 'application/octet-stream' });
  await readHeader(blob); return blob;
}
/** Keep Existing is the default. Explicit target binding determines owner; archive IDs never reassign ownership. */
export async function importProfileMediaArchive(blob: Blob, binding: WorkspaceBinding, mode: 'keep' | 'replace' = 'keep'): Promise<number> {
  if (!binding.durable) throw new WorkspaceError('locked');
  const token = binding.token(), { preview, start } = await readHeader(blob);
  token.assert();
  let offset = start;
  const tracks: ProfileTrack[] = preview.tracks.map((t) => {
    const part = blob.slice(offset, offset + t.bytes, t.type); offset += t.bytes;
    return { id: trackKey(token.profileId, t.missionId), profileId: token.profileId, missionId: t.missionId, blob: part, name: t.name, t0: t.t0 };
  });
  let imported = 0;
  // All reads/writes queued inside the same transaction; commit/abort applies to the entire selected media set.
  await mediaTransaction('readwrite', (store) => {
    token.assert();
    for (const track of tracks) {
      const found = store.get(track.id);
      found.onsuccess = () => { if (mode === 'replace' || found.result === undefined) { store.put(track); imported++; } };
    }
    return store.count();
  });
  token.assert(); return imported;
}
