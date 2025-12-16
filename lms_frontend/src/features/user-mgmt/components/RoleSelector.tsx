/**
 * RoleSelector Component
 * Multi-select role selector with student role always selected and locked
 * Requirements: 18.7 - Role multi-selector (student role cannot be removed)
 * Property 21: 学员角色不可移除
 */

import * as React from 'react';
import { cn } from '@/utils/cn';
import { Check, Lock } from 'lucide-react';
import { ROLE_CODES, ROLE_NAMES, type RoleCode } from '@/config/roles';

export interface RoleSelectorProps {
  /** Currently selected role codes */
  value: RoleCode[];
  /** Callback when selection changes */
  onChange: (roles: RoleCode[]) => void;
  /** Disabled state */
  disabled?: boolean;
  /** Error message */
  error?: string;
  /** Label for the selector */
  label?: string;
  /** Additional class names */
  className?: string;
}

// All available roles for selection
const ALL_ROLES: RoleCode[] = [
  ROLE_CODES.STUDENT,
  ROLE_CODES.MENTOR,
  ROLE_CODES.DEPT_MANAGER,
  ROLE_CODES.ADMIN,
  ROLE_CODES.TEAM_MANAGER,
];

export const RoleSelector: React.FC<RoleSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  error,
  label,
  className,
}) => {
  const selectorId = React.useId();
  const errorId = `${selectorId}-error`;
  
  // Ensure STUDENT role is always included
  const selectedRoles = React.useMemo(() => {
    const roles = new Set(value);
    roles.add(ROLE_CODES.STUDENT); // Always include student role
    return Array.from(roles) as RoleCode[];
  }, [value]);
  
  const handleRoleToggle = (roleCode: RoleCode) => {
    // Student role cannot be toggled off
    if (roleCode === ROLE_CODES.STUDENT) {
      return;
    }
    
    if (disabled) return;
    
    const newRoles = selectedRoles.includes(roleCode)
      ? selectedRoles.filter(r => r !== roleCode)
      : [...selectedRoles, roleCode];
    
    // Ensure STUDENT is always included
    if (!newRoles.includes(ROLE_CODES.STUDENT)) {
      newRoles.push(ROLE_CODES.STUDENT);
    }
    
    onChange(newRoles);
  };
  
  const isRoleLocked = (roleCode: RoleCode): boolean => {
    return roleCode === ROLE_CODES.STUDENT;
  };
  
  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label 
          id={`${selectorId}-label`}
          className="block text-sm font-medium text-text-secondary mb-2"
        >
          {label}
        </label>
      )}
      
      <div 
        role="group"
        aria-labelledby={label ? `${selectorId}-label` : undefined}
        aria-describedby={error ? errorId : undefined}
        className="space-y-2"
      >
        {ALL_ROLES.map((roleCode) => {
          const isSelected = selectedRoles.includes(roleCode);
          const isLocked = isRoleLocked(roleCode);
          const isDisabled = disabled || isLocked;
          
          return (
            <div
              key={roleCode}
              role="checkbox"
              aria-checked={isSelected}
              aria-disabled={isDisabled}
              tabIndex={isDisabled ? -1 : 0}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                isSelected 
                  ? 'border-primary bg-primary/10' 
                  : 'border-border bg-background-secondary hover:bg-white/5',
                isDisabled && 'cursor-not-allowed opacity-70',
                !isDisabled && !isSelected && 'hover:border-primary/50'
              )}
              onClick={() => handleRoleToggle(roleCode)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleRoleToggle(roleCode);
                }
              }}
            >
              {/* Checkbox indicator */}
              <div
                className={cn(
                  'h-5 w-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                  isSelected 
                    ? 'bg-primary border-primary' 
                    : 'border-input bg-transparent',
                  isLocked && 'bg-primary/80 border-primary/80'
                )}
              >
                {isSelected && (
                  <Check className="h-3 w-3 text-primary-foreground" />
                )}
              </div>
              
              {/* Role name */}
              <span className={cn(
                'flex-1 text-sm font-medium',
                isSelected ? 'text-primary' : 'text-text-primary'
              )}>
                {ROLE_NAMES[roleCode]}
              </span>
              
              {/* Lock indicator for student role */}
              {isLocked && (
                <div className="flex items-center gap-1 text-xs text-text-muted">
                  <Lock className="h-3 w-3" />
                  <span>默认角色</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {error && (
        <p id={errorId} className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
      
      <p className="mt-2 text-xs text-text-muted">
        学员角色为默认角色，不可取消
      </p>
    </div>
  );
};

RoleSelector.displayName = 'RoleSelector';
