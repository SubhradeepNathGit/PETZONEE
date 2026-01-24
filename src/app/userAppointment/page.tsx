// app/appointments/page.tsx
'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDays, Mail, Clock, User as UserIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';

/* ============================ Types ============================ */
type Vet = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
};

type Appointment = {
  id: string;
  user_id: string;
  vet_id: string;
  appointment_time: string; // ISO
  status: 'pending' | 'accepted' | 'rejected';
  notes: string | null;
  created_at: string;
  updated_at: string;
  vet?: Vet | null;
};

export default function AppointmentsPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<Appointment[]>([]);
  const [error, setError] = useState<string | null>(null);

  /* --------------------------- Helpers --------------------------- */
  const fmtDate = useCallback((iso: string) => {
    try {
      return new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Kolkata',
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  }, []);

  const statusStyles = useCallback((status: Appointment['status']) => {
    if (status === 'accepted')
      return 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700';
    if (status === 'rejected')
      return 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700';
    // pending
    return 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-300 text-white';
  }, []);

  const fetchAppointments = useCallback(
    async (uid: string) => {
      setError(null);
      const { data, error } = await supabase
        .from('appointments')
        .select(
          `
          id,
          user_id,
          vet_id,
          appointment_time,
          status,
          notes,
          created_at,
          updated_at,
          vet:veterinarian (
            id,
            name,
            email,
            phone,
            avatar_url
          )
        `
        )
        .eq('user_id', uid)
        .order('appointment_time', { ascending: false });

      if (error) {
        setError(error.message);
        return;
      }
      setItems((data as unknown as Appointment[]) ?? []);
    },
    []
  );

  /* ------------------------- Bootstrap -------------------------- */
  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;
      if (!mounted) return;

      setUserId(uid);
      if (!uid) {
        setLoading(false);
        return;
      }
      await fetchAppointments(uid);
      setLoading(false);

      // realtime
      const channel = supabase
        .channel(`appointments-user-${uid}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'appointments',
            filter: `user_id=eq.${uid}`,
          },
          async () => {
            await fetchAppointments(uid);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    })();

    return () => {
      mounted = false;
    };
  }, [fetchAppointments]);

  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    const up: Appointment[] = [];
    const pa: Appointment[] = [];
    for (const a of items) {
      const t = new Date(a.appointment_time).getTime();
      if (t >= now) up.push(a);
      else pa.push(a);
    }
    return { upcoming: up, past: pa };
  }, [items]);

  /* ----------------------------- UI ----------------------------- */
  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-sky-300 via-sky-200 to-sky-100">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading appointments...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      {/* === Top Banner === */}
      <div className="relative w-full h-48 sm:h-64 md:h-72 lg:h-80">
        <Image
          src="/images/statbg13.jpg" 
          alt="My Appointments Banner"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/40 flex flex-col justify-center items-center text-center">
          <h1 className="text-3xl md:text-5xl font-bold text-white">My Appointments</h1>
          <p className="text-sm md:text-base text-gray-200 mt-2">Home / Profile / My Appointments</p>
        </div>
      </div>

      {/* Main Content - Cream Background */}
      <section className="bg-gradient-to-b from-orange-50 via-amber-50 to-orange-100 min-h-screen py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          
          {/* Error Messages */}
          {error && (
            <div className="mb-6 p-4 rounded-lg border-l-4 bg-red-50 border-red-400 text-red-800">
              <div className="flex items-center">
                <span className="text-sm font-medium">❌ {error}</span>
              </div>
            </div>
          )}

          {!userId ? (
            <EmptyState
              title="You're not signed in"
              subtitle="Sign in to view your appointments."
              icon={<UserIcon className="h-8 w-8" />}
            />
          ) : (
            <>
              {/* Upcoming Appointments */}
              <Section
                title="Upcoming Appointments"
                subtitle={`${upcoming.length} scheduled appointments`}
              >
                {upcoming.length === 0 ? (
                  <EmptyState
                    title="No upcoming appointments"
                    subtitle="When you book one, it'll appear here."
                    icon={<CalendarDays className="h-8 w-8" />}
                  />
                ) : (
                  <div className="grid gap-4">
                    <AnimatePresence initial={false}>
                      {upcoming.map((a) => (
                        <AppointmentCard
                          key={a.id}
                          appt={a}
                          fmtDate={fmtDate}
                          statusStyles={statusStyles}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </Section>

              {/* Past Appointments */}
              <Section 
                title="Past Appointments"
                subtitle={`${past.length} completed appointments`}
              >
                {past.length === 0 ? (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
                    <p className="text-gray-600">No past appointments yet.</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    <AnimatePresence initial={false}>
                      {past.map((a) => (
                        <AppointmentCard
                          key={a.id}
                          appt={a}
                          fmtDate={fmtDate}
                          statusStyles={statusStyles}
                          dim
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </Section>
            </>
          )}

          {/* Footer Info */}
          <div className="mt-8 p-6 rounded-xl border border-white/20 bg-orange-300/20 backdrop-blur-md">
            <div className="flex items-start gap-3">
              <div className="text-sm text-gray-700 leading-relaxed">
                <p className="font-medium mb-2 text-gray-800">Need Help?</p>
                <ul className="space-y-1 text-gray-600">
                  <li>• Contact support if you need to modify appointments</li>
                  <li>• Check your email for appointment confirmations</li>
                  <li>• Arrive 15 minutes early for your scheduled appointments</li>
                  <li>• Cancellations must be made at least 2 hours in advance</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

/* ========================= Subcomponents ========================= */

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          {title}
          {subtitle && <span className="text-sm font-normal text-gray-600">({subtitle})</span>}
        </h2>
      </div>
      {children}
    </section>
  );
}

function AppointmentCard({
  appt,
  fmtDate,
  statusStyles,
  dim = false,
}: {
  appt: Appointment;
  fmtDate: (iso: string) => string;
  statusStyles: (s: Appointment['status']) => string;
  dim?: boolean;
}) {
  const vet = appt.vet;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200 ${dim ? 'opacity-75' : ''}`}
    >
      <div className="flex items-center justify-between">
        {/* Vet Info */}
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 rounded-full overflow-hidden border-3 border-gray-200 bg-gray-100">
              {vet?.avatar_url ? (
                <Image
                  src={vet.avatar_url}
                  alt={`Dr. ${vet?.name || 'Veterinarian'}`}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-600 text-lg font-semibold">
                  {initials(vet?.name)}
                </div>
              )}
            </div>
            {/* Status indicator */}
            <div className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 border-2 border-white rounded-full ${
              appt.status === 'accepted' ? 'bg-green-500' : 
              appt.status === 'rejected' ? 'bg-red-500' : 
              'bg-orange-500'
            }`}></div>
          </div>
          
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              Dr. {vet?.name || 'Veterinarian'}
            </h3>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                {fmtDate(appt.appointment_time)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={statusStyles(appt.status)}>
                {appt.status === 'accepted' ? '✓ Accepted' :
                 appt.status === 'rejected' ? '✗ Rejected' :
                 '⏳ Pending'}
              </span>
              {vet?.email && (
                <a
                  href={`mailto:${vet.email}`}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                >
                  <Mail className="h-3 w-3" />
                  Email
                </a>
              )}
            </div>
            {appt.notes && (
              <p className="mt-2 text-sm text-gray-600 line-clamp-2">{appt.notes}</p>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function EmptyState({
  title,
  subtitle,
  icon,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
        {icon || <CalendarDays className="h-8 w-8" />}
      </div>
      <h3 className="text-gray-900 text-lg font-medium">{title}</h3>
      {subtitle && <p className="text-gray-500 text-sm mt-2">{subtitle}</p>}
    </div>
  );
}

function initials(name?: string | null) {
  if (!name) return 'V';
  const parts = name.trim().split(/\s+/);
  return (
    (parts[0]?.[0] ?? 'V').toUpperCase() + (parts[1]?.[0] ?? '').toUpperCase()
  );
}