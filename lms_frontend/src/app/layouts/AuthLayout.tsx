/**
 * AuthLayout Component
 * Simple layout for authentication pages (login, etc.)
 * Requirements: 1.1
 */

import { Outlet } from 'react-router-dom';

/**
 * Authentication layout component
 * - Clean, minimal layout for login page
 * - Centered content with ambient background
 */
export function AuthLayout() {
  return (
    <div className="min-h-screen bg-background font-body text-text-primary selection:bg-primary selection:text-primary-foreground flex flex-col">
      {/* Global ambient background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,black_70%,transparent_100%)]" />
      </div>
      
      {/* Main content - centered */}
      <main className="flex-1 relative z-10 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-tr from-primary to-blue-600 flex items-center justify-center font-bold text-xl text-black font-heading">
              L
            </div>
            <div>
              <h1 className="font-heading font-bold text-2xl tracking-tight text-white">
                LMS <span className="text-primary">Ops</span>
              </h1>
              <p className="text-xs text-text-muted">学习管理系统</p>
            </div>
          </div>
          
          {/* Content slot */}
          <Outlet />
        </div>
      </main>
      
      {/* Footer */}
      <footer className="relative z-10 py-4 text-center text-xs text-text-muted">
        <p>© 2024 LMS Ops. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default AuthLayout;
