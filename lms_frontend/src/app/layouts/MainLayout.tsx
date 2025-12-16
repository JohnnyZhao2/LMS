/**
 * MainLayout Component
 * Main application layout with top navigation bar
 * Requirements: 22.1, 22.2, 22.3
 */

import { Outlet } from 'react-router-dom';
import { Header } from '@/components/layout/Header';

/**
 * Main layout component
 * - Uses top navigation bar (Header) for menu
 * - Responsive layout for all screen sizes
 */
export function MainLayout() {
  return (
    <div className="min-h-screen bg-background font-body text-text-primary selection:bg-primary selection:text-primary-foreground">
      {/* Global ambient background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,black_70%,transparent_100%)]" />
      </div>
      
      {/* Header with navigation */}
      <Header />
      
      {/* Main content area */}
      <main className="relative z-10 pt-16 min-h-screen">
        <div className="container mx-auto px-4 py-6 lg:px-6 lg:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default MainLayout;
