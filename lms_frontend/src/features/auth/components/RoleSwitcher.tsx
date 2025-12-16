/**
 * Role Switcher Component
 * Allows users with multiple roles to switch between them
 * Requirements: 2.2, 2.3, 2.4
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Check, RefreshCw } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { ROLE_NAMES, ROLE_DEFAULT_ROUTES, shouldShowRoleSwitcher } from '@/config/roles';
import type { RoleCode } from '@/types/domain';

/**
 * Role Switcher Component
 * Requirements: 2.2 - Display current role and available roles
 * Requirements: 2.3 - Call role switch API on selection
 * Requirements: 2.4 - Update menu after role switch
 */
export function RoleSwitcher() {
  const navigate = useNavigate();
  const { currentRole, availableRoles, switchRole, isLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get role codes from available roles
  const roleCodes = availableRoles.map((r) => r.code);

  // Don't render if user doesn't have multiple roles
  // Requirements: 2.1, 2.6 - Only show for users with multiple roles
  if (!shouldShowRoleSwitcher(roleCodes)) {
    return null;
  }

  /**
   * Handle role selection
   * Requirements: 2.3 - Call role switch API
   * Requirements: 2.4 - Navigate to new role's default route
   */
  const handleRoleSelect = async (roleCode: RoleCode) => {
    if (roleCode === currentRole || isSwitching) {
      setIsOpen(false);
      return;
    }

    setIsSwitching(true);
    setError(null);

    try {
      await switchRole(roleCode);
      setIsOpen(false);
      
      // Navigate to the new role's default route
      // Requirements: 2.4 - Menu updates after role switch
      const defaultRoute = ROLE_DEFAULT_ROUTES[roleCode] || '/dashboard';
      navigate(defaultRoute, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '角色切换失败');
    } finally {
      setIsSwitching(false);
    }
  };

  /**
   * Toggle dropdown
   */
  const toggleDropdown = () => {
    if (!isLoading && !isSwitching) {
      setIsOpen(!isOpen);
      setError(null);
    }
  };

  /**
   * Close dropdown when clicking outside
   */
  const handleBlur = () => {
    // Delay to allow click events on dropdown items
    setTimeout(() => setIsOpen(false), 150);
  };

  const currentRoleName = currentRole ? ROLE_NAMES[currentRole] : '未知角色';

  return (
    <div className="relative" onBlur={handleBlur}>
      {/* Current Role Button */}
      <button
        type="button"
        onClick={toggleDropdown}
        disabled={isLoading || isSwitching}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg
          bg-background-secondary border border-white/10
          hover:border-primary/50 hover:bg-background-secondary/80
          transition-all duration-200
          text-sm font-medium text-text-primary
          disabled:opacity-50 disabled:cursor-not-allowed
          ${isOpen ? 'border-primary/50 ring-1 ring-primary/20' : ''}
        `}
      >
        {isSwitching ? (
          <RefreshCw size={14} className="animate-spin text-primary" />
        ) : (
          <span className="w-2 h-2 rounded-full bg-primary" />
        )}
        <span>{currentRoleName}</span>
        <ChevronDown
          size={14}
          className={`text-text-muted transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 py-1 rounded-lg bg-background-secondary border border-white/10 shadow-xl z-50">
          {/* Error Message */}
          {error && (
            <div className="px-3 py-2 text-xs text-red-400 border-b border-white/10">
              {error}
            </div>
          )}

          {/* Role Options */}
          {availableRoles.map((role) => {
            const isActive = role.code === currentRole;
            return (
              <button
                key={role.code}
                type="button"
                onClick={() => handleRoleSelect(role.code)}
                disabled={isSwitching}
                className={`
                  w-full flex items-center justify-between px-3 py-2
                  text-sm text-left transition-colors
                  ${isActive 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-text-primary hover:bg-white/5'
                  }
                  disabled:opacity-50
                `}
              >
                <span>{role.name}</span>
                {isActive && <Check size={14} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default RoleSwitcher;
