"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";

const plans = [
  {
    title: "Puppy Plan",
    price: { monthly: 166, yearly: 166 * 12 },
    img: "/images/pricing1.jpg",
    features: [
      "Essential Pet Wellness",
      "Free Vet Consultation",
      "Essential Grooming",
      "Monthly Pet Care Tips",
      "Membership Discounts",
    ],
  },
  {
    title: "Paw Plan",
    price: { monthly: 333, yearly: 333 * 12 },
    img: "/images/pricing2.jpg",
    features: [
      "Full Grooming Package",
      "Accessory Discounts (10%)",
      "Monthly Health Tracker",
      "Loyalty Reward Points",
      "Seasonal Flea Treatment",
    ],
  },
  {
    title: "Tail-Wag Plan",
    price: { monthly: 500, yearly: 500 * 12 },
    img: "/images/pricing3.jpg",
    features: [
      "Teeth Cleaning Session",
      "Premium Organic Shampoo",
      "Pet Spa Therapy",
      "Seasonal Care Upgrade",
      "Skin Health Analysis",
    ],
  },
];

export default function PricingSection() {
  const [isYearly, setIsYearly] = useState(false);

  return (
    <section className="w-full bg-gray-50 py-16">
      {/* Top heading */}
      <div className="text-center mb-12">
        <p className="text-[#FF8A65] font-bold ">/PRICING</p>
        <h2 className="text-3xl font-bold text-gray-900 mt-2">
          Choose Your Plan
        </h2>

        {/* Toggle */}
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => setIsYearly(false)}
            className={`px-6 py-2 rounded-l-full transition-colors ${!isYearly
                ? "bg-[#FF8A65] text-white"
                : "bg-white border text-gray-800"
              }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setIsYearly(true)}
            className={`px-6 py-2 rounded-r-full transition-colors ${isYearly
                ? "bg-[#FF8A65] text-white"
                : "bg-white border text-gray-800"
              }`}
          >
            Yearly
          </button>
        </div>
      </div>

      {/* Pricing cards */}
      <div className="max-w-6xl mx-auto px-4 grid gap-8 md:grid-cols-3">
        {plans.map((plan, i) => (
          <motion.div
            key={i}
            className="relative w-full bg-white rounded-2xl shadow-lg overflow-hidden h-[520px] flex flex-col justify-between cursor-pointer transform-gpu group"
            whileHover={{ scale: 1.05 }}
            initial={{ rotateY: 180, opacity: 0 }}
            whileInView={{ rotateY: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            viewport={{ once: true }}
            style={{ perspective: 1000 }}
          >
            {/* Plan Image */}
            <div className="relative w-full h-56">
              <Image
                src={plan.img}
                alt={plan.title}
                fill
                className="object-cover"
              />
            </div>

            {/* Content */}
            <div className="flex flex-col flex-1 justify-between p-6 transition-colors group-hover:bg-[#FF8A65] group-hover:text-white">
              <div>
                <h3 className="text-xl font-semibold">{plan.title}</h3>
                <p className="mt-3 text-3xl font-bold text-[#FF8A65] group-hover:text-white">
                  Rs.{isYearly ? plan.price.yearly : plan.price.monthly}
                  <span className="text-sm font-medium ml-1">
                    /{isYearly ? "yr" : "mo"}
                  </span>
                </p>
                <ul className="mt-6 space-y-2 text-sm">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center">
                      <span className="mr-2 text-[#FF8A65] group-hover:text-white">
                        •
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Purchase Button */}
              {/* Purchase Button */}
              <button
                className="mt-6 w-full py-3 rounded-xl bg-[#FF8A65] text-white font-semibold 
             transition-transform duration-300 hover:scale-105 active:scale-95 
             group-hover:bg-white group-hover:text-[#FF8A65]"
              >
                Select Plan
              </button>

            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
