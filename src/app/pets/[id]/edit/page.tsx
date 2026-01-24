'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';

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

  async function uploadToBucket(kind: 'avatars'|'covers', file: File) {
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
    if (!name.trim()) return alert('Please enter a name');

    try {
      setSaving(true);

      // compute new URLs (undefined = untouched; null = remove)
      let avatar_url: string | null | undefined = undefined;
      let cover_url: string | null | undefined = undefined;

      if (removeAvatar) avatar_url = null;
      if (removeCover)  cover_url = null;

      if (avatarFile) avatar_url = await uploadToBucket('avatars', avatarFile);
      if (coverFile)  cover_url  = await uploadToBucket('covers',   coverFile);

      // update row
      const update: Record<string, any> = { name: name.trim() };
      if (avatar_url !== undefined) update.avatar_url = avatar_url;
      if (cover_url  !== undefined) update.cover_url  = cover_url;

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
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? 'Failed to save changes.');
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-[100dvh] bg-white">
        <div className="mx-auto max-w-[900px] px-4 py-10">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-40 rounded bg-slate-200" />
            <div className="h-56 rounded-2xl bg-slate-200" />
          </div>
        </div>
      </main>
    );
  }

  if (!pet) {
    return (
      <main className="min-h-[100dvh] bg-white">
        <div className="mx-auto max-w-[900px] px-4 py-10">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800">{err || 'Not found'}</div>
          <div className="mt-4"><Link href="/" className="text-[#0e2a36] underline">Go home</Link></div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] w-full bg-slate-800">
      <div className="mx-auto max-w-[900px] px-4 py-8 ">
        <section className=" rounded-[26px] border border-[#ffe2cf] mt-20 mb-20 bg-[#FF8A65] p-6 sm:p-8 text-white shadow-[0_10px_35px_rgba(0,0,0,0.15)]">
          <header className="mb-6 flex items-center justify-between">
            <h1 className="text-3xl font-extrabold tracking-tight drop-shadow-sm">Edit {pet.name}</h1>
            <Link href={`/pets/${pet.id}`} className="rounded-full bg-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/25">Back</Link>
          </header>

          <motion.form
            onSubmit={handleSave}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl border border-[#f2f5f7] bg-white p-6 text-[#0d1b22] shadow-[0_4px_18px_rgba(0,0,0,.06)]"
          >
            {/* Cover picker */}
            <div className="mb-6">
              <p className="mb-2 text-sm font-semibold text-[#0d1b22]">Cover photo</p>
              <div className="flex items-center gap-4">
                <div className="relative h-28 w-48 overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200">
                  {coverPreview ? (
                    <Image src={coverPreview} alt="Cover preview" fill sizes="192px" className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">No cover</div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => coverRef.current?.click()}
                    className="rounded-full bg-[#0e2a36] px-4 py-2 text-sm font-semibold text-white shadow hover:opacity-95"
                  >
                    {coverPreview ? 'Change cover' : 'Upload cover'}
                  </button>
                  {coverPreview && (
                    <button
                      type="button"
                      onClick={() => { setRemoveCover(true); setCoverFile(null); setCoverPreview(null); }}
                      className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                    >
                      Remove cover
                    </button>
                  )}
                  <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={onCover} />
                </div>
              </div>
            </div>

            {/* Avatar picker */}
            <div className="mb-6">
              <p className="mb-2 text-sm font-semibold text-[#0d1b22]">Profile photo (avatar)</p>
              <div className="flex items-center gap-4">
                <div className="relative h-28 w-28 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
                  {avatarPreview ? (
                    <Image src={avatarPreview} alt="Avatar preview" fill sizes="112px" className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">No photo</div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => avatarRef.current?.click()}
                    className="rounded-full bg-[#0e2a36] px-4 py-2 text-sm font-semibold text-white shadow hover:opacity-95"
                  >
                    {avatarPreview ? 'Change photo' : 'Upload photo'}
                  </button>
                  {avatarPreview && (
                    <button
                      type="button"
                      onClick={() => { setRemoveAvatar(true); setAvatarFile(null); setAvatarPreview(null); }}
                      className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                    >
                      Remove photo
                    </button>
                  )}
                  <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={onAvatar} />
                </div>
              </div>
            </div>

            {/* Name field */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-[#0d1b22]">Pet name *</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-[#e8edf0] px-3 py-2 outline-none"
                  placeholder="eg. Bruno"
                />
              </label>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                disabled={saving || !name.trim()}
                className="rounded-full bg-[#0e2a36] px-6 py-2 text-white font-semibold shadow hover:opacity-95 disabled:opacity-50"
                type="submit"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              <Link
                href={`/pets/${pet.id}`}
                className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold hover:bg-slate-50"
              >
                Cancel
              </Link>
            </div>
          </motion.form>
        </section>
      </div>
    </main>
  );
}
