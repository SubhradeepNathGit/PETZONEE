'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Trash2, PawPrint, Calendar, Cake, Image as LucideImage, Plus } from "lucide-react";
import { toast } from 'react-toastify';

type PetRow = {
  id: string;
  owner_id: string;
  name: string;
  species: string | null;
  breed: string | null;
  dob: string | null;
  weight_kg: number | null;
  notes: string | null;
  photo_url: string | null;               // legacy
  created_at: string;
  cover_url?: string | null;
  avatar_url?: string | null;
};

type PetMediaRow = {
  id: string;
  pet_id: string;
  url: string;
  created_at: string;
};

export default function PetProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [meId, setMeId] = useState<string | null>(null);
  const [pet, setPet] = useState<PetRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState<string>('');

  const [gallery, setGallery] = useState<PetMediaRow[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(true);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);

  // per-photo delete spinner
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/signup'); return; }
      setMeId(user.id);

      setErr(''); setLoading(true);

      const base =
        'id, owner_id, name, species, breed, dob, weight_kg, notes, photo_url, created_at';

      let petRow: PetRow | null = null;

      const withExtras = await supabase
        .from('pets')
        .select(`${base}, cover_url, avatar_url`)
        .eq('id', params.id)
        .maybeSingle();

      if (withExtras.error && withExtras.error.code !== '42703') {
        setErr(withExtras.error.message);
        setLoading(false);
        return;
      }
      petRow = (withExtras.data as PetRow) || null;
      if (!petRow) {
        const legacy = await supabase
          .from('pets')
          .select(base)
          .eq('id', params.id)
          .maybeSingle();
        if (legacy.error) { setErr(legacy.error.message); setLoading(false); return; }
        petRow = legacy.data as PetRow | null;
      }

      if (!petRow) { setErr('Pet not found'); setLoading(false); return; }
      setPet(petRow);
      setLoading(false);

      setGalleryLoading(true);
      const g = await supabase
        .from('pet_media')
        .select('id, pet_id, url, created_at')
        .eq('pet_id', petRow.id)
        .order('created_at', { ascending: false });

      if (g.error) console.error('gallery load error:', g.error);
      setGallery((g.data ?? []) as PetMediaRow[]);
      setGalleryLoading(false);
    })();
  }, [params.id, router]);

  const ageLabel = useMemo(() => (pet?.dob ? humanAge(pet.dob) : '-'), [pet?.dob]);

  async function handleDeletePet() {
    if (!pet) return;
    if (!confirm(`Delete ${pet.name}? This cannot be undone.`)) return;
    try {
      setDeleting(true);
      const { error } = await supabase.from('pets').delete().eq('id', pet.id);
      if (error) throw error;
      router.replace('/pets');
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to delete';
      toast.error(errorMessage);
      setDeleting(false);
    }
  }

  // ---- Delete a photo from gallery (DB + storage) ----
  function storagePathFromPublicUrl(url: string): string | null {
    try {
      const u = new URL(url);
      const marker = '/object/public/pet-media/';
      const i = u.pathname.indexOf(marker);
      if (i === -1) return null;
      return decodeURIComponent(u.pathname.slice(i + marker.length));
    } catch {
      return null;
    }
  }

  async function deletePhoto(row: PetMediaRow) {
    if (!pet || !meId) return;
    const ok = confirm('Delete this photo?');
    if (!ok) return;

    try {
      setDeletingPhotoId(row.id);

      // 1) remove from storage (best-effort)
      const path = storagePathFromPublicUrl(row.url);
      if (path) {
        const { error: rmErr } = await supabase.storage.from('pet-media').remove([path]);
        if (rmErr) console.warn('storage remove failed:', rmErr.message);
      }

      // 2) delete DB row
      const { error: dbErr } = await supabase.from('pet_media').delete().eq('id', row.id);
      if (dbErr) throw dbErr;

      // 3) if this photo was used as cover/avatar, clear those fields
      const reset: Record<string, null> = {};
      if (pet.cover_url === row.url) reset.cover_url = null;
      if (pet.avatar_url === row.url) reset.avatar_url = null;
      if (Object.keys(reset).length) {
        const { error: upErr } = await supabase.from('pets').update(reset).eq('id', pet.id);
        if (!upErr) setPet({ ...pet, ...reset });
      }

      // 4) log activity (best-effort)
      try {
        await supabase.from('activities').insert({
          actor_id: meId,
          verb: 'pet.media_deleted',
          subject_type: 'pet',
          subject_id: pet.id,
          summary: `Removed a photo from ${pet.name}`,
          diff: null,
          photo_url: row.url,
          visibility: 'owner_only',
          owner_id: pet.owner_id,
        });
      } catch (e) {
        console.warn('activity insert failed', e);
      }

      // 5) update UI
      setGallery(prev => prev.filter(p => p.id !== row.id));
      toast.success('Photo deleted');
      // fix lightbox index if needed
      setLightboxIdx(i => Math.min(Math.max(0, i - (i >= gallery.length - 1 ? 1 : 0)), Math.max(0, gallery.length - 2)));
      if (gallery.length - 1 <= 0) setLightboxOpen(false);
    } catch (e: unknown) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : 'Failed to delete photo';
      toast.error(errorMessage);
    } finally {
      setDeletingPhotoId(null);
    }
  }
  // ----------------------------------------------------

  const coverSrc = pet?.cover_url || pet?.photo_url || '';
  const avatarSrc = pet?.avatar_url || '/images/avatar-placeholder.png';
  const iOwnIt = !!(meId && pet && meId === pet.owner_id);

  if (loading) {
    return (
      <main className="min-h-[100dvh] bg-[#0a0a0f]">
        <div className="mx-auto max-w-[960px] px-4 py-10">
          <div className="animate-pulse space-y-5">
            <div className="h-64 rounded-3xl bg-white/5" />
            <div className="h-5 w-52 rounded-full bg-white/5" />
            <div className="grid grid-cols-3 gap-3">
              <div className="h-24 rounded-2xl bg-white/5" />
              <div className="h-24 rounded-2xl bg-white/5" />
              <div className="h-24 rounded-2xl bg-white/5" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!pet) {
    return (
      <main className="min-h-[100dvh] bg-[#0a0a0f]">
        <div className="mx-auto max-w-[960px] px-4 py-12">
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-6 text-rose-300">
            {err || 'Pet not found'}
          </div>
          <div className="mt-4">
            <Link href="/" className="text-[#FF8A65] hover:underline text-sm">← Go back</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] w-full bg-[#0a0a0f]">
      <div className="mx-auto max-w-[1000px] px-4 pt-8 pb-16">

        {/* Section: Hero Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-white/[0.04] shadow-[0_8px_40px_rgba(0,0,0,0.5)]"
        >
          {/* Cover photo */}
          <div className="relative h-64 sm:h-72 w-full overflow-hidden rounded-t-3xl bg-[#0e1520]">
            {coverSrc ? (
              <Image
                src={coverSrc}
                alt={`${pet.name} cover`}
                fill
                sizes="(max-width: 768px) 100vw, 1000px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-white/15">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-xs">No cover photo</span>
                </div>
              </div>
            )}
            {/* dark gradient overlay at bottom */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          </div>

          {/* Bottom info strip */}
          <div className="relative flex flex-col gap-4 px-6 pt-0 pb-6 sm:flex-row sm:items-end sm:justify-between">
            {/* Avatar - overlaps cover */}
            <div className="-mt-10 flex items-end gap-4">
              <div className="h-20 w-20 sm:h-24 sm:w-24 flex-shrink-0 overflow-hidden rounded-full ring-[3px] ring-[#FF8A65]/70 shadow-xl">
                <Image
                  src={avatarSrc}
                  alt={`${pet.name} avatar`}
                  width={96}
                  height={96}
                  className="object-cover w-full h-full"
                />
              </div>
              <div className="pb-1">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{pet.name}</h1>
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  {pet.species && (
                    <span className="rounded-full bg-[#FF8A65]/15 border border-[#FF8A65]/20 px-2.5 py-0.5 text-xs font-semibold text-[#FF8A65]">
                      {pet.species}
                    </span>
                  )}
                  {pet.breed && (
                    <span className="rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5 text-xs font-medium text-white/50">
                      {pet.breed}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-2 sm:pb-1">
              <Link
                href={`/pets/${pet.id}/edit`}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.07] px-4 py-2 text-sm font-semibold text-white/80 backdrop-blur hover:bg-white/[0.12] hover:text-white transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Edit
              </Link>
              <button
                onClick={handleDeletePet}
                disabled={!iOwnIt || deleting}
                className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-400 hover:bg-rose-500/20 transition-all disabled:opacity-40"
              >
                {deleting ? (
                  <span className="text-xs">.</span>
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                {deleting ? 'Deleting' : 'Delete'}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Section: Stat pills */}
        <section className="mt-4 grid grid-cols-3 gap-3">
          {[
            { label: 'Age', value: ageLabel },
            { label: 'Weight', value: pet.weight_kg ? `${pet.weight_kg} kg` : '-' },
            { label: 'Joined', value: new Date(pet.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-4 text-center hover:bg-white/[0.07] transition-colors">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#FF8A65]/70 mb-1">{s.label}</p>
              <p className="text-lg font-bold text-white">{s.value}</p>
            </div>
          ))}
        </section>


        {/* Section: About Section */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mt-5 overflow-hidden rounded-3xl border border-white/[0.06] bg-white/[0.04]"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-white/[0.06] flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-[#FF8A65]/15 flex items-center justify-center">
              <PawPrint className="text-[#FF8A65] w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Meet {pet.name || 'Pet'}</h2>
              <p className="text-xs text-white/30">
                Joined PETZONEE {new Date(pet.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Basic Info */}
              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#FF8A65]/70">Basic Information</h3>
                <div className="space-y-2">
                  {[
                    { label: 'Species', val: pet.species || 'Not specified' },
                    { label: 'Breed', val: pet.breed || 'Mixed / Unknown' },
                    { label: 'Age', val: ageLabel },
                  ].map((r) => (
                    <div key={r.label} className="flex items-center justify-between rounded-xl bg-white/[0.04] px-4 py-2.5">
                      <span className="text-xs font-medium text-white/40">{r.label}</span>
                      <span className="text-sm font-semibold text-white">{r.val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Physical Stats */}
              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#FF8A65]/70">Physical Stats</h3>
                <div className="space-y-2">
                  {[
                    { label: 'Weight', val: pet.weight_kg ? `${pet.weight_kg} kg` : 'Not recorded' },
                    { label: 'Born', val: pet.dob ? new Date(pet.dob).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown' },
                    { label: 'Owner', val: meId === pet.owner_id ? 'You' : 'Shared access' },
                  ].map((r) => (
                    <div key={r.label} className="flex items-center justify-between rounded-xl bg-white/[0.04] px-4 py-2.5">
                      <span className="text-xs font-medium text-white/40">{r.label}</span>
                      <span className="text-sm font-semibold text-white">{r.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bio */}
            {pet.notes && (
              <>
                <div className="h-px bg-white/[0.06]" />
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#FF8A65]/70">Bio</h3>
                  <p className="text-sm leading-relaxed text-white/60">{pet.notes}</p>
                </div>
              </>
            )}

            {/* Timeline chips */}
            <div className="h-px bg-white/[0.06]" />
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#FF8A65]/70">Timeline</h3>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/60">
                  <Calendar className="text-[#FF8A65] w-3.5 h-3.5" />
                  Added {new Date(pet.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                {pet.dob && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FF8A65]/20 bg-[#FF8A65]/10 px-3 py-1.5 text-xs font-medium text-[#FF8A65]">
                    <Cake className="w-3.5 h-3.5" />
                    Birthday {new Date(pet.dob).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/60">
                  <LucideImage className="w-3.5 h-3.5" />
                  {gallery.length} photo{gallery.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
        </motion.section>





        {/* Section: Gallery */}
        <section className="mt-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-white">Photos</h2>
            {meId === pet.owner_id && (
              <UploadPetPhoto
                petId={pet.id}
                petName={pet.name}
                ownerId={pet.owner_id}
                actorId={meId!}
                onUploaded={(url: string) => {
                  setGallery((prev) => [
                    { id: crypto.randomUUID(), pet_id: pet.id, url, created_at: new Date().toISOString() },
                    ...(prev ?? []),
                  ]);
                }}
              />
            )}
          </div>

          {galleryLoading ? (
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="h-28 sm:h-32 rounded-xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : gallery.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-8 text-center">
              <p className="text-sm text-white/30">No photos yet. Add some snapshots for {pet.name}!</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {gallery.map((g, idx) => (
                  <div
                    key={g.id}
                    className="group relative aspect-square overflow-hidden rounded-lg bg-slate-100"
                  >
                    <button
                      onClick={() => { setLightboxIdx(idx); setLightboxOpen(true); }}
                      title={`Open photo ${idx + 1}`}
                      className="absolute inset-0"
                    >
                      <Image
                        src={g.url}
                        alt={`${pet.name} photo ${idx + 1}`}
                        fill
                        className="object-cover transition group-hover:scale-105"
                        sizes="(max-width: 768px) 33vw, 320px"
                      />
                    </button>

                    {/* Delete overlay (owner only) */}
                    {meId === pet.owner_id && (
                      <button
                        onClick={(e) => { e.stopPropagation(); deletePhoto(g); }}
                        className="absolute right-1 top-1 rounded-full bg-black/55 px-2 py-1 text-[11px] font-semibold text-white opacity-0 transition group-hover:opacity-100"
                        title="Delete photo"
                      >
                        {deletingPhotoId === g.id ? '.' : 'Delete'}
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Lightbox */}
              <AnimatePresence>
                {lightboxOpen && (
                  <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  >
                    <motion.div
                      className="relative w-full max-w-4xl overflow-hidden rounded-2xl bg-black"
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 20, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                    >
                      <div className="relative h-[70vh] w-full">
                        <Image
                          src={gallery[lightboxIdx].url}
                          alt={`Photo ${lightboxIdx + 1}`}
                          fill
                          className="object-contain"
                          sizes="(max-width: 1024px) 100vw, 1024px"
                        />
                      </div>

                      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
                        {meId === pet.owner_id ? (
                          <button
                            onClick={() => deletePhoto(gallery[lightboxIdx])}
                            className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white hover:bg-white/25"
                          >
                            {deletingPhotoId === gallery[lightboxIdx].id ? 'Deleting.' : 'Delete'}
                          </button>
                        ) : <div />}

                        <div className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                          {lightboxIdx + 1} / {gallery.length}
                        </div>

                        <button
                          onClick={() => setLightboxOpen(false)}
                          className="rounded-full bg-white/20 px-3 py-1 text-white hover:bg-white/25"
                        >
                          Close
                        </button>
                      </div>

                      <div className="absolute inset-y-0 left-0 flex items-center">
                        <button
                          onClick={() => setLightboxIdx((i) => (i - 1 + gallery.length) % gallery.length)}
                          className="m-2 rounded-full bg-white/15 px-3 py-2 text-white hover:bg-white/25"
                          aria-label="Previous"
                        >
                          &lt;
                        </button>
                      </div>
                      <div className="absolute inset-y-0 right-0 flex items-center">
                        <button
                          onClick={() => setLightboxIdx((i) => (i + 1) % gallery.length)}
                          className="m-2 rounded-full bg-white/15 px-3 py-2 text-white hover:bg-white/25"
                          aria-label="Next"
                        >
                          &gt;
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </section>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/pets/new" className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-all">
            <Plus size={16} /> Add another pet
          </Link>
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#FF8A65] to-[#FF7043] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 hover:brightness-110 transition-all">
            ← Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}

/* -------- Gallery uploader -------- */

function UploadPetPhoto({
  petId, petName, ownerId, actorId, onUploaded,
}: {
  petId: string;
  petName: string;
  ownerId: string;
  actorId: string;
  onUploaded: (url: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const inputId = `gallery-input-${petId}`;

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    try {
      setBusy(true);
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `gallery/${petId}-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase
        .storage.from('pet-media')
        .upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from('pet-media').getPublicUrl(path);
      const url = pub?.publicUrl;
      if (!url) throw new Error('Failed to get public URL');

      const { error: insErr } = await supabase.from('pet_media').insert({ pet_id: petId, url });
      if (insErr) throw insErr;

      try {
        await supabase.from('activities').insert({
          actor_id: actorId,
          verb: 'pet.media_added',
          subject_type: 'pet',
          subject_id: petId,
          summary: `Added a photo to ${petName}`,
          diff: null,
          photo_url: url,
          visibility: 'owner_only',
          owner_id: ownerId,
        });
      } catch (e) {
        console.warn('activity insert failed', e);
      }

      toast.success('Photo uploaded!');
      onUploaded(url);
    } catch (err: unknown) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      toast.error(errorMessage);
    } finally {
      setBusy(false);
      if (input) input.value = '';
    }
  }

  return (
    <>
      <input
        id={inputId}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFile}
      />
      <label
        htmlFor={inputId}
        title="Add photo to gallery"
        className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold cursor-pointer transition-all ${busy
          ? 'bg-white/10 text-white/30'
          : 'bg-gradient-to-r from-[#FF8A65] to-[#FF7043] text-white shadow-lg shadow-orange-500/20 hover:brightness-110'
          }`}
      >
        {busy ? 'Uploading.' : <><Plus size={16} /> Add photo</>}
      </label>
    </>
  );
}

/* ---------- Enhanced components ---------- */

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-white/60 px-3 py-2 backdrop-blur-sm">
      <span className="text-sm font-medium text-[#5a6b73]">{label}</span>
      <span className="text-sm font-semibold text-[#0d1b22]">{value}</span>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#eef2f4] bg-white p-4 text-[#0d1b22] shadow-sm">
      <p className="text-xs text-[#5a6b73]">{title}</p>
      <p className="mt-1 text-2xl font-extrabold">{value}</p>
    </div>
  );
}

function humanAge(dobISO: string): string {
  const dob = new Date(dobISO);
  const now = new Date();
  let years = now.getFullYear() - dob.getFullYear();
  let months = now.getMonth() - dob.getMonth();
  let days = now.getDate() - dob.getDate();
  if (days < 0) { months -= 1; days += daysInMonth(new Date(now.getFullYear(), now.getMonth(), 0)); }
  if (months < 0) { years -= 1; months += 12; }
  if (years > 0) return `${years}y ${months}m`;
  if (months > 0) return `${months}m ${Math.max(days, 0)}d`;
  return `${Math.max(days, 0)}d`;
}

function daysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}