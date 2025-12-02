import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

export const LiquidBackground = () => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Create random movement for blobs
            const blobs = document.querySelectorAll('.liquid-blob');

            blobs.forEach((blob, i) => {
                // Randomize start positions slightly
                gsap.set(blob, {
                    x: Math.random() * 100 - 50,
                    y: Math.random() * 100 - 50,
                    scale: 0.8 + Math.random() * 0.4,
                });

                // Continuous floating animation
                gsap.to(blob, {
                    x: "random(-100, 100)",
                    y: "random(-100, 100)",
                    scale: "random(0.8, 1.2)",
                    rotation: "random(-180, 180)",
                    duration: 15 + Math.random() * 10,
                    repeat: -1,
                    yoyo: true,
                    ease: "sine.inOut",
                });
            });
        }, containerRef);

        return () => ctx.revert();
    }, []);

    return (
        <div ref={containerRef} className="fixed inset-0 -z-10 overflow-hidden pointer-events-none bg-slate-950">
            {/* Overlay for better text contrast */}
            <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[100px] z-10" />

            {/* Blobs */}
            <div className="liquid-blob absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-brand-blue/40 rounded-full mix-blend-screen blur-[80px] opacity-60" />
            <div className="liquid-blob absolute top-[20%] right-[-10%] w-[40vw] h-[40vw] bg-brand-green/30 rounded-full mix-blend-screen blur-[80px] opacity-50" />
            <div className="liquid-blob absolute bottom-[-10%] left-[20%] w-[45vw] h-[45vw] bg-purple-600/30 rounded-full mix-blend-screen blur-[80px] opacity-40" />
            <div className="liquid-blob absolute bottom-[10%] right-[10%] w-[30vw] h-[30vw] bg-brand-blue/30 rounded-full mix-blend-screen blur-[80px] opacity-50" />
        </div>
    );
};
