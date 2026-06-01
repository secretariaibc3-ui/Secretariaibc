import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';

const SplashScreen = () => {
  const [isDark, setIsDark] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Detect system theme
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDark(darkModeMediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    darkModeMediaQuery.addEventListener('change', handler);

    // Simulated progress bar animation
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 98) return prev;
        return prev + (Math.random() * 3);
      });
    }, 150);

    return () => {
      darkModeMediaQuery.removeEventListener('change', handler);
      clearInterval(interval);
    };
  }, []);

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-colors duration-700 ${
        isDark ? 'bg-[#29314B]' : 'bg-white'
      }`}
    >
      <div className="relative flex flex-col items-center px-6 w-full max-w-sm">
        {/* Pulsating logo with scale effect */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.9, 1, 0.9],
          }}
          transition={{
            scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
            opacity: { duration: 2, repeat: Infinity, ease: "easeInOut" },
            delay: 0.2
          }}
          className="w-48 h-48 md:w-64 md:h-64 mb-10 flex items-center justify-center"
        >
          <img 
            src={isDark ? "/logo-secretariaibc-inicioescuro.png" : "/logo-secretariaibc-inicio.png"} 
            alt="IBC Logo" 
            className="max-w-full max-h-full object-contain"
          />
        </motion.div>

        {/* Progress bar container */}
        <div className="w-full max-w-[240px] h-1.5 bg-black/5 rounded-full overflow-hidden relative">
          {/* Progress bar fill */}
          <motion.div 
            className={`h-full absolute left-0 top-0 transition-all duration-300 ${
              isDark ? 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'bg-[#2aafa2] shadow-[0_0_10px_rgba(42,175,162,0.3)]'
            }`}
            style={{ width: `${progress}%` }}
          />
          
          {/* Shimmer effect */}
          <motion.div
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            className={`absolute top-0 bottom-0 w-1/2 opacity-30 blur-sm ${
              isDark ? 'bg-gray-200' : 'bg-white'
            }`}
          />
        </div>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className={`mt-4 text-[11px] font-black uppercase tracking-[0.3em] ${
            isDark ? 'text-white/40' : 'text-[#2aafa2]/60'
          }`}
        >
          Carregando...
        </motion.p>
      </div>
    </div>
  );
};

export default SplashScreen;
