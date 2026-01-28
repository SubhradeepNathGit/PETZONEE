'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/sidebar';

import { Role, PetRow, PetUI, SidebarItem, VetRow } from '@/components/portal/shared/types';
import { useAsyncError } from '@/components/portal/shared/hooks';
import { resolvePetPhotoUrl } from '@/components/portal/shared/utils';
import { Card, LoadingCard } from '@/components/portal/shared/ui';
import {
  IconHome, IconCalendar, IconUsers, IconUser, IconBell, IconChart, IconShield, IconPackage,
  IconShoppingBag, IconCompass, IconPlus, IconHeart, IconSettings, IconTrash, IconLogOut, IconX, IconPawPrint, IconDog
} from '@/components/portal/shared/icons';

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

export default function Portal() {
  const router = useRouter();
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
    if (role === 'loading') return <LoadingCard />;

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

    if (role === 'user')
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
    profileAvatar, showMessage, loadMyPets
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
    />
  );

  return (
    <ErrorBoundary>
      <main className="min-h-screen relative bg-black/90 text-white">


        <div className="min-h-screen bg-transparent flex">
          <aside className="hidden lg:block fixed left-0 top-0 h-screen w-64 xl:w-72 bg-black/80 backdrop-blur-xl border-r border-gray-800 z-30">
            {sidebar}
          </aside>

          <div className="flex-1 min-w-0 lg:ml-64 xl:ml-72">
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40">
              <div className="backdrop-blur-xl border-t border-white/10 px-4 py-2">
                <div className="flex justify-around">
                  {getSidebarItems(role, notiCount).slice(0, 5).map((item, i) => (
                    <button
                      key={i}
                      onClick={() => { item.onClick ? item.onClick() : item.href ? router.push(item.href) : null; }}
                      className="flex flex-col items-center py-2 px-3 text-xs font-medium text-gray-300 hover:text-cyan-300 transition-colors relative"
                    >
                      {item.icon}
                      <span className="mt-1 truncate max-w-12">{item.label}</span>
                      {item.badge && item.badge > 0 && (
                        <span className="absolute -top-1 -right-1 bg-yellow-400 text-gray-900 text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {item.badge > 99 ? '99+' : item.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="container mx-auto px-3 sm:px-4 md:px-6 max-w-7xl py-2">
              <div className="rounded-2xl p-4 sm:p-6 md:p-8">
                <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <motion.h1
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-orange-500 to-yellow-300  bg-clip-text text-transparent"
                    >
                      Welcome to PETZONEE
                    </motion.h1>
                    <motion.p
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.1 }}
                      className="text-gray-300 text-sm"
                    >
                      Personalise your experience and manage your pet care needs effectively
                    </motion.p>
                  </div>
                  <div className="flex items-center gap-3 text-md mr-1 font-semibold">
                    <span className="px-3 py-1 rounded-full bg-gradient-to-r from-orange-700 to-yellow-400 text-white border border-white/10 shadow">
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
                      className={`mt-6 rounded-xl p-4 shadow-sm border ${msgType === 'error'
                        ? 'bg-red-500/10 text-red-200 border-red-500/30'
                        : msgType === 'success'
                          ? 'bg-emerald-500/10 text-emerald-200 border-emerald-500/30'
                          : 'bg-blue-500/10 text-blue-200 border-blue-500/30'
                        }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-lg">
                          {msgType === 'error' ? 'Ã¢ÂÅ’' : msgType === 'success' ? 'Ã¢Å“â€¦' : 'Ã¢â€žÂ¹Ã¯Â¸Â'}
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
                className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-black/80 p-6 shadow-2xl border border-white/10"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', duration: 0.3 }}
              >
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-white">My Pets  </h3>
                  <button
                    onClick={() => setShowPets(false)}
                    className="rounded-full bg-white/10 border border-white/10 p-2 text-gray-200 hover:bg-white/20 transition-colors"
                  >
                    <IconX size={20} />
                  </button>
                </div>

                {petsLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-48 bg-white/10 rounded-xl mb-3" />
                        <div className="h-4 bg-white/10 rounded mb-2" />
                        <div className="h-3 bg-white/10 rounded w-3/4" />
                      </div>
                    ))}
                  </div>
                ) : pets.length === 0 ? (
                  <div className="text-center py-16 flex flex-col items-center justify-center">
                    <h4 className="text-2xl font-bold text-white mb-2">No pets added yet</h4>
                    <p className="text-gray-400 mb-8 max-w-sm mx-auto">
                      Your journey starts here! Add your first furry friend to personalize your experience.
                    </p>
                    <Link
                      href="/pets/new"
                      className="group relative inline-flex items-center justify-center px-10 py-4 font-bold text-white transition-all duration-300 bg-gradient-to-r from-[#FF8A65] to-[#FF7043] rounded-2xl shadow-xl shadow-orange-500/25 hover:shadow-orange-500/40 hover:-translate-y-1 active:translate-y-0 active:scale-95"
                    >
                      <span className="relative flex items-center gap-2">
                        Add My Pet
                        <IconPlus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                      </span>
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pets.map((pet) => {
                      const photoSrc = pet.photo_resolved || null;
                      return (
                        <div
                          key={pet.id}
                          className="group relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                          <div className="relative h-48 w-full bg-gradient-to-br from-[#142034] to-[#0f1a2b]">
                            {photoSrc ? (
                              <Image
                                src={photoSrc}
                                alt={pet.name}
                                fill
                                unoptimized
                                sizes="(max-width: 768px) 100vw, 33vw"
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                                draggable={false}
                                onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : null}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                          </div>
                          <div className="p-4">
                            <h4 className="font-bold text-lg text-white mb-1">{pet.name}</h4>
                            <p className="text-sm text-gray-300 mb-3">
                              {pet.species || 'Pet'}
                              {pet.breed && ` ${pet.breed}`}
                              {pet.dob && ` Born ${new Date(pet.dob).toLocaleDateString()}`}
                            </p>
                            <div className="flex gap-2">
                              <Link
                                href={`/pets/${pet.id}`}
                                className="inline-flex items-center px-3 py-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs shadow hover:brightness-110 transition"
                              >
                                View Profile
                              </Link>
                              {/* <Link
                                href={`/pets/${pet.id}/records`}
                                className="inline-flex items-center px-3 py-1.5 rounded-full bg-white/10 text-white text-xs border border-white/10 hover:bg-white/20 transition"
                              >
                                Medical Records
                              </Link> */}
                            </div>
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
                <div className="text-yellow-400 text-4xl mb-4">Ã¢Å¡Â Ã¯Â¸Â</div>
                <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
                <p className="text-gray-300 mb-4">We are sorry, but something unexpected happened.</p>
                <button
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium shadow hover:brightness-110 transition"
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

