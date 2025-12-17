/**
 * MainLayout Component
 * Main application layout with top navigation bar
 * Requirements: 22.1, 22.2, 22.3
 */

import { Outlet, useLocation } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Main layout component
 * - Uses top navigation bar (Header) for navigation, user info and role switching
 * - Desktop: Full navigation in header
 * - Mobile: Drawer-style navigation menu
 * - Features: Animated background, Page transitions
 */
export function MainLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background font-body text-text-primary selection:bg-primary selection:text-white overflow-hidden relative">
      {/* Global ambient background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* Deep mesh gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-background-secondary via-background to-background opacity-80" />
        
        {/* Moving orbs */}
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
            x: [0, 50, 0],
            y: [0, -30, 0]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px]" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.2, 0.4, 0.2],
            x: [0, -30, 0],
            y: [0, 40, 0]
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-secondary/20 rounded-full blur-[100px]" 
        />
         <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.1, 0.3, 0.1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 5 }}
          className="absolute top-[40%] left-[50%] transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/5 rounded-full blur-[150px]" 
        />
        
        {/* Grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,black_40%,transparent_100%)]" />
      </div>
      
      {/* Header with navigation, user info and role switching */}
      <Header />
      
      {/* Main content area with page transition */}
      <main className="relative z-10 pt-20 min-h-screen flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            transition={{ 
              duration: 0.4, 
              ease: [0.22, 1, 0.36, 1] // Custom cubic-bezier for "delightful" feel
            }}
            className="flex-1 px-4 py-6 lg:px-8 lg:py-8 max-w-7xl mx-auto w-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default MainLayout;