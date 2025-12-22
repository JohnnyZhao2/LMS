import React from 'react';
import { motion } from 'framer-motion';

/**
 * STUDIO LOGIN BACKGROUND
 * Minimalist depth with subtle movement and texture.
 */
export const LoginBackground: React.FC = () => {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: 'var(--color-bg)',
        overflow: 'hidden',
        zIndex: 0,
      }}
    >
      {/* SOFT GRADIENT MESH */}
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          rotate: [0, 5, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{
          position: 'absolute',
          top: '-20%',
          right: '-10%',
          width: '60%',
          height: '60%',
          background: 'radial-gradient(circle, var(--color-accent-soft) 0%, transparent 70%)',
          filter: 'blur(80px)',
          zIndex: 1,
        }}
      />
      
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, -8, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 2,
        }}
        style={{
          position: 'absolute',
          bottom: '-10%',
          left: '-5%',
          width: '50%',
          height: '50%',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, transparent 70%)',
          filter: 'blur(60px)',
          zIndex: 1,
        }}
      />

      {/* NOISE TEXTURE */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          opacity: 0.02,
          zIndex: 2,
          pointerEvents: 'none',
        }}
      />

      {/* SUBTLE LINE DECO */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: '50%',
          width: '1px',
          background: 'linear-gradient(to bottom, transparent, var(--color-border), transparent)',
          opacity: 0.3,
          zIndex: 1,
        }}
      />
    </div>
  );
};
