'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {visible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
          style={{
            background: 'radial-gradient(circle at center, #0a1a0f 0%, #0A0A0F 70%)',
          }}
        >
          {/* Radial glow behind logo */}
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(0,255,65,0.18) 0%, rgba(0,255,65,0.04) 50%, transparent 70%)',
              }}
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.6, 1, 0.6],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </div>

          {/* Logo + text */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring' as const, stiffness: 200, damping: 20, delay: 0.1 }}
            className="relative z-10 flex flex-col items-center gap-5"
          >
            {/* Logo image with glow */}
            <motion.div
              className="relative w-[120px] h-[120px] flex items-center justify-center"
              animate={{
                scale: [1, 1.05, 1],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              {/* Glow ring behind logo */}
              <motion.div
                className="absolute inset-0 rounded-3xl"
                style={{
                  background: 'radial-gradient(circle, rgba(0,255,65,0.2) 0%, transparent 70%)',
                }}
                animate={{
                  opacity: [0.5, 1, 0.5],
                  scale: [0.95, 1.1, 0.95],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <img
                src="/icons/splash-logo.png"
                alt="NeonSub"
                width={120}
                height={120}
                className="relative z-10 rounded-3xl"
                style={{
                  filter: 'drop-shadow(0 0 20px rgba(0,255,65,0.3)) drop-shadow(0 0 40px rgba(0,255,65,0.1))',
                }}
              />
            </motion.div>

            {/* Title */}
            <motion.h1
              className="text-3xl font-display font-extrabold tracking-tight neon-text"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5, ease: 'easeOut' }}
            >
              NeonSub
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              className="text-text-secondary text-sm font-medium"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5, ease: 'easeOut' }}
            >
              Трекер подписок
            </motion.p>
          </motion.div>

          {/* Scanning line effect */}
          <motion.div
            className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon/30 to-transparent"
            initial={{ top: '30%' }}
            animate={{ top: '70%' }}
            transition={{ duration: 1.5, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
