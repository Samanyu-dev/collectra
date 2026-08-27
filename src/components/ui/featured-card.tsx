'use client';

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import Image from 'next/image';

interface FeaturedCardProps {
  image: string;
  name: string;
  rarity: string;
  value: string;
}

export function FeaturedCard({ image, name, rarity, value }: FeaturedCardProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 100, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 100, damping: 20 });

  // Very subtle tilt (max 3 degrees)
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["3deg", "-3deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-3deg", "3deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <div className="relative w-full h-[40vh] min-h-[400px] flex items-center justify-center py-10 perspective-1000">
      {/* Ambient background glow matching the card - we use the image itself heavily blurred */}
      <div className="absolute inset-0 z-0 overflow-hidden rounded-3xl pointer-events-none">
        <Image 
          src={image} 
          alt="Ambient glow"
          fill
          className="object-cover blur-[100px] opacity-40 scale-125 saturate-150"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
      </div>

      <motion.div
        className="relative z-10 h-full aspect-[63/88] cursor-grab active:cursor-grabbing preserve-3d"
        style={{
          rotateX,
          rotateY,
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      >
        {/* Shadow */}
        <div className="absolute -inset-4 bg-background/40 blur-2xl rounded-3xl transform translate-y-8 -z-10 opacity-60" />
        
        {/* Card Frame */}
        <div className="foil-frame card-frame relative w-full h-full rounded-2xl overflow-hidden border border-foreground/10 bg-background">
          <Image
            src={image}
            alt={name}
            fill
            className="object-cover"
            priority
          />
          
          {/* Glass reflection highlight */}
          <div className="absolute inset-0 bg-gradient-to-tr from-foreground/0 via-foreground/10 to-foreground/0 pointer-events-none mix-blend-overlay" />
        </div>
      </motion.div>

      {/* Floating Meta */}
      <div className="absolute bottom-8 left-8 z-20">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-background/40 backdrop-blur-md border border-foreground/10 mb-3">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-medium uppercase tracking-wider text-foreground/80">Featured Card</span>
        </div>
        <h2 className="text-4xl font-display font-bold text-foreground drop-shadow-md">{name}</h2>
        <div className="flex items-center gap-4 mt-2">
          <p className="text-lg text-foreground/60 font-medium">{rarity}</p>
          <div className="w-1 h-1 rounded-full bg-foreground/30" />
          <p className="text-lg font-mono text-primary">{value}</p>
        </div>
      </div>
    </div>
  );
}
