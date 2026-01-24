"use client";

import Image from "next/image";
import { Linkedin, Youtube, Facebook, Twitter } from "lucide-react";

type Coach = {
  id: number;
  name: string;
  role: string;
  image: string;
};

const coaches: Coach[] = [
  {
    id: 1,
    name: "Freddie Perry",
    role: "PET BEHAVIORIST",
    image: "/images/team1.jpg",
  },
  {
    id: 2,
    name: "Eugene Washington",
    role: "ANIMAL HANDLER",
    image: "/images/team2.jpg",
  },
  {
    id: 3,
    name: "Jami Guillen",
    role: "PETS CARE TRAINER",
    image: "/images/team3.jpg",
  },
  {
    id: 4,
    name: "Elizabeth Stephens",
    role: "PET NUTRITIONIST",
    image: "/images/team4.jpg",
  },
];

export default function Team() {
  return (
    <section className="py-16 md:py-20 lg:py-24 px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 2xl:px-20 bg-[#f8f4f0] text-center relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-8 left-8 md:top-16 md:left-16 lg:top-20 lg:left-20 text-orange-400">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <path
            d="M5 15L15 5L25 15L35 5"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M5 35L15 25L25 35L35 25"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="absolute top-8 right-8 md:top-16 md:right-16 lg:top-20 lg:right-20 text-orange-400">
        <svg width="50" height="50" viewBox="0 0 50 50" fill="none">
          <circle cx="15" cy="15" r="3" fill="currentColor" />
          <circle cx="35" cy="15" r="3" fill="currentColor" />
          <path
            d="M10 35C10 35 15 40 25 40C35 40 40 35 40 35"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path
            d="M15 25L25 20L35 25"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12 md:mb-16 lg:mb-20">
          <p className="text-sm md:text-base text-orange-500 font-bold tracking-wider uppercase mb-2">
            /POSHIK CREW
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-4 leading-tight">
            Certified Pet Coaches
          </h2>
          <p className="text-gray-600 max-w-3xl mx-auto text-sm sm:text-base md:text-lg leading-relaxed px-4">
            Our certified veterinarians and pet specialists provide expert care, training, and 
            nutrition advice to keep your beloved pets healthy and happy.
          </p>
        </div>

        {/* Coaches grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 lg:gap-10">
          {coaches.map((coach) => (
            <div key={coach.id} className="coach-card group">
              {/* Image circle only */}
              <div className="relative w-40 h-40 md:w-48 md:h-48 lg:w-56 lg:h-56 rounded-full overflow-hidden mb-6 mx-auto shadow-lg">
                <Image
                  src={coach.image}
                  alt={coach.name}
                  fill
                  className="object-cover transform group-hover:scale-110 transition-transform duration-500 ease-out"
                  sizes="(max-width: 768px) 160px, (max-width: 1024px) 192px, (max-width: 1280px) 224px, 256px"
                />
              </div>

              {/* Name & Role */}
              <div className="space-y-2">
                <h3 className="text-lg md:text-xl font-bold text-gray-800 leading-tight">
                  {coach.name}
                </h3>
                <p className="text-xs md:text-sm text-gray-600 font-semibold tracking-wider uppercase">
                  {coach.role}
                </p>
              </div>

              {/* Social Icons */}
              <div className="flex justify-center gap-3 md:gap-4 mt-4">
                <a
                  href="#"
                  className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-orange-500 transition-colors duration-300"
                >
                  <Linkedin size={18} />
                </a>
                <a
                  href="#"
                  className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-orange-500 transition-colors duration-300"
                >
                  <Youtube size={18} />
                </a>
                <a
                  href="#"
                  className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-orange-500 transition-colors duration-300"
                >
                  <Twitter size={18} />
                </a>
                <a
                  href="#"
                  className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-orange-500 transition-colors duration-300"
                >
                  <Facebook size={18} />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
