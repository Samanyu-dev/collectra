'use client';

import { motion } from 'framer-motion';

interface Variant {
  id: string;
  name: string; // The type/printing (e.g., Base, Gold Refractor)
  price?: number;
  isFoil: boolean;
  isActive: boolean;
}

interface VariantShelfProps {
  variants: Variant[];
  onSelect: (id: string) => void;
}

export function VariantShelf({ variants, onSelect }: VariantShelfProps) {
  return (
    <div className="relative w-full py-12 overflow-x-auto scrollbar-none snap-x snap-mandatory">
      
      {/* The physical shelf line */}
      <div className="absolute bottom-12 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-foreground/10 to-transparent pointer-events-none" />
      <div className="absolute bottom-8 left-0 right-0 h-4 bg-gradient-to-b from-foreground/5 to-transparent pointer-events-none blur-sm" />

      <div className="flex items-end gap-6 md:gap-10 px-8 min-w-max pb-12">
        {variants.map((v, i) => (
          <motion.button
            key={v.id}
            onClick={() => onSelect(v.id)}
            className={`relative flex flex-col items-center snap-center focus:outline-none group`}
            whileHover={{ y: -10 }}
            animate={{ 
              y: v.isActive ? -20 : 0,
              scale: v.isActive ? 1.05 : 1
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            {/* The "Card Edge" Representation */}
            <div className={`
              w-16 h-32 md:w-20 md:h-40 rounded-sm shadow-2xl transition-colors duration-500
              ${v.isActive ? 'bg-primary border-primary shadow-primary/20' : 'bg-elevated border-foreground/10'}
              border-l-4 border-r-4 border-t
              flex items-end justify-center pb-4
              relative overflow-hidden
            `}>
              {/* Spine Text */}
              <div 
                className="absolute text-[10px] md:text-xs font-mono tracking-widest uppercase whitespace-nowrap text-foreground/50 group-hover:text-foreground/80 transition-colors"
                style={{ transform: 'rotate(-90deg)', bottom: '50%', transformOrigin: 'center' }}
              >
                {v.name}
              </div>

              {/* Foil indicator */}
              {v.isFoil && (
                <div className="absolute top-2 w-3 h-3 rounded-full bg-gradient-to-tr from-cyan-400 via-fuchsia-400 to-yellow-400 animate-pulse" />
              )}
            </div>

            {/* Reflection on the shelf */}
            <div className={`
              w-16 h-10 md:w-20 rounded-t-sm opacity-20 bg-gradient-to-b 
              ${v.isActive ? 'from-primary to-transparent' : 'from-foreground/20 to-transparent'}
              mt-1 -scale-y-100 blur-sm
            `} />

            {/* Price Tag */}
            <div className={`
              mt-6 text-center transition-opacity duration-300
              ${v.isActive ? 'opacity-100' : 'opacity-40 group-hover:opacity-100'}
            `}>
              <div className="text-sm font-medium text-foreground">{v.name}</div>
              <div className="text-xs font-mono text-primary mt-1">
                {v.price ? `$${v.price.toFixed(2)}` : 'N/A'}
              </div>
            </div>

          </motion.button>
        ))}
      </div>
    </div>
  );
}
