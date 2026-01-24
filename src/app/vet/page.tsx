// pages/vetpage.tsx
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface ServiceCard {
  id: number;
  title: string;
  description: string;
  image: string;
  alt: string;
}

const services: ServiceCard[] = [
  {
    id: 1,
    title: "Dog Checkup",
    description: "Comprehensive health examinations to ensure your dog stays strong, happy, and healthy throughout their life.",
    image: "/images/vet1.jpg",
    alt: "Veterinarian examining a golden retriever with stethoscope"
  },
  {
    id: 2,
    title: "Cat Wellness",
    description: "Gentle, thorough health inspections specifically tailored for your beloved feline companion's unique needs.",
    image: "/images/vet2.jpg",
    alt: "Veterinarian gently examining a gray and white cat"
  },
  {
    id: 3,
    title: "Advanced Diagnostics",
    description: "State-of-the-art imaging and diagnostic services to accurately assess and monitor your pet's health.",
    image: "/images/vet3.jpg",
    alt: "Veterinarian looking at X-ray images on tablet"
  },
  {
    id: 4,
    title: "Dental Care",
    description: "Professional oral health examinations and treatments to prevent dental issues and improve overall wellness.",
    image: "/images/vet4.jpg",
    alt: "Close-up of dog's teeth being examined"
  },
  {
    id: 5,
    title: "Nutritional Guidance",
    description: "Expert advice on healthy diets and balanced nutrition plans tailored to your pet's specific needs and lifestyle.",
    image: "/images/vet5.jpg",
    alt: "Smiling veterinarian holding a golden retriever"
  },
  {
    id: 6,
    title: "Behavioral Support",
    description: "Professional training guidance and behavioral support to help pets and owners build stronger, happier relationships.",
    image: "/images/vet6.jpg",
    alt: "Female veterinarian holding a small dog"
  }
];

/* ================== Pricing Section ================== */
const plans = [
  {
    title: "Essential Care",
    subtitle: "Perfect for puppies & new pet parents",
    price: { monthly: 166, yearly: 1660 },
    img: "/images/pricing1.jpg",
    features: [
      "Essential Pet Wellness Exam",
      "Free Initial Vet Consultation",
      "Basic Grooming Package",
      "Monthly Pet Care Tips & Guides",
      "15% Membership Discounts",
      "24/7 Pet Care Hotline Access"
    ],
    popular: false,
  },
  {
    title: "Complete Care",
    subtitle: "Comprehensive care for active pets",
    price: { monthly: 333, yearly: 3330 },
    img: "/images/pricing2.jpg",
    features: [
      "Full Grooming & Spa Package",
      "Pet Accessory Discounts (20%)",
      "Monthly Health Tracking Reports",
      "Priority Appointment Booking",
      "Seasonal Flea & Tick Treatment",
      "Loyalty Reward Points Program"
    ],
    popular: true,
  },
  {
    title: "Premium Care",
    subtitle: "Ultimate care for cherished companions",
    price: { monthly: 500, yearly: 5000 },
    img: "/images/pricing3.jpg",
    features: [
      "Professional Teeth Cleaning",
      "Premium Organic Spa Treatments",
      "Advanced Pet Therapy Sessions",
      "Seasonal Care Package Upgrades",
      "Comprehensive Skin Health Analysis",
      "Personalized Nutrition Planning"
    ],
    popular: false,
  },
];

const PricingSection = () => {
  const [isYearly, setIsYearly] = React.useState(false);

  return (
    <section className="w-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-20">
      <div className="max-w-7xl mx-auto px-4">
        {/* Section Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-block bg-gradient-to-r from-[#5F97C9] to-[#64B5F6] bg-clip-text text-transparent font-bold text-sm tracking-widest uppercase mb-4">
            Pricing Plans
          </div>
          <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[#5F97C9] to-[#64B5F6] bg-clip-text text-transparent mb-6">
            Choose Your Care Plan
          </h2>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto mb-8">
            Select the perfect care package for your beloved pet. All plans include our commitment to exceptional veterinary care.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center bg-white rounded-full p-1 shadow-lg border border-blue-100">
            <button
              onClick={() => setIsYearly(false)}
              className={`px-6 py-3 rounded-full font-semibold transition-all duration-300 ${
                !isYearly
                  ? "bg-gradient-to-r from-[#5F97C9] to-[#64B5F6] text-white shadow-md"
                  : "text-slate-600 hover:text-[#5F97C9]"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={`px-6 py-3 rounded-full font-semibold transition-all duration-300 relative ${
                isYearly
                  ? "bg-gradient-to-r from-[#5F97C9] to-[#64B5F6] text-white shadow-md"
                  : "text-slate-600 hover:text-[#5F97C9]"
              }`}
            >
              Yearly
              <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                Save 20%
              </span>
            </button>
          </div>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid gap-8 md:grid-cols-3 max-w-6xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              viewport={{ once: true }}
              className={`relative bg-white rounded-3xl shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl ${
                plan.popular 
                  ? 'ring-2 ring-[#5F97C9] scale-105' 
                  : 'hover:ring-2 hover:ring-[#64B5F6]/50'
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-[#5F97C9] to-[#64B5F6] text-white text-center py-2 font-semibold text-sm">
                  Most Popular
                </div>
              )}

              {/* Plan Image */}
              <div className="relative h-48 overflow-hidden">
                <Image
                  src={plan.img}
                  alt={plan.title}
                  fill
                  className="object-cover transition-transform duration-500 hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              </div>

              {/* Content */}
              <div className="p-8">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-[#5F97C9] to-[#64B5F6] bg-clip-text text-transparent mb-2">
                    {plan.title}
                  </h3>
                  <p className="text-slate-600 text-sm mb-4">{plan.subtitle}</p>
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-slate-800">
                      ₹{isYearly ? plan.price.yearly.toLocaleString() : plan.price.monthly}
                    </span>
                    <span className="text-slate-600 ml-1">
                      /{isYearly ? "year" : "month"}
                    </span>
                    {isYearly && (
                      <div className="text-green-600 text-sm font-medium mt-1">
                        Save ₹{((plan.price.monthly * 12) - plan.price.yearly).toLocaleString()} annually
                      </div>
                    )}
                  </div>
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start">
                      <div className="flex-shrink-0 w-5 h-5 bg-gradient-to-r from-[#5F97C9] to-[#64B5F6] rounded-full flex items-center justify-center mr-3 mt-0.5">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-slate-700 text-sm leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full py-4 rounded-2xl font-semibold text-lg transition-all duration-300 ${
                    plan.popular
                      ? 'bg-gradient-to-r from-[#5F97C9] to-[#64B5F6] text-white shadow-lg hover:shadow-xl'
                      : 'bg-slate-100 text-slate-800 hover:bg-gradient-to-r hover:from-[#5F97C9] hover:to-[#64B5F6] hover:text-white'
                  }`}
                >
                  Get Started
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom Note */}
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <p className="text-slate-600">
            All plans include free consultations and can be cancelled anytime. 
            <span className="text-[#5F97C9] font-medium"> Questions? Contact our care team.</span>
          </p>
        </motion.div>
      </div>
    </section>
  );
};

const VeterinaryServices: React.FC = () => {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Hero Banner */}
     {/* Top Banner */}
      <div className="relative w-full h-48 sm:h-64 md:h-72 lg:h-80 mb-8">
        <Image
          src="/images/statbg9.jpg"
          alt="Products Banner"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/40 flex flex-col justify-center items-center text-center">
          <h1 className="text-3xl md:text-5xl font-bold text-white">
            Veterinary Support
          </h1>
           <p className="text-sm md:text-base text-gray-200 mt-2">
            Home / Health
          </p>

        </div>
      </div>

      {/* Header Section */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className="text-center py-20 px-4 max-w-6xl mx-auto"
      >
        <div className="inline-block bg-gradient-to-r from-[#5F97C9] to-[#64B5F6] bg-clip-text text-transparent font-bold text-sm tracking-widest uppercase mb-6">
          Our Mission
        </div>
        <h1 className="text-4xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-[#5F97C9] to-[#64B5F6] bg-clip-text text-transparent mb-8 leading-tight">
          Nurturing Animal Health with Expert Care
        </h1>
        <p className="text-xl text-slate-600 max-w-4xl mx-auto leading-relaxed">
          We are dedicated to providing exceptional veterinary services that support the health, happiness, and well-being of your beloved companions through every stage of their lives.
        </p>
      </motion.section>

      {/* Services Grid */}
      <section className="container mx-auto px-4 pb-24 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="group bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden cursor-pointer border border-blue-100 hover:border-[#64B5F6]/30"
            >
              {/* Image Container */}
              <div className="relative h-56 overflow-hidden">
                <Image
                  src={service.image}
                  alt={service.alt}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Overlay Icon */}
                <div className="absolute top-4 right-4 w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                  <svg className="w-6 h-6 text-[#5F97C9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>

              {/* Content */}
              <div className="p-8">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-[#5F97C9] to-[#64B5F6] bg-clip-text text-transparent mb-4 group-hover:from-[#4A7BA7] group-hover:to-[#5FA3D3] transition-all duration-300">
                  {service.title}
                </h3>
                <p className="text-slate-600 leading-relaxed group-hover:text-slate-700 transition-colors duration-300">
                  {service.description}
                </p>
                
                {/* Learn More Link */}
                <div className="mt-6 flex items-center text-[#5F97C9] font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                  <span className="mr-2">Learn More</span>
                  <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative w-full h-96 md:h-[28rem] mb-20">
        <Image
          src="/images/Vetbanner.jpg"
          alt="Give your pet the care they deserve"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#5F97C9]/80 via-[#64B5F6]/70 to-[#5F97C9]/80">
          <div className="flex flex-col justify-center items-center h-full text-center px-4">
            <motion.h2 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 max-w-4xl leading-tight"
            >
              Give Your Pet the Care They Deserve
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
              className="text-blue-100 text-xl mb-8 max-w-2xl"
            >
              Schedule a consultation today and experience compassionate, professional veterinary care.
            </motion.p>
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.05, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push("/contactUs")}
              className="bg-white text-[#5F97C9] font-bold py-4 px-10 rounded-full text-xl transition-all duration-300 shadow-lg hover:shadow-xl border-2 border-white hover:bg-transparent hover:text-white"
            >
              Schedule Consultation
            </motion.button>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <PricingSection />

      {/* Bottom CTA */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className="bg-gradient-to-r from-[#5F97C9] to-[#64B5F6] text-white py-20"
      >
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            Ready to Provide the Best Care?
          </h2>
          <p className="text-blue-100 text-xl mb-8 leading-relaxed max-w-2xl mx-auto">
            Join thousands of pet parents who trust us with their beloved companions. Schedule your appointment today and experience the difference professional care makes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push("/contactUs")}
              className="bg-white text-[#5F97C9] font-bold py-4 px-8 rounded-full text-lg transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Book Appointment
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="border-2 border-white text-white font-bold py-4 px-8 rounded-full text-lg transition-all duration-300 hover:bg-white hover:text-[#5F97C9]"
            >
              Learn More
            </motion.button>
          </div>
        </div>
      </motion.section>
    </div>
  );
};

export default VeterinaryServices;