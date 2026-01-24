'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';

type VetRow = {
  id: string;
  name: string;
  email: string;
  avatar_url?: string | null;
};

export default function BookAppointmentPage() {
  const [vets, setVets] = useState<VetRow[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [appointmentTime, setAppointmentTime] = useState<string>('');
  const [bookingVetId, setBookingVetId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setMeId(user.id);

        const { data, error } = await supabase
          .from('veterinarian')
          .select('id, name, email, avatar_url')
          .eq('kyc_status', 'approved');

        if (!error && data) setVets(data);
      } catch (error) {
        console.error('Failed to load veterinarians:', error);
        setMsg('❌ Failed to load veterinarians. Please refresh the page.');
      } finally {
        setInitialLoading(false);
      }
    })();
  }, []);

  async function book(vetId: string) {
    if (!meId) { 
      setMsg('⚠️ You must be logged in to book an appointment.'); 
      return; 
    }
    if (!appointmentTime) { 
      setMsg('⚠️ Please select an appointment date and time.'); 
      return; 
    }

    // Validate appointment time is in the future
    const selectedTime = new Date(appointmentTime);
    const now = new Date();
    if (selectedTime <= now) {
      setMsg('⚠️ Please select a future date and time for your appointment.');
      return;
    }

    setLoading(true);
    setBookingVetId(vetId);
    setMsg('');

    try {
      const { error } = await supabase
        .from('appointments')
        .insert({
          user_id: meId,
          vet_id: vetId,
          appointment_time: selectedTime.toISOString(),
        });

      if (error) {
        console.error('Booking error:', error.message, error.details);
        setMsg('❌ Booking failed: ' + error.message);
      } else {
        setMsg('✅ Appointment booked successfully! You will receive a confirmation email shortly.');
        setAppointmentTime('');
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setMsg('❌ An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
      setBookingVetId(null);
    }
  }

  // Get minimum datetime for input (current time + 1 hour)
  const getMinDateTime = () => {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    return now.toISOString().slice(0, 16);
  };

  if (initialLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-sky-300 via-sky-200 to-sky-100">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading veterinarians...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
        {/* === Top Banner (no animation) === */}
            <div className="relative w-full h-48 sm:h-64 md:h-72 lg:h-80 ">
              <Image
                src="/images/statbg13.jpg" 
                alt="Products Banner"
                fill
                priority
                className="object-cover"
              />
              <div className="absolute inset-0 bg-black/40 flex flex-col justify-center items-center text-center">
                <h1 className="text-3xl md:text-5xl font-bold text-white">Book Appointment</h1>
                <p className="text-sm md:text-base text-gray-200 mt-2">Home / Profile / Book Appointment </p>
              </div>
            </div>

      {/* Main Content - Cream Background */}
      <section className="bg-gradient-to-b from-orange-50 via-amber-50 to-orange-100 min-h-screen py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          
          {/* Status Messages */}
          {msg && (
            <div className={`mb-6 p-4 rounded-lg border-l-4 ${
              msg.includes('✅') 
                ? 'bg-green-50 border-green-400 text-green-800' 
                : msg.includes('⚠️')
                ? 'bg-yellow-50 border-yellow-400 text-yellow-800'
                : 'bg-red-50 border-red-400 text-red-800'
            }`}>
              <div className="flex items-center">
                <span className="text-sm font-medium">{msg}</span>
              </div>
            </div>
          )}

          {/* Appointment Time Selector */}
          <div className="mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                Select Appointment Date & Time
              </h2>
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="datetime-local"
                    value={appointmentTime}
                    onChange={(e) => setAppointmentTime(e.target.value)}
                    min={getMinDateTime()}
                    className="w-full max-w-xs rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    aria-label="Select appointment date and time"
                  />
                  <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-600">
                  Please select a date and time at least 1 hour from now
                </p>
              </div>
            </div>
          </div>

          {/* Veterinarians List */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              Available Veterinarians
              <span className="text-sm font-normal text-gray-600">({vets.length} available)</span>
            </h2>

            {vets.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <p className="text-gray-600 text-lg">No veterinarians are currently available</p>
                <p className="text-gray-500 text-sm mt-2">Please check back later or contact support</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {vets.map(vet => (
                  <article
                    key={vet.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-center justify-between">
                      {/* Vet Info */}
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div className="relative flex-shrink-0">
                          <div className="w-16 h-16 rounded-full overflow-hidden border-3 border-gray-200 bg-gray-100">
                            <Image
                              src={vet.avatar_url || '/images/avatar-placeholder.png'}
                              alt={`Dr. ${vet.name} - Veterinarian`}
                              width={64}
                              height={64}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          {/* Online indicator */}
                          <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-green-700/70 border-2 border-white rounded-full"></div>
                        </div>
                        
                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 truncate">
                            Dr. {vet.name}
                          </h3>
                          <p className="text-sm text-gray-600 truncate mb-2">{vet.email}</p>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              ✓ Verified
                            </span>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-300 text-white">
                              Available
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Book Button */}
                      <div className="flex-shrink-0 ml-4">
                        <button
                          onClick={() => book(vet.id)}
                          disabled={loading}
                          className="px-6 py-2.5 bg-gradient-to-r from-[#5F97C9] to-[#64B5F6] text-white font-medium rounded-lg hover:from-[#4B7AA3] hover:to-[#5198CC] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          aria-label={`Book appointment with Dr. ${vet.name}`}
                        >
                          {loading && bookingVetId === vet.id ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                              Booking...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              Book Appointment
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          {/* Footer Info */}
          <div className="mt-8 p-6 rounded-xl  border border-white/20 
  bg-orange-300/20 backdrop-blur-md">
            <div className="flex items-start gap-3">
              
              <div className="text-sm  text-gray-700 leading-relaxed">
                <p className="font-medium mb-2 btext-gray-800">Important Information:</p>
                <ul className="space-y-1 text-gray-600">
                  <li>• Appointments must be scheduled at least 1 hour in advance</li>
                  <li>• You will receive email confirmation once your appointment is booked</li>
                  <li>• Please arrive 15 minutes early for your appointment</li>
                  <li>• Cancellations must be made at least 2 hours before your scheduled time</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}