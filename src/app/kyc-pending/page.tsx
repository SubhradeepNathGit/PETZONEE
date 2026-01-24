'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type KycStatus = 'pending' | 'approved' | 'rejected';

export default function VetKycPendingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [status, setStatus] = useState<KycStatus>('pending');
  const [msg, setMsg] = useState<string>('');

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMsg('You are not signed in. Redirecting…');
        return router.replace('/signup');
      }

      const { data: vet, error } = await supabase
        .from('veterinarian')
        .select('name, email, medical_doc_url, kyc_status')
        .eq('id', user.id)
        .maybeSingle();

      if (error || !vet) {
        setMsg(error?.message || 'No veterinarian profile found. Please sign up as a vet.');
        setLoading(false);
        return;
      }

      setName(vet.name ?? '');
      setEmail(vet.email ?? '');
      setFileName(vet.medical_doc_url ?? null);
      setStatus((vet.kyc_status as KycStatus) ?? 'pending');
      setLoading(false);

      if (vet.kyc_status === 'approved') {
        setMsg('KYC approved! Redirecting…');
        router.push('/dashboard');
        return;
      }

      channel = supabase
        .channel('vet-kyc-status')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'veterinarian',
            filter: `email=eq.${vet.email}`,
          },
          (payload) => {
            const row = payload.new as { kyc_status?: KycStatus; medical_doc_url?: string };
            if (!row) return;
            if (row.medical_doc_url !== undefined) setFileName(row.medical_doc_url ?? null);
            if (row.kyc_status) {
              setStatus(row.kyc_status);
              if (row.kyc_status === 'approved') {
                setMsg('KYC approved! Redirecting…');
                router.push('/dashboard');
              }
            }
          }
        )
        .subscribe();
    })();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [router]);

  const getStatusConfig = useMemo(() => {
    switch (status) {
      case 'approved':
        return {
          color: 'text-green-300 border-green-400/30',
          icon: '✓',
          title: 'Verification Complete',
          message: 'Your account has been approved and is ready to use.',
        };
      case 'rejected':
        return {
          color: 'text-red-300 border-red-400/30',
          icon: '✗',
          title: 'Verification Declined',
          message: 'Your submission requires attention. Please contact support for assistance.',
        };
      default:
        return {
          color: 'text-yellow-300 border-yellow-400/30',
          icon: '⏳',
          title: 'Under Review',
          message: 'We are currently reviewing your documents. This typically takes 1-3 business days.',
        };
    }
  }, [status]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white">
      <main className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {loading ? (
          <div className="rounded-lg border border-white/20 p-8 bg-white/10 backdrop-blur-md">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-white/20 rounded w-1/4"></div>
              <div className="h-8 bg-white/20 rounded w-1/2"></div>
              <div className="h-4 bg-white/20 rounded w-3/4"></div>
              <div className="h-4 bg-white/20 rounded w-1/2"></div>
            </div>
          </div>
        ) : (
          <>
            {/* Status Card */}
            <div className={`rounded-lg border ${getStatusConfig.color} p-6 bg-white/10 mt-17 backdrop-blur-md`}>
              <div className="flex items-start space-x-4">
                {getStatusConfig.icon && (
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-lg font-semibold">
                      {getStatusConfig.icon}
                    </div>
                  </div>
                )}
                <div className="flex-1">
                  <h2 className="text-lg font-semibold mb-1">{getStatusConfig.title}</h2>
                  <p className="text-sm opacity-90 mb-2">{getStatusConfig.message}</p>
                  {status === 'pending' && (
                    <div className="flex items-center space-x-2 text-sm">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
                      <span>Processing your verification...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Account Details */}
            <div className="bg-white/10 backdrop-blur-md rounded-lg shadow-sm border border-white/20 p-6">
              <h3 className="text-lg font-medium mb-4">Account Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Full Name</label>
                  <div className="text-sm bg-white/10 rounded-md px-3 py-2 border border-white/20">
                    Dr. {name || 'Not provided'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Email Address</label>
                  <div className="text-sm bg-white/10 rounded-md px-3 py-2 border border-white/20">
                    {email || 'Not provided'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Verification Status</label>
                  <div
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusConfig.color}`}
                  >
                    {status !== 'pending' && getStatusConfig.icon && (
                      <span className="mr-1">{getStatusConfig.icon}</span>
                    )}
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Medical License</label>
                  <div className="flex items-center text-sm">
                    {fileName ? (
                      <span className="text-green-300 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Document uploaded
                      </span>
                    ) : (
                      <span className="text-gray-400">No document</span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Submission Date</label>
                  <div className="text-sm">{new Date().toLocaleDateString()}</div>
                </div>
              </div>
            </div>

            {/* Help Section */}
            <div className="bg-white/10 backdrop-blur-md rounded-lg border border-white/20 p-6">
              <h3 className="text-lg font-medium mb-2">Need Help?</h3>
              <p className="text-sm text-gray-300 mb-4">
                If you have questions about the verification process or need to update your information,
                our support team is here to help.
              </p>
              <button
                onClick={() => router.push('/dashboard')}
                className=" py-y  text-white rounded-md shadow transition"
              >
                ← Back to Portal
              </button>
            </div>
          </>
        )}

        {msg && (
          <div className="mt-6 bg-white/10 backdrop-blur-md border border-white/20 rounded-md p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-blue-300 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-sm font-medium">{msg}</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
