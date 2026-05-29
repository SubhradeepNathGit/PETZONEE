'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import Image from "next/image"; 

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  { id: "vet", question: "Could you suggest a trustworthy veterinarian?", answer: "We recommend certified local veterinarians with proven track records in pet care. You can also check our partner directory for trusted professionals near you." },
  { id: "service", question: "Are there affordable yet reliable service options?", answer: "Yes, we provide budget-friendly packages covering checkups, grooming, vaccinations, and preventive care without compromising quality." },
  { id: "products", question: "Which products help control odors and shedding?", answer: "Use high-quality grooming products such as deshedding tools, enzymatic cleaners, and specialized shampoos designed to minimize odors and reduce shedding." },
  { id: "training", question: "Do you offer specialized training for pets?", answer: "Yes, our certified trainers provide personalized programs ranging from basic obedience to advanced behavior training." },
  { id: "adoption", question: "Are there any adoption events this week?", answer: "Check our events calendar for adoption drives, meet-and-greets, and workshops that help pets find loving homes." },
  { id: "toys", question: "Which toys are safest for puppies and kittens?", answer: "Opt for non-toxic, durable toys without small parts. Puzzle feeders, rubber chews, and rope toys are great choices." },
  { id: "immunization", question: "Are pet immunization services available?", answer: "Yes, we provide vaccinations for cats, dogs, and other pets based on veterinary guidelines and local requirements." },
  { id: "grooming", question: "Can I book grooming appointments online?", answer: "Absolutely! Our online booking system lets you choose services, time slots, and preferences at your convenience." },
  { id: "food", question: "Do you offer organic cat food?", answer: "Yes, we stock certified organic cat foods made with natural ingredients and free from artificial additives." },
  { id: "supplies", question: "Do you provide pet supplies immediately?", answer: "Yes, essential supplies such as food, toys, bedding, and health products are available in-store and online." },
];

interface FAQSectionProps {
  className?: string;
  dark?: boolean;
  hideFooter?: boolean;
}

const FAQSection: React.FC<FAQSectionProps> = ({ className = "", dark = false, hideFooter = false }) => {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggleFAQ = (id: string): void => {
    setOpenId(openId === id ? null : id);
  };

  const mid = Math.ceil(faqData.length / 2);
  const leftFAQs = faqData.slice(0, mid);
  const rightFAQs = faqData.slice(mid);

  const renderFAQ = (faq: FAQItem, index: number) => (
    <motion.article
      key={faq.id}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className={`rounded-lg border overflow-hidden transition-all duration-300 ${
        dark 
          ? 'bg-white/[0.02] border-white/5 hover:border-white/20' 
          : 'bg-white border-gray-100'
      }`}
    >
      <button
        onClick={() => toggleFAQ(faq.id)}
        className={`w-full px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between text-left group transition-colors duration-300 ${
          dark 
            ? 'text-white/80 hover:bg-[#FF8A65]/10 hover:text-white' 
            : 'hover:bg-[#FF8A65] hover:text-white'
        }`}
        aria-expanded={openId === faq.id}
        aria-controls={`faq-answer-${faq.id}`}
      >
        <h2 className="text-sm sm:text-base md:text-lg font-medium pr-2 sm:pr-4">{faq.question}</h2>
        <motion.div
          animate={{ rotate: openId === faq.id ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          className="group-hover:text-white flex-shrink-0"
        >
          <ChevronDown className={`w-4 h-4 sm:w-5 sm:h-5 ${dark ? 'text-white/40 group-hover:text-[#FF8A65]' : ''}`} />
        </motion.div>
      </button>

      <AnimatePresence>
        {openId === faq.id && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden mt-1"
            id={`faq-answer-${faq.id}`}
          >
            <div className="px-3 sm:px-4 pb-3 sm:pb-4">
              <p className={`text-xs sm:text-sm md:text-base leading-relaxed ${
                dark ? 'text-white/50' : 'text-gray-600'
              }`}>{faq.answer}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );

  return (
    <section className={`relative w-full py-8 sm:py-12 px-3 sm:px-6 lg:px-10 transition-colors duration-300 ${
      dark 
        ? 'bg-black text-white' 
        : 'bg-gradient-to-b from-gray-50 to-white'
    } ${className}`}>
      <div className="max-w-6xl mx-auto">
        
        {/* Section Label */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-2"
        >
          <span className="text-xs sm:text-sm md:text-base font-bold text-[#FF8A65]">/FAQ</span>
        </motion.div>

        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8 sm:mb-12"
        >
          <h1 className={`text-lg sm:text-2xl md:text-3xl font-bold ${
            dark ? 'text-white' : 'text-gray-800'
          }`}>
            Ask Anything? Get Answers Right Here!
          </h1>
        </motion.header>

        {/* FAQ Two-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
          <div className="space-y-3 sm:space-y-4">{leftFAQs.map(renderFAQ)}</div>
          <div className="space-y-3 sm:space-y-4 mt-2 lg:mt-0">{rightFAQs.map(renderFAQ)}</div>
        </div>

        {/* Footer */}
        {!hideFooter && (
          <motion.footer
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="text-center mt-8 sm:mt-12"
          >
            <p className={`text-xs sm:text-sm md:text-base ${
              dark ? 'text-white/40' : 'text-gray-600'
            }`}>
              Still have questions?{" "}
              <motion.a
                href="#contact"
                className="text-[#FF8A65] hover:text-[#ff7043] font-medium underline transition-colors"
                whileHover={{ scale: 1.05 }}
              >
                Contact us
              </motion.a>
            </p>
          </motion.footer>
        )}
      </div>

      {/* Food Bowl PNG Bottom Left with Fade-in */}
      <motion.div
        initial={{ opacity: 0, x: -50, y: 50 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="absolute bottom-0 left-0 w-24 sm:w-32 md:w-40 lg:w-52"
      >
        <Image 
          src="/icons/foodbowl.png"
          alt="Food Bowl"
          width={400}
          height={300}
          className="w-full h-auto"
        />
      </motion.div>
    </section>
  );
};

export default FAQSection;
