'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/sidebar';
import UserAppointmentsView from '@/components/portal/UserAppointmentsView';

import { Role, PetRow, PetUI, SidebarItem, VetRow } from '@/components/portal/shared/types';
import { useAsyncError } from '@/components/portal/shared/hooks';
import { resolvePetPhotoUrl } from '@/components/portal/shared/utils';
import { Card, LoadingCard, SkeletonDashboard } from '@/components/portal/shared/ui';
import {
  IconHome, IconCalendar, IconUsers, IconUser, IconBell, IconChart, IconShield, IconPackage,
  IconShoppingBag, IconCompass, IconPlus, IconHeart, IconSettings, IconTrash, IconLogOut, IconX, IconPawPrint, IconDog
} from '@/components/portal/shared/icons';
import { CheckCircle, AlertCircle, Info, AlertTriangle, XCircle, PawPrint, Menu, X as IconXLucide } from 'lucide-react';

const AdminDashboard = dynamic(() => import('@/components/portal/AdminDashboard'), { ssr: false });
const VetDashboard = dynamic(() => import('@/components/portal/VetDashboard'), { ssr: false });
const UserDashboard = dynamic(() => import('@/components/portal/UserDashboard'), { ssr: false });
import { loadPendingVets, loadAdminStats } from '@/components/portal/AdminDashboard';
import { KycPending } from '@/components/portal/VetDashboard';

type UserProfileRow = {
  first_name: string | null;
  role: 'admin' | 'user' | null;
  avatar_url: string | null;
};

type VetProfileRow = {
  kyc_status: 'pending' | 'approved' | 'rejected';
  name: string | null;
  avatar_url: string | null;
};

function PortalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = searchParams.get('view');
  const throwAsyncError = useAsyncError();
  const [role, setRole] = useState<Role>('loading');
  const [firstName, setFirstName] = useState('');
  const [meId, setMeId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  const [vetKyc, setVetKyc] = useState<'pending' | 'approved' | 'rejected' | null>(null);
  const [vetName, setVetName] = useState<string>('');
  const [vetAvatar, setVetAvatar] = useState<string | null>(null);

  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);
  const [pendingVets, setPendingVets] = useState<VetRow[]>([]);
  const [stats, setStats] = useState({ users: 0, vetsPending: 0, vetsApproved: 0 });
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'error' | 'info'>('info');

  const [notiCount, setNotiCount] = useState(0);
  const [showPets, setShowPets] = useState(false);
  const [pets, setPets] = useState<PetUI[]>([]);
  const [petsLoading, setPetsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const showMessage = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'info') => {
      setMsg(message);
      setMsgType(type);
      setTimeout(() => setMsg(''), 5000);
    },
    []
  );

  const handleError = useCallback(
    (error: unknown, context = 'Operation') => {
      console.error(`${context} error:`, error);
      const message = error instanceof Error ? error.message : `${context} failed. Please try again.`;
      showMessage(message, 'error');
    },
    [showMessage]
  );

  const initializeUser = useCallback(
    async (maxRetries = 3) => {
      try {
        setMsg('');
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        const user = authData.user;
        if (!user) {
          setRole('none');
          return;
        }
        setMeId(user.id);

        const profileRes = await supabase
          .from('users')
          .select('first_name, role, avatar_url')
          .eq('id', user.id)
          .maybeSingle();
        const profile: UserProfileRow | null = (profileRes.data as UserProfileRow | null) ?? null;

        if (profile?.role === 'admin') {
          setRole('admin');
          setFirstName(profile.first_name ?? '');
          setProfileAvatar(profile.avatar_url ?? null);

          await Promise.allSettled([
            loadPendingVets(setPendingVets).catch(e => handleError(e, 'Loading pending vets')),
            loadAdminStats(setStats).catch(e => handleError(e, 'Loading admin stats')),
            loadNotiCount(user.id, 'admin', setNotiCount).catch(e => handleError(e, 'Loading notifications')),
          ]);
          return;
        }

        const vetRes = await supabase
          .from('veterinarian')
          .select('kyc_status, name, avatar_url')
          .eq('id', user.id)
          .maybeSingle();
        const vet: VetProfileRow | null = (vetRes.data as VetProfileRow | null) ?? null;

        if (vet) {
          setRole('vet');
          setVetKyc(vet.kyc_status);
          setVetName(vet.name ?? '');
          setVetAvatar(vet.avatar_url ?? null);
          await loadNotiCount(user.id, 'vet', setNotiCount).catch(e => handleError(e, 'Loading vet notifications'));
          return;
        }

        if (profile) {
          setRole('user');
          setFirstName(profile.first_name ?? '');
          setProfileAvatar(profile.avatar_url ?? null);
          await loadNotiCount(user.id, 'user', setNotiCount).catch(e => handleError(e, 'Loading user notifications'));
          return;
        }

        setRole('none');
      } catch (error: unknown) {
        if (retryCount < maxRetries && isOnline) {
          setRetryCount(prev => prev + 1);
          setTimeout(() => initializeUser(maxRetries), 1000 * Math.pow(2, retryCount));
          return;
        }
        handleError(error, 'User initialization');
        setRole('none');
      }
    },
    [retryCount, isOnline, handleError]
  );

  useEffect(() => {
    initializeUser();
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      setBusy('logout');
      await supabase.auth.signOut();
      window.location.href = '/signup';
    } catch (error: unknown) {
      handleError(error, 'Logout');
    } finally {
      setBusy('');
    }
  }, [handleError]);

  const handleDeleteAccount = useCallback(async () => {
    if (!meId) return;
    if (!confirm('Delete your account? This cannot be undone.')) return;

    try {
      setBusy('delete');
      await Promise.allSettled([
        supabase.from('veterinarian').delete().eq('id', meId),
        supabase.from('users').delete().eq('id', meId),
      ]);
      await supabase.auth.signOut();
      window.location.href = '/signup';
    } catch (e: unknown) {
      handleError(e, 'Account deletion');
    } finally {
      setBusy('');
    }
  }, [meId, handleError]);

  function getLegacyPetImage(obj: object): string | null {
    const candidate = obj as { image_url?: unknown; photo?: unknown };
    if (typeof candidate.image_url === 'string') return candidate.image_url;
    if (typeof candidate.photo === 'string') return candidate.photo;
    return null;
  }

  const loadMyPets = useCallback(async () => {
    if (!meId) return;
    try {
      setShowPets(true);
      setPetsLoading(true);
      const { data, error } = await supabase
        .from('pets')
        .select('id, owner_id, name, species, breed, avatar_url, photo_url, dob, cover_url')
        .eq('owner_id', meId)
        .order('created_at', { ascending: true });
      if (error) throw error;

      const normalized: PetUI[] = await Promise.all(
        (data ?? []).map(async (p: PetRow) => {
          const primary =
            p.avatar_url ??
            p.photo_url ??
            getLegacyPetImage(p);
          const resolved = await resolvePetPhotoUrl(primary ?? null);
          return { ...p, photo_resolved: resolved };
        })
      );
      setPets(normalized);
    } catch (error: unknown) {
      handleError(error, 'Loading pets');
    } finally {
      setPetsLoading(false);
    }
  }, [meId, handleError]);

  const content = useMemo(() => {
    if (role === 'loading') return <SkeletonDashboard />;

    if (role === 'admin')
      return (
        <AdminDashboard
          firstName={firstName}
          meId={meId}
          rows={pendingVets}
          stats={stats}
          busy={busy}
          setBusy={setBusy}
          showMessage={showMessage}
          profileAvatar={profileAvatar}
          onAvatarChange={setProfileAvatar}
          refresh={async () => {
            await Promise.allSettled([loadPendingVets(setPendingVets), loadAdminStats(setStats)]);
          }}
        />
      );

    if (role === 'vet') {
      if (vetKyc === 'approved') {
        return (
          <VetDashboard
            name={vetName}
            meId={meId}
            avatarUrl={vetAvatar}
            onAvatarChange={setVetAvatar}
            showMessage={showMessage}
          />
        );
      }
      return <KycPending status={vetKyc ?? 'pending'} />;
    }

    if (role === 'user') {
      if (view === 'appointments' && meId) {
        return <UserAppointmentsView userId={meId} />;
      }
      return (
        <UserDashboard
          firstName={firstName}
          meId={meId}
          profileAvatar={profileAvatar}
          onAvatarChange={setProfileAvatar}
          showMessage={showMessage}
          onExploreMyPets={loadMyPets}
        />
      );
    }

    return (
      <Card>
        <div className="text-center py-8 text-white">
          <div className="text-6xl mb-4"></div>
          <h2 className="text-xl font-bold mb-2">Authentication Required</h2>
          <p className="text-gray-300 mb-4">Please sign in to access your dashboard.</p>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium shadow hover:brightness-110 transition"
          >
            Sign In
          </Link>
        </div>
      </Card>
    );
  }, [
    role, firstName, meId, pendingVets, stats, busy, vetKyc, vetName, vetAvatar,
    profileAvatar, showMessage, loadMyPets, view
  ]);

  const getSidebarItems = useCallback(
    (r: Role, count: number): SidebarItem[] => {
      const baseItems = {
        vet: [
          { label: 'Dashboard', href: '/dashboard', icon: <IconHome /> },
          { label: 'Appointments', href: '/appointments', icon: <IconCalendar /> },
          { label: 'Patients', href: '/patients', icon: <IconUsers /> },
          { label: 'Profile', href: '/settings/profile', icon: <IconUser /> },
          { label: 'Notifications', href: '/notifications', badge: count, icon: <IconBell /> },
        ],
        admin: [
          { label: 'Home', href: '/admin', icon: <IconHome /> },
          { label: 'Analytics', href: '/admin/analytics', icon: <IconChart /> },
          { label: 'KYC Review', href: '/admin/kyc', icon: <IconShield /> },
          { label: 'Products', href: '/admin/products', icon: <IconPackage /> },
          { label: 'Orders', href: '/admin/orders', icon: <IconShoppingBag /> },
          { label: 'Profile', href: '/dashboard', icon: <IconUser /> },
        ],
        user: [
          { label: 'Home', href: '/', icon: <IconHome /> },
          { label: 'Discover', href: '/feed', icon: <IconCompass /> },
          { label: 'Create', href: '/pets/new', icon: <IconPlus /> },
          { label: 'My Pets', onClick: loadMyPets, icon: <IconHeart /> },
          { label: 'Profile', href: '/dashboard', icon: <IconUser /> },
          { label: 'Cart', href: '/cart', icon: <IconShoppingBag /> },
          { label: 'Orders', href: '/orders', icon: <IconPackage /> },
        ],
      } as const;

      const items = r === 'vet' || r === 'admin' || r === 'user' ? baseItems[r] : [];
      return [
        ...items,
        { label: 'Settings', href: '/settings', icon: <IconSettings /> },
        { label: 'Delete Account', onClick: handleDeleteAccount, icon: <IconTrash /> },
        { label: 'Log Out', onClick: handleLogout, icon: <IconLogOut /> },
      ];
    },
    [loadMyPets, handleDeleteAccount, handleLogout]
  );

  const sidebar = (
    <Sidebar
      role={role === 'loading' || role === 'none' ? 'user' : role}
      name={role === 'vet' ? (vetName ? `Dr. ${vetName}` : 'Doctor') : firstName || 'User'}
      avatarUrl={(role === 'vet' ? vetAvatar : profileAvatar) || undefined}
      onItemClick={() => setIsSidebarOpen(false)}
    />
  );

  return (
    <ErrorBoundary>
      <main className="min-h-screen relative bg-black/90 text-white">


        <div className="min-h-screen bg-transparent flex">
          <aside className="hidden lg:block fixed left-0 top-0 h-screen w-64 xl:w-72 bg-black/80 backdrop-blur-xl border-r border-gray-800 z-30">
            {sidebar}
          </aside>

          {/* Mobile/Tablet Sidebar with AnimatePresence */}
          <AnimatePresence>
            {isSidebarOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsSidebarOpen(false)}
                  className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                />
                <motion.aside
                  initial={{ x: '-100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '-100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="lg:hidden fixed left-0 top-0 h-screen w-72 bg-black z-[101] shadow-2xl"
                >
                  <div className="absolute top-4 right-4 z-[102]">
                    <button
                      onClick={() => setIsSidebarOpen(false)}
                      className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white"
                    >
                      <IconXLucide size={20} />
                    </button>
                  </div>
                  {sidebar}
                </motion.aside>
              </>
            )}
          </AnimatePresence>

          <div className="flex-1 min-w-0 lg:ml-64 xl:ml-72 flex flex-col">
            {/* Top Bar for Mobile Toggle */}
            <div className="lg:hidden sticky top-0 left-0 right-0 z-40 px-4 py-4 flex items-center bg-black/20 backdrop-blur-md border-b border-white/5">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all shadow-lg shadow-white/5"
              >
                <Menu size={20} />
              </button>
              <div className="ml-4 flex flex-col">
                <span className="text-[10px] font-bold text-[#5F97C9] uppercase tracking-[0.2em] leading-none mb-1">Portal</span>
                <span className="text-sm font-bold text-white tracking-tight leading-none uppercase">PETZONEE</span>
              </div>
            </div>


            <div className="container mx-auto px-1.5 sm:px-4 md:px-6 max-w-7xl py-2">
              <div className="rounded-2xl p-3 sm:p-6 md:p-8">
                {view !== 'appointments' && (
                  <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <motion.h1
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        className="text-4xl md:text-5xl font-black bg-gradient-to-r from-orange-500 via-yellow-400 to-orange-300 bg-clip-text text-transparent tracking-tighter"
                      >
                        Welcome to PETZONEE
                      </motion.h1>
                      <motion.p
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="text-gray-400 text-lg font-medium mt-2"
                      >
                        Personalise your experience and manage your pet care needs effectively
                      </motion.p>
                    </div>
                    <div className="flex items-center gap-3 text-md mr-1 font-semibold">
                      <span className="px-3 py-1 rounded-full bg-gradient-to-r from-orange-700 to-yellow-400 text-white border border-white/10">
                        {role === 'admin'
                          ? `Admin${firstName ? ` ${firstName}` : ''}`
                          : role === 'vet'
                            ? `Vet ${vetKyc ?? 'pending'}`
                            : role === 'user'
                              ? `User${firstName ? ` ${firstName}` : ''}`
                              : 'Guest'}
                      </span>
                    </div>
                  </header>
                )}

                <AnimatePresence mode="wait">
                  <motion.div
                    key={role + (vetKyc ?? '')}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    {content}
                  </motion.div>
                </AnimatePresence>

                <AnimatePresence>
                  {msg && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className={`mt-6 rounded-xl p-4 border ${msgType === 'error'
                        ? 'bg-red-500/10 text-red-200 border-red-500/30'
                        : msgType === 'success'
                          ? 'bg-emerald-500/10 text-emerald-200 border-emerald-500/30'
                          : 'bg-blue-500/10 text-blue-200 border-blue-500/30'
                        }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-lg">
                          {msgType === 'error' ? <XCircle className="w-5 h-5" /> : msgType === 'success' ? <CheckCircle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
                        </span>
                        <p className="text-sm font-medium">{msg}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {showPets && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={(e) => {
                if (e.target === e.currentTarget) setShowPets(false);
              }}
            >
              <motion.div
                className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#0d0d14] p-6 border border-white/[0.08]"
                initial={{ scale: 0.94, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.94, opacity: 0 }}
                transition={{ type: 'spring', duration: 0.3 }}
              >
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black text-white tracking-tight">My Pets</h3>
                    <p className="text-xs text-white/30 mt-0.5">{pets.length > 0 ? `${pets.length} companion${pets.length !== 1 ? 's' : ''}` : 'No pets yet'}</p>
                  </div>
                  <button
                    onClick={() => setShowPets(false)}
                    className="rounded-full bg-white/[0.07] border border-white/10 p-2 text-white/50 hover:bg-white/[0.12] hover:text-white transition-all"
                  >
                    <IconX size={18} />
                  </button>
                </div>

                {petsLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-44 bg-white/[0.04] rounded-2xl mb-3" />
                        <div className="h-3.5 bg-white/[0.04] rounded-full mb-2" />
                        <div className="h-3 bg-white/[0.04] rounded-full w-3/4" />
                      </div>
                    ))}
                  </div>
                ) : pets.length === 0 ? (
                  <div className="text-center py-16 flex flex-col items-center justify-center">
                    <div className="h-16 w-16 rounded-full bg-[#FF8A65]/10 border border-[#FF8A65]/15 flex items-center justify-center mb-5">
                      <PawPrint className="text-[#FF8A65] w-8 h-8" />
                    </div>
                    <h4 className="text-xl font-bold text-white mb-2">No pets added yet</h4>
                    <p className="text-white/30 mb-8 max-w-xs mx-auto text-sm">
                      Your journey starts here! Add your first furry friend to personalize your experience.
                    </p>
                    <Link
                      href="/pets/new"
                      className="inline-flex items-center justify-center gap-2 px-8 py-3 font-bold text-white bg-gradient-to-r from-[#FF8A65] to-[#FF7043] rounded-full shadow-lg shadow-orange-500/20 hover:shadow-orange-500/35 hover:brightness-110 transition-all"
                    >
                      Add My Pet
                      <IconPlus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pets.map((pet) => {
                      const photoSrc = pet.photo_resolved || null;
                      return (
                        <div
                          key={pet.id}
                          className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.04] hover:border-[#FF8A65]/30 hover:bg-white/[0.07] transition-all duration-300 hover:scale-[1.02]"
                        >
                          <div className="relative h-44 w-full bg-[#0e1520]">
                            {photoSrc ? (
                              <Image
                                src={photoSrc}
                                alt={pet.name}
                                fill
                                unoptimized
                                sizes="(max-width: 768px) 100vw, 33vw"
                                className="object-cover group-hover:scale-105 transition-transform duration-500"
                                draggable={false}
                                onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : null}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                          </div>
                          <div className="p-4">
                            <h4 className="font-bold text-base text-white mb-1 truncate">{pet.name}</h4>
                            <div className="flex flex-wrap items-center gap-1.5 mb-3">
                              {pet.species && (
                                <span className="rounded-full bg-[#FF8A65]/10 border border-[#FF8A65]/15 px-2 py-0.5 text-[11px] font-semibold text-[#FF8A65]">
                                  {pet.species}
                                </span>
                              )}
                              {pet.breed && (
                                <span className="rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-[11px] font-medium text-white/40">
                                  {pet.breed}
                                </span>
                              )}
                            </div>
                            <Link
                              href={`/pets/${pet.id}`}
                              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#FF8A65] to-[#FF7043] px-4 py-1.5 text-xs font-bold text-white hover:brightness-110 transition-all"
                            >
                              View Profile
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </ErrorBoundary>
  );
}

import React from 'react';
function ErrorBoundaryInner({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return <>{children}</>;
}
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Dashboard Error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="min-h-screen flex items-center justify-center">
            <Card className="max-w-md">
              <div className="text-center text-white">
                <div className="flex justify-center mb-4"><AlertTriangle className="text-yellow-400 w-12 h-12" /></div>
                <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
                <p className="text-gray-300 mb-4">We are sorry, but something unexpected happened.</p>
                <button
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium hover:brightness-110 transition"
                >
                  Reload Page
                </button>
              </div>
            </Card>
          </div>
        )
      );
    }
    return <ErrorBoundaryInner>{this.props.children}</ErrorBoundaryInner>;
  }
}

async function loadNotiCount(
  userId: string,
  _role: 'user' | 'vet' | 'admin',
  setCount: (n: number) => void
) {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('seen', false);
    if (error) throw error;
    setCount(count ?? 0);
  } catch (error: unknown) {
    console.error('Load notification count error:', error);
    setCount(0);
  }
}

export default function Portal() {
  return (
    <Suspense fallback={<SkeletonDashboard />}>
      <PortalContent />
    </Suspense>
  );
}
