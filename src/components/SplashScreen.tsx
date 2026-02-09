'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 1600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {visible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-surface"
        >
          {/* Radial glow background */}
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(0,255,65,0.15) 0%, rgba(0,255,65,0.03) 50%, transparent 70%)',
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

          {/* Logo */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
            className="relative z-10 flex flex-col items-center gap-4"
          >
            {/* Icon circle */}
            <motion.div
              className="w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(0,255,65,0.15), rgba(0,255,65,0.05))',
                boxShadow: '0 0 30px rgba(0,255,65,0.2), 0 0 60px rgba(0,255,65,0.08)',
              }}
              animate={{
                boxShadow: [
                  '0 0 20px rgba(0,255,65,0.15), 0 0 40px rgba(0,255,65,0.06)',
                  '0 0 40px rgba(0,255,65,0.3), 0 0 80px rgba(0,255,65,0.12)',
                  '0 0 20px rgba(0,255,65,0.15), 0 0 40px rgba(0,255,65,0.06)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <span className="text-4xl">⚡</span>
            </motion.div>

            {/* Title */}
            <motion.h1
              className="text-3xl font-display font-bold tracking-tight neon-text"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              NeonSub
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              className="text-text-muted text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
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
