'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';

type Species = 'Dog' | 'Cat' | 'Bird' | 'Rabbit' | 'Fish' | 'Reptile' | 'Other';

type PetDraft = {
  name: string;
  species: Species;
  breed: string;
  dob: string;        // yyyy-mm-dd
  weight: string;     // keep as string in UI
  notes: string;
  file: File | null;
  preview: string | null;
};

const EMPTY: PetDraft = {
  name: '',
  species: 'Dog',
  breed: '',
  dob: '',
  weight: '',
  notes: '',
  file: null,
  preview: null,
};

export default function NewMultiplePetsPage() {
  const router = useRouter();
  const [meId, setMeId] = useState<string | null>(null);
  const [rows, setRows] = useState<PetDraft[]>([{ ...EMPTY }]);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.replace('/signup');
      setMeId(user.id);
    })();
  }, [router]);

  function addRow() {
    setRows((r) => [...r, { ...EMPTY }]);
  }
  function removeRow(i: number) {
    setRows((r) => r.length === 1 ? r : r.filter((_, idx) => idx !== i));
  }
  function update(i: number, patch: Partial<PetDraft>) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }
  function onPick(i: number, file: File | null) {
    update(i, { file, preview: file ? URL.createObjectURL(file) : null });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!meId) return;

    // basic validation
    for (const [i, r] of rows.entries()) {
      if (!r.name.trim()) return alert(`Row ${i + 1}: name is required`);
      if (r.weight && isNaN(Number(r.weight))) return alert(`Row ${i + 1}: weight must be a number`);
    }

    try {
      setSaving(true);
      setProgress({ done: 0, total: rows.length });

      // 1) upload photos (if any)
      const uploadedUrls: (string | null)[] = [];
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        if (!r.file) { uploadedUrls.push(null); setProgress((p) => ({ ...p, done: p.done + 0 })); continue; }
        const ext = r.file.name.split('.').pop() || 'jpg';
        const key = `${meId}/${Date.now()}-${slugify(r.name)}-${i}.${ext}`;
        const { error: upErr } = await supabase
          .storage.from('pet-photos')
          .upload(key, r.file, { upsert: true, contentType: r.file.type });
        if (upErr) throw upErr;
        const { data } = supabase.storage.from('pet-photos').getPublicUrl(key);
        uploadedUrls.push(data.publicUrl);
      }

      // 2) batch insert
      const payload = rows.map((r, i) => ({
        // owner_id: rely on RLS default auth.uid() (recommended). If not set, send owner_id: meId
        name: r.name.trim(),
        species: r.species,
        breed: r.breed.trim() || null,
        dob: r.dob || null,
        weight_kg: r.weight ? Number(r.weight) : null,
        notes: r.notes.trim() || null,
        avatar_url: uploadedUrls[i],   // 👈 changed from photo_url → avatar_url
      }));

      const { data, error } = await supabase
        .from('pets')
        .insert(payload)
        .select('id');

      if (error) throw error;

      // 3) go somewhere—either list or first pet
      if (data && data.length > 0) router.replace(`/pets/${data[0].id}`);
      else router.replace('/pets');
    } catch (err: any) {
      console.error(err);
      alert(err?.message ?? 'Failed to save pets.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main>
      {/*  Top Banner with Breadcrumb */}
      <div className="relative w-full h-48 sm:h-64 md:h-72 lg:h-80">
        <Image
          src="/images/statbg4.jpg" // put your banner in /public
          alt="Products Banner"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/40 flex flex-col justify-center items-center text-center">
          <h1 className="text-3xl md:text-5xl font-bold text-white">
            Add Pets
          </h1>
          <p className="text-sm md:text-base text-gray-200 mt-2">
            Home / Pets / Add Pets
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-[1000px] px-4 m-20">
        <section className="rounded-[26px] border border-[#ffe2cf] bg-[#FF8A65] p-6 sm:p-8 md:p-10 text-white shadow-[0_10px_35px_rgba(0,0,0,0.15)]">
          <header className="mb-6">
            <h1 className="text-3xl font-extrabold tracking-tight drop-shadow-sm">Add Multiple Pets</h1>
            <p className="text-white/90 text-sm">Quickly create profiles for all your pets.</p>
          </header>

          <motion.form
            onSubmit={handleSave}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {rows.map((r, i) => (
              <PetRowCard
                key={i}
                index={i}
                row={r}
                onChange={update}
                onRemove={() => removeRow(i)}
                onPick={(f) => onPick(i, f)}
              />
            ))}

            <div className="flex items-center gap-3">
              <button type="button" onClick={addRow}
                className="rounded-full border border-white/40 bg-white/20 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-white/25">
                + Add another pet
              </button>

              <button type="submit" disabled={saving}
                className="rounded-full bg-[#0e2a36] px-6 py-2 text-sm font-semibold text-white shadow hover:opacity-95 disabled:opacity-60">
                {saving ? 'Saving…' : `Save ${rows.length} pet${rows.length > 1 ? 's' : ''}`}
              </button>

              <span className="text-sm text-white/80">
                {saving && `Uploading ${progress.done}/${progress.total}`}
              </span>
            </div>
          </motion.form>
        </section>
      </div>
    </main>
  );
}

/* ------- Subcomponents ------- */

function PetRowCard({
  index, row, onChange, onRemove, onPick,
}: {
  index: number;
  row: PetDraft;
  onChange: (i: number, patch: Partial<PetDraft>) => void;
  onRemove: () => void;
  onPick: (f: File | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="rounded-2xl border border-[#f2f5f7] bg-white p-5 text-[#0d1b22] shadow-[0_4px_18px_rgba(0,0,0,.06)]">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">Pet #{index + 1}</h3>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold hover:bg-slate-50"
        >
          Remove
        </button>
      </div>

      <div className="mb-4 flex items-center gap-4">
        <div className="relative h-20 w-20 overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200">
          {row.preview ? (
            <Image src={row.preview} alt="Preview" fill sizes="80px" className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-500">No photo</div>
          )}
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-full bg-[#0e2a36] px-4 py-2 text-xs font-semibold text-white shadow hover:opacity-95"
          >
            {row.preview ? 'Change photo' : 'Upload photo'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onPick(e.target.files?.[0] ?? null)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Pet name *">
          <input
            value={row.name}
            onChange={(e) => onChange(index, { name: e.target.value })}
            required
            className="input"
            placeholder="eg. Bruno"
          />
        </Field>

        <Field label="Species">
          <select
            value={row.species}
            onChange={(e) => onChange(index, { species: e.target.value as Species })}
            className="input"
          >
            {(['Dog','Cat','Bird','Rabbit','Fish','Reptile','Other'] as Species[]).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>

        <Field label="Breed">
          <input
            value={row.breed}
            onChange={(e) => onChange(index, { breed: e.target.value })}
            className="input"
            placeholder="eg. Golden Retriever"
          />
        </Field>

        <Field label="Date of birth">
          <input
            type="date"
            value={row.dob}
            onChange={(e) => onChange(index, { dob: e.target.value })}
            className="input"
          />
        </Field>

        <Field label="Weight (kg)">
          <input
            inputMode="decimal"
            value={row.weight}
            onChange={(e) => onChange(index, { weight: e.target.value })}
            className="input"
            placeholder="eg. 12.5"
          />
        </Field>

        <Field label="Notes">
          <input
            value={row.notes}
            onChange={(e) => onChange(index, { notes: e.target.value })}
            className="input"
            placeholder="Temperament, allergies…"
          />
        </Field>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-[#0d1b22]">{label}</span>
      {children}
    </label>
  );
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}
