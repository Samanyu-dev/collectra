'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Sparkles, PackageOpen, RotateCcw } from 'lucide-react';

interface Pull {
  variantId: string;
  cardName: string;
  parallelName: string | null;
  odds: number;
}

interface PackDef {
  name: string;
  pulls: Pull[];
}

interface ProductItem {
  id: string;
  name: string;
  image: string | null;
  packs: PackDef[];
}

function drawFromOdds(pulls: Pull[], count: number): Pull[] {
  if (pulls.length === 0) return [];
  const result: Pull[] = [];
  for (let i = 0; i < count; i++) {
    const rand = Math.random();
    let cumulative = 0;
    let picked = pulls[pulls.length - 1];
    for (const pull of pulls) {
      cumulative += pull.odds;
      if (rand < cumulative) {
        picked = pull;
        break;
      }
    }
    result.push(picked);
  }
  return result;
}

export function PackSimulatorClient({ products }: { products: ProductItem[] }) {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(products[0]?.id ?? null);
  const [isOpening, setIsOpening] = useState(false);
  const [pulled, setPulled] = useState<Pull[]>([]);

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  function handleOpenPack() {
    if (!selectedProduct) return;
    const pack = selectedProduct.packs[0];
    if (!pack) return;

    setIsOpening(true);
    setPulled([]);
    setTimeout(() => {
      setPulled(drawFromOdds(pack.pulls, 10));
      setIsOpening(false);
    }, 1200);
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-8 min-h-[calc(100vh-4rem)] flex flex-col">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight flex items-center gap-3">
          <Sparkles className="text-primary" /> Pack Simulator
        </h1>
        <p className="text-foreground/50 mt-2 max-w-2xl">
          Simulates real, verified pull rates — only products with actual sourced odds appear here.
        </p>
      </motion.div>

      {products.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 text-foreground/50">
          <PackageOpen size={48} className="opacity-20" />
          <p className="font-medium text-foreground">No products with verified pull rates yet</p>
          <p className="text-sm max-w-md">
            The pack simulator only runs on real, sourced odds — none have been ingested yet.
            Once product pull-rate data is added, it'll show up here automatically.
          </p>
        </div>
      ) : (
        <>
          {!pulled.length && !isOpening && (
            <motion.div className="flex-1 flex flex-col items-center justify-center space-y-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              <div className="flex flex-wrap justify-center gap-4 max-w-3xl">
                {products.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => setSelectedProductId(product.id)}
                    className={`p-4 rounded-xl border transition-all ${selectedProductId === product.id ? 'border-primary bg-primary/10 ring-2 ring-primary/20 scale-105' : 'border-foreground/10 bg-foreground/5 hover:bg-foreground/10'}`}
                  >
                    {product.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.image} alt={product.name} className="w-32 h-32 object-contain mb-3 drop-shadow-xl" />
                    ) : (
                      <div className="w-32 h-32 flex items-center justify-center mb-3"><PackageOpen size={32} className="text-foreground/20" /></div>
                    )}
                    <p className="text-sm font-medium text-center truncate max-w-[120px]">{product.name}</p>
                  </button>
                ))}
              </div>

              <button
                onClick={handleOpenPack}
                disabled={!selectedProductId}
                className="bg-primary text-primary-foreground px-8 py-4 rounded-full font-bold tracking-widest uppercase text-lg shadow-lg hover:shadow-primary/25 hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-3"
              >
                <PackageOpen /> Open Pack
              </button>
            </motion.div>
          )}

          {isOpening && (
            <div className="flex-1 flex flex-col items-center justify-center">
              <motion.div animate={{ rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.1, 1] }} transition={{ duration: 0.5, repeat: Infinity }}>
                <PackageOpen size={64} className="text-primary mb-4" />
              </motion.div>
              <p className="text-lg font-medium animate-pulse text-foreground/50">Tearing foil...</p>
            </div>
          )}

          {pulled.length > 0 && !isOpening && (
            <motion.div className="flex-1 flex flex-col items-center justify-center space-y-12 py-12" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="flex flex-wrap justify-center gap-4 md:gap-6 max-w-5xl">
                <AnimatePresence>
                  {pulled.map((pull, i) => (
                    <motion.div
                      key={`${pull.variantId}-${i}`}
                      initial={{ opacity: 0, rotateY: 180, y: 50 }}
                      animate={{ opacity: 1, rotateY: 0, y: 0 }}
                      transition={{ duration: 0.6, delay: i * 0.15, type: 'spring' }}
                      className="flex flex-col items-center gap-2 w-32"
                    >
                      <div className={`card-frame w-28 aspect-[63/88] rounded-xl bg-foreground/5 border border-foreground/10 flex items-center justify-center p-2 text-center overflow-hidden ${pull.parallelName ? "foil-frame" : ""}`}>
                        <span className="text-[11px] text-foreground/70">{pull.cardName}</span>
                      </div>
                      {pull.parallelName && <span className="text-[10px] text-primary uppercase tracking-wide">{pull.parallelName}</span>}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <motion.button
                onClick={() => setPulled([])}
                className="flex items-center gap-2 text-foreground/50 hover:text-foreground bg-foreground/5 px-6 py-3 rounded-full transition-colors font-medium"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: pulled.length * 0.15 + 1 }}
              >
                <RotateCcw size={18} /> Rip Another Pack
              </motion.button>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
