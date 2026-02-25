'use client';

import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';
import { PawPrint, Plus } from 'lucide-react';

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
      if (!r.name.trim()) return toast.warning(`Row ${i + 1}: name is required`);
      if (r.weight && isNaN(Number(r.weight))) return toast.warning(`Row ${i + 1}: weight must be a number`);
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
      toast.success('Pets saved successfully!');
    } catch (err: unknown) {
      console.error(err);
      toast.error((err as Error)?.message ?? 'Failed to save pets.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-[100dvh] w-full bg-[#0a0a0f]">
      {/* Page header — no banner, clean dark heading */}
      <div className="pt-10 pb-6 px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-4 py-1.5 text-xs font-semibold text-[#FF8A65] mb-4 tracking-wide uppercase">
            <PawPrint size={14} /> New Profile
          </span>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">Add Your Pets</h1>
          <p className="mt-2 text-white/40 text-sm">Quickly create profiles for all your furry friends.</p>
        </motion.div>
      </div>

      <div className="mx-auto max-w-[860px] px-4 pb-20">
        <motion.form
          onSubmit={handleSave}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="space-y-5"
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

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={addRow}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white transition-all"
            >
              <Plus size={16} className="text-[#FF8A65]" /> Add another pet
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-gradient-to-r from-[#FF8A65] to-[#FF7043] px-7 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 hover:brightness-110 disabled:opacity-50 transition-all"
            >
              {saving ? 'Saving…' : `Save ${rows.length} pet${rows.length > 1 ? 's' : ''}`}
            </button>

            {saving && (
              <span className="text-sm text-white/40">
                Uploading {progress.done}/{progress.total}
              </span>
            )}
          </div>
        </motion.form>
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
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl border border-white/[0.07] bg-white/[0.04] backdrop-blur-xl p-6 shadow-[0_4px_30px_rgba(0,0,0,0.3)]"
    >
      {/* Card header */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#FF8A65]/15 text-[#FF8A65] text-xs font-bold">
            {index + 1}
          </span>
          <h3 className="font-semibold text-white text-sm">Pet #{index + 1}</h3>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/50 hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/30 transition-all"
        >
          Remove
        </button>
      </div>

      {/* Photo upload */}
      <div className="mb-6 flex items-center gap-5">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="group relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-full border-2 border-dashed border-white/20 bg-white/5 hover:border-[#FF8A65]/60 hover:bg-white/10 transition-all"
        >
          {row.preview ? (
            <Image src={row.preview} alt="Preview" fill sizes="80px" className="object-cover" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-white/30 group-hover:text-[#FF8A65]/70 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          )}
          {row.preview && (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        />
        <div>
          <p className="text-sm font-semibold text-white/80">
            {row.preview ? 'Profile photo' : 'Add a photo'}
          </p>
          <p className="text-xs text-white/30 mt-0.5">
            {row.preview ? 'Click the circle to change' : 'Click the circle to upload'}
          </p>
        </div>
      </div>

      {/* Fields grid */}
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
            {(['Dog', 'Cat', 'Bird', 'Rabbit', 'Fish', 'Reptile', 'Other'] as Species[]).map((s) => (
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
    </motion.div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-white/40 uppercase tracking-wider">{label}</span>
      {children}
    </label>
  );
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}
