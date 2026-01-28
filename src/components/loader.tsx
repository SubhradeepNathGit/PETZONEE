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
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const spansRef = useRef<HTMLSpanElement[]>([]);

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
    if (subtitleRef.current) subtitleRef.current.style.opacity = '0';
  }, []);

  /* ================== Create Title Spans (ONCE) ================== */
  useEffect(() => {
    if (!titleRef.current || spansRef.current.length) return;

    const text = 'PETZONEE';
    const spans: HTMLSpanElement[] = [];

    for (const ch of text) {
      const span = document.createElement('span');
      span.textContent = ch;
      span.style.display = 'inline-block';
      span.style.opacity = '0';
      span.style.transform = 'translateY(24px)';
      span.style.willChange = 'transform, opacity';
      titleRef.current.appendChild(span);
      spans.push(span);
    }

    spansRef.current = spans;
  }, []);

  const [videoReady, setVideoReady] = useState(false);

  /* ================== Robust video ready check ================== */
  useEffect(() => {
    if (videoRef.current && videoRef.current.readyState >= 3) {
      setVideoReady(true);
    }

    const fallback = setTimeout(() => setVideoReady(true), 1500);
    return () => clearTimeout(fallback);
  }, []);

  /* ================== Safe video play / pause ================== */
  useEffect(() => {
    if (show && videoReady && videoRef.current) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => { });
      }
    } else if (!show && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.removeAttribute('src');
      videoRef.current.load();
    }
  }, [videoReady, show]);

  /* ================== Animate Title + Subtitle (OPTIMIZED) ================== */
  useEffect(() => {
    if (!show) return cleanupAnimation();
    if (!videoReady) return;

    cleanupAnimation();

    const spans = spansRef.current;
    if (!spans.length) return;

    // Delay GSAP until browser settles video decode + layer promotion
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const tl = gsap.timeline();

        gsap.set(spans, {
          y: 24,
          opacity: 0,
          scale: 0.96,
          force3D: true,
        });

        tl.to(spans, {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 1.1,
          ease: 'expo.out',
          stagger: {
            each: 0.08,
            from: 'start',
          },
        });

        if (subtitleRef.current) {
          tl.fromTo(
            subtitleRef.current,
            { y: 12, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 1,
              ease: 'expo.out',
            },
            '-=0.7'
          );
        }

        timelineRef.current = tl;
      });
    });

    return () => cleanupAnimation();
  }, [show, videoReady, cleanupAnimation]);

  /* ================== Container Fade ================== */
  const containerVariants: Variants = {
    hidden: { opacity: 1 },
    visible: { opacity: 1, transition: { duration: 0 } },
    exit: {
      opacity: 0,
      transition: { duration: 0.4, ease: [0.33, 1, 0.68, 1] },
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
          className="fixed inset-0 flex items-center justify-center overflow-hidden z-[9999] will-change-opacity bg-black"
        >
          {/* Smooth Background */}
          <motion.div
            className="absolute inset-0 will-change-transform"
          >
            <video
              ref={videoRef}
              src="/videos/petzone-loader.mp4"
              autoPlay
              muted
              loop
              playsInline
              crossOrigin="anonymous"
              onLoadedMetadata={() => setVideoReady(true)}
              onCanPlay={() => setVideoReady(true)}
              onPlaying={() => setVideoReady(true)}
              className="absolute inset-0 w-full h-full object-cover z-10"
              style={{ filter: 'brightness(0.7)', transition: 'opacity 0.5s ease' }}
            />

            <motion.div
              className="absolute inset-0 bg-black z-30 pointer-events-none"
              initial={{ opacity: 0.5 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
            />
          </motion.div>

          {/* Content */}
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center">
            <div className="w-56 h-56 sm:w-64 sm:h-64 md:w-80 md:h-80 lg:w-90 lg:h-90 flex items-center justify-center relative">
              {pawData && (
                <motion.div
                  className="w-full h-full flex items-center justify-center"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
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
                    style={{ width: '100%', height: '100%', willChange: 'transform' }}
                    rendererSettings={{
                      preserveAspectRatio: 'xMidYMid slice',
                      progressiveLoad: true,
                      hideOnTransparent: true,
                    }}
                  />
                </motion.div>
              )}
            </div>

            <div className="relative flex items-center justify-center">
              <div
                ref={titleRef}
                className="font-[var(--font-inter)] -mt-10 text-5xl lg:text-7xl font-bold text-white/90"
                style={{
                  letterSpacing: '0.15em',
                  fontWeight: '800',
                  textShadow: '0 0 20px rgba(255,255,255,0.4)',
                  minHeight: '1.2em',
                  display: 'flex',
                  alignItems: 'center',
                }}
              />
            </div>

            <div
              ref={subtitleRef}
              className="mt-4 text-lg sm:text-xl lg:text-xl text-white/70 font-medium opacity-0 translate-y-3"
              style={{ textShadow: '0 0 12px rgba(255,255,255,0.4)' }}
            >
              Connecting Pet Lovers, from Cute Clicks to Heartfelt Bonds
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
