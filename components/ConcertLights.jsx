import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useTransform, useMotionValue } from 'framer-motion';

export const ConcertLights = ({ 
  masterOn,
  beams,
  blinders,
  lasers,
  audio,
  isReactive 
}) => {
  const [isMounted, setIsMounted] = useState(false);
  
  // Global Trigger for Default Mode (Random Sync)
  const [flashTrigger, setFlashTrigger] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Default Mode Timer
  useEffect(() => {
    if (isReactive) return; 

    const interval = setInterval(() => {
      if (Math.random() > 0.80) { 
        setFlashTrigger(true);
        setTimeout(() => setFlashTrigger(false), 80); 
      }
    }, 200);

    return () => clearInterval(interval);
  }, [isReactive]);

  if (!isMounted) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      <AnimatePresence>
        {masterOn && (
          <>
            {/* 1. BEAMS */}
            {beams.on && Array.from({ length: beams.count }).map((_, i) => (
              <MovingHead key={`beam-${i}`} index={i} total={beams.count} color={beams.color} />
            ))}

            {/* 2. STROBES */}
            {blinders.on && Array.from({ length: blinders.count }).map((_, i) => (
              isReactive ? (
                <AudioStrobe 
                  key={`strobe-audio-${i}`} 
                  index={i} 
                  total={blinders.count} 
                  energy={audio?.beat} 
                />
              ) : (
                <SyncedStrobe 
                  key={`strobe-sync-${i}`} 
                  index={i} 
                  total={blinders.count} 
                  isFired={flashTrigger} 
                />
              )
            ))}

            {/* 3. LASERS */}
            {lasers.on && (
               <LaserArray 
                 count={lasers.count} 
                 color={lasers.color} 
                 volume={audio?.volume}
                 isReactive={isReactive}
               />
            )}
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- BEAMS (RESPONSIVE UPDATE) ---
const MovingHead = ({ index, total, color }) => {
  const isBottom = index % 2 !== 0;
  const positionPercent = 10 + (80 / (total - 1 || 1)) * index;
  
  return (
    <motion.div
      initial={{ opacity: 0 }} 
      animate={{ opacity: isBottom ? 0.5 : 0.4 }} 
      exit={{ opacity: 0, transition: { duration: 1.5 } }}
      
      // RESPONSIVE CLASSES ADDED HERE:
      // Mobile: w-14 (thin), h-[120vh], bottom-[-20px]
      // Desktop (md): w-32 (thick), h-[150vh], bottom-[-50px]
      className={`
        absolute mix-blend-screen
        w-14 md:w-32 
        h-[120vh] md:h-[150vh]
        ${isBottom 
          ? 'bottom-[-20px] md:bottom-[-50px] origin-bottom' 
          : 'top-[-20px] md:top-[-50px] origin-top'
        }
      `}
      style={{ left: `${positionPercent}%` }}
    >
      <motion.div
        animate={{ rotate: isBottom ? [-30, 30] : [-20, 20] }}
        transition={{ duration: Math.random() * 4 + 4, repeat: Infinity, repeatType: "mirror", ease: "easeInOut", delay: index * 0.5 }}
        className={`w-full h-full ${isBottom ? 'origin-bottom' : 'origin-top'}`}
      >
        <div 
          className="w-full h-full blur-xl md:blur-2xl" // Less blur on mobile to keep definition
          style={{ 
            background: `linear-gradient(to ${isBottom ? 'top' : 'bottom'}, ${color}, transparent 60%)`, 
            // Tighter clip-path for mobile ? No, scaling width handles it.
            clipPath: isBottom 
              ? "polygon(40% 100%, 60% 100%, 100% 0%, 0% 0%)" 
              : "polygon(40% 0%, 60% 0%, 100% 100%, 0% 100%)" 
          }} 
        />
      </motion.div>
    </motion.div>
  );
};

// --- SYNCED STROBE (RESPONSIVE UPDATE) ---
const SyncedStrobe = ({ index, total, isFired }) => {
  const center = (total - 1) / 2;
  const topOffset = 5 + (Math.abs(index - center) * 3);
  const leftPos = 5 + (90 / (total - 1 || 1)) * index;

  return (
    <motion.div
      exit={{ opacity: 0, scale: 0 }}
      // Responsive Size: w-8 on mobile, w-12 on desktop
      className="absolute w-8 h-8 md:w-12 md:h-12 rounded-full blur-md mix-blend-screen bg-white transition-opacity duration-75"
      style={{ 
        top: `${topOffset}%`, left: `${leftPos}%`, 
        opacity: isFired ? 1 : 0, 
        boxShadow: isFired ? `0 0 30px 10px white` : 'none', 
        transform: isFired ? 'scale(1.5)' : 'scale(1)' 
      }}
    >
      <div className="w-full h-full bg-white rounded-full" />
    </motion.div>
  );
};

// --- AUDIO STROBE (RESPONSIVE UPDATE) ---
const AudioStrobe = ({ index, total, energy }) => {
  const center = (total - 1) / 2;
  const topOffset = 5 + (Math.abs(index - center) * 3);
  const leftPos = 5 + (90 / (total - 1 || 1)) * index;

  const fallback = useMotionValue(0);
  const activeEnergy = energy || fallback;

  const opacity = useTransform(activeEnergy, (v) => v > 0.4 ? 1 : 0);
  const scale = useTransform(activeEnergy, (v) => v > 0.4 ? 1.5 : 0.5);

  return (
    <motion.div
      exit={{ opacity: 0 }}
      // Responsive Size: w-8 on mobile, w-12 on desktop
      className="absolute w-8 h-8 md:w-12 md:h-12 rounded-full blur-md mix-blend-screen bg-white"
      style={{ top: `${topOffset}%`, left: `${leftPos}%`, opacity: opacity, scale: scale, boxShadow: `0 0 30px 10px white` }}
    >
      <div className="w-full h-full bg-white rounded-full" />
    </motion.div>
  );
};

// --- LASERS (RESPONSIVE UPDATE) ---
const LaserArray = ({ count, color, volume, isReactive }) => {
  const fallback = useMotionValue(0);
  const activeVolume = volume || fallback;

  const reactiveHeight = useTransform(activeVolume, [0, 1], ["20vh", "150vh"]);
  const staticHeight = "140vh";
  
  return (
    <motion.div exit={{ opacity: 0, transition: { duration: 1 } }} className="absolute inset-0 z-20 pointer-events-none flex justify-center items-end">
      {Array.from({ length: count }).map((_, i) => (
        <LiquidLaser 
          key={i} index={i} total={count} color={color} 
          height={isReactive ? reactiveHeight : staticHeight} 
        />
      ))}
    </motion.div>
  );
};

const LiquidLaser = ({ index, total, color, height }) => {
  const maxAngle = 70;
  const angleStep = (maxAngle * 2) / (total - 1 || 1);
  const baseAngle = -maxAngle + (angleStep * index);
  
  return (
    // Responsive Width: w-[2px] mobile, w-[4px] desktop
    <motion.div className="absolute bottom-[-10vh] w-[2px] md:w-[4px] origin-bottom mix-blend-screen" style={{ left: "50%", x: "-50%", height: height }}>
      <motion.div
        animate={{ rotate: [baseAngle, baseAngle + 5, baseAngle - 5, baseAngle] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: index * 0.05 }}
        className="w-full h-full origin-bottom"
      >
        <div className="w-full h-full" style={{ background: `linear-gradient(to top, white 0%, ${color} 30%, transparent 80%)`, boxShadow: `0 0 10px 1px ${color}`, opacity: 0.8 }} />
      </motion.div>
    </motion.div>
  );
};