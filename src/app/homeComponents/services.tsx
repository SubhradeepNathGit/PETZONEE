'use client';

import { useEffect, useRef } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const services = [
  { id: 1, title: "Vet Diagnostics", desc: "Complete diagnostics check to keep your pets lively & healthy.", img: "/icons/service5.png", back: "/images/vet3.jpg" },
  { id: 2, title: "Cat Wellness", desc: "Routine wellness and preventive care for your cats.", img: "/icons/servive4.png", back: "/images/vet2.jpg" },
  { id: 3, title: "Pet Nutrition", desc: "Expert diet and nutrition plans tailored to your pets.", img: "/icons/service2.png", back: "/images/vet6.jpg" },
  { id: 4, title: "Behaviour Support", desc: "Training and guidance for better behaviour and bonding.", img: "/icons/service6.png", back: "/images/vet5.jpg" },
];

export default function PetServices() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (sectionRef.current) {
      const rows = Array.from(sectionRef.current.querySelectorAll(".service-row"));
      rows.forEach((row) => {
        gsap.fromTo(
          row.querySelectorAll(".service-card"),
          { y: 50, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            stagger: 0.15,
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: {
              trigger: row,
              start: "top 80%",
            },
          }
        );
      });
    }
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative w-full pt-0 pb-20 bg-[#FFF6E9] overflow-hidden"
    >
      {/* Background decorations */}
      <div className="absolute bottom-0 -left-10 pointer-events-none z-0">
        <Image
          src="/icons/home1-dog-img.png"
          alt="Dog"
          width={250}
          height={200}
          priority
          className="object-contain w-[180px] lg:w-[250px] h-auto"
        />
      </div>
      <div className="absolute bottom-1 left-25 pointer-events-none z-0">
        <Image
          src="/icons/home1-cat-img.png"
          alt="Cat"
          width={120}
          height={120}
          priority
          className="object-contain w-[80px] lg:w-[110px] h-auto"
        />
      </div>

      {/* Heading */}
      <div className="text-center relative z-10 max-w-4xl mx-auto mb-12 px-4">
        <p className="text-xs sm:text-sm font-bold text-orange-500 uppercase tracking-wider mb-1">
          Serving Pet Needs
        </p>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0F172A] leading-tight mb-3">
          Our Pet Services
        </h2>
        <p className="mt-2 text-gray-600 text-sm sm:text-base lg:text-lg max-w-2xl mx-auto">
          We provide a full range of veterinary and wellness services to keep your pets happy,
          healthy, and full of life.
        </p>
      </div>

      {/* Service cards */}
      <div className="service-row relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl max-h-6xl mx-auto px-5">
        {services.map((service) => (
          <div
            key={service.id}
            className="service-card group relative w-full min-h-[260px] perspective"
          >
            {/* Flip wrapper */}
            <div className="relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
              
              {/* Front side */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center 
                              rounded-3xl shadow-lg p-6 bg-transparent text-[#0F172A]
                              [backface-visibility:hidden]">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#FF8A65]/10 shadow-lg flex items-center justify-center mb-4">
                  <Image
                    src={service.img}
                    alt={service.title}
                    width={60}
                    height={60}
                    className="object-contain"
                  />
                </div>
                <h3 className="text-xl font-bold mb-2">{service.title}</h3>
                <p className="text-sm text-gray-600">{service.desc}</p>
              </div>

              {/* Back side */}
              <div className="absolute inset-0 rounded-3xl overflow-hidden shadow-lg 
                              [transform:rotateY(180deg)] [backface-visibility:hidden]">
                <Image
                  src={service.back}
                  alt={`${service.title} background`}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/20 flex flex-col items-center justify-center text-center p-4">
                  <h3 className="text-lg sm:text-xl font-bold text-white mt-35 ">{service.title}</h3>
                  <p className="text-sm text-gray-200 mb-4">{service.desc}</p>
                  
                </div>
              </div>

            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
