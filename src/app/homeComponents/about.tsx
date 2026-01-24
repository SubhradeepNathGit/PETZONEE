'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { motion, useScroll, useTransform } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Button } from '@/components/ui/button';

if (typeof window !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
}

export default function AboutPage() {
    const sectionRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLDivElement>(null);
    const counterRef = useRef<HTMLDivElement>(null);
    const [counterValue, setCounterValue] = useState(0);

    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ["start end", "end start"]
    });

    const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '25%']);
    const contentY = useTransform(scrollYProgress, [0, 1], ['0%', '-8%']);

    useEffect(() => {
        if (textRef.current) {
            // Reveal text animation
            gsap.fromTo(
                textRef.current.querySelectorAll('.reveal-text'),
                { y: 80, opacity: 0 },
                {
                    y: 0,
                    opacity: 1,
                    duration: 1.4,
                    stagger: 0.25,
                    ease: 'power3.out',
                    scrollTrigger: {
                        trigger: textRef.current,
                        start: 'top 80%',
                    },
                }
            );
        }

        // Counter animation
        if (counterRef.current) {
            gsap.to(counterRef.current, {
                scrollTrigger: {
                    trigger: counterRef.current,
                    start: 'top 90%',
                    onEnter: () => {
                        gsap.to({ value: 0 }, {
                            value: 300000,
                            duration: 2,
                            ease: 'power2.out',
                            onUpdate: function() {
                                setCounterValue(Math.floor(this.targets()[0].value));
                            }
                        });
                    }
                },
            });
        }

        // Floating paw animation
        const paw = document.querySelector('.paw-float');

        if (paw) {
            // 1️⃣ Scroll-triggered rotation from 0° → 15°
            gsap.to(paw, {
                rotation: 20,
                scrollTrigger: {
                    trigger: sectionRef.current,
                    start: "top bottom",
                    end: "bottom top",
                    scrub: true, // smooth scroll-driven animation
                },
            });

            // 2️⃣ Continuous floating (after rotation)
            gsap.to(paw, {
                y: "-=20",   // float up/down
                x: "+=10",   // float left/right
                duration: 4,
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut',
                delay: 0.5,
            });
        }
    }, []);

    const formatCounter = (value: number) => {
        if (value >= 10000) {
            return (value / 10000).toFixed(0) + 'K';
        }
        return value.toString();
    };

    return (
        <section
            ref={sectionRef}
            className="relative overflow-hidden bg-gradient-to-br from-[#FF6B47] via-[#FF8A65] to-[#FFAB78] min-h-screen"
        >
            <div className="absolute -top-1 right-0 w-52 sm:w-40 lg:w-110 z-10 pointer-events-none">
                <Image
                    src="/icons/home1-pet-food.png"
                    alt="Pet Food"
                    width={500}
                    height={500}
                    priority
                    className="object-contain"
                />
            </div>
            {/* Animated Paw Print Background */}
            <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{ y: bgY }}
            >
                {/* Left side large paw */}
                <div className="paw-float absolute top-2 left-1 w-85 h-100 opacity-35">
                    <svg viewBox="0 0 100 100" className="w-full h-full fill-white">
                        <ellipse cx="50" cy="30" rx="12" ry="18" />
                        <ellipse cx="30" cy="45" rx="8" ry="14" />
                        <ellipse cx="70" cy="45" rx="8" ry="14" />
                        <ellipse cx="25" cy="65" rx="7" ry="12" />
                        <ellipse cx="75" cy="65" rx="7" ry="12" />
                        <ellipse cx="50" cy="80" rx="20" ry="15" />
                    </svg>
                </div>

                {/* Center blur effect */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/8 rounded-full blur-3xl"></div>
            </motion.div>

            <motion.div
                className="container mx-auto px-8 lg:px-20 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10 min-h-screen"
                style={{ y: contentY }}
            >
                {/* Left Content */}
                <div ref={textRef} className="text-white space-y-12 text-center lg:text-left">
                    <motion.p
                        className="reveal-text uppercase tracking-[0.3em] text-sm font-bold opacity-70"
                        whileInView={{ opacity: [0, 1] }}
                    >
                        /ABOUT US
                    </motion.p>

                    <motion.h1 className="reveal-text text-3xl sm:text-4xl lg:text-5xl font-bold leading-[0.95] tracking-tight whitespace-nowrap">
                        Start Your Pet&apos;s Journey with Us
                    </motion.h1>

                    <motion.p className="reveal-text text-base lg:text-lg leading-relaxed max-w-2xl mx-auto lg:mx-0 opacity-95 font-medium">
                        At Poshik, we believe every pet deserves love, care and the best journey
                        of life. From food to accessories, we provide everything that strengthens
                        the bond between pets and owners.
                    </motion.p>

                    <motion.div className="reveal-text flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-6 pt-8">
                        {/* Glass Button */}
                        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.90 }}>
                            <Button className="relative bg-white/15 backdrop-blur-lg text-white font-bold px-8 py-6 rounded-full text-lg border border-white/25 shadow-2xl hover:bg-[#f5f6dc] hover:text-orange-400 transition-all duration-500 overflow-hidden group">
                                <span className="relative z-10">Explore</span>
                                <motion.div
                                    className="absolute inset-0 bg-white opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                                    whileHover={{ scale: 1.5 }}
                                />
                            </Button>
                        </motion.div>

                        {/* Client Avatars */}
                        <motion.div className="flex items-center gap-4">
                            <div className="flex -space-x-3">
                                <motion.div className="w-[120px] h-13 rounded-full shadow-lg overflow-hidden">
                                    <Image
                                        src="/icons/ppl2.png"
                                        alt="Client Avatars"
                                        width={100}
                                        height={50}
                                        className="object-cover w-full h-full"
                                    />
                                </motion.div>
                            </div>

                            <div className="text-left" ref={counterRef}>
                                <div className="text-base text-white font-bold">
                                    {formatCounter(counterValue)}+
                                </div>
                                <div className="text-base opacity-80 font-medium">Satisfied Clients</div>
                            </div>
                        </motion.div>
                    </motion.div>
                </div>

                {/* Right Image - Perfect Bottom Alignment */}
                <div className="relative flex justify-center lg:justify-end">
                    <div className="relative z-10">
                        <Image
                            src="/icons/about-cutout.png"
                            alt="Happy woman with golden retriever"
                            width={600}
                            height={600}
                            priority
                            quality={100}
                            className="relative w-72 sm:w-96 lg:w-[500px] h-auto"
                            style={{
                                transform: 'translateY(120px)',
                                filter: 'drop-shadow(0 25px 50px rgba(0,0,0,0.15))'
                            }}
                        />

                        {/* Subtle glow effect */}
                        <div className="absolute -inset-6 bg-gradient-to-t from-white/5 to-transparent rounded-full blur-xl opacity-50"></div>
                    </div>
                </div>
            </motion.div>

            {/* Perfect Curved Bottom Divider */}
            <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-[0] z-20">
                <motion.svg
                    viewBox="0 0 500 140"
                    preserveAspectRatio="none"
                    className="w-full h-[140px]"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2.5, ease: "easeInOut" }}
                >
                    <path
                        d="M0,130 Q250,0 500,130 L500,150 L0,150 Z"
                        className="fill-[#FFF6E9]"
                    />
                </motion.svg>
            </div>
        </section>
    );
}