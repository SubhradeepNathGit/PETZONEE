'use client';

const services = ["Grooming +", "Adoption +", "Diagnostics +", "Nutrition +", "Training +"];

export default function ServicesMarquee() {
  return (
    <div className="w-full overflow-hidden bg-[#FFF6E9] py-4 sm:py-6 md:py-8">
      <div className="flex animate-marquee space-x-6 sm:space-x-8 md:space-x-12 text-2xl sm:text-4xl md:text-5xl font-extrabold">
        {services.concat(services).map((service, i) => (
          <span
            key={i}
            className="relative cursor-pointer text-transparent bg-gradient-to-r from-orange-200 to-orange-400 bg-left bg-no-repeat bg-[length:0%_100%] inline-block transition-all duration-700 ease-out hover:bg-[length:100%_100%]"
            style={{
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextStroke: "1px hsla(33, 92%, 49%, 1.00)",
            }}
          >
            {service}
          </span>
        ))}
      </div>

      {/* Tailwind keyframes */}
      <style jsx>{`
        @keyframes marquee {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-marquee {
          display: inline-flex;
          white-space: nowrap;
          animation: marquee 18s linear infinite;
        }
      `}</style>
    </div>
  );
}
