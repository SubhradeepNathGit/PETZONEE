'use client';
import Image from 'next/image';
import { AvatarPicker, DashboardLoadingScreen } from './shared/ui';
import { supabase } from '@/lib/supabase';
import React, { useEffect, useMemo, useState, useCallback, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Stethoscope, Clock, CheckCircle, XCircle, Calendar,
  Mail, Phone, User, Search,
  ChevronRight, Loader2, RefreshCw, IndianRupee, Save, Pencil,
  CreditCard, ArrowRight, Star, TrendingUp, ShoppingBag, Activity, Zap,
  History, FileText, Upload, Plus, Menu, X as IconX
} from 'lucide-react';
import { formatDistanceToNow, format, subMonths, startOfMonth, endOfMonth, subDays } from 'date-fns';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import Sidebar from '@/components/sidebar';
import dynamic from 'next/dynamic';
const UserMessages = dynamic(() => import('@/components/portal/UserMessages'), { ssr: false });
import {
  RevenueLineChart,
  UserGrowthChart,
  AppointmentsPolarArea,
} from "@/components/admin/ChartComponents";

type AppointmentStatus = 'pending' | 'accepted' | 'rejected';
type FilterKey = 'all' | AppointmentStatus;

type PatientUser = {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  avatar_url: string | null;
  phone: string | null;
};

type AppointmentRow = {
  id: string;
  created_at: string;
  appointment_time: string | null;
  status: AppointmentStatus;
  user_id: string | null;
  users: PatientUser | null;
  is_free_visit: boolean;
  fee_at_booking: number;
  medical_summary?: string;
  prescription_url?: string;
  is_completed?: boolean;
  completed_at?: string;
  next_appointment_date?: string;
  is_first_visit_completed?: boolean;
  is_subscription_benefit?: boolean; // Added for correct analytics
};

type ReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  users: PatientUser | null;
};

function VetDashboardInner({
  name, meId, avatarUrl, onAvatarChange, showMessage,
}: {
  name: string;
  meId: string | null;
  avatarUrl: string | null;
  onAvatarChange: (url: string | null) => void;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const view = searchParams.get('view') || 'home';
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');
  const [selectedAppt, setSelectedAppt] = useState<AppointmentRow | null>(null);

  // Fee management state
  const [consultationFee, setConsultationFee] = useState<number>(0);
  const [feeDescription, setFeeDescription] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [designation, setDesignation] = useState<string>('');
  const [specialization, setSpecialization] = useState<string>('');
  const [experienceYears, setExperienceYears] = useState<number>(1);

  const [feeLoading, setFeeLoading] = useState(false);
  const [editingFee, setEditingFee] = useState(false);

  const [feeInput, setFeeInput] = useState<string>('0');
  const [feeDescInput, setFeeDescInput] = useState<string>('');
  const [bioInput, setBioInput] = useState<string>('');
  const [designationInput, setDesignationInput] = useState<string>('');
  const [specializationInput, setSpecializationInput] = useState<string>('');
  const [experienceInput, setExperienceInput] = useState<string>('1');

  const [reviews, setReviews] = useState<ReviewRow[]>([]);

  // Management flow state
  const [managingAppt, setManagingAppt] = useState<AppointmentRow | null>(null);
  const [patientHistory, setPatientHistory] = useState<AppointmentRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [summaryInput, setSummaryInput] = useState('');
  const [nextDateInput, setNextDateInput] = useState('');
  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null);
  const [isFirstVisitDone, setIsFirstVisitDone] = useState(false);
  const [submittingNote, setSubmittingNote] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const fetchAppointments = useCallback(async () => {
    if (!meId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id, created_at, appointment_time, status, user_id, is_free_visit, fee_at_booking,
          medical_summary, prescription_url, is_completed, completed_at, next_appointment_date,
          is_subscription_benefit,
          users(first_name, last_name, email, avatar_url, phone)
        `)
        .eq('vet_id', meId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: AppointmentRow[] = (data as unknown[] ?? []).map((row) => {
        const r = row as { users: PatientUser[] | PatientUser | null } & Omit<AppointmentRow, 'users'>;
        return {
          ...r,
          users: Array.isArray(r.users) ? r.users[0] ?? null : (r.users ?? null)
        };
      });
      setAppointments(mapped);

      // Fetch Reviews
      const reviewsRes = await supabase
        .from('vet_reviews')
        .select('id, rating, comment, created_at, users(first_name, last_name, avatar_url)')
        .eq('vet_id', meId)
        .order('created_at', { ascending: false });

      if (!reviewsRes.error && reviewsRes.data) {
        setReviews(reviewsRes.data as unknown as ReviewRow[]);
      }
    } catch (error: unknown) {
      showMessage('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  }, [meId, showMessage]);

  const fetchPatientHistory = useCallback(async (userId: string) => {
    try {
      setHistoryLoading(true);
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id, created_at, appointment_time, status, medical_summary, prescription_url, is_completed, completed_at,
          users(first_name, last_name)
        `)
        .eq('user_id', userId)
        .eq('is_completed', true)
        .order('completed_at', { ascending: false });

      if (error) throw error;
      setPatientHistory(data as unknown as AppointmentRow[]);
    } catch (err) {
      console.error('History fetch error:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const handleManage = (appt: AppointmentRow) => {
    setManagingAppt(appt);
    setSummaryInput(appt.medical_summary || '');
    setNextDateInput(appt.next_appointment_date ? format(new Date(appt.next_appointment_date), 'yyyy-MM-dd') : '');
    setIsFirstVisitDone(appt.is_first_visit_completed || false);
    if (appt.user_id) fetchPatientHistory(appt.user_id);
  };

  const handleCompleteAppointment = async () => {
    if (!managingAppt) return;
    try {
      setSubmittingNote(true);
      let prescriptionUrl = managingAppt.prescription_url || null;

      if (prescriptionFile) {
        const ext = prescriptionFile.name.split('.').pop();
        const path = `prescriptions/${managingAppt.id}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('prescriptions').upload(path, prescriptionFile);
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from('prescriptions').getPublicUrl(path);
        prescriptionUrl = pub.publicUrl;
      }

      const { error } = await supabase
        .from('appointments')
        .update({
          medical_summary: summaryInput,
          prescription_url: prescriptionUrl,
          is_completed: true,
          completed_at: new Date().toISOString(),
          next_appointment_date: nextDateInput ? new Date(nextDateInput).toISOString() : null,
          is_first_visit_completed: isFirstVisitDone,
          status: 'accepted' // Ensure it's still accepted but now completed
        })
        .eq('id', managingAppt.id);

      if (error) throw error;

      showMessage('Appointment finalized and revenue recorded!', 'success');
      setManagingAppt(null);
      fetchAppointments();
    } catch (err) {
      showMessage('Failed to complete appointment', 'error');
    } finally {
      setSubmittingNote(false);
    }
  };

  const fee = consultationFee;

  const analyticsData = useMemo(() => {
    const accepted = appointments.filter(a => a.status === 'accepted').length;
    const pending = appointments.filter(a => a.status === 'pending').length;
    const rejected = appointments.filter(a => a.status === 'rejected').length;
    // const revenue = accepted * fee; // Current month approx or total lifetime from table? Let's use total lifetime from DB

    const compedRevenue = appointments
      .filter(a => a.is_completed && (a.is_free_visit || a.is_subscription_benefit))
      .reduce((sum, a) => sum + (a.fee_at_booking || 0), 0);

    const directRevenue = appointments
      .filter(a => a.is_completed && !a.is_free_visit && !a.is_subscription_benefit)
      .reduce((sum, a) => sum + (a.fee_at_booking || 0), 0);

    const lifetimeRevenue = compedRevenue + directRevenue;

    // Monthly Revenue (Last 6 months)
    const revenueData = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(new Date(), 5 - i);
      const start = startOfMonth(d);
      const end = endOfMonth(d);
      const sum = appointments.filter(a => {
        if (!a.is_completed || !a.appointment_time) return false;
        const t = new Date(a.appointment_time);
        return t >= start && t <= end;
      }).reduce((s, a) => s + (a.fee_at_booking || 0), 0);
      return { name: format(d, 'MMM'), value: sum };
    });

    // Appointment Growth (Last 14 days)
    const growthData = Array.from({ length: 14 }, (_, i) => {
      const d = subDays(new Date(), 13 - i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const count = appointments.filter(a => a.created_at.startsWith(dateStr)).length;
      return { name: format(d, 'dd MMM'), value: count };
    });

    // Status Distribution
    const polarData = [
      { name: "Accepted", value: accepted },
      { name: "Pending", value: pending },
      { name: "Rejected", value: rejected }
    ];

    // Review Distribution
    const ratingStats = [1, 2, 3, 4, 5].map(r => ({
      name: `${r} Stars`,
      value: reviews.filter(rev => rev.rating === r).length
    }));
    const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : "0.0";

    return {
      total: appointments.length,
      accepted,
      pending,
      rejected,
      revenue: lifetimeRevenue,
      compedRevenue,
      directRevenue,
      revenueData,
      growthData,
      polarData,
      ratingStats,
      avgRating,
      totalReviews: reviews.length
    };
  }, [appointments, reviews]);

  const fetchProfile = useCallback(async () => {
    if (!meId) return;
    const { data } = await supabase
      .from('veterinarian')
      .select('consultation_fee, fee_description, bio, designation, specialization, experience_years')
      .eq('id', meId)
      .maybeSingle();
    if (data) {
      const fee = Number(data.consultation_fee ?? 0);
      const desc = data.fee_description ?? '';
      const b = data.bio ?? '';
      const d = data.designation ?? 'Veterinary Surgeon';
      const s = data.specialization ?? 'General Practice';
      const e = Number(data.experience_years ?? 1);

      setConsultationFee(fee);
      setFeeDescription(desc);
      setBio(b);
      setDesignation(d);
      setSpecialization(s);
      setExperienceYears(e);

      setFeeInput(String(fee));
      setFeeDescInput(desc);
      setBioInput(b);
      setDesignationInput(d);
      setSpecializationInput(s);
      setExperienceInput(String(e));
    }
  }, [meId]);

  const saveProfile = async () => {
    if (!meId) return;
    setFeeLoading(true);
    const fee = parseFloat(feeInput) || 0;
    const exp = parseInt(experienceInput) || 0;

    const { error } = await supabase
      .from('veterinarian')
      .update({
        consultation_fee: fee,
        fee_description: feeDescInput.trim(),
        bio: bioInput.trim(),
        designation: designationInput.trim(),
        specialization: specializationInput.trim(),
        experience_years: exp
      })
      .eq('id', meId);

    setFeeLoading(false);
    if (error) { showMessage('Failed to save profile', 'error'); return; }

    setConsultationFee(fee);
    setFeeDescription(feeDescInput.trim());
    setBio(bioInput.trim());
    setDesignation(designationInput.trim());
    setSpecialization(specializationInput.trim());
    setExperienceYears(exp);

    setEditingFee(false);
    showMessage('Profile updated successfully!', 'success');
  };

  useEffect(() => {
    fetchAppointments();
    fetchProfile();
  }, [fetchAppointments, fetchProfile]);

  // Real-time listener
  useEffect(() => {
    if (!meId) return;
    const channel = supabase
      .channel(`vet-appointments-${meId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'appointments',
        filter: `vet_id=eq.${meId}`
      }, () => { fetchAppointments(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [meId, fetchAppointments]);

  const updateStatus = async (id: string, status: Exclude<AppointmentStatus, 'pending'>) => {
    try {
      setBusyId(id);
      const { error } = await supabase.from('appointments').update({ status }).eq('id', id);
      if (error) throw error;
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
      if (selectedAppt?.id === id) setSelectedAppt(prev => prev ? { ...prev, status } : null);
      showMessage(`Appointment ${status}!`, 'success');
    } catch {
      showMessage('Failed to update status', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const stats = useMemo(() => ({
    total: appointments.length,
    pending: appointments.filter(a => a.status === 'pending').length,
    accepted: appointments.filter(a => a.status === 'accepted').length,
    rejected: appointments.filter(a => a.status === 'rejected').length,
  }), [appointments]);

  const filtered = useMemo(() => {
    let list = filter === 'all' ? appointments : appointments.filter(a => a.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.users?.first_name?.toLowerCase().includes(q) ||
        a.users?.last_name?.toLowerCase().includes(q) ||
        a.users?.email?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [appointments, filter, search]);

  const statusColor = (s: AppointmentStatus) => ({
    pending: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    accepted: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    rejected: 'text-red-400 bg-red-400/10 border-red-400/20',
  }[s]);



  if (view === 'messages' && meId) {
    return (
      <div className="min-h-screen bg-black">
        <aside className="hidden lg:block w-72 fixed h-screen left-0 top-0 z-50">
          <Sidebar role="vet" name={name ? `Dr. ${name}` : 'Doctor'} avatarUrl={avatarUrl || undefined} />
        </aside>
        <main className="lg:ml-72 h-screen">
          <Suspense fallback={<DashboardLoadingScreen message="Secure Comms Channel" />}>
            <UserMessages userId={meId} role="vet" />
          </Suspense>
        </main>
      </div>
    );
  }

  if (view === 'profile') {
    return (
      <div className="min-h-screen bg-black">
        <aside className="hidden lg:block w-72 fixed h-screen left-0 top-0 z-50">
          <Sidebar role="vet" name={name ? `Dr. ${name}` : 'Doctor'} avatarUrl={avatarUrl || undefined} />
        </aside>
        <main className="lg:ml-72 p-6 md:p-10 space-y-10">
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase">My Profile</h1>
            <p className="text-white/30 text-xs font-medium uppercase tracking-[0.4em]">Manage your practice identity</p>
          </div>
          <div className="relative overflow-hidden rounded-[2.5rem] border border-white/5 bg-[#0a0a0a]/80 backdrop-blur-3xl shadow-2xl p-8 md:p-10">
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-cyan-500/5 rounded-full -mr-20 -mt-20 blur-[80px] pointer-events-none" />
            <div className="flex flex-col md:flex-row md:items-center gap-10">
              <AvatarPicker name={name} currentUrl={avatarUrl} meId={meId} table="veterinarian" showMessage={showMessage} onUploaded={onAvatarChange} />
              <div className="space-y-4">
                <div className="space-y-2">
                  <h2 className="text-4xl font-black text-white tracking-tighter uppercase">Dr. {name}</h2>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[9px] font-black uppercase tracking-widest">{designation}</span>
                    <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-widest">{specialization}</span>
                    <span className="px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[9px] font-black uppercase tracking-widest">{experienceYears} Years Exp.</span>
                  </div>
                </div>
                <p className="text-white/40 text-xs font-medium leading-relaxed max-w-2xl italic">
                  &ldquo;{bio || 'Dedicated to providing the best care for your furry friends.'}&rdquo;
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Professional Identity */}
            <div className="relative overflow-hidden rounded-[2.5rem] border border-white/5 bg-[#0a0a0a]/80 backdrop-blur-3xl shadow-2xl p-8 md:p-10 space-y-8">
              <h3 className="text-[10px] font-black uppercase text-white/30 tracking-[0.4em] flex items-center gap-4">Professional Identity<div className="flex-1 h-[1px] bg-white/5" /></h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-white/20 tracking-widest ml-1">Designation</label>
                  <input type="text" value={designationInput} onChange={e => setDesignationInput(e.target.value)} placeholder="e.g. Senior Veterinary Surgeon" className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-3.5 text-xs font-bold text-white placeholder:text-white/10 focus:outline-none focus:border-cyan-500/30 transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-white/20 tracking-widest ml-1">Specialization</label>
                  <input type="text" value={specializationInput} onChange={e => setSpecializationInput(e.target.value)} placeholder="e.g. Feline Medicine" className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-3.5 text-xs font-bold text-white placeholder:text-white/10 focus:outline-none focus:border-emerald-500/30 transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-white/20 tracking-widest ml-1">Years of Experience</label>
                  <input type="number" value={experienceInput} onChange={e => setExperienceInput(e.target.value)} className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-3.5 text-xs font-bold text-white focus:outline-none focus:border-orange-500/30 transition-all" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-white/20 tracking-widest ml-1">Professional Bio</label>
                <textarea value={bioInput} onChange={e => setBioInput(e.target.value)} placeholder="Tell us about your medical background and philosophy..." className="w-full h-32 bg-white/[0.03] border border-white/10 rounded-2xl p-5 text-xs font-medium leading-relaxed text-white placeholder:text-white/10 focus:outline-none focus:border-cyan-500/30 transition-all resize-none" />
              </div>
            </div>

            {/* Consultation & Economics */}
            <div className="relative overflow-hidden rounded-[2.5rem] border border-white/5 bg-[#0a0a0a]/80 backdrop-blur-3xl shadow-2xl p-8 md:p-10 space-y-8">
              <h3 className="text-[10px] font-black uppercase text-white/30 tracking-[0.4em] flex items-center gap-4">Economics & Services<div className="flex-1 h-[1px] bg-white/5" /></h3>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-white/20 tracking-widest ml-1">Standard Consultation Fee</label>
                  <div className="flex items-center gap-4 bg-white/[0.03] border border-white/10 rounded-[2rem] p-6 group focus-within:border-cyan-500/30 transition-all">
                    <IndianRupee className="text-cyan-400 flex-shrink-0" size={28} />
                    <input type="number" min="0" step="0.01" value={feeInput} onChange={e => setFeeInput(e.target.value)} placeholder="0.00" className="flex-1 bg-transparent text-white font-black text-4xl tracking-tighter focus:outline-none placeholder:text-white/10" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-white/20 tracking-widest ml-1">Fee Description</label>
                  <input type="text" value={feeDescInput} onChange={e => setFeeDescInput(e.target.value)} placeholder="e.g. Includes primary diagnostic checkup..." className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-[11px] font-bold text-white placeholder:text-white/10 focus:outline-none focus:border-cyan-500/30 transition-all" />
                </div>

                <div className="pt-4">
                  <button onClick={saveProfile} disabled={feeLoading} className="w-full py-5 rounded-[2rem] bg-cyan-500 text-black text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-cyan-400 hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-50 shadow-xl shadow-cyan-500/20">
                    {feeLoading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />} Sync Practice Identity
                  </button>
                  <p className="text-center text-white/20 text-[8px] font-bold uppercase tracking-widest mt-4">Database synchronization is encrypted and instantaneous</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Default: home view
  return (
    <div className="min-h-screen bg-black">
      <aside className="hidden lg:block w-72 fixed h-screen left-0 top-0 z-50">
        <Sidebar role="vet" name={name ? `Dr. ${name}` : 'Doctor'} avatarUrl={avatarUrl || undefined} />
      </aside>
      <main className="lg:ml-72 p-6 md:p-10 space-y-10">
        {view === 'appointments' ? (
          <div className="space-y-10">
            {/* Page Header */}
            <div className="space-y-1">
              <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Manage Appointments</h1>
              <p className="text-white/30 text-xs font-medium uppercase tracking-[0.4em]">Schedule & Patient Management</p>
            </div>

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <StatCard
                label="Pending Action"
                value={analyticsData.pending}
                trend="Awaiting Response"
                icon={<Clock className="text-yellow-400" />}
                color="orange"
                alert={analyticsData.pending > 0}
              />
              <StatCard
                label="Active Consults"
                value={analyticsData.accepted}
                trend="Confirmed"
                icon={<CheckCircle className="text-emerald-400" />}
                color="emerald"
              />
              <StatCard
                label="Rejected"
                value={analyticsData.rejected}
                trend="Declined"
                icon={<XCircle className="text-red-400" />}
                color="red"
              />
            </div>

            <div className="relative overflow-hidden rounded-[2.5rem] border border-white/5 bg-[#0a0a0a]/80 backdrop-blur-3xl shadow-2xl p-8 md:p-10">
              {/* Section header */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
                <div>
                  <h2 className="text-xl font-black text-white tracking-tighter uppercase">Appointment Queue</h2>
                  <p className="text-white/20 text-[9px] font-bold uppercase tracking-widest mt-1">
                    {analyticsData.pending > 0 ? `${analyticsData.pending} awaiting your response` : 'All caught up'}
                  </p>
                </div>
                <button
                  onClick={fetchAppointments}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:border-white/20 transition-all"
                >
                  <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>

              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                {/* Search */}
                <div className="relative group flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-cyan-400 transition-colors" size={16} />
                  <input
                    type="text"
                    placeholder="Search patient name or email..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/5 rounded-2xl pl-12 pr-4 py-3.5 text-[11px] font-bold uppercase tracking-widest focus:outline-none focus:border-cyan-500/30 transition-all placeholder:text-white/10 text-white"
                  />
                </div>

                {/* Filter pills */}
                <div className="flex items-center gap-2 p-1 bg-white/[0.02] border border-white/5 rounded-2xl">
                  {(['all', 'pending', 'accepted', 'rejected'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-4 py-2.5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all
                    ${filter === f
                          ? f === 'all' ? 'bg-white text-black'
                            : f === 'pending' ? 'bg-yellow-400 text-black'
                              : f === 'accepted' ? 'bg-emerald-400 text-black'
                                : 'bg-red-400 text-black'
                          : 'text-white/30 hover:text-white'
                        }`}
                    >
                      {f}
                      {f !== 'all' && analyticsData[f] > 0 && (
                        <span className="ml-1.5 opacity-60">({analyticsData[f]})</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table */}
              {loading ? (
                <div className="flex flex-col items-center justify-center py-32 space-y-6">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl border border-white/10 bg-white/[0.02] flex items-center justify-center relative overflow-hidden">
                      <Activity className="text-cyan-500 animate-pulse" size={24} />
                    </div>
                    <div className="absolute -inset-2 border border-white/5 rounded-3xl animate-[spin_3s_linear_infinite]" />
                  </div>
                  <div className="space-y-1 text-center">
                    <p className="text-[10px] font-black text-white uppercase tracking-[0.4em] animate-pulse">Syncing Medical Records</p>
                    <p className="text-[8px] text-white/20 uppercase tracking-widest leading-relaxed">Accessing encrypted patient transmissions...</p>
                  </div>
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-24 text-center border border-dashed border-white/5 rounded-[2rem] bg-white/[0.01]">
                  <Calendar className="mx-auto text-white/10 mb-4" size={48} />
                  <p className="text-white/20 text-[10px] font-black uppercase tracking-widest">
                    {search ? 'No results found' : filter === 'all' ? 'No appointments yet' : `No ${filter} appointments`}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="px-4 py-4 text-[9px] font-black text-white/20 uppercase tracking-widest">Patient</th>
                        <th className="px-4 py-4 text-[9px] font-black text-white/20 uppercase tracking-widest hidden md:table-cell">Appointment</th>
                        <th className="px-4 py-4 text-[9px] font-black text-white/20 uppercase tracking-widest text-center">Status</th>
                        <th className="px-4 py-4 text-[9px] font-black text-white/20 uppercase tracking-widest text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                      <AnimatePresence mode="popLayout">
                        {filtered.map((appt) => (
                          <motion.tr
                            key={appt.id}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            layout
                            className="hover:bg-white/[0.02] transition-colors group"
                          >
                            {/* Patient */}
                            <td className="px-4 py-5">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 flex items-center justify-center border border-white/10 overflow-hidden flex-shrink-0">
                                  {appt.users?.avatar_url ? (
                                    <Image src={appt.users.avatar_url} alt="" width={40} height={40} className="object-cover" />
                                  ) : (
                                    <User size={16} className="text-cyan-400" />
                                  )}
                                </div>
                                <div>
                                  <p className="text-white font-black text-xs uppercase tracking-tight">
                                    {appt.users ? `${appt.users.first_name || ''} ${appt.users.last_name || ''}`.trim() || 'Unknown' : 'Unknown'}
                                  </p>
                                  <p className="text-white/30 text-[9px] font-bold">{appt.users?.email || '—'}</p>
                                </div>
                              </div>
                            </td>

                            {/* Appointment time */}
                            <td className="px-4 py-5 hidden md:table-cell">
                              {appt.appointment_time ? (
                                <div>
                                  <p className="text-white text-xs font-black uppercase tracking-tight">
                                    {format(new Date(appt.appointment_time), 'dd MMM yyyy')}
                                  </p>
                                  <p className="text-white/30 text-[9px] font-bold">
                                    {format(new Date(appt.appointment_time), 'hh:mm a')}
                                  </p>
                                </div>
                              ) : (
                                <p className="text-white/20 text-[9px] font-bold italic">
                                  {formatDistanceToNow(new Date(appt.created_at), { addSuffix: true })}
                                </p>
                              )}
                            </td>

                            {/* Status */}
                            <td className="px-4 py-5 text-center">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${statusColor(appt.status)}`}>
                                {appt.status}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="px-4 py-5">
                              <div className="flex items-center justify-end gap-2">
                                {appt.status === 'accepted' && !appt.is_completed && (
                                  <button
                                    onClick={() => handleManage(appt)}
                                    className="px-3 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500 hover:bg-orange-500 hover:text-white transition-all text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5"
                                  >
                                    Manage
                                  </button>
                                )}
                                {appt.status === 'pending' && (
                                  <>
                                    <button
                                      disabled={busyId === appt.id}
                                      onClick={() => updateStatus(appt.id, 'accepted')}
                                      className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 disabled:opacity-50 transition-all"
                                      title="Accept"
                                    >
                                      {busyId === appt.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                                    </button>
                                    <button
                                      disabled={busyId === appt.id}
                                      onClick={() => updateStatus(appt.id, 'rejected')}
                                      className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 disabled:opacity-50 transition-all"
                                      title="Reject"
                                    >
                                      <XCircle size={14} />
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={() => setSelectedAppt(appt)}
                                  className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/30 hover:text-white hover:border-white/20 transition-all"
                                  title="View details"
                                >
                                  <ChevronRight size={14} />
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="relative overflow-hidden rounded-[2rem] border border-white/5 bg-[#0a0a0a]/80 backdrop-blur-3xl shadow-2xl p-6 md:p-8">
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/10 rounded-full -mr-32 -mt-32 blur-[80px] pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-emerald-500/5 rounded-full -ml-20 -mb-20 blur-[80px] pointer-events-none" />

              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-10">
                <div className="flex flex-col md:flex-row md:items-center gap-6 flex-1">
                  <div className="flex-shrink-0 scale-90 origin-left">
                    <AvatarPicker
                      name={name}
                      currentUrl={avatarUrl}
                      meId={meId}
                      table="veterinarian"
                      showMessage={showMessage}
                      onUploaded={onAvatarChange}
                    />
                  </div>
                  <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-cyan-400 flex items-center gap-2">
                      Medical Professional <Stethoscope className="w-3 h-3" />
                    </p>
                    <h2 className="text-xl md:text-2xl font-black uppercase text-white leading-none tracking-tight">
                      Welcome, {name ? `Dr. ${name}` : 'Doctor'}
                    </h2>
                    <p className="text-white/30 text-[10px] font-bold uppercase tracking-[0.3em]">
                      Manage your patients and appointment schedule
                    </p>
                  </div>
                </div>

                {/* Stat Pills - Right Aligned as per UI Refinement */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {[
                    { label: 'Total', value: analyticsData.total, color: 'text-white' },
                    { label: 'Pending', value: analyticsData.pending, color: 'text-yellow-400' },
                    { label: 'Accepted', value: analyticsData.accepted, color: 'text-emerald-400' },
                    { label: 'Completed', value: appointments.filter(a => a.is_completed).length, color: 'text-cyan-400' },
                    { label: 'Rejected', value: analyticsData.rejected, color: 'text-red-400' },
                  ].map(s => (
                    <div key={s.label} className="min-w-[90px] text-center p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-center">
                      <p className={`text-3xl font-black ${s.color} tracking-tighter`}>{s.value}</p>
                      <p className="text-[7px] font-black uppercase tracking-[0.2em] text-white/20 mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Quick Actions ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <ControlButton
                label="My Profile"
                icon={<User />}
                color="blue"
                onClick={() => router.push('/dashboard?view=profile')}
              />
              <ControlButton
                label="Messages"
                icon={<Mail />}
                color="emerald"
                onClick={() => router.push('/dashboard?view=messages')}
              />
              <ControlButton
                label="Analytics"
                icon={<TrendingUp />}
                color="cyan"
                onClick={() => {
                  const overview = document.getElementById('practice-analytics');
                  if (overview) overview.scrollIntoView({ behavior: 'smooth' });
                }}
              />
              <ControlButton
                label="Settings"
                icon={<Save />}
                color="orange"
                onClick={() => setEditingFee(true)}
              />
            </div>

            {/* ── Fee Management Card ── */}
            <div className="relative overflow-hidden rounded-[2rem] border border-white/5 bg-[#0a0a0a]/80 backdrop-blur-3xl shadow-2xl p-6 md:p-8">
              <div className="absolute top-0 left-0 w-64 h-64 bg-cyan-500/5 rounded-full -ml-20 -mt-20 blur-[80px] pointer-events-none" />
              <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                  <h3 className="text-[10px] font-black uppercase text-white/30 tracking-[0.4em] flex items-center gap-4 mb-1">
                    Consultation Fee
                    <div className="flex-1 h-[1px] bg-white/5 min-w-[60px]" />
                  </h3>
                  <p className="text-white/20 text-[9px] font-bold uppercase tracking-widest">
                    Shown to users when booking — pay at visit
                  </p>
                </div>

                {editingFee ? (
                  <div className="flex flex-col gap-3 w-full md:max-w-sm">
                    <div className="flex items-center gap-3 bg-white/[0.03] border border-white/10 rounded-2xl p-4">
                      <IndianRupee className="text-cyan-400 flex-shrink-0" size={18} />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={feeInput}
                        onChange={e => setFeeInput(e.target.value)}
                        placeholder="0.00"
                        className="flex-1 bg-transparent text-white font-black text-2xl tracking-tighter focus:outline-none placeholder:text-white/10"
                      />
                    </div>
                    <input
                      type="text"
                      value={feeDescInput}
                      onChange={e => setFeeDescInput(e.target.value)}
                      placeholder="e.g. Includes basic checkup and consultation..."
                      className="bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-3 text-[11px] font-bold text-white placeholder:text-white/10 focus:outline-none focus:border-cyan-500/30 transition-all"
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={saveProfile}
                        disabled={feeLoading}
                        className="flex-1 py-3 rounded-2xl bg-cyan-500 text-black text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-cyan-400 transition-all disabled:opacity-50"
                      >
                        {feeLoading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        Save Profile
                      </button>
                      <button
                        onClick={() => { setEditingFee(false); setFeeInput(String(consultationFee)); setFeeDescInput(feeDescription); }}
                        className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <IndianRupee className="text-cyan-400" size={22} />
                        <span className="text-4xl font-black text-white tracking-tighter">{consultationFee.toFixed(2)}</span>
                      </div>
                      {feeDescription && (
                        <p className="text-white/30 text-[10px] font-bold mt-1 max-w-xs text-right">{feeDescription}</p>
                      )}
                      <span className="text-[9px] font-black uppercase tracking-widest text-cyan-400/60 mt-1 block">
                        {consultationFee === 0 ? 'Free Consultation' : 'Pay at Visit'}
                      </span>
                    </div>
                    <button
                      onClick={() => setEditingFee(true)}
                      className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white/30 hover:text-white hover:border-white/20 transition-all"
                      title="Edit fee"
                    >
                      <Pencil size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Analytics Section Integrated into Overview */}
            <div id="practice-analytics" className="space-y-8 pt-8 border-t border-white/5">
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-white tracking-tight uppercase">Practice Analytics</h2>
                <p className="text-white/30 text-xs font-medium uppercase tracking-[0.4em]">Operations & Financial Overview</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard label="Total Revenue" value={`₹${analyticsData.revenue.toLocaleString()}`} trend="Lifetime" icon={<CreditCard className="text-emerald-500" />} color="emerald" />
                <StatCard label="Comped (Petverse)" value={`₹${analyticsData.compedRevenue.toLocaleString()}`} trend="Platform Paid" icon={<Zap className="text-yellow-500" />} color="orange" />
                <StatCard label="Patient Paid" value={`₹${analyticsData.directRevenue.toLocaleString()}`} trend="Direct" icon={<User className="text-cyan-500" />} color="cyan" />
                <StatCard label="Accepted Rate" value={`${analyticsData.total > 0 ? Math.round((analyticsData.accepted / analyticsData.total) * 100) : 0}%`} trend="Target 90%" icon={<CheckCircle className="text-emerald-400" />} color="emerald" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <ChartWrapper title="Revenue Velocity" subtitle="Financial liquidity trajectory">
                  <RevenueLineChart data={analyticsData.revenueData} />
                </ChartWrapper>
                <ChartWrapper title="Network Growth" subtitle="Appointment volume acquisition">
                  <UserGrowthChart data={analyticsData.growthData} />
                </ChartWrapper>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <ChartWrapper title="Booking Distribution" subtitle="Polar Area Analysis of Appointment Statuses">
                  <AppointmentsPolarArea data={analyticsData.polarData} />
                </ChartWrapper>
                <div className="bg-[#0a0a0a] border border-white/5 rounded-[2rem] p-8 flex flex-col justify-center gap-4 relative overflow-hidden group">
                  <div className="absolute -right-20 -bottom-20 w-48 h-48 bg-emerald-500/10 blur-[80px] group-hover:bg-emerald-500/20 transition-all duration-500"></div>
                  <h3 className="text-3xl font-black tracking-tight text-white">System Health</h3>
                  <p className="text-white/50 text-sm font-medium leading-relaxed max-w-sm">The consultation engine is operating at optimal capacity. Patient engagement remains high with a {analyticsData.avgRating} average rating across {analyticsData.totalReviews} transmissions.</p>
                  <div className="flex items-center gap-3 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full w-max">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Live Operational</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-10">
                <ChartWrapper title="Patient Feedback" subtitle="Rating distribution and volume">
                  <div className="space-y-6">
                    <div className="flex items-center gap-6 p-6 bg-white/[0.02] border border-white/5 rounded-2xl group transition-all hover:bg-white/[0.04]">
                      <div className="text-center">
                        <p className="text-5xl font-black text-white tracking-tighter mb-1">{analyticsData.avgRating}</p>
                        <div className="flex items-center justify-center gap-0.5 text-yellow-500">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} size={14} fill={i < Math.round(Number(analyticsData.avgRating)) ? "currentColor" : "none"} />
                          ))}
                        </div>
                      </div>
                      <div className="flex-1 space-y-2">
                        {[5, 4, 3, 2, 1].map(r => (
                          <div key={r} className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-white/40 w-12">{r} Stars</span>
                            <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${analyticsData.totalReviews > 0 ? (reviews.filter(rev => rev.rating === r).length / analyticsData.totalReviews) * 100 : 0}%` }}
                                className="h-full bg-yellow-500/60 rounded-full"
                              />
                            </div>
                            <span className="text-[10px] font-black text-white/20 w-8 text-right">{reviews.filter(rev => rev.rating === r).length}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase text-white/20 tracking-[0.3em]">Recent Feedback</h4>
                      {reviews.slice(0, 3).map(rev => (
                        <div key={rev.id} className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2 group hover:border-white/10 transition-all">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black overflow-hidden relative">
                                {rev.users?.avatar_url ? (
                                  <Image src={rev.users.avatar_url} alt="Patient" fill className="object-cover" />
                                ) : (
                                  <User size={14} />
                                )}
                              </div>
                              <p className="text-[11px] font-black text-white uppercase tracking-tighter">{rev.users?.first_name || 'Patient'} {rev.users?.last_name || ''}</p>
                            </div>
                            <div className="flex items-center gap-0.5 text-yellow-500">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star key={i} size={10} fill={i < rev.rating ? "currentColor" : "none"} />
                              ))}
                            </div>
                          </div>
                          <p className="text-[12px] text-white/40 leading-relaxed italic line-clamp-2">&ldquo;{rev.comment || 'No comment provided.'}&rdquo;</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </ChartWrapper>

                <div className="bg-[#0a0a0a] border border-white/5 rounded-[2rem] p-8 flex flex-col justify-between gap-6 relative overflow-hidden group">
                  <div className="absolute -right-20 -bottom-20 w-48 h-48 bg-cyan-500/10 blur-[80px] group-hover:bg-cyan-500/20 transition-all duration-500"></div>
                  <div>
                    <h3 className="text-3xl font-black tracking-tight text-white mb-2">Production Portal</h3>
                    <p className="text-white/50 text-sm font-medium leading-relaxed max-w-sm">Your medical practice is operating at optimal capacity. Manage your appointments, communicate with patients, and track your revenue growth from this command center.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                      <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                        <TrendingUp size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-white uppercase tracking-widest">Revenue Growth</p>
                        <p className="text-[9px] text-white/30 uppercase tracking-widest">+12% from last month</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        <Activity size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-white uppercase tracking-widest">Active Channels</p>
                        <p className="text-[9px] text-white/30 uppercase tracking-widest">{analyticsData.total} Transmissions Live</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* ── Manage Appointment Overlay ── */}
      <AnimatePresence>
        {managingAppt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-10"
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setManagingAppt(null)} />

            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-5xl max-h-[90vh] bg-[#0a0a0a] border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row"
            >
              {/* Left Column: Patient Info & History */}
              <div className="w-full md:w-1/3 border-r border-white/5 bg-white/[0.01] flex flex-col h-full overflow-hidden">
                <div className="p-8 border-b border-white/5 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 p-0.5 shadow-xl shadow-cyan-500/10">
                      <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                        {managingAppt.users?.avatar_url ? (
                          <Image src={managingAppt.users.avatar_url} alt="" width={64} height={64} className="object-cover" />
                        ) : (
                          <User size={24} className="text-white/20" />
                        )}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white tracking-tighter uppercase whitespace-nowrap overflow-hidden text-ellipsis">
                        {managingAppt.users?.first_name} {managingAppt.users?.last_name}
                      </h3>
                      <p className="text-white/30 text-[9px] font-bold uppercase tracking-widest">Patient History Profile</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-[10px] font-bold text-white/40 uppercase tracking-widest">
                      <Mail size={12} className="text-cyan-500" /> {managingAppt.users?.email || 'No email'}
                    </div>
                    <div className="flex items-center gap-3 text-[10px] font-bold text-white/40 uppercase tracking-widest">
                      <Calendar size={12} className="text-cyan-500" /> Member since {format(new Date(managingAppt.created_at), 'MMMM yyyy')}
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                  <h4 className="text-[10px] font-black uppercase text-white/20 tracking-[0.4em] flex items-center gap-4">
                    Clinical History
                    <div className="flex-1 h-[1px] bg-white/5" />
                  </h4>

                  {historyLoading ? (
                    <div className="flex flex-col items-center justify-center py-10 opacity-20">
                      <Loader2 size={24} className="animate-spin mb-2" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Retrieving records...</span>
                    </div>
                  ) : patientHistory.length === 0 ? (
                    <div className="py-10 text-center opacity-20 italic text-[10px] uppercase tracking-widest">
                      No previous records found
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {patientHistory.map(h => (
                        <div key={h.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3 group hover:border-white/10 transition-all">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">
                              {h.completed_at ? format(new Date(h.completed_at), 'dd MMM yyyy') : 'Recently'}
                            </span>
                            <div className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[8px] font-black uppercase tracking-widest">
                              Finalized
                            </div>
                          </div>
                          <p className="text-[11px] text-white/60 leading-relaxed line-clamp-3">
                            {h.medical_summary || 'No summary recorded.'}
                          </p>
                          {h.prescription_url && (
                            <a href={h.prescription_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-cyan-400 text-[9px] font-black uppercase tracking-widest hover:text-cyan-300 transition-colors">
                              <FileText size={10} /> View Prescription
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Management Form */}
              <div className="flex-1 flex flex-col h-full bg-black/40 overflow-hidden md:rounded-r-[3rem]">
                <div className="p-6 border-b border-white/5 flex items-center justify-between md:rounded-tr-[3rem]">
                  <div>
                    <h3 className="text-xl font-black text-white tracking-tighter uppercase">Clinical Session Info</h3>
                    <p className="text-white/20 text-[8px] font-bold uppercase tracking-widest mt-1">ID: {managingAppt.id.slice(0, 8)}</p>
                  </div>
                  <button
                    onClick={() => setManagingAppt(null)}
                    className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white/20 hover:text-white transition-all shadow-lg"
                  >
                    <XCircle size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar">
                  {/* Summary */}
                  <div className="space-y-3">
                    <label className="text-[9px] font-black uppercase text-white/30 tracking-[0.4em] flex items-center gap-4">
                      Medical Summary & Observations
                      <div className="flex-1 h-[1px] bg-white/5" />
                    </label>
                    <textarea
                      value={summaryInput}
                      onChange={e => setSummaryInput(e.target.value)}
                      placeholder="Enter detailed clinical notes, observations, and recommendations..."
                      className="w-full h-32 bg-white/[0.03] border border-white/5 rounded-[1.5rem] p-4 text-xs text-white placeholder:text-white/10 focus:outline-none focus:border-orange-500/30 transition-all resize-none font-medium leading-relaxed"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Prescription */}
                    <div className="space-y-3">
                      <label className="text-[9px] font-black uppercase text-white/30 tracking-[0.4em] flex items-center gap-4">
                        Prescription Copy
                        <div className="flex-1 h-[1px] bg-white/5" />
                      </label>
                      <div className="relative group/upload">
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={e => setPrescriptionFile(e.target.files?.[0] || null)}
                          className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        />
                        <div className={`h-24 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-3 text-center
                          ${prescriptionFile
                            ? 'border-emerald-500/30 bg-emerald-500/5'
                            : managingAppt.prescription_url
                              ? 'border-cyan-500/30 bg-cyan-500/5'
                              : 'border-white/5 bg-white/[0.02] group-hover/upload:border-white/10'
                          }`}
                        >
                          {prescriptionFile ? (
                            <>
                              <CheckCircle size={24} className="text-emerald-500 mb-2" />
                              <p className="text-[10px] font-black text-white uppercase tracking-tighter truncate w-full px-4">{prescriptionFile.name}</p>
                              <p className="text-[8px] text-white/30 uppercase tracking-widest mt-1">File Uploaded</p>
                            </>
                          ) : (
                            <>
                              <Upload size={24} className="text-white/10 mb-2 group-hover/upload:text-cyan-500 transition-colors" />
                              <p className="text-[10px] font-black text-white/40 uppercase tracking-tighter">Click or drag to upload</p>
                              <p className="text-[8px] text-white/20 uppercase tracking-widest mt-1">Image or PDF (Max 5MB)</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Next Appointment */}
                    <div className="space-y-3">
                      <label className="text-[9px] font-black uppercase text-white/30 tracking-[0.4em] flex items-center gap-4">
                        Suggest Follow-up
                        <div className="flex-1 h-[1px] bg-white/5" />
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                        <input
                          type="date"
                          value={nextDateInput}
                          onChange={e => setNextDateInput(e.target.value)}
                          className="w-full bg-white/[0.03] border border-white/5 rounded-xl pl-12 pr-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-500/30 transition-all [color-scheme:dark]"
                        />
                      </div>
                      <p className="text-[7px] text-white/20 uppercase tracking-widest">Optional: Suggest a date for the next visit</p>
                    </div>
                  </div>

                  {/* Checkbox logic */}
                  <div className="p-5 rounded-[1.5rem] bg-orange-500/5 border border-orange-500/10 flex items-center justify-between group hover:bg-orange-500/10 transition-all">
                    <div className="space-y-0.5">
                      <p className="text-white font-black text-[10px] uppercase tracking-tight">First Physical Visit Completed</p>
                      <p className="text-white/30 text-[8px] font-bold uppercase tracking-widest">Confirm the initial consultation has taken place</p>
                    </div>
                    <div
                      onClick={() => setIsFirstVisitDone(!isFirstVisitDone)}
                      className={`w-10 h-5 rounded-full transition-all relative cursor-pointer ${isFirstVisitDone ? 'bg-orange-500 shadow-lg shadow-orange-500/20' : 'bg-white/10'}`}
                    >
                      <motion.div
                        animate={{ x: isFirstVisitDone ? 20 : 4 }}
                        className="absolute top-1 w-3 h-3 rounded-full bg-white shadow-md"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-white/5 bg-black/40 md:rounded-br-[3rem]">
                  <button
                    disabled={submittingNote || !summaryInput.trim()}
                    onClick={handleCompleteAppointment}
                    className="w-full py-4 rounded-[1.5rem] bg-orange-500 text-black text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-orange-400 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:grayscale shadow-xl shadow-orange-500/20"
                  >
                    {submittingNote ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <CheckCircle size={16} />
                    )}
                    Finalize Session & Secure Revenue
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Detail Slide-over ── */}
      <AnimatePresence>
        {selectedAppt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex justify-end"
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setSelectedAppt(null)} />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 200 }}
              className="relative w-full max-w-md h-screen bg-[#0a0a0a] border-l border-white/10 p-8 md:p-10 shadow-2xl overflow-y-auto"
            >
              <button
                onClick={() => setSelectedAppt(null)}
                className="mb-8 p-3 rounded-2xl bg-white/5 border border-white/10 text-white/40 hover:text-white transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
              >
                <XCircle size={16} /> Close
              </button>

              {/* Patient avatar */}
              <div className="flex items-center gap-6 mb-10">
                <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-cyan-500 to-emerald-600 p-0.5 shadow-2xl overflow-hidden flex-shrink-0">
                  {selectedAppt.users?.avatar_url ? (
                    <Image src={selectedAppt.users.avatar_url} alt="" width={80} height={80} className="w-full h-full object-cover rounded-[1.8rem]" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/30 rounded-[1.8rem] bg-black">
                      <User size={32} />
                    </div>
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tighter uppercase">
                    {selectedAppt.users ? `${selectedAppt.users.first_name || ''} ${selectedAppt.users.last_name || ''}`.trim() || 'Unknown Patient' : 'Unknown Patient'}
                  </h2>
                  <span className={`inline-block mt-2 px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest ${statusColor(selectedAppt.status)}`}>
                    {selectedAppt.status}
                  </span>
                </div>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-1 gap-3 mb-8">
                {[
                  { icon: Mail, label: 'Email', value: selectedAppt.users?.email || '—' },
                  { icon: Phone, label: 'Phone', value: selectedAppt.users?.phone || 'Not provided' },
                  {
                    icon: Calendar, label: 'Booked on', value: format(new Date(selectedAppt.created_at), 'dd MMM yyyy, hh:mm a')
                  },
                  {
                    icon: Clock, label: 'Appointment Time',
                    value: selectedAppt.appointment_time ? format(new Date(selectedAppt.appointment_time), 'dd MMM yyyy · hh:mm a') : 'Not specified'
                  },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="bg-white/[0.03] border border-white/10 p-4 rounded-[2rem] flex items-start gap-4">
                    <Icon className="text-cyan-500 mt-0.5 flex-shrink-0" size={16} />
                    <div>
                      <p className="text-white/20 text-[9px] font-black uppercase tracking-widest mb-1">{label}</p>
                      <p className="text-xs font-bold text-white break-words">{value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              {selectedAppt.status === 'pending' && (
                <div className="flex gap-3">
                  <button
                    disabled={busyId === selectedAppt.id}
                    onClick={() => updateStatus(selectedAppt.id, 'accepted')}
                    className="flex-1 py-4 rounded-2xl bg-emerald-500 text-black text-[10px] font-black uppercase tracking-widest hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {busyId === selectedAppt.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                    Accept
                  </button>
                  <button
                    disabled={busyId === selectedAppt.id}
                    onClick={() => updateStatus(selectedAppt.id, 'rejected')}
                    className="flex-1 py-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white hover:border-transparent transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              )}
              {selectedAppt.status !== 'pending' && (
                <div className="py-4 px-6 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
                  <p className="text-white/30 text-[10px] font-black uppercase tracking-widest">
                    This appointment has already been {selectedAppt.status}
                  </p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div >
  );
}

/* ── KYC Pending Screen ── */
export function KycPending({ status }: { status: 'pending' | 'rejected' | 'approved' }) {
  const configs = {
    pending: {
      icon: <Clock className="w-16 h-16 text-yellow-400" />,
      title: 'Application Under Review',
      subtitle: 'KYC Verification Pending',
      description: 'Your veterinarian credentials are being reviewed by our compliance team. You will gain full dashboard access once approved.',
      color: 'text-yellow-400',
      glow: 'bg-yellow-500/10',
      border: 'border-yellow-500/20',
      barColor: 'via-yellow-500',
    },
    rejected: {
      icon: <XCircle className="w-16 h-16 text-red-400" />,
      title: 'Application Rejected',
      subtitle: 'Verification Failed',
      description: 'Your application has been rejected. Please contact our support team for more information and to re-apply.',
      color: 'text-red-400',
      glow: 'bg-red-500/10',
      border: 'border-red-500/20',
      barColor: 'via-red-500',
    },
    approved: {
      icon: <CheckCircle className="w-16 h-16 text-emerald-400" />,
      title: 'Application Approved',
      subtitle: 'Welcome Aboard, Doctor',
      description: 'Congratulations! Your credentials have been verified. Your dashboard is loading now.',
      color: 'text-emerald-400',
      glow: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      barColor: 'via-emerald-500',
    },
  } as const;

  const cfg = configs[status];

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`relative w-full max-w-lg rounded-[2.5rem] ${cfg.glow} ${cfg.border} border p-12 text-center overflow-hidden bg-[#0a0a0a]/80 backdrop-blur-3xl shadow-2xl`}
      >
        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent ${cfg.barColor} to-transparent opacity-60`} />
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/[0.02] rounded-full -mr-20 -mt-20 blur-[80px]" />

        <div className="relative z-10">
          <div className="flex justify-center mb-6">{cfg.icon}</div>
          <p className={`text-[10px] font-black uppercase tracking-[0.4em] ${cfg.color} mb-3`}>{cfg.subtitle}</p>
          <h2 className={`text-3xl font-black tracking-tighter uppercase text-white mb-4`}>{cfg.title}</h2>
          <p className="text-white/30 text-sm leading-relaxed mb-8 max-w-sm mx-auto">{cfg.description}</p>

          {status === 'pending' && (
            <div className="flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-yellow-400/60">
              <div className="animate-spin h-4 w-4 border-2 border-yellow-400/40 border-t-yellow-400 rounded-full" />
              Awaiting Admin Review
            </div>
          )}
          {status === 'rejected' && (
            <a
              href="mailto:support@petzonee.com"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white hover:border-transparent transition-all"
            >
              <Mail size={14} /> Contact Support
            </a>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function ControlButton({ label, icon, color, onClick, count }: any) {
  const colors: any = {
    blue: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    orange: "text-orange-500 bg-orange-500/10 border-orange-500/20",
    emerald: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    pink: "text-pink-500 bg-pink-500/10 border-pink-500/20",
    cyan: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20"
  };

  return (
    <button
      onClick={onClick}
      className="group relative bg-[#0a0a0a] border border-white/5 rounded-[2rem] p-6 flex flex-col items-center gap-4 hover:border-white/10 hover:bg-white/[0.02] transition-all overflow-hidden"
    >
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${colors[color]} transition-transform group-hover:scale-110 shadow-lg`}>
        {React.cloneElement(icon, { size: 24 })}
      </div>
      <div className="text-center">
        <p className="text-white font-black text-[10px] uppercase tracking-widest">{label}</p>
        {count !== undefined && count > 0 && (
          <p className="text-orange-500 text-[8px] font-black uppercase mt-1 animate-pulse">{count} NEW</p>
        )}
      </div>
      <ArrowRight size={14} className="absolute bottom-4 right-4 text-white/10 group-hover:text-white/30 transition-colors" />
    </button>
  );
}

function StatCard({ label, value, trend, icon, color, alert }: any) {
  const colors: any = {
    blue: "from-blue-500 to-indigo-600 shadow-blue-500/10",
    orange: "from-orange-500 to-yellow-600 shadow-orange-500/10",
    purple: "from-purple-500 to-pink-600 shadow-purple-500/10",
    pink: "from-pink-500 to-rose-600 shadow-pink-500/10",
    emerald: "from-emerald-500 to-teal-600 shadow-emerald-500/10",
    cyan: "from-cyan-500 to-blue-500 shadow-cyan-500/10",
    red: "from-red-500 to-rose-600 shadow-red-500/10",
  };

  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-8 space-y-6 group hover:border-white/10 transition-all shadow-2xl overflow-hidden relative"
    >
      <div className="flex items-center justify-between relative z-10">
        <div className={`w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-xl shadow-inner group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
        <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${alert ? 'bg-red-500/20 text-red-500 border-red-500/30 animate-pulse' : 'bg-white/5 text-white/40 border-white/10'}`}>
          {trend}
        </div>
      </div>
      <div className="relative z-10">
        <p className="text-white/20 text-[9px] font-black uppercase tracking-[0.2em]">{label}</p>
        <h3 className="text-3xl font-black text-white tracking-tighter">{value}</h3>
      </div>
      <div className={`absolute -bottom-8 -right-8 w-32 h-32 bg-gradient-to-br ${colors[color]} blur-[60px] opacity-0 group-hover:opacity-20 transition-opacity`}></div>
    </motion.div>
  );
}

function ChartWrapper({ title, subtitle, children, className }: any) {
  return (
    <div className={`bg-[#0a0a0a] border border-white/5 rounded-[2rem] p-8 shadow-2xl space-y-6 flex flex-col ${className}`}>
      <div className="flex flex-col gap-1">
        <h3 className="text-2xl font-black text-white tracking-tight uppercase flex items-center justify-between">
          {title}
          <div className="w-5 h-5 flex items-center justify-center text-white/20">
            <ChevronRight size={20} className="-rotate-45" />
          </div>
        </h3>
        <p className="text-white/20 text-[10px] font-bold uppercase tracking-[0.3em]">{subtitle}</p>
      </div>
      <div className="w-full flex-1 min-h-[300px]">
        {children}
      </div>
    </div>
  );
}

/* ── Export ── */
export default function VetDashboard(props: {
  name: string;
  meId: string | null;
  avatarUrl: string | null;
  onAvatarChange: (url: string | null) => void;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}) {
  return <VetDashboardInner {...props} />;
}
