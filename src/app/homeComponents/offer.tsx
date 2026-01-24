"use client";

import Image from "next/image";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type TimeLeft = {
  days: number;
  hours: number;
  mins: number;
  secs: number;
};

interface OfferBannerProps {
  endDate?: Date;
}

export default function OfferBanner({ endDate }: OfferBannerProps) {
  const defaultTarget = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    d.setHours(d.getHours() + 8);
    d.setMinutes(d.getMinutes() + 30);
    d.setSeconds(d.getSeconds() + 52);
    return d;
  }, []);

  const target = endDate ?? defaultTarget;

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() =>
    diffFromNow(target)
  );

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(diffFromNow(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  const rootRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: rootRef.current,
          start: "top 80%",
        },
      });

      tl.from(".ob-heading", { y: 30, opacity: 0, duration: 0.6 })
        .from(
          ".ob-sub",
          { y: 20, opacity: 0, duration: 0.6, stagger: 0.1 },
          "-=0.3"
        )
        .from(".ob-cta", { scale: 0.95, opacity: 0, duration: 0.4 }, "-=0.2");
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={rootRef} className="relative w-full overflow-hidden">
      {/* Top Curve */}
      <div className="ob-curve absolute top-0 left-0 w-full pointer-events-none z-10">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1440 150"
          className="w-full h-[70px] sm:h-[90px] md:h-[110px] lg:h-[140px]"
          preserveAspectRatio="none"
        >
          <path
            d="M0,64 C480,180 960,0 1440,100 L1440,0 L0,0 Z"
            fill="white"
          />
        </svg>
      </div>

      {/* Background */}
      <div className="relative min-h-[480px] sm:min-h-[540px] md:min-h-[620px] lg:min-h-[680px] flex items-center">
        <Image
          src="/images/offerbanner.jpg"
          alt="Woman cuddling a dog"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/45 md:bg-black/35" />

        {/* Content */}
        <div className="relative z-20 container mx-auto px-4 sm:px-6 lg:px-8 mt-30">
          <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-y-8">
            {/* Left spacer on desktop */}
            <div className="hidden md:block md:col-span-6" />
            {/* Text content */}
            <div className="md:col-span-6 text-white text-center md:text-left">
              <p className="ob-sub text-[11px] sm:text-xs md:text-sm tracking-[0.12em] text-[#FF5E5E] font-semibold mb-2">
                /INSTANT DISCOUNT COUPON
              </p>

              <h2 className="ob-heading font-bold leading-tight mb-3 text-[22px] sm:text-[28px] md:text-[40px] lg:text-[48px]">
                Poshik Deals You’ll Love —<br className="hidden sm:block" />
                Ending Really Soon
              </h2>

              <p className="ob-sub max-w-[620px] mx-auto md:mx-0 text-xs sm:text-sm md:text-base opacity-90 mb-6 md:mb-8">
                Lacinia integer nunc posuere ut hendrerit semper vel. Torquent
                per conubia nostra inceptos himenaeos orci varius. Montes nascetur
                ridiculus mus donec rhoncus eros lobortis.
              </p>

              {/* Countdown */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 sm:gap-3 md:gap-4 mb-6 md:mb-8">
                <FlipTimer label="Days" value={pad(timeLeft.days)} wide />
                <Colon />
                <FlipTimer label="Hrs" value={pad(timeLeft.hours)} />
                <Colon />
                <FlipTimer label="Mins" value={pad(timeLeft.mins)} />
                <Colon />
                <FlipTimer label="Secs" value={pad(timeLeft.secs)} />
              </div>

              {/* CTA */}
              
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- helpers & subcomponents ---------- */
function diffFromNow(target: Date): TimeLeft {
  const now = new Date().getTime();
  const end = target.getTime();
  let delta = Math.max(0, Math.floor((end - now) / 1000));

  const days = Math.floor(delta / (3600 * 24));
  delta -= days * 3600 * 24;
  const hours = Math.floor(delta / 3600);
  delta -= hours * 3600;
  const mins = Math.floor(delta / 60);
  delta -= mins * 60;
  const secs = delta;

  return { days, hours, mins, secs };
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function Colon() {
  return (
    <span className="mx-1 sm:mx-2 md:mx-3 text-lg sm:text-xl md:text-3xl font-bold opacity-90">
      :
    </span>
  );
}

function FlipTimer({
  value,
  label,
  wide,
}: {
  value: string | number;
  label: string;
  wide?: boolean;
}) {
  return (
    <div
      className={[
        "ob-card backdrop-blur-md bg-white/20 border border-white/30 text-white rounded-xl text-center",
        "px-2.5 py-2.5 sm:px-3.5 sm:py-3 md:px-4 md:py-3.5",
        wide ? "min-w-[72px] sm:min-w-[80px] md:min-w-[88px]" : "min-w-[56px] sm:min-w-[64px] md:min-w-[72px]",
        "shadow-lg flex flex-col items-center justify-center relative overflow-hidden",
      ].join(" ")}
    >
      <div className="relative h-[1.1em] sm:h-[1.3em] md:h-[1.6em] flex items-center justify-center">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={value}
            initial={{ y: "-100%", rotateX: 90, opacity: 0 }}
            animate={{ y: "0%", rotateX: 0, opacity: 1 }}
            exit={{ y: "100%", rotateX: -90, opacity: 0 }}
            transition={{ duration: 0.45, ease: "easeInOut" }}
            className="absolute text-xl sm:text-2xl md:text-4xl font-extrabold leading-none"
          >
            {value}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="mt-1 sm:mt-2 text-[9px] sm:text-xs md:text-sm font-medium opacity-80">
        {label}
      </div>
    </div>
  );
}
