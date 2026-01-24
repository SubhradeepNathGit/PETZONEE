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

    // Ensure initial state for animation
    gsap.set(spans, { y: 20, opacity: 0 });

    tl.to(spans, {
      opacity: 1,
      y: 0,
      duration: 1.2, // Slower, more elegant
      ease: 'expo.out', // Premium silky ease
      stagger: 0.12, // Distinct typewriter flow
    });

    // Animate subtitle after title finishes
    if (subtitleRef.current) {
      gsap.set(subtitleRef.current, { y: 15, opacity: 0 }); // Ensure initial state
      tl.to(subtitleRef.current, {
        opacity: 1,
        y: 0,
        duration: 1.5,
        ease: 'expo.out',
      }, "-=0.8"); // Overlap significantly for smooth flow
    }

    timelineRef.current = tl;

    return () => cleanupAnimation();
  }, [show, cleanupAnimation, createSpans]);

  /* ================== Container Fade ================== */
  const containerVariants: Variants = {
    hidden: { opacity: 1 }, // Start fully visible
    visible: {
      opacity: 1,
      transition: { duration: 0 }, // No fade-in transition
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
          style={{ backgroundColor: '#1a1a1a' }} // Prevent white flash before image loads
        >
          {/* Smooth Background */}
          <motion.div
            initial={{ scale: 1 }}
            animate={{ scale: 1 }}
            exit={{ scale: 1 }}
            transition={{
              duration: 0,
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
              initial={{ opacity: 0.5 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0, ease: 'easeInOut' }}
            />
          </motion.div>

          {/* Content */}
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center">
            {/* Paw Animation Placeholder/Container */}
            <div className="w-56 h-56 sm:w-64 sm:h-64 md:w-80 md:h-80 lg:w-90 lg:h-90 flex items-center justify-center relative">
              {pawData && (
                <motion.div
                  className="w-full h-full flex items-center justify-center"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    filter:
                      'drop-shadow(0 0 8px rgba(255,255,255,0.7)) brightness(1.5)',
                  }}
                  exit={{ opacity: 0, scale: 1 }}
                  transition={{
                    duration: 1.2,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  <Lottie
                    animationData={pawData}
                    loop
                    autoplay
                    style={{ width: '100%', height: '100%', willChange: 'transform' }} // Optimize transform
                    rendererSettings={{
                      preserveAspectRatio: 'xMidYMid slice',
                      progressiveLoad: true, // Help with loading performance
                      hideOnTransparent: true,
                    }}
                  />
                </motion.div>
              )}
            </div>

            {/* Title */}
            <div
              ref={titleRef}
              className="font-[var(--font-inter)] -mt-10 text-5xl lg:text-7xl font-bold tracking-wide text-white/80 will-change-[opacity,transform]"
              style={{
                letterSpacing: '0.2em',
                fontWeight: '700',
                textShadow: '0 0 16px rgba(255,255,255,0.5)', // Keep visual, but rely on GPU where possible 
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
