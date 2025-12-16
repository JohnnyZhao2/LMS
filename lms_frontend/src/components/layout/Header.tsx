/**
 * Header Component
 * Top navigation bar with navigation menu, user info, role switcher, and logout
 * Requirements: 2.1, 2.2, 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Bell, LogOut, ChevronDown, User, Settings, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAuthStore, useUser, useCurrentRole, useAvailableRoles } from '@/stores/auth';
import { getMenuItemsForRole, ROLE_NAMES, ROLE_DEFAULT_ROUTES, shouldShowRoleSwitcher, type RoleCode, type MenuItem } from '@/config/roles';

interface HeaderProps {
  className?: string;
}

/**
 * Header navigation component
 * - Displays navigation menu based on current role
 * - Shows role switcher for users with multiple roles
 * - Provides logout functionality
 */
export function Header({ className }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useUser();
  const currentRole = useCurrentRole();
  const availableRoles = useAvailableRoles();
  const { logout, switchRole, isLoading } = useAuthStore();
  
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const roleSwitcherRef = useRef<HTMLDivElement>(null);
  
  // Get menu items for current role
  const menuItems = currentRole ? getMenuItemsForRole(currentRole as RoleCode) : [];
  
  // Get role codes from available roles
  const roleCodes = availableRoles.map(r => r.code);
  const canSwitchRoles = shouldShowRoleSwitcher(roleCodes);
  
  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (roleSwitcherRef.current && !roleSwitcherRef.current.contains(event.target as Node)) {
        setShowRoleSwitcher(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Close mobile menu on route change
  useEffect(() => {
    setShowMobileMenu(false);
  }, [location.pathname]);
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  const handleRoleSwitch = async (roleCode: RoleCode) => {
    try {
      await switchRole(roleCode);
      setShowRoleSwitcher(false);
      // Navigate to the default route for the new role
      const defaultRoute = ROLE_DEFAULT_ROUTES[roleCode];
      navigate(defaultRoute);
    } catch (error) {
      console.error('Failed to switch role:', error);
    }
  };
  
  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };
  
  const renderNavItem = (item: MenuItem) => {
    const Icon = item.icon;
    const active = isActive(item.path);
    
    return (
      <Link key={item.key} to={item.path}>
        <Button
          variant={active ? 'secondary' : 'ghost'}
          size="sm"
          className={cn('gap-2', active && 'bg-white/10 text-white')}
        >
          <Icon size={16} />
          <span className="hidden md:inline">{item.label}</span>
        </Button>
      </Link>
    );
  };
  
  return (
    <>
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-50 h-16',
          'bg-background/80 backdrop-blur-md border-b border-white/5',
          className
        )}
      >
        <div className="container mx-auto h-full px-4 flex items-center justify-between">
          {/* Left section: Logo */}
          <div className="flex items-center gap-3">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-gradient-to-tr from-primary to-blue-600 flex items-center justify-center font-bold text-black font-heading">
                L
              </div>
              <span className="font-heading font-bold text-lg tracking-tight text-white hidden sm:block">
                LMS <span className="text-primary">Ops</span>
              </span>
              <Badge variant="outline" className="ml-2 text-[10px] hidden lg:flex border-white/10">
                BETA 2.0
              </Badge>
            </Link>
          </div>
          
          {/* Center section: Navigation menu (desktop) */}
          {/* Requirements: 3.1, 3.2, 3.3, 3.4, 3.5 */}
          <nav className="hidden md:flex items-center gap-1">
            {menuItems.map(item => renderNavItem(item))}
          </nav>
          
          {/* Right section: Role switcher, notifications, user menu */}
          <div className="flex items-center gap-2">
            {/* Role Switcher - Only show for users with multiple roles */}
            {/* Requirements: 2.1, 2.6 */}
            {canSwitchRoles && currentRole && (
              <div className="relative hidden sm:block" ref={roleSwitcherRef}>
                <button
                  onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
                  disabled={isLoading}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-lg',
                    'bg-primary/10 border border-primary/30 text-primary',
                    'hover:bg-primary/20 transition-colors',
                    'text-sm font-medium'
                  )}
                >
                  <span>{ROLE_NAMES[currentRole as RoleCode]}</span>
                  <ChevronDown size={14} className={cn(
                    'transition-transform',
                    showRoleSwitcher && 'rotate-180'
                  )} />
                </button>
                
                {/* Role dropdown */}
                {showRoleSwitcher && (
                  <div className="absolute right-0 mt-2 w-48 py-1 bg-background-secondary border border-white/10 rounded-lg shadow-xl animate-scale-in origin-top-right">
                    <div className="px-3 py-2 text-xs text-text-muted border-b border-white/5">
                      切换角色
                    </div>
                    {availableRoles.map(role => (
                      <button
                        key={role.code}
                        onClick={() => handleRoleSwitch(role.code)}
                        disabled={role.code === currentRole || isLoading}
                        className={cn(
                          'w-full px-3 py-2 text-left text-sm',
                          'hover:bg-white/5 transition-colors',
                          role.code === currentRole
                            ? 'text-primary bg-primary/5'
                            : 'text-text-secondary hover:text-text-primary'
                        )}
                      >
                        {role.name}
                        {role.code === currentRole && (
                          <span className="ml-2 text-xs text-text-muted">(当前)</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* Notifications */}
            <Button variant="ghost" size="sm" className="text-text-muted hover:text-white p-2">
              <Bell size={20} />
            </Button>
            
            <div className="h-4 w-[1px] bg-white/10 mx-1 hidden sm:block" />
            
            {/* User Menu */}
            <div className="relative hidden sm:block" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-3 pl-2 hover:opacity-80 transition-opacity"
              >
                {/* User info */}
                <div className="text-right hidden lg:block">
                  <div className="text-xs font-bold text-white">
                    {user?.name || '用户'}
                  </div>
                  <div className="text-[10px] font-mono text-primary">
                    {currentRole && ROLE_NAMES[currentRole as RoleCode]}
                  </div>
                </div>
                
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-secondary border border-white/10 flex items-center justify-center text-xs font-bold ring-2 ring-transparent hover:ring-primary/50 transition-all">
                  {user?.name?.slice(0, 2) || 'U'}
                </div>
              </button>
              
              {/* User dropdown menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 py-1 bg-background-secondary border border-white/10 rounded-lg shadow-xl animate-scale-in origin-top-right">
                  {/* User info header */}
                  <div className="px-4 py-3 border-b border-white/5">
                    <div className="text-sm font-medium text-text-primary">
                      {user?.name}
                    </div>
                    {user?.team && (
                      <div className="text-xs text-text-muted mt-0.5">
                        {user.team}
                      </div>
                    )}
                  </div>
                  
                  {/* Menu items */}
                  <div className="py-1">
                    <Link
                      to="/personal"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
                    >
                      <User size={16} />
                      个人中心
                    </Link>
                    <Link
                      to="/settings"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
                    >
                      <Settings size={16} />
                      设置
                    </Link>
                  </div>
                  
                  {/* Logout */}
                  <div className="border-t border-white/5 py-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-status-error hover:bg-status-error/10 transition-colors"
                    >
                      <LogOut size={16} />
                      退出登录
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Mobile menu toggle */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
              aria-label={showMobileMenu ? '关闭菜单' : '打开菜单'}
            >
              {showMobileMenu ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>
      
      {/* Mobile menu overlay */}
      {showMobileMenu && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowMobileMenu(false)}
          />
          
          {/* Mobile menu panel */}
          <div className="absolute top-16 left-0 right-0 bg-background-secondary border-b border-white/10 animate-slide-up">
            {/* Navigation items */}
            <nav className="p-4 space-y-1">
              {menuItems.map(item => {
                const Icon = item.icon;
                const active = isActive(item.path);
                
                return (
                  <Link
                    key={item.key}
                    to={item.path}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                    )}
                  >
                    <Icon size={20} />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            
            {/* Role switcher (mobile) */}
            {canSwitchRoles && currentRole && (
              <div className="px-4 py-3 border-t border-white/5">
                <div className="text-xs text-text-muted mb-2">切换角色</div>
                <div className="flex flex-wrap gap-2">
                  {availableRoles.map(role => (
                    <button
                      key={role.code}
                      onClick={() => handleRoleSwitch(role.code)}
                      disabled={role.code === currentRole || isLoading}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                        role.code === currentRole
                          ? 'bg-primary/20 text-primary border border-primary/30'
                          : 'bg-white/5 text-text-secondary hover:text-text-primary'
                      )}
                    >
                      {role.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* User section (mobile) */}
            <div className="px-4 py-3 border-t border-white/5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-secondary border border-white/10 flex items-center justify-center text-sm font-bold">
                  {user?.name?.slice(0, 2) || 'U'}
                </div>
                <div>
                  <div className="text-sm font-medium text-text-primary">
                    {user?.name}
                  </div>
                  <div className="text-xs text-text-muted">
                    {currentRole && ROLE_NAMES[currentRole as RoleCode]}
                  </div>
                </div>
              </div>
              
              <div className="space-y-1">
                <Link
                  to="/personal"
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
                >
                  <User size={16} />
                  个人中心
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-status-error hover:bg-status-error/10 transition-colors"
                >
                  <LogOut size={16} />
                  退出登录
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Header;
