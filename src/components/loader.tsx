'use client';

import { motion, AnimatePresence, Variants } from 'framer-motion';
import Image from 'next/image';
import { useEffect, useRef, useState, useCallback } from 'react';
import Lottie from 'lottie-react';
import { gsap } from 'gsap';

interface LoaderProps {
  isLoading: boolean;
}

export default function Loader({ isLoading }: LoaderProps) {
  const [show, setShow] = useState<boolean>(isLoading);
  const [pawData, setPawData] = useState<Record<string, unknown> | null>(null);

  const titleRef = useRef<HTMLDivElement | null>(null);
  const subtitleRef = useRef<HTMLDivElement | null>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  /* ================== State Sync ================== */
  useEffect(() => setShow(isLoading), [isLoading]);

  /* ================== Preload Lottie ================== */
  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        const res = await fetch('/icons/paw.json');
        const data = await res.json();
        if (!cancelled) setPawData(data);
      } catch {
        if (!cancelled) setPawData(null);
      }
    };
    fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ================== Cleanup GSAP ================== */
  const cleanupAnimation = useCallback(() => {
    timelineRef.current?.kill();
    timelineRef.current = null;
    if (titleRef.current) titleRef.current.innerHTML = '';
    if (subtitleRef.current) subtitleRef.current.style.opacity = '0';
  }, []);

  /* ================== Create Title Spans ================== */
  const createSpans = useCallback(() => {
    if (!titleRef.current) return [];
    const titleEl = titleRef.current;
    const text = 'PETZONEE';
    const spans: HTMLSpanElement[] = [];

    for (const ch of text) {
      const span = document.createElement('span');
      span.textContent = ch;
      span.style.opacity = '0';
      span.style.display = 'inline-block';
      span.style.transform = 'translateY(12px)';
      titleEl.appendChild(span);
      spans.push(span);
    }
    return spans;
  }, []);

  /* ================== Animate Title + Subtitle ================== */
  useEffect(() => {
    if (!show) return cleanupAnimation();
    if (!titleRef.current) return;

    cleanupAnimation();
    const spans = createSpans();

    const tl = gsap.timeline();
    tl.to(spans, {
      opacity: 1,
      y: 0,
      duration: 0.5,
      ease: 'power3.out',
      stagger: 0.12,
      delay: 0.2,
    });

    // Animate subtitle after title finishes
    if (subtitleRef.current) {
      tl.to(subtitleRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'power3.out',
      }, "+=0.2");
    }

    timelineRef.current = tl;

    return () => cleanupAnimation();
  }, [show, cleanupAnimation, createSpans]);

  /* ================== Container Fade ================== */
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.6, ease: 'easeInOut' },
    },
    exit: {
      opacity: 0,
      transition: { duration: 0.6, ease: 'easeInOut' },
    },
  };

  return (
    <AnimatePresence mode="wait">
      {show && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 flex items-center justify-center overflow-hidden z-[9999]"
        >
          {/* Smooth Background */}
          <motion.div
            initial={{ scale: 1 }}
            animate={{ scale: 1.05 }}
            exit={{ scale: 1 }}
            transition={{
              duration: 2.0,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="absolute inset-0 will-change-transform"
          >
            <Image
              src="/images/loader5.jpg"
              alt="Background"
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
            {/* Dark Overlay */}
            <motion.div
              className="absolute inset-0 bg-black"
              initial={{ opacity: 0.3 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeInOut' }}
            />
          </motion.div>

          {/* Content */}
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center">
            {/* Paw Animation */}
            {pawData && (
              <motion.div
                className="w-56 h-56 sm:w-64 sm:h-64 md:w-72 md:h-72 flex items-center justify-center"
                initial={{ opacity: 0, scale: 1.2 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  filter:
                    'drop-shadow(0 0 8px rgba(255,255,255,0.7)) brightness(1.5)',
                }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{
                  duration: 1.2,
                  ease: 'easeOut',
                }}
              >
                <Lottie
                  animationData={pawData}
                  loop
                  autoplay
                  style={{ width: '100%', height: '100%' }}
                  rendererSettings={{ preserveAspectRatio: 'xMidYMid slice' }}
                />
              </motion.div>
            )}

            {/* Title */}
            <div
              ref={titleRef}
              className="font-[var(--font-inter)] text-5xl lg:text-7xl font-bold tracking-wide text-white/80"
              style={{
                letterSpacing: '0.2em',
                fontWeight: '700',
                textShadow: '0 0 16px rgba(255,255,255,0.5)',
                minHeight: '1.2em',
              }}
            />

            {/* Subtitle */}
            <div
              ref={subtitleRef}
              className="mt-4 text-lg sm:text-xl lg:text-xl text-white/70 font-medium opacity-0 translate-y-3"
              style={{
                textShadow: '0 0 12px rgba(255,255,255,0.4)',
              }}
            >
              Connecting Pet Lovers, from Cute Clicks to Heartfelt Bonds
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
