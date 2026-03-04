'use client';

import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-toastify';

function ResetPasswordContent() {
    const router = useRouter();
    const [busy, setBusy] = useState(false);

    async function onResetPassword(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setBusy(true);

        const fd = new FormData(e.currentTarget);
        const password = String(fd.get('password') || '');
        const confirmPassword = String(fd.get('confirm_password') || '');

        if (password !== confirmPassword) {
            toast.error('Passwords do not match!');
            setBusy(false);
            return;
        }

        if (password.length < 6) {
            toast.error('Password must be at least 6 characters long.');
            setBusy(false);
            return;
        }

        const { error } = await supabase.auth.updateUser({ password });

        setBusy(false);
        if (error) {
            toast.error(error.message);
        } else {
            toast.success('Password updated successfully! Please sign in.');
            router.replace('/signup?mode=signin');
        }
    }

    return (
        <main className="min-h-screen w-full bg-[#FF8A65] flex flex-col justify-center items-center px-4">
            {/* Brand Title */}
            <div className="mb-8 text-center">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white drop-shadow-lg">
                    PETZONEE
                </h1>
                <p className="mt-1 text-white/90 text-xs sm:text-sm">Secure Password Reset</p>
            </div>

            <motion.div
                className="w-full max-w-[450px]"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
            >
                <div className="bg-white/10 backdrop-blur-md rounded-[2.5rem] p-8 lg:p-12 border border-white/20 shadow-2xl">
                    <ResetCard busy={busy} onSubmit={onResetPassword} />
                </div>
            </motion.div>
        </main>
    );
}

function ResetCard({
    busy,
    onSubmit,
}: {
    busy: boolean;
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
}) {
    return (
        <div className="text-white">
            <h2 className="mb-2 text-center text-2xl lg:text-3xl font-extrabold leading-none drop-shadow-md">
                New Password
            </h2>
            <p className="mb-6 text-center text-xs lg:text-sm opacity-90">
                Create a strong password for your account
            </p>
            <form onSubmit={onSubmit} className="space-y-4">
                <Input name="password" type="password" placeholder="New Password *" />
                <Input name="confirm_password" type="password" placeholder="Confirm New Password *" />

                <button
                    disabled={busy}
                    className="w-full rounded-3xl bg-[#0e2a36] py-3.5 text-sm lg:text-base font-semibold text-white shadow-md hover:bg-[#1a3d4d] transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-4"
                >
                    {busy ? 'Updating…' : 'Update Password'}
                </button>
            </form>
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
                className="w-full rounded-full border-0 bg-white px-5 py-3.5 text-xs lg:text-sm text-[#1b2b34] placeholder-[#9aa6ad] shadow-md focus:ring-2 focus:ring-white/50 focus:outline-none transition-shadow"
                required
                autoComplete="new-password"
            />
            {isPassword && (
                <button
                    type="button"
                    onClick={() => setShow(!show)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-orange-500 transition-colors"
                >
                    {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
            )}
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#FF8A65]" />}>
            <ResetPasswordContent />
        </Suspense>
    );
}
