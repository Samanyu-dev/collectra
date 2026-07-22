'use client';

import { useEffect, useState } from 'react';
import { FastAverageColor } from 'fast-average-color';
import { motion } from 'framer-motion';

interface AmbientBackgroundProps {
  imageUrl: string;
}

export function AmbientBackground({ imageUrl }: AmbientBackgroundProps) {
  const [color, setColor] = useState<string>('rgba(0,0,0,0)');

  useEffect(() => {
    if (!imageUrl) return;

    const fac = new FastAverageColor();
    // Use an Image object to get the color, taking care of CORS issues if needed
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = imageUrl;

    img.onload = () => {
      try {
        const c = fac.getColor(img);
        setColor(c.hex);
      } catch (e) {
        console.error("Failed to extract color", e);
      }
    };
    
    return () => {
      fac.destroy();
    };
  }, [imageUrl]);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none flex items-center justify-center">
      {/* Huge blurry orb representing the ambient color */}
      <motion.div 
        className="w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] rounded-full blur-[120px] opacity-30 md:opacity-40"
        initial={{ backgroundColor: 'rgba(0,0,0,0)', scale: 0.8 }}
        animate={{ 
          backgroundColor: color,
          scale: [1, 1.05, 1],
        }}
        transition={{ 
          backgroundColor: { duration: 1.5, ease: 'easeOut' },
          scale: { duration: 10, repeat: Infinity, ease: 'easeInOut' }
        }}
        style={{ mixBlendMode: 'screen' }}
      />
    </div>
  );
}
