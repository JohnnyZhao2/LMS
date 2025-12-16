/**
 * Login Form Component
 * Handles user login with form validation
 * Requirements: 1.1, 1.4
 */

import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '../AuthContext';

/**
 * Login form validation schema using Zod
 * Requirements: 1.4 - Validate username and password
 */
const loginSchema = z.object({
  username: z
    .string()
    .min(1, '请输入用户名')
    .max(50, '用户名不能超过50个字符'),
  password: z
    .string()
    .min(1, '请输入密码')
    .max(100, '密码不能超过100个字符'),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSuccess?: () => void;
}

/**
 * Login Form Component
 * Requirements: 1.1 - Username and password input
 * Requirements: 1.4 - Form validation and error display
 */
export function LoginForm({ onSuccess }: LoginFormProps) {
  const { login, isLoading } = useAuth();
  
  // Form state
  const [formData, setFormData] = useState<LoginFormData>({
    username: '',
    password: '',
  });
  
  // Validation errors
  const [errors, setErrors] = useState<Partial<Record<keyof LoginFormData, string>>>({});
  
  // API error
  const [apiError, setApiError] = useState<string | null>(null);

  /**
   * Handle input change
   */
  const handleChange = (field: keyof LoginFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    // Clear field error on change
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    // Clear API error on any change
    if (apiError) {
      setApiError(null);
    }
  };

  /**
   * Validate form data
   */
  const validateForm = (): boolean => {
    const result = loginSchema.safeParse(formData);
    
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof LoginFormData, string>> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof LoginFormData;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      });
      setErrors(fieldErrors);
      return false;
    }
    
    setErrors({});
    return true;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    // Clear previous API error
    setApiError(null);
    
    try {
      await login(formData);
      onSuccess?.();
    } catch (error) {
      // Display API error
      if (error instanceof Error) {
        setApiError(error.message);
      } else {
        setApiError('登录失败，请稍后重试');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* API Error Display */}
      {apiError && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {apiError}
        </div>
      )}

      {/* Username Field */}
      <div className="space-y-2">
        <label
          htmlFor="username"
          className="text-xs font-mono text-primary uppercase tracking-wider"
        >
          用户名
        </label>
        <Input
          id="username"
          type="text"
          placeholder="请输入用户名"
          value={formData.username}
          onChange={handleChange('username')}
          disabled={isLoading}
          className={errors.username ? 'border-red-500' : ''}
          autoComplete="username"
        />
        {errors.username && (
          <p className="text-xs text-red-400">{errors.username}</p>
        )}
      </div>

      {/* Password Field */}
      <div className="space-y-2">
        <label
          htmlFor="password"
          className="text-xs font-mono text-primary uppercase tracking-wider"
        >
          密码
        </label>
        <Input
          id="password"
          type="password"
          placeholder="请输入密码"
          value={formData.password}
          onChange={handleChange('password')}
          disabled={isLoading}
          className={errors.password ? 'border-red-500' : ''}
          autoComplete="current-password"
        />
        {errors.password && (
          <p className="text-xs text-red-400">{errors.password}</p>
        )}
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        variant="primary"
        className="w-full mt-4"
        disabled={isLoading}
      >
        {isLoading ? '登录中...' : '登录'}
      </Button>
    </form>
  );
}

export default LoginForm;
