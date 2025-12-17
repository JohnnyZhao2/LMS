/**
 * AuthLayout Component
 * Simple layout for authentication pages (login, etc.)
 * Requirements: 1.1
 */

import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';

/**
 * Authentication layout component
 * - Clean, minimal layout for login page
 * - Centered content with ambient background
 * - Features: Animated background, Entrance animations
 */
export function AuthLayout() {
  return (
    <div className="min-h-screen bg-background font-body text-text-primary selection:bg-primary selection:text-white flex flex-col overflow-hidden relative">
      {/* Global ambient background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* Deep mesh gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-background-secondary via-background to-background opacity-80" />
        
        {/* Moving orbs - slightly more intense for login */}
        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.6, 0.3],
            x: [0, 60, 0],
            y: [0, -40, 0]
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-5%] right-[10%] w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px]" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.5, 0.2],
            x: [0, -40, 0],
            y: [0, 50, 0]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-[-5%] left-[5%] w-[500px] h-[500px] bg-secondary/20 rounded-full blur-[100px]" 
        />
        
        {/* Grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,black_40%,transparent_100%)]" />
      </div>
      
      {/* Main content - centered */}
      <main className="flex-1 relative z-10 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, cubicBezier: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-10 group cursor-default">
            <motion.div 
              whileHover={{ rotate: 5, scale: 1.1 }}
              className="w-14 h-14 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center font-bold text-2xl text-black font-heading shadow-[0_0_20px_rgba(176,38,255,0.5)]"
            >
              L
            </motion.div>
            <div>
              <h1 className="font-heading font-bold text-3xl tracking-tight text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-primary transition-all duration-300">
                LMS <span className="text-primary group-hover:text-secondary transition-colors duration-300">Ops</span>
              </h1>
              <p className="text-sm text-text-muted mt-1 font-medium tracking-wide">学习管理系统</p>
            </div>
          </div>
          
          {/* Content slot */}
          <div className="backdrop-blur-xl bg-background/40 border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-1">
             <Outlet />
          </div>
        </motion.div>
      </main>
      
      {/* Footer */}
      <footer className="relative z-10 py-6 text-center text-xs text-text-muted">
        <p>© 2024 LMS Ops. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default AuthLayout;