'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Play, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';

/* ================== Types ================== */
interface BannerSlide {
  id: number;
  videoSrc: string;
  title: string;
  subtitle: string;
  description: string;
}

const Banner = () => {
  const router = useRouter();
  const slides: BannerSlide[] = [
    {
      id: 1,
      videoSrc: '/videos/Banner12.mp4',
      title: 'Connect with Pet Lovers',
      subtitle: 'WELCOME TO PETZONEE',
      description:
        'The ultimate social platform for pet lovers. Share moments, find services, and build a community around your furry friends.',
    },
    {
      id: 2,
      videoSrc: '/videos/BannerCat.mp4',
      title: 'Expert Pet Care Services',
      subtitle: 'PROFESSIONAL CARE',
      description:
        'Book veterinary appointments, find grooming services, and ensure your pets get the best care they deserve.',
    },
    {
      id: 3,
      videoSrc: '/videos/BannerPuppy.mp4',
      title: 'Everything Your Pet Needs',
      subtitle: 'PET MARKETPLACE',
      description:
        'Discover premium pet products, accessories, and services all in one convenient platform.',
    },
    {
      id: 4,
      videoSrc: '/videos/BannerDog4.mp4',
      title: 'Discover Pets Nearby',
      subtitle: 'GEOLOCATION MAP',
      description:
        'Find and connect with pets and owners around you using our interactive map and community discovery tools.',
    },
    {
      id: 5,
      videoSrc: '/videos/Bannerimg5.mp4',
      title: 'Safe & Easy Payments',
      subtitle: 'SECURE WALLET',
      description:
        'Enjoy seamless transactions with our secure wallet for bookings, services, and pet product purchases.',
    },
  ];

  /* ================== State ================== */
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [videosLoaded, setVideosLoaded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isMuted] = useState(true);

  const videoRefs = useRef<(HTMLVideoElement | null)[]>(
    new Array(slides.length).fill(null)
  );
  const slideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const preloadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const loadedVideosRef = useRef(new Set<number>());

  /* ================== Hydration Fix ================== */
  useEffect(() => {
    setMounted(true);

    // Initial auth check
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      setIsSignedIn(!!data?.user);
    };
    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsSignedIn(!!session?.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  /* ================== Video Preloading ================== */
  useEffect(() => {
    if (!mounted) return;

    const preloadVideos = async () => {
      const firstVideo = videoRefs.current[0];
      if (!firstVideo) return;

      try {
        // Set up first video
        firstVideo.muted = true;
        firstVideo.preload = 'auto';
        firstVideo.playsInline = true;

        const handleFirstVideoLoad = () => {
          // Use HAVE_ENOUGH_DATA (4) for 0-lag with large files (34MB+)
          if (firstVideo.readyState >= 4) {
            loadedVideosRef.current.add(0);
            setVideosLoaded(true);

            // Preload other videos progressively
            videoRefs.current.slice(1).forEach((video, index) => {
              if (video) {
                const actualIndex = index + 1;
                setTimeout(() => {
                  video.muted = true;
                  video.preload = 'metadata';
                  video.playsInline = true;

                  const handleLoad = () => {
                    loadedVideosRef.current.add(actualIndex);
                    video.removeEventListener('loadeddata', handleLoad);
                  };
                  video.addEventListener('loadeddata', handleLoad);
                }, actualIndex * 800);
              }
            });
          }
        };

        if (firstVideo.readyState >= 4) {
          handleFirstVideoLoad();
        } else {
          // Listen to canplaythrough for absolute stability
          firstVideo.addEventListener('canplaythrough', handleFirstVideoLoad, { once: true });
        }

      } catch (error) {
        console.warn('Video preloading failed:', error);
        // Fallback - mark as loaded anyway
        setTimeout(() => setVideosLoaded(true), 1000);
      }
    };

    preloadVideos();

    return () => {
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current);
      }
      // Proactive cleanup of resources
      videoRefs.current.forEach((video) => {
        if (video) {
          video.pause();
          video.src = '';
          video.load();
        }
      });
    };
  }, [mounted]);

  /* ================== User Interaction ================== */
  const handleUserInteraction = useCallback(() => {
    if (!hasUserInteracted && mounted) {
      setHasUserInteracted(true);
      const currentVideo = videoRefs.current[currentSlide];
      if (currentVideo && currentVideo.readyState >= 3) {
        currentVideo.play().catch((error) => {
          console.warn('Video play failed:', error);
        });
      }
    }
  }, [hasUserInteracted, currentSlide, mounted]);

  useEffect(() => {
    if (!mounted) return;

    const events = ['click', 'touchstart', 'keydown', 'scroll'];
    const handleInteraction = () => {
      handleUserInteraction();
      events.forEach((event) =>
        document.removeEventListener(event, handleInteraction)
      );
    };

    events.forEach((event) =>
      document.addEventListener(event, handleInteraction, {
        passive: true,
      })
    );

    return () => {
      events.forEach((event) =>
        document.removeEventListener(event, handleInteraction)
      );
    };
  }, [handleUserInteraction, mounted]);

  /* ================== Auto-play Attempt ================== */
  useEffect(() => {
    if (!mounted || !videosLoaded || hasUserInteracted) return;

    const currentVideo = videoRefs.current[currentSlide];
    if (currentVideo && currentVideo.readyState >= 3) {
      currentVideo.muted = true;
      currentVideo.play().catch(() => {
        // Silent fail - will work after user interaction
      });
    }
  }, [videosLoaded, hasUserInteracted, currentSlide, mounted]);

  /* ================== Slide Timer ================== */
  const startSlideTimer = useCallback(() => {
    if (slideTimerRef.current) clearInterval(slideTimerRef.current);
    slideTimerRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
  }, [slides.length]);

  useEffect(() => {
    if (videosLoaded && mounted) {
      startSlideTimer();
    }
    return () => {
      if (slideTimerRef.current) clearInterval(slideTimerRef.current);
    };
  }, [startSlideTimer, videosLoaded, mounted]);

  /* ================== Video Playback Management ================== */
  useEffect(() => {
    if (!videosLoaded || !mounted) return;

    const playCurrentVideo = async () => {
      const currentVideo = videoRefs.current[currentSlide];
      if (!currentVideo) return;

      try {
        // Pause and reset other videos
        videoRefs.current.forEach((video, idx) => {
          if (video && idx !== currentSlide) {
            video.pause();
            video.currentTime = 0;
          }
        });

        // Play current video if ready
        if (currentVideo.readyState >= 3) {
          currentVideo.muted = isMuted;
          currentVideo.currentTime = 0;
          await currentVideo.play();
        } else {
          // Wait for video to load
          const handleCanPlay = () => {
            currentVideo.removeEventListener('canplay', handleCanPlay);
            currentVideo.muted = isMuted;
            currentVideo.currentTime = 0;
            currentVideo.play().catch(console.warn);
          };
          currentVideo.addEventListener('canplay', handleCanPlay);
          currentVideo.load();
        }
      } catch (error) {
        console.warn('Video playback error:', error);
      }
    };

    playCurrentVideo();
  }, [currentSlide, isMuted, videosLoaded, mounted]);

  /* ================== Cleanup ================== */
  useEffect(() => {
    return () => {
      if (slideTimerRef.current) clearInterval(slideTimerRef.current);
      if (preloadTimeoutRef.current) clearTimeout(preloadTimeoutRef.current);

      // Clean up video event listeners
      videoRefs.current.forEach((video) => {
        if (video) {
          video.pause();
          video.removeAttribute('src');
          video.load();
        }
      });
    };
  }, []);

  /* ================== Helpers ================== */
  const handleSlideChange = (index: number) => {
    if (!mounted) return;
    setCurrentSlide(index);
    startSlideTimer();
  };

  const scrollToContent = () => {
    if (!mounted) return;
    const element = document.getElementById('main-content');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Don't render anything until mounted
  if (!mounted) {
    return (
      <section className="relative h-screen w-full overflow-hidden bg-black/10 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/10 z-0" />
        <div className="relative z-10 flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
        </div>
      </section>
    );
  }

  /* ================== JSX ================== */
  return (
    <section className="relative h-screen w-full overflow-hidden">
      {/* Premium Background Base - Replaces pure black */}
      <div className="absolute inset-0 bg-black/10 z-0" />

      {/* Video Backgrounds */}
      {slides.map((slide, index) => {
        const isCurrent = index === currentSlide;
        const isNext = index === (currentSlide + 1) % slides.length;
        const shouldRender = isCurrent || isNext;

        return (
          <div
            key={slide.id}
            className="absolute inset-0 z-0"
            style={{
              pointerEvents: isCurrent ? 'auto' : 'none'
            }}
          >
            {shouldRender && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{
                  opacity: isCurrent ? 1 : 0,
                  scale: isCurrent ? 1.05 : 1 // Subtle Ken Burns starting state
                }}
                transition={{
                  opacity: { duration: 1.5, ease: "easeInOut" },
                  scale: { duration: 8, ease: "linear", repeat: isCurrent ? Infinity : 0, repeatType: "reverse" }
                }}
                className="absolute inset-0"
              >
                <video
                  ref={(el) => {
                    videoRefs.current[index] = el;
                  }}
                  className="absolute inset-0 w-full h-full object-cover transform-gpu"
                  muted={isMuted}
                  loop
                  playsInline
                  crossOrigin="anonymous"
                  style={{ backfaceVisibility: 'hidden', perspective: 1000 }}
                  preload={isCurrent || isNext ? 'auto' : 'metadata'}
                  onLoadedData={() => {
                    if (index === 0 && !videosLoaded) {
                      setVideosLoaded(true);
                    }
                    loadedVideosRef.current.add(index);
                  }}
                  onCanPlayThrough={() => {
                    if (index === 0) setVideosLoaded(true);
                  }}
                  onError={(e) => {
                    console.warn(`Video ${index} failed to load:`, e);
                    if (index === 0) setVideosLoaded(true);
                  }}
                >
                  <source src={slide.videoSrc} type="video/mp4" />
                </video>

                {/* Premium Overlay Gradient */}


              </motion.div>
            )}
          </div>
        );
      })}



      {/* Content */}
      <div className="relative z-20 h-full flex items-center justify-center">
        <div className="text-center max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.8 }}
            className="space-y-4 sm:space-y-6 lg:space-y-8"
          >
            <motion.p
              className="text-orange-500 font-semibold text-sm sm:text-base lg:text-lg tracking-wider uppercase [text-stroke:0.1px_rgba(0,0,0,0.5)]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {slides[currentSlide].subtitle}
            </motion.p>

            <motion.h1
              className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-tight drop-shadow-2xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              {slides[currentSlide].title}
            </motion.h1>

            <motion.p
              className="text-white/90 text-sm sm:text-base md:text-lg lg:text-xl max-w-xs sm:max-w-md md:max-w-2xl lg:max-w-3xl mx-auto leading-relaxed px-4 drop-shadow-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              {slides[currentSlide].description}
            </motion.p>
          </motion.div>

          {/* CTA Button */}
          <motion.div
            className="mt-8 sm:mt-12 inline-flex items-center space-x-2 sm:space-x-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 sm:px-6 py-2 sm:py-3 cursor-pointer hover:bg-white/20 transition-all shadow-2xl group"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            onClick={() => {
              handleUserInteraction();
              if (!isSignedIn) {
                router.push('/signup?mode=signin');
              }
            }}
          >
            <motion.div
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-500 rounded-full flex items-center justify-center shadow-lg group-hover:bg-orange-600 transition-colors"
            >
              <Play className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
            </motion.div>

            <span className="text-white font-semibold text-sm sm:text-base lg:text-lg">
              Get Started
            </span>
          </motion.div>
        </div>
      </div>

      {/* Slide Indicators */}
      <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 flex space-x-3 z-30">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => handleSlideChange(index)}
            className={`h-1.5 rounded-full transition-all duration-500 ${index === currentSlide
              ? 'bg-orange-500 w-8'
              : 'bg-white/30 w-4 hover:bg-white/60'
              }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Scroll Indicator */}
      <motion.button
        onClick={scrollToContent}
        className="absolute bottom-10 right-6 sm:right-8 text-white/70 hover:text-orange-400 transition-colors duration-300 z-30 flex flex-col items-center space-y-2"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <span className="text-[10px] uppercase tracking-widest font-medium hidden sm:block">Scroll</span>
        <ChevronDown className="w-6 h-6 sm:w-8 sm:h-8" />
      </motion.button>
    </section>
  );
};

export default Banner;
