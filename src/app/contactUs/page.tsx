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
import FAQSection from '../homeComponents/faq';

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
      <section className="relative h-[45vh] min-h-[300px] flex items-center justify-center overflow-hidden">
        {/* Hero Image */}

        <Image
          src="/images/statbg2.jpg"
          alt="Contact Us Banner"
          fill
          priority
          className="object-cover opacity-30 grayscale hover:grayscale-0 transition-all duration-1000 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black"></div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center px-4 max-w-4xl"
        >

          <div className="space-y-2 mb-6">
            <h1 className="text-2xl md:text-4xl font-sans font-extrabold tracking-tighter bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent uppercase">
              Get in <span className="text-[#FF8A70]">Touch</span>
            </h1>
            <p className="text-white/40 text-xs md:text-sm font-medium uppercase tracking-[0.3em]">
              We&apos;re here to help you and your pets 24/7
            </p>
          </div>

          <div className="flex items-center justify-center gap-4 mt-10">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-black bg-zinc-800 overflow-hidden ring-4 ring-white/5">
                  <img src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="Expert" />
                </div>
              ))}
            </div>

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
            className="lg:col-span-4 space-y-8"
          >
            {[
              { icon: <Mail />, title: 'Email Us', info: 'hello@petzonee.com', sub: '24/7 Human support', color: 'bg-blue-500/10 text-blue-400' },
              { icon: <Phone />, title: 'Call Center', info: '+91 98300 98300', sub: 'Mon-Fri, 9am - 6pm (IST)', color: 'bg-[#FF8A70]/10 text-[#FF8A70]' },
              { icon: <MapPin />, title: 'Visit Base', info: 'Sector V, Salt Lake, Kolkata', sub: 'HQ & Medical Center', color: 'bg-emerald-500/10 text-emerald-400' },
              { icon: <ShieldCheck />, title: 'Encryption', info: 'End-to-End Secure', sub: 'Your data is protected', color: 'bg-purple-500/10 text-purple-400' },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                variants={itemVariants}
                whileHover={{ x: 10, scale: 1.02 }}
                className="group p-8 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-3xl hover:bg-white/[0.05] hover:border-[#FF8A70]/30 transition-all duration-300"
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
            <div className="p-10 md:p-14 rounded-3xl bg-gradient-to-br from-white/[0.05] to-white/[0.01] border border-white/10 backdrop-blur-3xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-10 opacity-10">
                <MessageSquare size={120} />
              </div>

              <div className="relative z-10">
                <h2 className="text-4xl font-bold tracking-tighter mb-2">Send <span className="text-[#FF8A70]">Inquiry</span></h2>
                <p className="text-white/40 mb-12 font-medium tracking-tight">Our smart engine will route your message to the right specialist.</p>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Name */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-4">Full Name</label>
                      <input
                        {...register('name')}
                        type="text"
                        placeholder="e.g. Alex Rivera"
                        className={`w-full bg-white/5 border ${errors.name ? 'border-red-500/50' : 'border-white/10'} rounded-2xl px-6 py-6 focus:outline-none focus:ring-2 focus:ring-[#FF8A70]/50 focus:bg-white/10 transition-all`}
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
                        className={`w-full bg-white/5 border ${errors.email ? 'border-red-500/50' : 'border-white/10'} rounded-2xl px-6 py-6 focus:outline-none focus:ring-2 focus:ring-[#FF8A70]/50 focus:bg-white/10 transition-all`}
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
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-6 focus:outline-none focus:ring-2 focus:ring-[#FF8A70]/50 focus:bg-white/10 transition-all"
                      />
                    </div>

                    {/* Subject */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-4">Subject</label>
                      <input
                        {...register('subject')}
                        placeholder="How can we help?"
                        className={`w-full bg-white/5 border ${errors.subject ? 'border-red-500/50' : 'border-white/10'} rounded-2xl px-6 py-6 focus:outline-none focus:ring-2 focus:ring-[#FF8A70]/50 focus:bg-white/10 transition-all`}
                      />
                      {errors.subject && <p className="text-[10px] text-red-500 ml-4 font-bold">{errors.subject.message}</p>}
                    </div>
                  </div>

                  {/* Message */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-4">Your Message</label>
                    <textarea
                      {...register('message')}
                      rows={12}
                      placeholder="Share your thoughts or questions with us..."
                      className={`w-full bg-white/5 border ${errors.message ? 'border-red-500/50' : 'border-white/10'} rounded-2xl px-6 py-6 focus:outline-none focus:ring-2 focus:ring-[#FF8A70]/50 focus:bg-white/10 transition-all resize-none`}
                    />
                    {errors.message && <p className="text-[10px] text-red-500 ml-4 font-bold">{errors.message.message}</p>}
                  </div>

                  {/* Privacy Policy */}
                  <div className="flex items-start gap-4 px-4 py-4 rounded-lg bg-white/[0.02] border border-white/5">
                    <input
                      {...register('agree')}
                      type="checkbox"
                      className="mt-1 w-5 h-5 accent-[#FF8A70] rounded-xl cursor-pointer"
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
                    className="w-full h-16 rounded-2xl bg-[#FF8A70] hover:bg-[#ff7043] text-black font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* === Premium Map Section === */}
      <section className="py-28 relative overflow-hidden bg-black">
        {/* Ambient background glows */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#FF8A70]/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6">
          {/* Section header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-14"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[#FF8A70] mb-4">Headquarters</p>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div>
                <h2 className="text-4xl md:text-5xl font-black tracking-tighter">
                  Find <span className="bg-gradient-to-r from-[#FF8A70] to-[#FF6B4A] bg-clip-text text-transparent">Us</span>
                </h2>
                <p className="text-white/30 mt-3 text-sm font-medium max-w-md">
                  Visit our state-of-the-art veterinary center, equipped with cutting-edge diagnostics and care facilities.
                </p>
              </div>
              <div className="flex items-center gap-5">
                <div className="text-right">
                  <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mb-1.5">Clinic Status</p>
                  <div className="flex items-center gap-2 justify-end">
                    <div className="relative flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <div className="absolute w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    </div>
                    <span className="text-sm font-bold text-emerald-400">Open Now</span>
                  </div>
                </div>
                <div className="h-10 w-px bg-white/[0.06]" />
                <a
                  href="https://www.google.com/maps/search/?api=1&query=Sector+V+Salt+Lake+Kolkata"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-white/60 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-[#FF8A70] hover:text-black hover:border-[#FF8A70] transition-all duration-300"
                >
                  Open in Maps
                </a>
              </div>
            </div>
          </motion.div>

          {/* Map container */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative rounded-[2rem] overflow-hidden border border-white/[0.08] h-[550px] group bg-[#0a0a0a]"
          >
            {/* Map iframe */}
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3684.286280424564!2d88.43054367584144!3d22.568434779494396!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a0275ad67c8052d%3A0xc3b836489a748c8!2sSector%20V%2C%20Salt%20Lake%20City%2C%20Kolkata%2C%20West%20Bengal!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin"
              width="100%"
              height="100%"
              style={{ border: 0, filter: 'invert(90%) hue-rotate(180deg) brightness(0.85) contrast(1.1) saturate(0.3)' }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="absolute inset-0"
            />

            {/* Edge gradient overlays for seamless blending */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-[#0a0a0a] to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
              <div className="absolute top-0 bottom-0 left-0 w-16 bg-gradient-to-r from-[#0a0a0a] to-transparent" />
              <div className="absolute top-0 bottom-0 right-0 w-16 bg-gradient-to-l from-[#0a0a0a] to-transparent" />
            </div>

            {/* Inner ring overlay */}
            <div className="absolute inset-0 pointer-events-none rounded-[2rem] ring-1 ring-inset ring-white/[0.06]" />

            {/* Floating location card */}
            <div className="absolute bottom-8 left-8 right-8 md:right-auto md:max-w-[380px] z-10">
              <div className="p-6 md:p-8 rounded-[1.5rem] bg-black/70 backdrop-blur-2xl border border-white/[0.08] shadow-2xl shadow-black/50">
                {/* Location pin accent */}
                <div className="flex items-start gap-5">
                  <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF8A70] to-[#FF6B4A] flex items-center justify-center shadow-lg shadow-[#FF8A70]/20">
                    <MapPin size={20} className="text-black" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-black text-white tracking-tight mb-1">PetZonee HQ</h4>
                    <p className="text-xs text-white/40 leading-relaxed font-medium">
                      Block EP & GP, Sector V, Salt Lake,<br />Kolkata, West Bengal 700091
                    </p>
                  </div>
                </div>

                {/* Divider */}
                <div className="my-5 h-px bg-white/[0.06]" />

                {/* Operating hours grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <p className="text-[8px] font-black uppercase tracking-[0.3em] text-white/20 mb-1">Weekdays</p>
                    <p className="text-xs font-bold text-white/70">9:00 AM – 8:00 PM</p>
                  </div>
                  <div className="px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <p className="text-[8px] font-black uppercase tracking-[0.3em] text-white/20 mb-1">Weekends</p>
                    <p className="text-xs font-bold text-white/70">10:00 AM – 6:00 PM</p>
                  </div>
                </div>

                {/* CTA */}
                <a
                  href="https://www.google.com/maps/dir/?api=1&destination=22.573531,88.433119"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white/60 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-[#FF8A70] hover:text-black hover:border-[#FF8A70] transition-all duration-300 group/btn"
                >
                  Get Directions
                  <ArrowRight size={12} className="group-hover/btn:translate-x-1 transition-transform" />
                </a>
              </div>
            </div>

            {/* Floating coordinates badge (desktop) */}
            <div className="absolute top-8 right-8 hidden md:flex items-center gap-3 px-5 py-3 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/[0.06]">
              <div className="w-2 h-2 rounded-full bg-[#FF8A70] animate-pulse" />
              <span className="text-[10px] font-mono font-bold text-white/40 tracking-wider">22.5735° N, 88.4331° E</span>
            </div>
          </motion.div>
        </div>
      </section>
      {/* === FAQ Section === */}
      <FAQSection dark hideFooter />

      {/* Footer Branding */}
      <footer className="py-12 text-center px-6 bg-black">
        <p className="text-[10px] font-bold text-white/15 uppercase tracking-[0.4em] select-none">PETZONEE SECURE COMMS OS v2.6</p>
      </footer>
    </div>
  );
}
