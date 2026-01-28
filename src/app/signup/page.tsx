'use client';

import { useRef, useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-toastify';

type Mode = 'signup' | 'signin';
type Role = 'user' | 'vet';

type UserSignup = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  password: string;
  location_city: string;
  location_state: string;
  location_country: string;
};

/* ---------- Geocode helper (City + State -> lat/lng) ---------- */
async function geocodeCityState(
  city: string,
  state: string,
  country?: string
): Promise<{ lat: number; lng: number } | null> {
  const q = `${city}, ${state}${country ? `, ${country}` : ''}`;
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    const arr = await res.json();
    if (Array.isArray(arr) && arr.length) {
      return { lat: parseFloat(arr[0].lat), lng: parseFloat(arr[0].lon) };
    }
    return null;
  } catch {
    return null;
  }
}

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>('signup');
  const [role, setRole] = useState<Role>('user');

  useEffect(() => {
    if (searchParams.get('mode') === 'signin') {
      setMode('signin');
    }
  }, [searchParams]);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  /* ---------- Handlers ---------- */

  async function onLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);

    const fd = new FormData(e.currentTarget);
    const email = String(fd.get('email') || '');
    const password = String(fd.get('password') || '');

    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) { toast.error(error.message); return; }

    const user = data.user;
    const userRole = (user?.user_metadata as { role?: string })?.role;
    if (userRole === 'vet') {
      const { data: vet } = await supabase
        .from('veterinarian')
        .select('kyc_status')
        .eq('id', user!.id)
        .single();
      if (vet?.kyc_status === 'approved') router.replace('/dashboard');
      else router.replace('/kyc-pending');
    } else {
      router.replace('/dashboard');
    }
  }

  async function onSignupUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);

    const fd = new FormData(e.currentTarget);
    const payload: UserSignup = {
      first_name: String(fd.get('first_name') || ''),
      last_name: String(fd.get('last_name') || ''),
      email: String(fd.get('email') || ''),
      phone: String(fd.get('phone') || ''),
      password: String(fd.get('password') || ''),
      location_city: String(fd.get('location_city') || ''),
      location_state: String(fd.get('location_state') || ''),
      location_country: String(fd.get('location_country') || ''),
    };

    const { data: sign, error: signErr } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: { role: 'user', first_name: payload.first_name, last_name: payload.last_name },
        emailRedirectTo: `${window.location.origin}/signup?mode=signin`,
      },
    });
    if (signErr) { setBusy(false); toast.error(signErr.message); return; }

    const geo = await geocodeCityState(
      payload.location_city,
      payload.location_state,
      payload.location_country || 'India'
    );
    if (!geo) { setBusy(false); toast.error('Could not locate that city/state. Please check the spelling.'); return; }

    const uid = sign.user?.id;
    if (uid) {
      const { error: upErr } = await supabase
        .from('users')
        .upsert(
          {
            id: uid,
            first_name: payload.first_name,
            last_name: payload.last_name,
            email: payload.email,
            phone: payload.phone || null,
            city: payload.location_city,
            state: payload.location_state,
            latitude: geo.lat,
            longitude: geo.lng,
            role: 'user',
          },
          { onConflict: 'id' }
        );

      if (upErr) { setBusy(false); toast.error(upErr.message); return; }
    }

    setBusy(false);
    setBusy(false);
    toast.success('User account created! Please confirm your email.');
    setMode('signin');
  }

  async function onSignupVet(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);

    const fd = new FormData(e.currentTarget);
    const name = String(fd.get('name') || '');
    const email = String(fd.get('email') || '');
    const phone = String(fd.get('phone') || '');
    const password = String(fd.get('password') || '');
    const file = (fd.get('medical_pdf') as File) ?? null;

    const { data: sign, error: signErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role: 'vet', display_name: name },
        emailRedirectTo: `${window.location.origin}/signup?mode=signin`,
      },
    });
    if (signErr) { setBusy(false); toast.error(signErr.message); return; }

    const uid = sign.user?.id;
    if (!uid) { setBusy(false); toast.error('Signup succeeded but no UID found.'); return; }

    let medicalDocUrl: string | null = null;
    if (file && file.size > 0) {
      const path = `${uid}/${Date.now()}-${file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from('medical-docs')
        .upload(path, file, { upsert: true });

      if (uploadErr) {
        setBusy(false);
        toast.error(`File upload failed: ${uploadErr.message}`);
        return;
      }

      const { data: pub } = supabase.storage.from('medical-docs').getPublicUrl(path);
      medicalDocUrl = pub.publicUrl;
    }

    const { error: dbErr } = await supabase.from('veterinarian').insert([{
      id: uid,
      name,
      email,
      phone,
      medical_doc_url: medicalDocUrl,
      kyc_status: 'pending',
    }]);
    if (dbErr) { setBusy(false); toast.error(`Vet insert failed: ${dbErr.message}`); return; }

    setBusy(false);
    setBusy(false);
    toast.success('Vet account created! Please confirm your email. KYC is pending.');
    setMode('signin');
  }

  const isSignup = mode === 'signup';

  return (
    <main className="min-h-screen lg:h-screen w-full bg-[#FF8A65] flex flex-col lg:overflow-hidden">
      {/* Brand Title */}
      <div className="pt-0 pb-3 mt-5 lg:pt-4 lg:pb-2 text-center flex-shrink-0">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white drop-shadow-lg">
          PETZONEE
        </h1>
        <p className="mt-1 text-white/90 text-xs sm:text-sm"> Your Pets Trusted All-in-One Companion</p>
      </div>

      <div className="flex-1 flex flex-col lg:overflow-hidden px-4 lg:px-40">
        {/* Toggle */}
        <div className="mb-0 lg:mb-3 flex justify-center flex-shrink-0">
          <div className="relative inline-flex rounded-full bg-white/30 p-1 shadow-lg">
            <button
              onClick={() => setMode('signup')}
              className={`relative z-10 rounded-full px-6 lg:px-6 py-1 lg:py-1.5 text-sm lg:text-base font-semibold transition-colors duration-200 ${isSignup ? 'text-[#FF8A65]' : 'text-white'
                }`}
            >
              Register
            </button>
            <button
              onClick={() => setMode('signin')}
              className={`relative z-10 rounded-full px-6 lg:px-6 py-1 lg:py-1.5 text-sm lg:text-base font-semibold transition-colors duration-200 ${!isSignup ? 'text-[#FF8A65]' : 'text-white'
                }`}
            >
              Signin
            </button>
            <motion.span
              className="absolute inset-y-1 rounded-full bg-white shadow-md"
              initial={false}
              animate={{
                left: isSignup ? '4px' : '50%',
                right: isSignup ? '50%' : '4px',
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          </div>
        </div>

        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-0 lg:gap-0 flex-1 lg:overflow-hidden pb-0 lg:pb-6">
          {/* Left Column */}
          <div className="flex lg:overflow-hidden items-center justify-center">
            <div className="w-160 h-full lg:max-h-800 lg:max-w-[100%]">
              <AnimatePresence mode="wait">
                {isSignup ? (
                  <motion.div
                    key="signup-form"
                    className="h-full"
                    initial={{ x: -40, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -20, opacity: 0 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                  >
                    <RegisterCard
                      role={role}
                      setRole={setRole}
                      busy={busy}
                      onSubmitUser={onSignupUser}
                      onSubmitVet={onSignupVet}
                      fileRef={fileRef}
                      onSwap={() => setMode('signin')}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="signin-video"
                    className="h-full hidden lg:block"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <VideoCard mode="signin" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right Column */}
          <div className="flex items-center justify-center lg:overflow-hidden">
            <div className="w-full h-full lg:max-h-[calc(100vh-200px)] lg:max-w-[100%]">
              <AnimatePresence mode="wait">
                {isSignup ? (
                  <motion.div
                    key="signup-video"
                    className="h-full hidden lg:block"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <VideoCard mode="signup" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="signin-form"
                    className="h-full"
                    initial={{ x: 40, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 20, opacity: 0 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                  >
                    <LoginCard busy={busy} onSubmit={onLogin} onSwap={() => setMode('signup')} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}

/* ---------- Presentational blocks ---------- */

function VideoCard({ mode }: { mode: 'signup' | 'signin' }) {
  const src = mode === 'signup' ? '/videos/signup.mp4' : '/videos/login.mp4';

  return (
    <div className="relative mx-auto w-140 h-130 mt-7 overflow-hidden rounded-2xl lg:rounded-3xl">
      <video
        key={mode}
        src={src}
        className="h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
      />
    </div>
  );
}

function LoginCard({
  busy,
  onSubmit,
  onSwap,
}: {
  busy: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onSwap: () => void;
}) {
  return (
    <div className="mx-auto w-full h-full flex flex-col justify-start -mt-35 lg:-mt-10 lg:justify-center lg:pt-0 text-white px-4 py-6 lg:py-0">
      <div className="max-w-[500px] lg:max-w-[450px] mx-auto w-full">
        <h2 className="mb-2 text-center text-2xl lg:text-3xl xl:text-4xl font-extrabold leading-none drop-shadow-md">
          Sign in
        </h2>
        <p className="mb-5 lg:mb-6 text-center text-xs lg:text-sm opacity-90">Welcome back, sign in to continue</p>
        <form onSubmit={onSubmit} className="space-y-3 lg:space-y-4">
          <Input name="email" type="email" placeholder="Email Id *" />
          <Input name="password" type="password" placeholder="Password *" />
          <button
            disabled={busy}
            className="w-full rounded-3xl lg:rounded-3xl bg-[#0e2a36] py-2.5 lg:py-3.5 text-sm lg:text-base font-semibold text-white shadow-md hover:bg-[#1a3d4d] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {busy ? 'Signing in…' : 'Login'}
          </button>
        </form>
        <p className="mt-4 text-center text-xs lg:text-sm">
          New here?{' '}
          <button
            type="button"
            onClick={onSwap}
            className="underline decoration-white/60 underline-offset-2 hover:opacity-90 font-medium transition-opacity"
          >
            Create account
          </button>
        </p>
      </div>
    </div>
  );
}

function RegisterCard({
  role,
  setRole,
  busy,
  onSubmitUser,
  onSubmitVet,
  fileRef,
  onSwap,
}: {
  role: Role;
  setRole: (r: Role) => void;
  busy: boolean;
  onSubmitUser: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onSubmitVet: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  fileRef: React.RefObject<HTMLInputElement | null>;
  onSwap: () => void;
}) {
  return (
    <div className="mx-auto w-full h-full flex flex-col justify-start lg:justify-center text-white overflow-y-auto lg:overflow-hidden px-0 lg:px-0 py-8 lg:py-0">
      <div className="max-w-[450px] mx-auto w-full">
        <h2 className="mb-1 text-center text-2xl lg:text-3xl xl:text-4xl font-extrabold leading-none drop-shadow-md">
          Sign up
        </h2>
        <p className="mb-3 lg:mb-4 text-center text-xs opacity-90">
          Create account to start your journey
        </p>

        {/* Role tabs */}
        <div className="mb-4 flex justify-center">
          <div className="relative inline-flex rounded-full bg-white/30 p-1 shadow-lg">
            <button
              type="button"
              onClick={() => setRole('user')}
              className={`relative z-10 rounded-full px-4 lg:px-5 py-2 text-xs lg:text-sm font-semibold transition-colors duration-200 ${role === 'user' ? 'text-[#FF8A65]' : 'text-white'
                }`}
            >
              Pet Owner
            </button>
            <button
              type="button"
              onClick={() => setRole('vet')}
              className={`relative z-10 rounded-full px-4 lg:px-5 py-1.5 text-xs lg:text-sm font-semibold transition-colors duration-200 ${role === 'vet' ? 'text-[#FF8A65]' : 'text-white'
                }`}
            >
              Veterinarian
            </button>
            <motion.span
              className="absolute inset-y-1 rounded-full bg-white shadow-md"
              initial={false}
              animate={{
                left: role === 'user' ? '4px' : '50%',
                right: role === 'user' ? '50%' : '4px',
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          </div>
        </div>

        {role === 'user' ? (
          <form onSubmit={onSubmitUser} className="space-y-2.5 lg:space-y-3">
            <Input name="first_name" placeholder="First Name *" />
            <Input name="last_name" placeholder="Last Name *" />
            <Input name="email" type="email" placeholder="Email Id *" />
            <Input name="location_city" placeholder="City *" />
            <Input name="location_state" placeholder="State *" />
            <input name="location_country" defaultValue="India" hidden readOnly />
            <Input name="password" type="password" placeholder="Password *" />
            <button
              disabled={busy}
              className="w-full rounded-full bg-[#0e2a36] py-2.5 lg:py-3.5 text-sm lg:text-base font-semibold text-white shadow-lg hover:bg-[#1a3d4d] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {busy ? 'Creating…' : 'Register'}
            </button>
            <p className="text-center text-xs lg:text-sm pt-1">
              Already have an account?{' '}
              <button
                type="button"
                onClick={onSwap}
                className="underline decoration-white/60 underline-offset-2 hover:opacity-90 font-medium transition-opacity"
              >
                Login
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={onSubmitVet} className="space-y-2.5 lg:space-y-3">
            <Input name="name" placeholder="Full Name *" />
            <Input name="email" type="email" placeholder="Email Id *" />
            <Input name="phone" placeholder="Phone Number *" />
            <Input name="password" type="password" placeholder="Password *" />
            <div>
              <label className="mb-1 block text-xs lg:text-sm font-medium text-white/95">
                Medical Document (PDF)*
              </label>
              <input
                ref={fileRef}
                name="medical_pdf"
                type="file"
                accept="application/pdf"
                className="w-full rounded-full border-0 bg-white px-4 py-2.5 text-xs lg:text-sm text-gray-600 shadow-md file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#FF8A65] file:text-white hover:file:bg-[#ff7a50] file:cursor-pointer"
              />
            </div>
            <button
              disabled={busy}
              className="w-full rounded-full bg-[#0e2a36] py-2.5 lg:py-3.5 text-sm lg:text-base font-semibold text-white shadow-lg hover:bg-[#1a3d4d] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {busy ? 'Creating…' : 'Register as Vet'}
            </button>
            <p className="text-center text-xs lg:text-sm pt-1">
              Already have an account?{' '}
              <button
                type="button"
                onClick={onSwap}
                className="underline decoration-white/60 underline-offset-2 hover:opacity-90 font-medium transition-opacity"
              >
                Login
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

function Input({
  name,
  placeholder,
  type = 'text',
}: {
  name: string;
  placeholder: string;
  type?: string;
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';

  return (
    <div className="relative">
      <input
        name={name}
        type={isPassword && show ? 'text' : type}
        placeholder={placeholder}
        className="w-full rounded-full border-0 bg-white px-4 lg:px-4 py-2.5 lg:py-3.5 text-xs lg:text-sm text-[#1b2b34] placeholder-[#9aa6ad] shadow-md focus:ring-2 focus:ring-white/50 focus:outline-none transition-shadow"
        required
        autoComplete={isPassword ? 'new-password' : 'on'}
      />
      {isPassword && (
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-orange-500 transition-colors"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          <span className="sr-only">{show ? 'Hide password' : 'Show password'}</span>
          {show ? <EyeOff className="h-4 w-4 lg:h-5 lg:w-5 " /> : <Eye className="h-4 w-4 lg:h-5 lg:w-5" />}
        </button>
      )}
    </div>
  );
}

export default function PetzoneeAuth() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FF8A65]" />}>
      <AuthContent />
    </Suspense>
  );
}