import React, { useEffect, useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";

const RAIN_DROP_COUNT = 80;
const WIND_STREAK_COUNT = 15;

export const WeatherEffects: React.FC = () => {
  const [lightning, setLightning] = useState(false);
  const [boltPos, setBoltPos] = useState({ x: 0, scale: 1 });
  const rainAudio = useRef<HTMLAudioElement | null>(null);
  const thunderAudio = useRef<HTMLAudioElement | null>(null);

  // Initialize audio
  useEffect(() => {
    const rain = new Audio("/rain.mp3");
    rain.loop = true;
    rain.volume = 0.4;
    rainAudio.current = rain;
    
    const thunder = new Audio("/thunder.mp3");
    thunder.volume = 0.8;
    thunderAudio.current = thunder;

    let userInteracted = false;

    // Verbose logging to help debug
    rain.addEventListener('error', (e) => console.error("Rain audio error:", e));
    thunder.addEventListener('error', (e) => console.error("Thunder audio error:", e));

    const enableAudio = () => {
      userInteracted = true;
      console.log("User interaction detected, attempting to play rain audio...");
      if (!document.hidden) {
        rain.play()
          .then(() => console.log("Rain audio playing successfully"))
          .catch((err) => console.warn("Rain audio play blocked or failed:", err));
      }
        
      window.removeEventListener('mousedown', enableAudio);
      window.removeEventListener('keydown', enableAudio);
      window.removeEventListener('touchstart', enableAudio);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log("App is hidden, pausing audio");
        rain.pause();
        thunder.pause();
      } else {
        console.log("App is visible, handling audio resume");
        if (userInteracted) {
          rain.play()
            .then(() => console.log("Rain audio resumed successfully"))
            .catch((err) => console.warn("Rain play failed on resume:", err));
        }
      }
    };

    window.addEventListener('mousedown', enableAudio);
    window.addEventListener('keydown', enableAudio);
    window.addEventListener('touchstart', enableAudio); // For mobile
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      rain.pause();
      thunder.pause();
      window.removeEventListener('mousedown', enableAudio);
      window.removeEventListener('keydown', enableAudio);
      window.removeEventListener('touchstart', enableAudio);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Lightning effect logic
  useEffect(() => {
    const triggerLightning = () => {
      // Random delay between lightning strikes: 10 to 25 seconds
      const delay = Math.random() * 15000 + 10000;
      
      const timer = setTimeout(() => {
        // If app is hidden in the background, skip trigger
        if (document.hidden) {
          triggerLightning();
          return;
        }

        setBoltPos({
            x: Math.random() * 80 + 10,
            scale: Math.random() * 0.5 + 0.75
        });
        setLightning(true);
        // Play thunder sound when lightning starts
        if (thunderAudio.current && !document.hidden) {
            thunderAudio.current.currentTime = 0;
            thunderAudio.current.play().catch(() => {});
        }

        // Lightning duration: short flash 100-300ms
        setTimeout(() => {
          setLightning(false);
          // Sometimes a double or triple strike
          const randomVal = Math.random();
          if (randomVal > 0.4) {
            setTimeout(() => {
              if (document.hidden) return;
              setLightning(true);
              setTimeout(() => {
                setLightning(false);
                if (randomVal > 0.8) {
                    setTimeout(() => {
                        if (document.hidden) return;
                        setLightning(true);
                        setTimeout(() => setLightning(false), 50);
                    }, 50);
                }
              }, 80);
            }, 100);
          }
          triggerLightning();
        }, Math.random() * 150 + 50);
      }, delay);
      
      return () => clearTimeout(timer);
    };

    const cleanup = triggerLightning();
    return cleanup;
  }, []);

  // Generate rain drops
  const rainDrops = useMemo(() => {
    return Array.from({ length: RAIN_DROP_COUNT }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 5,
      duration: Math.random() * 0.4 + 0.4,
      opacity: Math.random() * 0.4 + 0.2,
      height: Math.random() * 30 + 15,
    }));
  }, []);

  // Generate wind streaks
  const windStreaks = useMemo(() => {
    return Array.from({ length: WIND_STREAK_COUNT }).map((_, i) => ({
      id: i,
      top: Math.random() * 100,
      delay: Math.random() * 10,
      duration: Math.random() * 4 + 4,
      opacity: Math.random() * 0.1 + 0.05,
      width: Math.random() * 100 + 100,
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Rain Layer */}
      <div className="absolute inset-0">
        {rainDrops.map((drop) => (
          <motion.div
            key={`rain-${drop.id}`}
            className="absolute bg-white"
            style={{
              left: `${drop.left}%`,
              width: "1.5px",
              height: `${drop.height}px`,
              opacity: drop.opacity,
              top: "-20px",
            }}
            animate={{
              y: ["0vh", "110vh"],
              x: ["0px", "50px"],
            }}
            transition={{
              duration: drop.duration,
              repeat: Infinity,
              delay: drop.delay,
              ease: "linear",
            }}
          />
        ))}
      </div>

      {/* Wind Streaks */}
      <div className="absolute inset-0">
        {windStreaks.map((streak) => (
          <motion.div
            key={`wind-${streak.id}`}
            className="absolute bg-white/20 blur-[3px] rounded-full"
            style={{
              top: `${streak.top}%`,
              height: "2px",
              width: `${streak.width}px`,
              opacity: streak.opacity,
              left: "-300px",
            }}
            animate={{
              x: ["0vw", "150vw"],
            }}
            transition={{
              duration: streak.duration,
              repeat: Infinity,
              delay: streak.delay,
              ease: "linear",
            }}
          />
        ))}
      </div>

      {/* Lightning Flash Overlay & Bolts */}
      <AnimatePresence>
        {lightning && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.6, 0.2, 0.8, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 bg-white z-10"
            />
            {/* The Lightning Bolt Bolt */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0, 1, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute top-0 z-20 overflow-visible"
                style={{
                    left: `${boltPos.x}%`,
                    transform: `scale(${boltPos.scale})`,
                }}
            >
                <svg width="200" height="600" viewBox="0 0 100 300" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path 
                        d="M50 0 L30 100 L60 80 L20 200 L50 180 L10 300" 
                        stroke="#E0F2FE" 
                        strokeWidth="3" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        className="drop-shadow-[0_0_15px_rgba(186,230,253,0.8)]"
                    />
                    <path 
                        d="M50 0 L30 100 L60 80 L20 200 L50 180 L10 300" 
                        stroke="white" 
                        strokeWidth="1" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                    />
                </svg>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Clouds/Atmosphere - a dark vignette that pulses slightly */}
      <motion.div 
        className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/60"
        animate={{
            opacity: [0.3, 0.5, 0.3]
        }}
        transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut"
        }}
      />
    </div>
  );
};
