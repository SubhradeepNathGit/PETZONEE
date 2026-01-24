
import { supabase } from '@/lib/supabase';

export function isDirectUrl(raw?: string | null): boolean {
  if (!raw) return false;
  const s = raw.trim();
  return s.startsWith('http://') || s.startsWith('https://') || s.startsWith('/') || s.startsWith('data:') || s.startsWith('blob:');
}

function splitBucketPath(path: string): { bucket: string; objectPath: string } | null {
  const clean = path.replace(/^\/+/, '');
  const firstSlash = clean.indexOf('/');
  if (firstSlash <= 0) return null;
  const bucket = clean.slice(0, firstSlash);
  const objectPath = clean.slice(firstSlash + 1);
  if (!bucket || !objectPath) return null;
  return { bucket, objectPath };
}

export async function resolveStoragePathToUrl(rawPath: string): Promise<string | null> {
  const path = rawPath.replace(/^\/+/, '');
  if (isDirectUrl(path)) return path;

  const knownBuckets = ['pets', 'pet-photos', 'pet_images', 'avatars', 'public', 'images'];
  const candidates: Array<{ bucket: string; objectPath: string }> = [];
  const split = splitBucketPath(path);

  if (split) {
    candidates.push({ bucket: split.bucket, objectPath: split.objectPath });
    for (const b of knownBuckets) candidates.push({ bucket: b, objectPath: path });
  } else {
    for (const b of knownBuckets) candidates.push({ bucket: b, objectPath: path });
  }

  for (const cand of candidates) {
    try {
      const signed = await supabase.storage.from(cand.bucket).createSignedUrl(cand.objectPath, 60 * 60 * 24 * 7);
      if (signed?.data?.signedUrl) return signed.data.signedUrl;
    } catch {}
    try {
      const pub = supabase.storage.from(cand.bucket).getPublicUrl(cand.objectPath);
      if (pub?.data?.publicUrl) return pub.data.publicUrl;
    } catch {}
  }
  return null;
}

export async function resolvePetPhotoUrl(raw?: string | null): Promise<string | null> {
  if (!raw) return null;
  if (isDirectUrl(raw)) return raw.trim();
  return await resolveStoragePathToUrl(raw);
}
