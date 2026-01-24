'use client';

import React from 'react';
import Image from 'next/image';

interface Offer {
  img: string;
  title: string;
  subtitle: string;
}

const offers: Offer[] = [
  { img: "/icons/marquee4.jpg", title: "Up to 70% Off", subtitle: "Cages & Tanks" },
  { img: "/icons/marquee3.jpg", title: "Up to 80% Off", subtitle: "Dog Foods" },
  { img: "/icons/marquee2.jpg", title: "Minimum 30% Off", subtitle: "Kitten Chow" },
  { img: "/icons/marquee1.jpg", title: "40% - 80% Off", subtitle: "Pet Services" },
  { img: "/icons/marquee1.jpg", title: "Up to 40% Off", subtitle: "Regular Checkup" },
  { img: "/icons/marquee3.jpg", title: "Buy 2 Get 1", subtitle: "Pet Toys" }
];

const OfferItem: React.FC<{ offer: Offer }> = ({ offer }) => (
  <div className="flex items-center mx-3 sm:mx-4 md:mx-6 space-x-2 flex-shrink-0">
    {/* Smaller Rounded Image Container */}
    <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full bg-white/30 flex items-center justify-center overflow-hidden">
      <Image 
        src={offer.img} 
        alt={offer.title} 
        width={80} 
        height={80} 
        className="object-contain w-full h-full"
      />
    </div>

    {/* Text with tighter line height */}
    <div>
      <h3 className="text-white font-bold text-base sm:text-lg md:text-xl leading-tight glowing-title">
        {offer.title}
      </h3>
      <p className="text-white/90 text-xs sm:text-sm md:text-sm leading-tight">
        {offer.subtitle}
      </p>
    </div>
  </div>
);

const PetOffersMarquee: React.FC = () => {
  // Repeat offers twice for seamless loop
  const repeatedOffers = [...offers, ...offers];

  return (
    <div className="w-full relative overflow-hidden py-3">
      {/* Animated Gradient Background */}
      <div
        className="absolute inset-0 animate-gradient-x"
        style={{
          background: 'linear-gradient(-45deg, #FF7B5A, rgba(246, 147, 49, 1), #FF6347, #f37070ff, #FF7B5A)',
          backgroundSize: '400% 400%',
        }}
      />

      {/* Marquee Content */}
      <div className="flex animate-marquee whitespace-nowrap">
        {[...repeatedOffers, ...repeatedOffers].map((offer, index) => (
          <OfferItem key={`${offer.title}-${index}`} offer={offer} />
        ))}
      </div>

      {/* Custom CSS Animations */}
      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }

        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        @keyframes glow {
          0%, 100% { text-shadow: 0 0 5px #fff, 0 0 10px #ff7b5a, 0 0 20px #ff6347; }
          50% { text-shadow: 0 0 10px #fff, 0 0 20px #ff7b5a, 0 0 40px #ff6347; }
        }

        .animate-marquee {
          display: inline-flex;
          animation: marquee 60s linear infinite;
        }

        .animate-marquee:hover {
          animation-play-state: paused;
        }

        .animate-gradient-x {
          animation: gradient-x 8s ease infinite;
        }

        .glowing-title {
          animation: glow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default PetOffersMarquee;
