/**
 * Sidebar Component
 * Responsive sidebar navigation with support for desktop, tablet, and mobile
 * Requirements: 22.1, 22.2, 22.3
 */

import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight, User, LogOut } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useUIStore, useSidebarCollapsed, useSidebarMobileOpen } from '@/stores/ui';
import { useAuthStore, useCurrentRole, useUser, useAvailableRoles } from '@/stores/auth';
import { getMenuItemsForRole, ROLE_NAMES, ROLE_DEFAULT_ROUTES, shouldShowRoleSwitcher, type RoleCode, type MenuItem } from '@/config/roles';

interface SidebarProps {
  className?: string;
}

interface DesktopSidebarProps {
  className?: string;
  collapsed: boolean;
  menuItems: MenuItem[];
  isActive: (path: string) => boolean;
  toggleSidebar: () => void;
}

interface MobileSidebarProps {
  mobileOpen: boolean;
  menuItems: MenuItem[];
  isActive: (path: string) => boolean;
  setMobileSidebarOpen: (open: boolean) => void;
  canSwitchRoles: boolean;
  currentRole: string | null;
  availableRoles: { code: string; name: string }[];
  handleRoleSwitch: (roleCode: RoleCode) => void;
  isLoading: boolean;
  user: { name?: string } | null;
  handleLogout: () => void;
}

// Desktop/Tablet Sidebar Component
function DesktopSidebar({ className, collapsed, menuItems, isActive, toggleSidebar }: DesktopSidebarProps) {
  const renderMenuItem = (item: MenuItem) => {
    const Icon = item.icon;
    const active = isActive(item.path);
    
    return (
      <Link
        key={item.key}
        to={item.path}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
          'hover:bg-white/5',
          active
            ? 'bg-primary/10 text-primary border-l-2 border-primary'
            : 'text-text-secondary hover:text-text-primary',
          collapsed && 'justify-center px-2'
        )}
        title={collapsed ? item.label : undefined}
      >
        <Icon size={20} className="flex-shrink-0" />
        {!collapsed && (
          <span className="font-medium truncate">{item.label}</span>
        )}
      </Link>
    );
  };

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col fixed left-0 top-16 bottom-0 z-30',
        'bg-background-secondary/80 backdrop-blur-md border-r border-white/5',
        'transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-60',
        className
      )}
    >
      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {menuItems.map(item => renderMenuItem(item))}
      </nav>
      
      {/* Collapse toggle button */}
      <div className="p-3 border-t border-white/5">
        <button
          onClick={toggleSidebar}
          className={cn(
            'flex items-center gap-2 w-full px-3 py-2 rounded-lg',
            'text-text-muted hover:text-text-primary hover:bg-white/5',
            'transition-colors',
            collapsed && 'justify-center px-2'
          )}
          aria-label={collapsed ? '展开侧边栏' : '折叠侧边栏'}
        >
          {collapsed ? (
            <ChevronRight size={18} />
          ) : (
            <>
              <ChevronLeft size={18} />
              <span className="text-sm">折叠菜单</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

// Mobile Drawer Sidebar Component
function MobileSidebar({
  mobileOpen,
  menuItems,
  isActive,
  setMobileSidebarOpen,
  canSwitchRoles,
  currentRole,
  availableRoles,
  handleRoleSwitch,
  isLoading,
  user,
  handleLogout,
}: MobileSidebarProps) {
  return (
    <>
      {/* Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      
      {/* Drawer */}
      <aside
        className={cn(
          'fixed left-0 top-0 bottom-0 z-50 w-72 md:hidden',
          'bg-background-secondary border-r border-white/5',
          'transform transition-transform duration-300 ease-in-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-gradient-to-tr from-primary to-blue-600 flex items-center justify-center font-bold text-black font-heading">
              L
            </div>
            <span className="font-heading font-bold text-lg tracking-tight text-white">
              LMS <span className="text-primary">Ops</span>
            </span>
          </div>
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
            aria-label="关闭菜单"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="p-4 space-y-1 overflow-y-auto flex-1">
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
                  onClick={() => handleRoleSwitch(role.code as RoleCode)}
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
      </aside>
    </>
  );
}

/**
 * Responsive Sidebar component
 * - Desktop (lg+): Full sidebar, always visible
 * - Tablet (md): Collapsible sidebar with icons only when collapsed
 * - Mobile (< md): Drawer-style sidebar with overlay
 */
export function Sidebar({ className }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentRole = useCurrentRole();
  const user = useUser();
  const availableRoles = useAvailableRoles();
  const collapsed = useSidebarCollapsed();
  const mobileOpen = useSidebarMobileOpen();
  const { toggleSidebar, setMobileSidebarOpen } = useUIStore();
  const { logout, switchRole, isLoading } = useAuthStore();
  
  // Get menu items for current role
  const menuItems = currentRole ? getMenuItemsForRole(currentRole as RoleCode) : [];
  
  // Get role codes from available roles
  const roleCodes = availableRoles.map(r => r.code);
  const canSwitchRoles = shouldShowRoleSwitcher(roleCodes);
  
  const handleLogout = () => {
    logout();
    setMobileSidebarOpen(false);
    navigate('/login');
  };
  
  const handleRoleSwitch = async (roleCode: RoleCode) => {
    try {
      await switchRole(roleCode);
      setMobileSidebarOpen(false);
      const defaultRoute = ROLE_DEFAULT_ROUTES[roleCode];
      navigate(defaultRoute);
    } catch (error) {
      console.error('Failed to switch role:', error);
    }
  };
  
  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname, setMobileSidebarOpen]);
  
  // Close mobile sidebar on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileOpen) {
        setMobileSidebarOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [mobileOpen, setMobileSidebarOpen]);
  
  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };
  
  return (
    <>
      <DesktopSidebar
        className={className}
        collapsed={collapsed}
        menuItems={menuItems}
        isActive={isActive}
        toggleSidebar={toggleSidebar}
      />
      <MobileSidebar
        mobileOpen={mobileOpen}
        menuItems={menuItems}
        isActive={isActive}
        setMobileSidebarOpen={setMobileSidebarOpen}
        canSwitchRoles={canSwitchRoles}
        currentRole={currentRole}
        availableRoles={availableRoles}
        handleRoleSwitch={handleRoleSwitch}
        isLoading={isLoading}
        user={user}
        handleLogout={handleLogout}
      />
    </>
  );
}

export default Sidebar;
