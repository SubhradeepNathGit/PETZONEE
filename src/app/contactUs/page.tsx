'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, Phone, MapPin, Send, MessageSquare,
  ChevronRight, PawPrint, ShieldCheck, Clock,
  ChevronDown, ArrowRight
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';

/* ================= Validation Schema ================= */
const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  subject: z.string().min(5, 'Subject must be at least 5 characters'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
  agree: z.literal(true, {
    message: 'You must agree to the privacy policy',
  }),
});

type ContactFormData = z.infer<typeof contactSchema>;

/* ================= FAQ Data ================= */
const faqData = [
  { id: 'vet', question: 'Could you suggest a trustworthy veterinarian?', answer: 'We recommend certified local veterinarians with proven track records in pet care. You can also check our partner directory for trusted professionals near you.' },
  { id: 'service', question: 'Are there affordable yet reliable service options?', answer: 'Yes, we provide budget-friendly packages covering checkups, grooming, vaccinations, and preventive care without compromising quality.' },
  { id: 'products', question: 'Which products help control odors and shedding?', answer: 'Use high-quality grooming products such as deshedding tools, enzymatic cleaners, and specialized shampoos designed to minimize odors and reduce shedding.' },
  { id: 'training', question: 'Do you offer specialized training for pets?', answer: 'Yes, our certified trainers provide personalized programs ranging from basic obedience to advanced behavior training.' },
  { id: 'adoption', question: 'Are there any adoption events this week?', answer: 'Check our events calendar for adoption drives, meet-and-greets, and workshops that help pets find loving homes.' },
];

/* ================= Animation Variants ================= */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

/* ================= Contact Page ================= */
export default function ContactPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeFaq, setActiveFaq] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      agree: false as any,
    }
  });

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        if (user.user_metadata?.first_name && user.user_metadata?.last_name) {
          setValue('name', `${user.user_metadata.first_name} ${user.user_metadata.last_name}`);
        } else if (user.user_metadata?.full_name) {
          setValue('name', user.user_metadata.full_name);
        }
        setValue('email', user.email || '');
      }
    };
    fetchUser();
  }, [setValue]);

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    try {
      // 1. Get current user - REQUIRED for chat
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error('Please login to initiate a secure transmission with our team.', {
          icon: '🔒',
          style: {
            background: '#000',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
          },
        });
        setIsSubmitting(false);
        return;
      }

      // 2. Create a new conversation (Authenticated Only)
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          subject: data.subject,
          status: 'active',
          is_starred: false,
          is_archived: false,
          is_deleted: false
        })
        .select()
        .single();

      if (convError) throw convError;

      // 3. Insert the first message
      const { error: msgError } = await supabase
        .from('conversation_messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: user.id,
          sender_role: 'user',
          content: data.message,
        });

      if (msgError) throw msgError;

      toast.success('Frequency established! Our team will respond shortly.', {
        style: {
          background: '#000',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
        },
      });
      reset();

      // Open Global Chat instead of redirecting
      window.dispatchEvent(new CustomEvent('open-global-chat'));
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Transmission failure. Please recalibrate and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-[var(--font-inter)] selection:bg-[#FF8A70]/30">

      {/* === Hero Section (2026 Aesthetic) === */}
      <section className="relative h-[60vh] flex items-center justify-center overflow-hidden">
        {/* Animated background blobs */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#FF8A70]/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-orange-600/10 rounded-full blur-[100px] animate-pulse delay-700"></div>

        <Image
          src="/images/statbg2.jpg"
          alt="Contact Us Banner"
          fill
          priority
          className="object-cover opacity-30 grayscale hover:grayscale-0 transition-all duration-1000 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black"></div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center px-4 max-w-4xl"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 backdrop-blur-md mb-6">
            <PawPrint className="w-4 h-4 text-[#FF8A70]" />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#FF8A70]">Always Here for You</span>
          </div>
          <h1 className="text-5xl md:text-8xl font-black tracking-tighter mb-6 bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent italic">
            Get in <span className="text-[#FF8A70] not-italic">Touch</span>
          </h1>
          <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto leading-relaxed">
            Have a question? Our team and medical experts are ready to assist you in under 24 hours. Experience the future of pet care communications.
          </p>

          <div className="flex items-center justify-center gap-4 mt-10">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="w-10 h-10 rounded-lg border-2 border-black bg-zinc-800 overflow-hidden ring-4 ring-white/5">
                  <img src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="Agent" />
                </div>
              ))}
            </div>
            <p className="text-xs font-bold text-white/40 uppercase tracking-widest whitespace-nowrap">
              4 EXPERTS ONLINE
            </p>
          </div>
        </motion.div>
      </section>

      {/* === Main Content Grid === */}
      <section className="relative z-20 max-w-7xl mx-auto px-6 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">

          {/* Left Side: Contact Cards */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="lg:col-span-4 space-y-6"
          >
            {[
              { icon: <Mail />, title: 'Email Us', info: 'hello@petzonee.com', sub: '24/7 Human support', color: 'bg-blue-500/10 text-blue-400' },
              { icon: <Phone />, title: 'Call Center', info: '+1 (555) 902-1234', sub: 'Mon-Fri, 9am - 6pm', color: 'bg-[#FF8A70]/10 text-[#FF8A70]' },
              { icon: <MapPin />, title: 'Visit Base', info: 'Neville St, New Albany', sub: 'HQ & Medical Center', color: 'bg-emerald-500/10 text-emerald-400' },
              { icon: <ShieldCheck />, title: 'Encryption', info: 'End-to-End Secure', sub: 'Your data is protected', color: 'bg-purple-500/10 text-purple-400' },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                variants={itemVariants}
                whileHover={{ x: 10, scale: 1.02 }}
                className="group p-8 rounded-lg bg-white/[0.03] border border-white/5 backdrop-blur-3xl hover:bg-white/[0.05] hover:border-[#FF8A70]/30 transition-all duration-300"
              >
                <div className={`w-14 h-14 ${item.color} rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  {React.cloneElement(item.icon as React.ReactElement, { size: 24 } as any)}
                </div>
                <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                <p className="text-lg font-medium text-white/90 mb-1">{item.info}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">{item.sub}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Right Side: Smart Contact Form */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="lg:col-span-8"
          >
            <div className="p-10 md:p-14 rounded-lg bg-gradient-to-br from-white/[0.05] to-white/[0.01] border border-white/10 backdrop-blur-3xl shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-10 opacity-10">
                <MessageSquare size={120} />
              </div>

              <div className="relative z-10">
                <h2 className="text-4xl font-black italic tracking-tighter mb-2">Send <span className="text-[#FF8A70] not-italic">Inquiry</span></h2>
                <p className="text-white/40 mb-12 font-medium tracking-tight">Our smart engine will route your message to the right specialist.</p>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Name */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-4">Full Name</label>
                      <input
                        {...register('name')}
                        type="text"
                        placeholder="e.g. Alex Rivera"
                        className={`w-full bg-white/5 border ${errors.name ? 'border-red-500/50' : 'border-white/10'} rounded-lg px-6 py-4 focus:outline-none focus:ring-2 focus:ring-[#FF8A70]/50 focus:bg-white/10 transition-all`}
                      />
                      {errors.name && <p className="text-[10px] text-red-500 ml-4 font-bold">{errors.name.message}</p>}
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-4">Email Address</label>
                      <input
                        {...register('email')}
                        type="email"
                        placeholder="alex@example.com"
                        className={`w-full bg-white/5 border ${errors.email ? 'border-red-500/50' : 'border-white/10'} rounded-lg px-6 py-4 focus:outline-none focus:ring-2 focus:ring-[#FF8A70]/50 focus:bg-white/10 transition-all`}
                      />
                      {errors.email && <p className="text-[10px] text-red-500 ml-4 font-bold">{errors.email.message}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Phone (Optional) */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-4">Phone Number (Optional)</label>
                      <input
                        {...register('phone')}
                        type="tel"
                        placeholder="+1 (000) 000-0000"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-6 py-4 focus:outline-none focus:ring-2 focus:ring-[#FF8A70]/50 focus:bg-white/10 transition-all"
                      />
                    </div>

                    {/* Subject */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-4">Subject</label>
                      <input
                        {...register('subject')}
                        placeholder="How can we help?"
                        className={`w-full bg-white/5 border ${errors.subject ? 'border-red-500/50' : 'border-white/10'} rounded-lg px-6 py-4 focus:outline-none focus:ring-2 focus:ring-[#FF8A70]/50 focus:bg-white/10 transition-all`}
                      />
                      {errors.subject && <p className="text-[10px] text-red-500 ml-4 font-bold">{errors.subject.message}</p>}
                    </div>
                  </div>

                  {/* Message */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-4">Your Message</label>
                    <textarea
                      {...register('message')}
                      rows={6}
                      placeholder="Share your thoughts or questions with us..."
                      className={`w-full bg-white/5 border ${errors.message ? 'border-red-500/50' : 'border-white/10'} rounded-lg px-6 py-4 focus:outline-none focus:ring-2 focus:ring-[#FF8A70]/50 focus:bg-white/10 transition-all resize-none`}
                    />
                    {errors.message && <p className="text-[10px] text-red-500 ml-4 font-bold">{errors.message.message}</p>}
                  </div>

                  {/* Privacy Policy */}
                  <div className="flex items-start gap-4 px-4 py-4 rounded-lg bg-white/[0.02] border border-white/5">
                    <input
                      {...register('agree')}
                      type="checkbox"
                      className="mt-1 w-5 h-5 accent-[#FF8A70] rounded-lg cursor-pointer"
                    />
                    <div className="space-y-1">
                      <p className="text-xs text-white/60 leading-relaxed">
                        I agree to the <span className="text-[#FF8A70] font-bold hover:underline cursor-pointer">Privacy Policy</span> and consent to PetZonee experts contacting me via the provided details.
                      </p>
                      {errors.agree && <p className="text-[10px] text-red-500 font-bold uppercase">{errors.agree.message}</p>}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-16 rounded-lg bg-[#FF8A70] hover:bg-[#ff7043] text-black font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        Initiate Chat <ArrowRight className="group-hover:translate-x-2 transition-transform" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* === Modern Map Section === */}
      <section className="py-24 relative overflow-hidden bg-[#0A0A0A]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-end justify-between mb-12 gap-6">
            <div>
              <h2 className="text-4xl md:text-6xl font-black tracking-tight italic">Our <span className="text-[#FF8A70] not-italic">Location</span></h2>
              <p className="text-white/40 mt-4 max-w-md font-medium tracking-tight">Visit our state-of-the-art facility in the heart of the city.</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Clinic Status</p>
                <div className="flex items-center gap-2 justify-end">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-sm font-bold text-emerald-400">Open Now</span>
                </div>
              </div>
              <div className="h-12 w-px bg-white/10"></div>
              <div className="p-4 rounded-lg bg-white/5 border border-white/10 backdrop-blur-md">
                <Clock className="w-6 h-6 text-[#FF8A70]" />
              </div>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative rounded-lg overflow-hidden border border-white/10 h-[500px] shadow-2xl group"
          >
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3689.017013408831!2d88.34796067493606!3d22.572646185258867!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a027b03e5f0a0cd%3A0xf2f2b3d7a5e2f5a!2sKolkata%2C%20West%20Bengal%2C%20India!5e0!3m2!1sen!2sin!4v1693555200000!5m2!1sen!2sin"
              width="100%"
              height="100%"
              style={{ border: 0, filter: 'invert(90%) hue-rotate(180deg) brightness(0.9)' }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            {/* Overlay Gradient for integration */}
            <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-white/10 rounded-lg"></div>

            {/* Map Card Floating */}
            <div className="absolute top-8 left-8 p-6 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 max-w-[280px] hidden md:block">
              <h4 className="text-lg font-bold mb-2">PetZonee HQ</h4>
              <p className="text-xs text-white/50 leading-relaxed">
                42nd Neville Street, Discovery District, New Albany, 90210
              </p>
              <button className="mt-4 flex items-center gap-2 text-[#FF8A70] text-[10px] font-bold border-b border-[#FF8A70]">
                GET DIRECTIONS <ChevronRight size={12} />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* === Overhauled FAQ Section === */}
      <section className="py-24 bg-black">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-black italic tracking-tighter mb-4">Common <span className="text-[#FF8A70] not-italic">Questions</span></h2>
            <p className="text-white/40 font-medium tracking-tight">Everything you need to know about our medical care.</p>
          </div>

          <div className="space-y-4">
            {faqData.map((faq) => (
              <div
                key={faq.id}
                className={`rounded-lg border transition-all duration-300 overflow-hidden 
                  ${activeFaq === faq.id
                    ? 'bg-white/[0.05] border-[#FF8A70]/30 shadow-[0_0_30px_rgba(255,138,112,0.1)]'
                    : 'bg-white/[0.02] border-white/5 hover:border-white/20'
                  }`}
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === faq.id ? null : faq.id)}
                  className="w-full px-8 py-7 flex items-center justify-between text-left"
                >
                  <span className={`text-lg font-bold transition-colors ${activeFaq === faq.id ? 'text-[#FF8A70]' : 'text-white/80'}`}>
                    {faq.question}
                  </span>
                  <motion.div
                    animate={{ rotate: activeFaq === faq.id ? 180 : 0 }}
                    className={`p-2 rounded-full ${activeFaq === faq.id ? 'bg-[#FF8A70] text-black' : 'text-white/20'}`}
                  >
                    <ChevronDown size={20} />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {activeFaq === faq.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-8 pb-8"
                    >
                      <p className="text-white/50 leading-relaxed font-medium">
                        {faq.answer}
                      </p>
                      <button className="mt-6 flex items-center gap-2 text-[#FF8A70] text-[10px] font-bold border-b border-[#FF8A70] uppercase">
                        Learn More <ChevronRight size={10} />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer Branding */}
      <footer className="py-12 border-t border-white/5 text-center px-6">
        <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.3em]">PETZONEE SECURE COMMS OS v2.6</p>
      </footer>
    </div>
  );
}
