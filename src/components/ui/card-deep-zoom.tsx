'use client';

import { useState, useRef, useEffect, MouseEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { X, ZoomIn } from 'lucide-react';
import { useFocusTrap } from '@/lib/use-focus-trap';

interface CardDeepZoomProps {
  imageUrl: string;
  name: string;
}

export function CardDeepZoom({ imageUrl, name }: CardDeepZoomProps) {
  const [isOpen, setIsOpen] = useState(false);
  const cardRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useFocusTrap(modalRef, isOpen);

  useEffect(() => {
    if (!isOpen) return;
    closeButtonRef.current?.focus();
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // 3D Tilt State
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  const handleMouseMove = (e: MouseEvent<HTMLButtonElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Calculate rotation (-15 to 15 degrees)
    const rotateXValue = ((y - centerY) / centerY) * -15;
    const rotateYValue = ((x - centerX) / centerX) * 15;
    
    setRotateX(rotateXValue);
    setRotateY(rotateYValue);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <>
      {/* Hero Display (Click to Open Zoom) */}
      <motion.button
        type="button"
        ref={cardRef}
        aria-label={`Open deep zoom view of ${name}`}
        className="relative cursor-pointer group perspective-1000 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 focus-visible:ring-offset-4 focus-visible:ring-offset-black rounded-2xl"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={() => setIsOpen(true)}
        animate={{ rotateX, rotateY }}
        transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.5 }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        <div className="relative w-64 h-80 sm:w-80 sm:h-[450px] md:w-96 md:h-[530px] rounded-2xl overflow-hidden shadow-2xl border border-foreground/10 transition-shadow duration-500 group-hover:shadow-[0_0_50px_rgba(255,255,255,0.1)]">
          <Image 
            src={imageUrl} 
            alt={name} 
            fill 
            className="object-cover"
            priority
            sizes="(max-width: 640px) 256px, (max-width: 768px) 320px, 384px"
          />
          {/* Subtle Glare Effect */}
          <motion.div 
            className="absolute inset-0 bg-gradient-to-tr from-foreground/0 via-foreground/10 to-foreground/0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"
            animate={{ 
              backgroundPosition: [`${rotateY * 10}% ${rotateX * 10}%`]
            }}
          />
          
          <div className="absolute inset-0 bg-background/40 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 flex items-center justify-center transition-opacity">
            <div className="flex items-center gap-2 bg-background/60 backdrop-blur-md px-4 py-2 rounded-full border border-foreground/20 text-foreground font-mono text-sm">
              <ZoomIn size={16} aria-hidden="true" />
              <span>Deep Zoom</span>
            </div>
          </div>
        </div>
      </motion.button>

      {/* Deep Zoom Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label={`Deep zoom view of ${name}`}
          >
            <div className="flex justify-between items-center p-6 border-b border-foreground/5 bg-background/20">
              <div>
                <p className="text-foreground/50 text-xs font-mono uppercase tracking-widest">Museum View</p>
                <h2 className="text-foreground font-display text-xl">{name}</h2>
              </div>
              <button
                ref={closeButtonRef}
                onClick={() => setIsOpen(false)}
                aria-label="Close deep zoom view"
                className="w-12 h-12 flex items-center justify-center rounded-full bg-foreground/5 hover:bg-foreground/10 transition-colors text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50"
              >
                <X size={24} aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 relative overflow-hidden cursor-move touch-none">
              <motion.div
                className="absolute inset-0 w-full h-full"
                drag
                dragConstraints={{ left: -1000, right: 1000, top: -1000, bottom: 1000 }}
                dragElastic={0.1}
                whileTap={{ cursor: 'grabbing' }}
                initial={{ scale: 1, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              >
                <Image 
                  src={imageUrl} 
                  alt={name} 
                  fill 
                  className="object-contain"
                  quality={100}
                  sizes="100vw"
                />
              </motion.div>
            </div>
            
            <div className="p-6 text-center text-foreground/40 font-mono text-sm border-t border-foreground/5 bg-background/20">
              Pinch or drag to inspect surface texture
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
