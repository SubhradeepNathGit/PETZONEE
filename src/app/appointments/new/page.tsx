'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Clock, CalendarDays,
  Stethoscope, CheckCircle2, Loader2, ShieldCheck, Info,
  CalendarCheck, Star, Phone
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

/* ── Color palette: Site Blue ── */
const blue = {
  primary: '#5F97C9',
  light: '#64B5F6',
  glow: 'rgba(95,151,201,0.25)',
  card: 'rgba(95,151,201,0.08)',
  border: 'rgba(95,151,201,0.25)',
  badge: 'rgba(95,151,201,0.15)',
  text: '#93C5FD',
};

/* ── Types ── */
type VetRow = { id: string; name: string; email: string; avatar_url?: string | null; };

/* ── Helpers ── */
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const TIME_SLOTS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

function initials(name?: string | null): string {
  if (!name) return 'V';
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? 'V') + (p[1]?.[0] ?? '')).toUpperCase();
}

/* ── Calendar ── */
function AppointmentCalendar({ selectedDate, onSelect }: { selectedDate: Date | null; onSelect: (d: Date) => void }) {
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const [view, setView] = useState<Date>(() => { const d = new Date(); d.setDate(1); return d; });
  const year = view.getFullYear(), month = view.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setView(new Date(year, month - 1, 1))} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white"><ChevronLeft size={16} /></button>
        <span className="text-white font-semibold text-sm">{MONTHS[month]} {year}</span>
        <button onClick={() => setView(new Date(year, month + 1, 1))} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white"><ChevronRight size={16} /></button>
      </div>
      <div className="grid grid-cols-7 mb-2">
        {DAYS.map(d => <div key={d} className="text-center text-[11px] font-medium text-white/40 py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((cell, i) => {
          if (!cell) return <div key={`e-${i}`} />;
          const past = cell < today;
          const sel = selectedDate?.toDateString() === cell.toDateString();
          const isToday = cell.toDateString() === today.toDateString();
          return (
            <button key={cell.toISOString()} onClick={() => !past && onSelect(cell)} disabled={past}
              className={`w-8 h-8 mx-auto rounded-full text-xs font-medium transition-all duration-150
                ${past ? 'text-white/15 cursor-not-allowed' : 'cursor-pointer'}
                ${sel ? 'bg-[#5F97C9] text-white scale-105' : ''}
                ${isToday && !sel ? 'ring-1 ring-[#5F97C9] text-[#93C5FD]' : ''}
                ${!past && !sel ? 'text-white/70 hover:bg-white/10' : ''}
              `}>{cell.getDate()}</button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Time Slots ── */
function TimeSlotPicker({ selectedTime, selectedDate, onSelect }: { selectedTime: string | null; selectedDate: Date | null; onSelect: (t: string) => void }) {
  const now = new Date();
  const isValid = (slot: string) => {
    if (!selectedDate) return false;
    const [h, m] = slot.split(':').map(Number);
    const dt = new Date(selectedDate); dt.setHours(h, m, 0, 0);
    return dt > new Date(now.getTime() + 60 * 60 * 1000);
  };
  return (
    <div className="mt-5">
      <p className="text-[11px] font-semibold text-white/40 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Clock size={11} /> Select Time</p>
      <div className="grid grid-cols-3 gap-2">
        {TIME_SLOTS.map(slot => {
          const valid = isValid(slot), sel = selectedTime === slot;
          return (
            <button key={slot} onClick={() => valid && onSelect(slot)} disabled={!valid}
              className={`py-2 text-xs font-semibold rounded-lg transition-all duration-150
                ${!valid ? 'text-white/15 cursor-not-allowed bg-white/[0.03]' : 'cursor-pointer'}
                ${sel ? 'bg-[#5F97C9] text-white shadow-md shadow-[#5F97C9]/30 scale-105' : ''}
                ${valid && !sel ? 'bg-white/8 text-white/70 hover:bg-white/15 border border-white/10' : ''}
              `}>{slot}</button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Doctor Card ── */
function DoctorCard({ vet, isSelected, onSelect, loading, disabled }: {
  vet: VetRow; isSelected: boolean; onSelect: () => void; loading: boolean; disabled?: boolean;
}) {
  return (
    <div className={`relative pt-[60px] mt-2 w-full pb-2 px-1 transition-all duration-500 ${disabled ? 'opacity-20 grayscale' : ''}`}>
      <motion.div
        onClick={disabled ? undefined : onSelect}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={disabled ? {} : { y: -3 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={`relative rounded-[1.8rem] transition-all duration-500 border flex flex-col items-center p-3 pt-[52px] pb-4 text-center overflow-visible
          ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
          ${isSelected
            ? 'border-gray-300 bg-white/5 backdrop-blur-3xl shadow-[0_0_30px_rgba(255,255,255,0.1)] ring-1 ring-white/30'
            : 'border-slate-800 bg-white/10 backdrop-blur-2xl hover:bg-white/15 hover:border-white/30 shadow-none'}
        `}
      >
        {/* Subtle top edge glow for depth without shadows */}
        <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none rounded-t-[1.8rem]" />

        {/* Profile Pic - Centered on top edge, EXTRA LARGE */}
        <div className="absolute -top-[55px] left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="relative">
            {/* The Avatar itself */}
            <div className={`relative w-[110px] h-[110px] rounded-full p-[2px] transition-all duration-500 
              ${isSelected ? 'bg-gradient-to-tr from-[#5F97C9] via-[#93C5FD] to-[#5F97C9] scale-105 shadow-[0_0_20px_rgba(95,151,201,0.2)]' : 'bg-white/20 group-hover:bg-white/40'}`}>
              <div className="relative w-full h-full rounded-full overflow-hidden bg-black/50 ring-4 ring-black/80 backdrop-blur-md">
                {vet.avatar_url && vet.avatar_url.startsWith('http') ? (
                  <Image src={vet.avatar_url} alt={vet.name} fill className="object-cover transition-transform duration-1000" sizes="110px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/10 to-transparent text-white text-3xl font-black italic">{initials(vet.name)}</div>
                )}
              </div>
            </div>

            {/* Filled Verification Check Icon */}
            <AnimatePresence>
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute bottom-2 right-1 w-7 h-7 rounded-full bg-gradient-to-tr from-[#5F97C9] to-[#80B2DF] border-[3px] border-[#0A0E17] flex items-center justify-center z-30 shadow-none"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Basic Info (Smaller) */}
        <div className="relative z-10 space-y-0.5 mt-2">
          <h3 className={`font-black text-[13px] tracking-tight transition-colors duration-500 ${isSelected ? 'text-white' : 'text-white/80'}`}>
            Dr. {vet.name}
          </h3>
          <p className={`text-[8px] font-black uppercase tracking-[0.3em] transition-colors duration-500 ${isSelected ? 'text-[#93C5FD]' : 'text-white/30'}`}>
            Veterinarian
          </p>
        </div>

        {/* Verified Badge (Smaller) */}
        <div className="mt-3 relative z-10">
          <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full border backdrop-blur-md transition-all duration-500
            ${isSelected ? 'bg-[#5F97C9]/10 border-[#5F97C9]/30 opacity-100' : 'bg-white/[0.04] border-white/10 opacity-60'}`}>
            <ShieldCheck size={10} className={isSelected ? 'text-[#5F97C9]' : 'text-white/40'} />
            <span className={`text-[7px] font-black uppercase tracking-widest ${isSelected ? 'text-[#5F97C9]/90' : 'text-white/40'}`}>Verified</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}


/* ── Main ── */
export default function BookAppointmentPage() {
  const router = useRouter();
  const [vets, setVets] = useState<VetRow[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedVetId, setSelectedVetId] = useState<string | null>(null);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setMeId(user.id);

        // Check for reschedule param
        const params = new URLSearchParams(window.location.search);
        const rid = params.get('reschedule');
        if (rid) {
          setRescheduleId(rid);
          const { data: appt } = await supabase.from('appointments').select('vet_id').eq('id', rid).single();
          if (appt) setSelectedVetId(appt.vet_id);
        }

        let { data, error } = await supabase.from('veterinarian').select('id, name, email, avatar_url').eq('kyc_status', 'approved');
        if (!error && (!data || data.length === 0)) {
          const fallback = await supabase.from('veterinarian').select('id, name, email, avatar_url');
          if (!fallback.error && fallback.data) { data = fallback.data; error = null; }
        }
        if (!error && data) setVets(data);
        else if (error) toast.error('Could not load vets: ' + error.message);
      } catch { toast.error('Failed to load veterinarians. Please refresh.'); }
      finally { setInitialLoading(false); }
    })();
  }, []);

  const buildAppointmentTime = useCallback((): Date | null => {
    if (!selectedDate || !selectedTime) return null;
    const [h, m] = selectedTime.split(':').map(Number);
    const dt = new Date(selectedDate); dt.setHours(h, m, 0, 0);
    return dt;
  }, [selectedDate, selectedTime]);

  const book = async () => {
    if (!meId) { toast.error('You must be logged in.'); return; }
    if (!selectedDate || !selectedTime) { toast.warning('Select a date and time.'); return; }
    if (!selectedVetId) { toast.warning('Select a doctor.'); return; }
    const dt = buildAppointmentTime();
    if (!dt || dt <= new Date()) { toast.warning('Select a future time.'); return; }

    setLoading(true);
    try {
      if (rescheduleId) {
        // Update existing for reschedule
        const { error } = await supabase
          .from('appointments')
          .update({
            appointment_time: dt.toISOString(),
            status: 'pending' // Re-set to pending for doctor re-approval if needed
          })
          .eq('id', rescheduleId);

        if (error) toast.error('Update failed: ' + error.message);
        else {
          toast.success('Appointment rescheduled! Waiting for confirmation.');
          setTimeout(() => router.push('/dashboard?view=appointments'), 2000);
        }
      } else {
        // New booking
        const { error } = await supabase.from('appointments').insert({ user_id: meId, vet_id: selectedVetId, appointment_time: dt.toISOString() });
        if (error) { toast.error('Booking failed: ' + error.message); }
        else {
          toast.success('Booked successfully! Redirecting...');
          setTimeout(() => router.push('/dashboard?view=appointments'), 2000);
        }
      }
    } catch { toast.error('An unexpected error occurred.'); }
    finally { setLoading(false); }
  };

  const formattedSelection = useMemo(() => {
    if (!selectedDate || !selectedTime) return null;
    return new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(selectedDate) + ' · ' + selectedTime;
  }, [selectedDate, selectedTime]);

  const selectedVet = vets.find(v => v.id === selectedVetId);

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="relative">
          {/* Decorative background glow */}
          <div className="absolute inset-0 bg-[#5F97C9]/10 blur-[100px] rounded-full scale-150" />

          <div className="relative text-center">
            <div className="relative w-20 h-20 mx-auto mb-8">
              <div className="absolute inset-0 border-t-2 border-r-2 border-[#5F97C9] rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Stethoscope size={32} className="text-[#5F97C9] animate-pulse" />
              </div>
            </div>
            <h2 className="text-white font-black text-xs uppercase tracking-[0.5em] mb-3">Initializing</h2>
            <p className="text-white/30 text-[10px] font-bold uppercase tracking-[0.2em]">Synchronizing Veterinary Records...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <ToastContainer position="top-right" autoClose={3500} theme="dark"
        toastStyle={{ background: '#131927', borderRadius: '12px', border: '1px solid rgba(95,151,201,0.2)' }} />

      {/* ── Header ── */}
      <div className="relative w-full h-48 sm:h-64 md:h-72 lg:h-80 mb-8 overflow-hidden">
        <Image
          src="/images/statbg15.jpg"
          alt="Book Appointment"
          fill
          priority
          sizes="100vw"
          quality={90}
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/70 flex flex-col justify-center items-center text-center px-4 z-10">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-[#5F97C9]/20 flex items-center justify-center border border-[#5F97C9]/20">
              <Stethoscope size={16} className="text-[#5F97C9]" />
            </div>
            <span className="text-xs font-black text-[#5F97C9] uppercase tracking-[0.2em]">Veterinary Care</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
            Book an <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5F97C9] to-[#93C5FD]">Appointment</span>
          </h1>
          <div className="flex items-center justify-center gap-2 mt-4 overflow-hidden">
            <Link
              href="/"
              className="text-white/40 hover:text-white transition-colors duration-200 font-bold text-[10px] sm:text-xs uppercase tracking-widest"
            >
              Home
            </Link>
            <span className="text-white/10 text-[10px]">/</span>
            <p className="text-[10px] sm:text-xs text-[#5F97C9] font-black uppercase tracking-widest">Appointments</p>
          </div>
        </div>
      </div>

      {/* ── Main Grid ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6 xl:gap-8 items-start">

          {/* ── Left Panel ── */}
          <div className="xl:sticky xl:top-6 space-y-4">
            {/* Calendar Card */}
            <div className="bg-gradient-to-br from-white/5 to-gray-500/20 rounded-2xl border border-white/8 p-5 shadow-2xl">
              <p className="text-[11px] font-semibold text-white/40 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                <CalendarDays size={11} /> Select Date
              </p>
              <AppointmentCalendar selectedDate={selectedDate} onSelect={d => { setSelectedDate(d); setSelectedTime(null); }} />
              <div className="mt-4 pt-4 border-t border-white/5">
                <TimeSlotPicker selectedDate={selectedDate} selectedTime={selectedTime} onSelect={setSelectedTime} />
              </div>
            </div>

            {/* Summary / Confirm Card */}
            <AnimatePresence>
              {(selectedDate || selectedVet) && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="bg-gradient-to-br from-white/5 to-gray-500/10 rounded-2xl border border-[#5F97C9]/20 p-5 shadow-xl">
                  <p className="text-[11px] font-bold text-[#5F97C9] uppercase tracking-widest mb-4">Booking Summary</p>
                  <div className="space-y-3">
                    {formattedSelection ? (
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-[#5F97C9]/8 border border-[#5F97C9]/15">
                        <CalendarCheck size={15} className="text-[#5F97C9] flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] text-white/30 uppercase tracking-wide">Date & Time</p>
                          <p className="text-white text-sm font-medium mt-0.5">{formattedSelection}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/8">
                        <CalendarDays size={13} className="text-white/20" />
                        <p className="text-white/25 text-xs">No date & time selected</p>
                      </div>
                    )}
                    {selectedVet ? (
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-[#5F97C9]/8 border border-[#5F97C9]/15">
                        <Stethoscope size={15} className="text-[#5F97C9] flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] text-white/30 uppercase tracking-wide">Doctor</p>
                          <p className="text-white text-sm font-medium mt-0.5">Dr. {selectedVet.name}</p>
                          <p className="text-white/35 text-[11px]">{selectedVet.email}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/8">
                        <Stethoscope size={13} className="text-white/20" />
                        <p className="text-white/25 text-xs">No doctor selected</p>
                      </div>
                    )}
                  </div>
                  {selectedDate && selectedTime && selectedVetId && (
                    <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={book} disabled={loading}
                      className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-[#5F97C9] to-[#3B72A4] text-white font-bold text-sm shadow-lg shadow-[#5F97C9]/20 hover:shadow-[#5F97C9]/40 disabled:opacity-60 flex items-center justify-center gap-2 transition-all">
                      {loading ? <><Loader2 size={15} className="animate-spin" /> Booking...</> : <><CalendarDays size={15} /> Confirm Appointment</>}
                    </motion.button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Info pills */}
            <div className="grid grid-cols-1 gap-2">
              {[
                { icon: ShieldCheck, text: 'KYC-verified doctors only' },
                { icon: Clock, text: 'Book at least 1 hour in advance' },
                { icon: Info, text: 'Arrive 15 minutes early' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2.5 bg-white/[0.03] rounded-xl px-3.5 py-2.5 border border-white/5">
                  <Icon size={13} className="text-[#5F97C9] flex-shrink-0" />
                  <p className="text-white/35 text-xs">{text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right Panel: Doctor Grid ── */}
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white">Available Veterinarians</h2>
                <p className="text-white/30 text-xs mt-0.5">{vets.length} doctors ready to help — click a card to select</p>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-white/30 bg-white/[0.03] px-3 py-1.5 rounded-full border border-white/8">
                <Star size={11} className="text-[#5F97C9]" /> All Verified
              </div>
            </div>

            {vets.length === 0 ? (
              <div className="text-center py-20 rounded-2xl border border-dashed border-white/10 bg-white/[0.02]">
                <Stethoscope size={36} className="text-white/15 mx-auto mb-3" />
                <p className="text-white/35 text-sm">No veterinarians available right now.</p>
                <p className="text-white/20 text-xs mt-1">Please check back later or contact support.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                <AnimatePresence>
                  {vets.map((vet, i) => (
                    <motion.div key={vet.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                      <DoctorCard
                        vet={vet}
                        isSelected={selectedVetId === vet.id}
                        onSelect={rescheduleId ? () => { } : () => setSelectedVetId(prev => prev === vet.id ? null : vet.id)}
                        loading={loading}
                        disabled={!!rescheduleId}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* Quick tips row at bottom */}
            {vets.length > 0 && (
              <div className="mt-8 p-4 rounded-2xl bg-[#5F97C9]/5 border border-[#5F97C9]/10">
                <div className="flex flex-wrap items-center gap-4 text-xs text-white/30">
                  <div className="flex items-center gap-1.5"><CalendarDays size={12} className="text-[#5F97C9]" /> Step 1: Pick a date above</div>
                  <div className="flex items-center gap-1.5"><Clock size={12} className="text-[#5F97C9]" /> Step 2: Choose a time slot</div>
                  <div className="flex items-center gap-1.5"><Phone size={12} className="text-[#5F97C9]" /> Step 3: Select a doctor</div>
                  <div className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-[#5F97C9]" /> Step 4: Confirm!</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}