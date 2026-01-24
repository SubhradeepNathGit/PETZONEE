'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Trash2 } from "lucide-react";

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
  const [msg, setMsg] = useState<string>('');

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

  const ageLabel = useMemo(() => (pet?.dob ? humanAge(pet.dob) : '—'), [pet?.dob]);

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
      alert(errorMessage);
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
      setMsg('Photo deleted');
      // fix lightbox index if needed
      setLightboxIdx(i => Math.min(Math.max(0, i - (i >= gallery.length - 1 ? 1 : 0)), Math.max(0, gallery.length - 2)));
      if (gallery.length - 1 <= 0) setLightboxOpen(false);
    } catch (e: unknown) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : 'Failed to delete photo';
      alert(errorMessage);
    } finally {
      setDeletingPhotoId(null);
    }
  }
  // ----------------------------------------------------

  const coverSrc  = pet?.cover_url  || pet?.photo_url || '';
  const avatarSrc = pet?.avatar_url || '/images/avatar-placeholder.png';
  const iOwnIt = !!(meId && pet && meId === pet.owner_id);

  if (loading) {
    return (
      <main className="min-h-[100dvh] bg-white">
        <div className="mx-auto max-w-[960px] px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-56 rounded-3xl bg-slate-200" />
            <div className="h-6 w-64 rounded bg-slate-200" />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="h-24 rounded-xl bg-slate-100" />
              <div className="h-24 rounded-xl bg-slate-100" />
              <div className="h-24 rounded-xl bg-slate-100" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!pet) {
    return (
      <main className="min-h-[100dvh] bg-white">
        <div className="mx-auto max-w-[960px] px-4 py-12">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
            {err || 'Pet not found'}
          </div>
          <div className="mt-4">
            <Link href="/" className="text-[#0e2a36] underline">Go back</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] w-full bg-[#f5f5dc]">
     {/*  Top Banner with Breadcrumb */}
      <div className="relative w-full h-48 sm:h-64 md:h-72 lg:h-80 mb-8">
        <Image
          src="/images/statbg13.jpg" // put your banner in /public
          alt="Products Banner"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/40 flex flex-col justify-center items-center text-center">
          <h1 className="text-3xl md:text-5xl font-bold text-white">
            Pet Profile
          </h1>
          <p className="text-sm md:text-base text-gray-200 mt-2">
            Home / Profile / Pet Profile
          </p>
        </div>
      </div>
 
      
      <div className="mx-auto max-w-[1000px] px-4 py-8">
        
        {/* Cover / hero - Increased height */}
        <div className="relative overflow-hidden rounded-[28px] border border-[#ffe2cf] bg-[#FF8A65] p-6  shadow-[0_10px_35px_rgba(0,0,0,0.15)] ">
          <div className="relative h-72 w-full overflow-hidden rounded-[24px] bg-white  ">
            {coverSrc ? (
              <Image
                src={coverSrc}
                alt={`${pet.name} cover`}
                fill
                sizes="(max-width: 768px) 100vw, 1000px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-white/80 bg-[#0e2a36]">
                No cover photo
              </div>
            )}
          </div>

          {/* Avatar */}
          <div className="absolute bottom-4 left-6 z-10 h-28 w-28 overflow-hidden rounded-full ring-4 ring-white shadow-lg">
            <Image
              src={avatarSrc}
              alt={`${pet.name} avatar`}
              fill
              className="object-cover"
              sizes="112px"
            />
          </div>

          {/* Header strip */}
          <div className="mt-10 flex flex-col gap-3 p-4 text-white sm:mt-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="sm:ml-32">
              <h1 className="text-3xl font-extrabold tracking-tight drop-shadow-sm">{pet.name}</h1>
              <p className="text-white/85 text-sm">
                {(pet.species || 'Pet')}{pet.breed ? ` • ${pet.breed}` : ''} {pet.dob ? `• DOB: ${new Date(pet.dob).toLocaleDateString()}` : ''}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
             
              <Link
                href={`/pets/${pet.id}/edit`}
               className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-md backdrop-blur-md transition hover:bg-white/20 hover:border-white/30"

              >
                Edit
              </Link>
              <button
  onClick={handleDeletePet}
  disabled={!iOwnIt || deleting}
  className="rounded-full border border-rose-500/30 bg-white/20 p-2 text-red-500 shadow-md backdrop-blur-md transition hover:bg-white/20 hover:border-white/30"
>
  {deleting ? (
    <span className="text-xs">…</span>
  ) : (
    <Trash2 className="w-5 h-5 text-rose-400" />
  )}
</button>
            </div>
          </div>
        </div>

       {/* Stats */}
<section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
  <div className="rounded-2xl border border-white/20 bg-transparent backdrop-blur-md p-6 text-center shadow-md hover:bg-white/50 transition">
    <h4 className="text-lg font-bold text-[#FF6B40]/70">Age</h4>
    <p className="mt-2 text-xl font-bold text-black/70">{ageLabel}</p>
  </div>

  <div className="rounded-2xl border border-white/20 bg-transparent backdrop-blur-md p-6 text-center shadow-md hover:bg-white/50 transition">
    <h4 className="text-sm font-medium text-[#FF6B40]/70">Weight</h4>
    <p className="mt-2 text-xl font-bold text-black/70">
      {pet.weight_kg ? `${pet.weight_kg} kg` : "—"}
    </p>
  </div>

  <div className="rounded-2xl border border-white/20 bg-transparent backdrop-blur-md p-6 text-center shadow-md hover:bg-white/50 transition">
    <h4 className="text-sm font-medium text-[#FF6B40]/70">Joined</h4>
    <p className="mt-2 text-xl font-bold text-black/70">
      {new Date(pet.created_at).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })}
    </p>
  </div>
</section>


{/* About Section */}
<motion.section
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4, delay: 0.1 }}
  className="mt-10 overflow-hidden rounded-3xl bg-orange-100 "
>
 {/* Header */}
<div className="px-8 py-6 bg-[#FF8A65]">
  <h2 className="text-2xl font-bold text-white">
    Meet {pet.name || "Pet"}
  </h2>
  <p className="text-sm text-white mt-1 flex items-center gap-2">
    <span className='font-medium'>Joined Poshik on</span>
    <span className="font-medium text-white">
      {new Date(pet.created_at).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })}
    </span>
  </p>
</div>


  {/* Content */}
  <div className="p-8 space-y-8">
    {/* Basic Info + Physical Stats */}
    <div className="grid gap-8 md:grid-cols-2">
      {/* Basic Info */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-orange-400">
          Basic Information
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-gray-600">
            <span className="font-medium">Species :</span>
            <span className=" font-medium text-gray-600">{pet.species || "Not specified"}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span className="font-medium">Breed :</span>
            <span className="font-medium text-gray-600">{pet.breed || "Mixed/Unknown"}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span className="font-medium">Age :</span>
            <span className="font-medium text-gray-600">{ageLabel}</span>
          </div>
        </div>
      </div>

      {/* Physical Stats */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-orange-400">
          Physical Stats
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-gray-600">
            <span className="font-medium">Weight :</span>
            <span className="font-medium text-gray-600">
              {pet.weight_kg ? `${pet.weight_kg} kg` : "Not recorded"}
            </span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span className="font-medium">Born: </span>
            <span className="font-medium text-gray-600">
              {pet.dob
                ? new Date(pet.dob).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "Unknown"}
            </span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span className="font-medium">Owner: </span>
            <span className=" font-medium text-gray-600">
              {meId === pet.owner_id ? "You" : "Shared access"}
            </span>
          </div>
        </div>
      </div>
    </div>

    {/* Biography */}
    {pet.notes && (
      <>
        <hr className="border-t border-gray-700/40" />
        <div>
          <h3 className="mb-4 text-lg font-semibold text-orange-400">
            Bio
          </h3>
          <p className="leading-relaxed text-md font-semibold text-gray-500">{pet.notes}</p>
        </div>
      </>
    )}

    {/* Timeline */}
    <hr className="border-t border-gray-700/40" />
    <div>
      <h3 className="mb-4 text-lg font-semibold text-orange-400">Timeline</h3>
      <div className="flex flex-wrap gap-3 text-sm text-gray-100">
        {/* Added */}
        <div className="flex items-center gap-2 rounded-full bg-orange-300/20 px-4 py-2  border border-orange-300">
          <span className="font-medium text-orange-400">Added:</span>
          <span className=" font-medium text-gray-500">
            {new Date(pet.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>

        {/* Birthday */}
        {pet.dob && (
          <div className="flex items-center gap-2 rounded-full bg-[#FF8A65] px-4 py-2  border border-orange-300">
            <span className="font-medium text-white">Birthday:</span>
            <span className='font-medium'>
              {new Date(pet.dob).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        )}

        {/* Photos */}
        <div className="flex items-center gap-2 rounded-full bg-black/40 px-4 py-2 shadow-sm border border-black/30">
          <span className="font-medium">Photos:</span>
          <span className='font-medium'>{gallery.length} uploaded</span>
        </div>
      </div>
    </div>
  </div>
</motion.section>





        {/* ===== Gallery ===== */}
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#0d1b22]">Photos</h2>
            {meId === pet.owner_id && (
              <UploadPetPhoto
                petId={pet.id}
                petName={pet.name}
                ownerId={pet.owner_id}
                actorId={meId!}
                setMsg={setMsg}
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
                <div key={i} className="h-28 sm:h-32 rounded-lg bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : gallery.length === 0 ? (
            <div className="rounded-xl border border-[#eef2f4] bg-white p-6 text-sm text-[#5a6b73]">
              No photos yet. Add some snapshots for {pet.name}!
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
                        {deletingPhotoId === g.id ? '…' : 'Delete'}
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
                            {deletingPhotoId === gallery[lightboxIdx].id ? 'Deleting…' : 'Delete'}
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
                          ‹
                        </button>
                      </div>
                      <div className="absolute inset-y-0 right-0 flex items-center">
                        <button
                          onClick={() => setLightboxIdx((i) => (i + 1) % gallery.length)}
                          className="m-2 rounded-full bg-white/15 px-3 py-2 text-white hover:bg-white/25"
                          aria-label="Next"
                        >
                          ›
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </section>

        {msg && <p className="mt-3 text-sm text-emerald-700">{msg}</p>}

        {/* Quick links */}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/pets/new" className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold hover:bg-slate-50">
            Add another pet
          </Link>
          
          <Link href="/dashboard" className="rounded-full bg-[#FF8A65] px-5 py-2 text-sm font-semibold text-white hover:opacity-95">
            Back to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}

/* -------- Gallery uploader -------- */

function UploadPetPhoto({
  petId, petName, ownerId, actorId, onUploaded, setMsg,
}: {
  petId: string;
  petName: string;
  ownerId: string;
  actorId: string;
  onUploaded: (url: string) => void;
  setMsg: (s: string) => void;
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

      setMsg('Photo uploaded!');
      onUploaded(url);
    } catch (err: unknown) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setMsg(errorMessage);
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
        className={`rounded-full px-4 py-2 text-sm font-semibold shadow cursor-pointer ${
          busy ? 'bg-slate-300 text-slate-600' : 'bg-[#FF8A65] text-white hover:opacity-90'
        }`}
      >
        {busy ? 'Uploading…' : 'Add photo'}
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