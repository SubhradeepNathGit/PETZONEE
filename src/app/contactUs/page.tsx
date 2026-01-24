'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { ChevronDown, Mail, Phone, MapPin } from 'lucide-react';
import Image from 'next/image';

/* ================= FAQ Data ================= */
interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  { id: 'vet', question: 'Could you suggest a trustworthy veterinarian?', answer: 'We recommend certified local veterinarians with proven track records in pet care. You can also check our partner directory for trusted professionals near you.' },
  { id: 'service', question: 'Are there affordable yet reliable service options?', answer: 'Yes, we provide budget-friendly packages covering checkups, grooming, vaccinations, and preventive care without compromising quality.' },
  { id: 'products', question: 'Which products help control odors and shedding?', answer: 'Use high-quality grooming products such as deshedding tools, enzymatic cleaners, and specialized shampoos designed to minimize odors and reduce shedding.' },
  { id: 'training', question: 'Do you offer specialized training for pets?', answer: 'Yes, our certified trainers provide personalized programs ranging from basic obedience to advanced behavior training.' },
  { id: 'adoption', question: 'Are there any adoption events this week?', answer: 'Check our events calendar for adoption drives, meet-and-greets, and workshops that help pets find loving homes.' },
  { id: 'toys', question: 'Which toys are safest for puppies and kittens?', answer: 'Opt for non-toxic, durable toys without small parts. Puzzle feeders, rubber chews, and rope toys are great choices.' },
  { id: 'immunization', question: 'Are pet immunization services available?', answer: 'Yes, we provide vaccinations for cats, dogs, and other pets based on veterinary guidelines and local requirements.' },
  { id: 'grooming', question: 'Can I book grooming appointments online?', answer: 'Absolutely! Our online booking system lets you choose services, time slots, and preferences at your convenience.' },
  { id: 'food', question: 'Do you offer organic cat food?', answer: 'Yes, we stock certified organic cat foods made with natural ingredients and free from artificial additives.' },
  { id: 'supplies', question: 'Do you provide pet supplies immediately?', answer: 'Yes, essential supplies such as food, toys, bedding, and health products are available in-store and online.' },
];

/* ================= Animations ================= */
const fadeInUp = {
  initial: { opacity: 0, y: 60 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: 'easeOut' },
};
const fadeInLeft = {
  initial: { opacity: 0, x: -60 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.6, ease: 'easeOut' },
};
const fadeInRight = {
  initial: { opacity: 0, x: 60 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.6, ease: 'easeOut' },
};
const staggerContainer = {
  initial: {},
  animate: { transition: { staggerChildren: 0.1 } },
};

/* ================= FAQ Section ================= */
const FAQSection = () => {
  const [openId, setOpenId] = useState<string | null>(null);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-10%' });

  const toggleFAQ = (id: string) => setOpenId(openId === id ? null : id);

  const mid = Math.ceil(faqData.length / 2);
  const leftFAQs = faqData.slice(0, mid);
  const rightFAQs = faqData.slice(mid);

  const renderFAQ = (faq: FAQItem, index: number) => (
    <motion.div
      key={faq.id}
      variants={fadeInUp}
      transition={{ delay: index * 0.1 }}
      className="bg-[#f5f5dc] rounded-xl shadow-lg border border-[#FF8A65]/20 overflow-hidden hover:shadow-xl transition-all duration-300"
    >
      <button
        onClick={() => toggleFAQ(faq.id)}
        className={`w-full px-6 py-5 flex items-center justify-between text-left transition-all duration-300 ${
          openId === faq.id ? 'bg-[#FF8A65] text-white' : 'hover:bg-[#FF8A65] hover:text-white'
        }`}
        aria-expanded={openId === faq.id}
        aria-controls={`faq-answer-${faq.id}`}
      >
        <h3 className="text-base lg:text-lg font-semibold pr-4">{faq.question}</h3>
        <motion.div animate={{ rotate: openId === faq.id ? 180 : 0 }} transition={{ duration: 0.3 }}>
          <ChevronDown className="w-6 h-6" />
        </motion.div>
      </button>

      <AnimatePresence>
        {openId === faq.id && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
            id={`faq-answer-${faq.id}`}
          >
            <div className="px-6 pb-5">
              <p className="text-base text-gray-700">{faq.answer}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  return (
    <section ref={ref} className="w-full bg-white py-16 px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-lg font-bold text-[#FF8A65]">/FAQ</span>
          <h2 className="text-4xl font-bold text-gray-800 mt-2">Ask Anything? Get Answers Right Here!</h2>
          <p className="text-gray-600 mt-3 max-w-2xl mx-auto">Find quick answers to common questions about our pet care services</p>
        </div>

        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate={isInView ? 'animate' : 'initial'}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          <div className="space-y-6">{leftFAQs.map(renderFAQ)}</div>
          <div className="space-y-6">{rightFAQs.map(renderFAQ)}</div>
        </motion.div>
      </div>
    </section>
  );
};

/* ================= Contact Page ================= */
export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '', agree: false });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log(form);
  };

  const mainRef = useRef(null);
  const mapRef = useRef(null);
  const mainInView = useInView(mainRef, { once: true, margin: '-10%' });
  const mapInView = useInView(mapRef, { once: true, margin: '-10%' });

  return (
    <div className="min-h-screen bg-white">
      {/* === Top Banner (no animation) === */}
      <div className="relative w-full h-48 sm:h-64 md:h-72 lg:h-80 mb-12">
        <Image
          src="/images/statbg2.jpg" // put your banner in /public
          alt="Products Banner"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/40 flex flex-col justify-center items-center text-center">
          <h1 className="text-3xl md:text-5xl font-bold text-white">Contant Us</h1>
          <p className="text-sm md:text-base text-gray-200 mt-2">Home / Contact</p>
        </div>
      </div>

      {/* === Contact Section === */}
      <section ref={mainRef} className="py-16 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-2 gap-12">
          {/* Left - Image + Info */}
          <motion.div variants={fadeInLeft} initial="initial" animate={mainInView ? 'animate' : 'initial'} className="space-y-8">
            <div className="rounded-2xl overflow-hidden shadow-2xl">
              <img src="/images/contactpg.jpg" alt="Happy family with pet" className="w-full h-80 object-cover" />
            </div>

            {/* Contact Info */}
            <motion.div variants={staggerContainer} initial="initial" animate={mainInView ? 'animate' : 'initial'} className="space-y-6">
              <motion.div variants={fadeInUp} className="flex items-center gap-6 bg-[#f7f5dc] p-6 rounded-xl shadow-lg">
                <div className="bg-[#FF8A65] text-white p-4 rounded-full">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email Address</p>
                  <p className="font-semibold text-gray-800">Sweetheart@example.com</p>
                </div>
              </motion.div>

              <motion.div variants={fadeInUp} className="flex items-center gap-6 bg-[#f5f5dc] p-6 rounded-xl shadow-lg">
                <div className="bg-[#FF8A65] text-white p-4 rounded-full">
                  <Phone className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone Number</p>
                  <p className="font-semibold text-gray-800">7890 456 123 (02+)</p>
                </div>
              </motion.div>

              <motion.div variants={fadeInUp} className="flex items-center gap-6 bg-[#f5f5dc] p-6 rounded-xl shadow-lg">
                <div className="bg-[#FF8A65] text-white p-4 rounded-full">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Our Location</p>
                  <p className="font-semibold text-gray-800">Neville Street, New Albany</p>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Right - Form */}
          <motion.div variants={fadeInRight} initial="initial" animate={mainInView ? 'animate' : 'initial'} className="bg-[#faf8f0] p-10 rounded-2xl shadow-2xl">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Need help? Send us a message</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <input type="text" name="name" placeholder="*Enter Name" className="w-full p-4 rounded-full border bg-white focus:ring-4 focus:ring-[#FF8A65]" value={form.name} onChange={handleChange} />
              <input type="email" name="email" placeholder="*Enter Email" className="w-full p-4 rounded-full border bg-white focus:ring-2 focus:ring-[#FF8A65]" value={form.email} onChange={handleChange} />
              <input type="tel" name="phone" placeholder="*Phone Number" className="w-full p-4 rounded-full border bg-white focus:ring-2 focus:ring-[#FF8A65]" value={form.phone} onChange={handleChange} />
              <textarea name="message" placeholder="Additional Message" rows={5} className="w-full p-4 rounded-xl border bg-white focus:ring-2 focus:ring-[#FF8A65]" value={form.message} onChange={handleChange} />
              <div className="flex items-start gap-3">
                <input type="checkbox" name="agree" checked={form.agree} onChange={handleChange} className="mt-1 w-5 h-5 text-[#FF8A65]" />
                <label className="text-sm text-gray-700">
                  I Agree To Our Friendly <a href="#" className="text-[#FF8A65] underline">Privacy Policy</a>
                </label>
              </div>
              <button type="submit" className="w-full bg-[#FF8A65] hover:bg-[#ff7043] text-white font-semibold py-4 rounded-xl shadow-lg">Send Message</button>
            </form>
          </motion.div>
        </div>
      </section>

      {/* === Map Section === */}
      <section ref={mapRef} className="py-10 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div  className=" shadow-2xl ">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3689.017013408831!2d88.34796067493606!3d22.572646185258867!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a027b03e5f0a0cd%3A0xf2f2b3d7a5e2f5a!2sKolkata%2C%20West%20Bengal%2C%20India!5e0!3m2!1sen!2sin!4v1693555200000!5m2!1sen!2sin"
              width="100%"
              height="600"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full h-64 sm:h-80 lg:h-120"
              title="Our Location - Kolkata, West Bengal, India"
            />
          </motion.div>
        </div>
      </section>

      {/* === FAQ Section at Bottom === */}
      <FAQSection />
    </div>
  );
}
