
'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useCallback, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { IconCamera, IconUser } from './icons';
import { Stethoscope, Activity, Zap, ChevronRight } from 'lucide-react';


export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`rounded-[2.5rem] p-8 md:p-10 border border-white/5 bg-[#0a0a0a]/80 backdrop-blur-3xl shadow-2xl transition-all ${className}`}
    >
      {children}
    </motion.div>
  );
}


export function LoadingCard() {
  return (
    <Card className="border-none bg-white/[0.02]">
      <div className="animate-pulse space-y-8">
        <div className="flex items-center gap-6">
          <div className="h-20 w-20 bg-white/10 rounded-full" />
          <div className="space-y-3 flex-1">
            <div className="h-8 bg-white/10 rounded-xl w-1/3" />
            <div className="h-4 bg-white/10 rounded-lg w-1/2" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-white/5 rounded-3xl border border-white/5" />
          ))}
        </div>
      </div>
    </Card>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-8">
      <div className="h-48 w-full bg-white/[0.03] rounded-3xl animate-pulse flex items-center p-8 gap-6 border border-white/5">
        <div className="h-24 w-24 rounded-full bg-white/10" />
        <div className="space-y-4 flex-1">
          <div className="h-10 bg-white/10 rounded-xl w-1/4" />
          <div className="h-4 bg-white/10 rounded-lg w-1/3" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-72 bg-white/[0.03] rounded-3xl border border-white/5 animate-pulse p-8">
            <div className="w-14 h-14 bg-white/10 rounded-2xl mb-6" />
            <div className="h-8 bg-white/10 rounded-xl w-3/4 mb-4" />
            <div className="h-4 bg-white/10 rounded-lg w-full mb-2" />
            <div className="h-4 bg-white/10 rounded-lg w-2/3" />
          </div>
        ))}
      </div>

      <div className="h-40 bg-white/[0.03] rounded-3xl border border-white/5 animate-pulse p-8">
        <div className="h-8 bg-white/10 rounded-xl w-1/5 mb-6" />
        <div className="flex items-center gap-4">
          <div className="h-12 w-full bg-white/10 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}


export function Metric({
  title,
  value,
  icon,
  gradient,
  trend,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  gradient: string;
  trend?: string;
}) {
  return (
    <div className="relative overflow-hidden bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/8 transition">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg bg-gradient-to-br ${gradient} p-2.5 text-white`}>{icon}</div>
        <div className="flex-1">
          <p className="text-xs text-gray-300 font-medium">{title}</p>
          <p className="text-2xl font-bold text-white leading-tight">{value}</p>
          {trend && <p className="text-xs text-gray-400 mt-0.5">{trend}</p>}
        </div>
      </div>
    </div>
  );
}


export function FeatureCard({
  title,
  description,
  icon,
  gradient,
  action,
  href,
  onClick,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  action: string;
  href?: string;
  onClick?: () => void;
}) {
  const buttonClass = `inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r ${gradient} text-white rounded-xl font-semibold text-sm hover:brightness-110 active:scale-95 transition-all duration-300 group-hover:translate-x-1`;
  const arrow = <span className="group-hover:translate-x-1 transition-transform duration-300">?</span>;

  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="group relative overflow-hidden rounded-[2.5rem] p-10 bg-[#0a0a0a]/80 border border-white/5 hover:border-white/10 transition-all duration-500 shadow-2xl backdrop-blur-xl"
    >
      <div
        className={`absolute -top-12 -right-12 h-64 w-64 bg-gradient-to-br ${gradient} opacity-5 rounded-full blur-[80px] group-hover:opacity-10 group-hover:scale-150 transition-all duration-700`}
      />

      <div className="relative z-10">
        <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} p-3 mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500`}>
          <div className="text-white">
            {icon}
          </div>
        </div>

        <h3 className="text-2xl font-black text-white mb-3 tracking-tighter uppercase">{title}</h3>
        <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-8 leading-relaxed">{description}</p>

        {href ? (
          <Link href={href} className={buttonClass}>
            <span>{action}</span>
            {arrow}
          </Link>
        ) : (
          <button onClick={onClick} type="button" className={buttonClass}>
            <span>{action}</span>
            {arrow}
          </button>
        )}
      </div>
    </motion.div>
  );
}


export function AvatarPicker({
  currentUrl,
  meId,
  table,
  showMessage,
  onUploaded,
  name,
}: {
  currentUrl: string | null;
  meId: string | null;
  table: 'users' | 'veterinarian';
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onUploaded: (url: string | null) => void;
  name?: string;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const handlePick = () => fileRef.current?.click();

  const onFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!meId) {
        showMessage('Not signed in', 'error');
        return;
      }
      if (!file.type.startsWith('image/')) {
        showMessage('Please select a valid image file', 'error');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showMessage('Image must be less than 5MB', 'error');
        return;
      }

      try {
        setUploading(true);
        const ext = file.name.split('.').pop() || 'jpg';
        const path = `${meId}/avatar-${Date.now()}.${ext}`;

        const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, {
          upsert: true,
          contentType: file.type,
        });
        if (upErr) throw upErr;

        const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
        const publicUrl = pub?.publicUrl ?? '';

        const { error: dbErr } = await supabase.from(table).update({ avatar_url: publicUrl }).eq('id', meId);
        if (dbErr) throw dbErr;

        onUploaded(publicUrl);
        showMessage('Profile picture updated successfully!', 'success');
      } catch (err) {
        console.error('Avatar upload error:', err);
        const message = err instanceof Error ? err.message : 'Failed to upload profile picture';
        showMessage(message, 'error');
      } finally {
        setUploading(false);
        if (fileRef.current) fileRef.current.value = '';
      }
    },
    [meId, table, showMessage, onUploaded],
  );

  return (
    <div className="relative group">
      <div className="h-35 w-35 rounded-full overflow-hidden ring-4 ring-white/10 bg-zinc-800 flex items-center justify-center transition-all duration-500 group-hover:ring-white/20">
        {currentUrl ? (
          <Image
            src={currentUrl}
            alt="Profile"
            width={140}
            height={140}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center text-zinc-400">
            <IconUser size={80} />
          </div>
        )}
      </div>
      <button
        onClick={handlePick}
        disabled={uploading}
        className="absolute -bottom-0 -right-0 h-8 w-8 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-full flex items-center justify-center hover:brightness-110 transition hover:scale-110 disabled:opacity-50"
        title="Upload profile picture"
      >
        {uploading ? (
          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
        ) : (
          <IconCamera size={16} />
        )}
      </button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
    </div>
  );
}

export function DashboardLoadingScreen({ message = "Initializing Systems" }: { message?: string }) {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/5 rounded-full blur-[100px]" />

      <div className="relative z-10 flex flex-col items-center gap-10">
        <div className="relative">
          <motion.div
            animate={{
              scale: [1, 1.05, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="w-24 h-24 rounded-[2.5rem] bg-white/[0.03] border border-white/10 flex items-center justify-center shadow-2xl backdrop-blur-3xl relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-transparent opacity-50" />
            <Activity className="text-cyan-500" size={40} />
          </motion.div>

          {/* Orbital Orbs */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute -inset-4 border border-white/5 rounded-[3rem]"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
          </motion.div>
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
            className="absolute -inset-10 border border-white/5 rounded-[3.5rem]"
          >
            <div className="absolute bottom-0 right-1/2 translate-x-1/2 w-2 h-2 bg-orange-400 rounded-full shadow-[0_0_10px_rgba(251,146,60,0.8)]" />
          </motion.div>
        </div>

        {/* Text info */}
        <div className="space-y-4 text-center">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[10px] font-black text-white uppercase tracking-[0.6em]"
          >
            {message}
          </motion.p>
          <div className="flex items-center justify-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.3, 1, 0.3]
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2
                }}
                className="w-1.5 h-1.5 rounded-full bg-cyan-500"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Subtle scanline effect */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_4px,3px_100%] opacity-20" />
    </div>
  );
}
