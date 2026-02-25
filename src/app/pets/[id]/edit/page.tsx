'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';

type Pet = {
  id: string;
  owner_id: string;
  name: string;
  photo_url: string | null;   // legacy fallback
  avatar_url: string | null;
  cover_url: string | null;
};

export default function EditPetPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [meId, setMeId] = useState<string | null>(null);
  const [pet, setPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  // form state
  const [name, setName] = useState('');

  // avatar
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const avatarRef = useRef<HTMLInputElement | null>(null);

  // cover
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [removeCover, setRemoveCover] = useState(false);
  const coverRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/signup'); return; }
      setMeId(user.id);

      const { data, error } = await supabase
        .from('pets')
        .select('id, owner_id, name, photo_url, avatar_url, cover_url')
        .eq('id', id)
        .maybeSingle();

      if (error) { setErr(error.message); setLoading(false); return; }
      if (!data) { setErr('Pet not found'); setLoading(false); return; }
      if (data.owner_id !== user.id) { setErr('You do not own this pet.'); setLoading(false); return; }

      setPet(data as Pet);
      setName(data.name);
      setAvatarPreview(data.avatar_url ?? data.photo_url);
      setCoverPreview(data.cover_url ?? data.photo_url);
      setLoading(false);
    })();
  }, [id, router]);

  function onAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setAvatarFile(f);
    setRemoveAvatar(false);
    setAvatarPreview(f ? URL.createObjectURL(f) : (pet?.avatar_url ?? pet?.photo_url ?? null));
  }
  function onCover(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setCoverFile(f);
    setRemoveCover(false);
    setCoverPreview(f ? URL.createObjectURL(f) : (pet?.cover_url ?? pet?.photo_url ?? null));
  }

  async function uploadToBucket(kind: 'avatars' | 'covers', file: File) {
    const ext = file.name.split('.').pop() || 'jpg';
    const key = `${kind}/${id}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase
      .storage.from('pet-media')
      .upload(key, file, { upsert: false, contentType: file.type });
    if (upErr) throw upErr;
    const { data: pub } = supabase.storage.from('pet-media').getPublicUrl(key);
    if (!pub?.publicUrl) throw new Error('Failed to get public URL');
    return pub.publicUrl as string;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!pet || !meId) return;
    if (!name.trim()) { toast.warning('Please enter a name'); return; }

    try {
      setSaving(true);

      // compute new URLs (undefined = untouched; null = remove)
      let avatar_url: string | null | undefined = undefined;
      let cover_url: string | null | undefined = undefined;

      if (removeAvatar) avatar_url = null;
      if (removeCover) cover_url = null;

      if (avatarFile) avatar_url = await uploadToBucket('avatars', avatarFile);
      if (coverFile) cover_url = await uploadToBucket('covers', coverFile);

      // update row
      const update: Record<string, unknown> = { name: name.trim() };
      if (avatar_url !== undefined) update.avatar_url = avatar_url;
      if (cover_url !== undefined) update.cover_url = cover_url;

      const { error } = await supabase.from('pets').update(update).eq('id', pet.id);
      if (error) throw error;

      // log activities (best-effort)
      try {
        if (avatar_url !== undefined) {
          await supabase.from('activities').insert({
            actor_id: meId,
            verb: 'pet.avatar_updated',
            subject_type: 'pet',
            subject_id: pet.id,
            summary: `Updated profile photo for ${name.trim()}`,
            diff: { field: 'avatar_url', old: pet.avatar_url, new: avatar_url },
            photo_url: avatar_url,
            visibility: 'owner_only',
            owner_id: pet.owner_id,
          });
        }
        if (cover_url !== undefined) {
          await supabase.from('activities').insert({
            actor_id: meId,
            verb: 'pet.cover_updated',
            subject_type: 'pet',
            subject_id: pet.id,
            summary: `Updated cover photo for ${name.trim()}`,
            diff: { field: 'cover_url', old: pet.cover_url, new: cover_url },
            photo_url: cover_url,
            visibility: 'owner_only',
            owner_id: pet.owner_id,
          });
        }
      } catch (e) {
        // ignore feed logging errors
        console.warn('activity insert failed', e);
      }

      router.replace(`/pets/${pet.id}`);
    } catch (e: unknown) {
      console.error(e);
      toast.error((e as Error)?.message ?? 'Failed to save changes.');
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-[100dvh] bg-[#0a0a0f]">
        <div className="mx-auto max-w-[900px] px-4 py-10">
          <div className="animate-pulse space-y-4">
            <div className="h-7 w-44 rounded-full bg-white/5" />
            <div className="h-56 rounded-2xl bg-white/5" />
          </div>
        </div>
      </main>
    );
  }

  if (!pet) {
    return (
      <main className="min-h-[100dvh] bg-[#0a0a0f]">
        <div className="mx-auto max-w-[900px] px-4 py-10">
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-6 text-rose-300">{err || 'Not found'}</div>
          <div className="mt-4"><Link href="/" className="text-[#FF8A65] hover:underline text-sm">← Go home</Link></div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] w-full bg-[#0a0a0f]">
      <div className="mx-auto max-w-[860px] px-4 pt-10 pb-20">

        {/* Page heading */}
        <div className="mb-8">
          <Link
            href={`/pets/${pet.id}`}
            className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors mb-4"
          >
            ← Back to {pet.name}’s profile
          </Link>
          <h1 className="text-3xl font-black text-white tracking-tight">Edit {pet.name}</h1>
          <p className="mt-1 text-sm text-white/30">Update photos and name for this pet profile.</p>
        </div>

        <motion.form
          onSubmit={handleSave}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="rounded-3xl border border-white/[0.07] bg-white/[0.04] backdrop-blur-xl p-6 sm:p-8 shadow-[0_8px_40px_rgba(0,0,0,0.4)] space-y-8"
        >
          {/* Cover picker */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">Cover photo</p>
            <div className="flex flex-col sm:flex-row items-start gap-5">
              <div className="relative h-32 w-56 overflow-hidden rounded-2xl border border-white/10 bg-white/5 flex-shrink-0">
                {coverPreview ? (
                  <Image src={coverPreview} alt="Cover preview" fill sizes="224px" className="object-cover" />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-white/20">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs">No cover</span>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => coverRef.current?.click()}
                  className="rounded-full bg-gradient-to-r from-[#FF8A65] to-[#FF7043] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 hover:brightness-110 transition-all"
                >
                  {coverPreview ? 'Change cover' : 'Upload cover'}
                </button>
                {coverPreview && (
                  <button
                    type="button"
                    onClick={() => { setRemoveCover(true); setCoverFile(null); setCoverPreview(null); }}
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/60 hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/30 transition-all"
                  >
                    Remove cover
                  </button>
                )}
                <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={onCover} />
              </div>
            </div>
          </div>

          <div className="h-px bg-white/[0.06]" />

          {/* Avatar picker */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">Profile photo (avatar)</p>
            <div className="flex flex-col sm:flex-row items-start gap-5">
              <div className="relative h-28 w-28 overflow-hidden rounded-full border border-white/10 bg-white/5 ring-2 ring-[#FF8A65]/30 flex-shrink-0">
                {avatarPreview ? (
                  <Image src={avatarPreview} alt="Avatar preview" fill sizes="112px" className="object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-white/20">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => avatarRef.current?.click()}
                  className="rounded-full bg-gradient-to-r from-[#FF8A65] to-[#FF7043] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 hover:brightness-110 transition-all"
                >
                  {avatarPreview ? 'Change photo' : 'Upload photo'}
                </button>
                {avatarPreview && (
                  <button
                    type="button"
                    onClick={() => { setRemoveAvatar(true); setAvatarFile(null); setAvatarPreview(null); }}
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/60 hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/30 transition-all"
                  >
                    Remove photo
                  </button>
                )}
                <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={onAvatar} />
              </div>
            </div>
          </div>

          <div className="h-px bg-white/[0.06]" />

          {/* Name field */}
          <div>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/40">Pet name *</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="input"
                placeholder="eg. Bruno"
              />
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              disabled={saving || !name.trim()}
              className="rounded-full bg-gradient-to-r from-[#FF8A65] to-[#FF7043] px-7 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-500/20 hover:brightness-110 disabled:opacity-40 transition-all"
              type="submit"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <Link
              href={`/pets/${pet.id}`}
              className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/60 hover:bg-white/10 hover:text-white transition-all"
            >
              Cancel
            </Link>
          </div>
        </motion.form>
      </div>
    </main>
  );
}
