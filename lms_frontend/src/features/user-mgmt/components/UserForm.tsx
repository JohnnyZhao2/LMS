/**
 * UserForm Component
 * Form for creating and editing users
 * Requirements: 18.2, 18.3 - User create/edit form with basic info
 * Requirements: 22.4 - Responsive form layout
 */

import * as React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select, type SelectOption } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { FormGrid, FormField } from '@/components/ui/FormLayout';
import { useCreateUser, useUpdateUser, type UserCreateRequest, type UserUpdateRequest, type UserListItem } from '../api/users';

export interface Department {
  id: number;
  name: string;
}

export interface UserFormProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** User to edit (null for create mode) */
  user?: UserListItem | null;
  /** Available departments for selection */
  departments?: Department[];
  /** Callback when form is successfully submitted */
  onSuccess?: () => void;
}

interface FormData {
  username: string;
  password: string;
  real_name: string;
  employee_id: string;
  department_id: string;
}

interface FormErrors {
  username?: string;
  password?: string;
  real_name?: string;
  employee_id?: string;
  department_id?: string;
}

export const UserForm: React.FC<UserFormProps> = ({
  open,
  onClose,
  user,
  departments = [],
  onSuccess,
}) => {
  const isEditMode = !!user;
  
  const [formData, setFormData] = React.useState<FormData>({
    username: '',
    password: '',
    real_name: '',
    employee_id: '',
    department_id: '',
  });
  
  const [errors, setErrors] = React.useState<FormErrors>({});
  
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  
  const isLoading = createUser.isPending || updateUser.isPending;
  
  // Reset form when modal opens/closes or user changes
  React.useEffect(() => {
    if (open) {
      if (user) {
        setFormData({
          username: user.username,
          password: '',
          real_name: user.real_name,
          employee_id: user.employee_id,
          department_id: user.department?.id?.toString() || '',
        });
      } else {
        setFormData({
          username: '',
          password: '',
          real_name: '',
          employee_id: '',
          department_id: '',
        });
      }
      setErrors({});
    }
  }, [open, user]);
  
  const handleInputChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };
  
  const handleSelectChange = (field: keyof FormData) => (value: string | string[]) => {
    const stringValue = Array.isArray(value) ? value[0] : value;
    setFormData(prev => ({ ...prev, [field]: stringValue }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };
  
  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!isEditMode) {
      if (!formData.username.trim()) {
        newErrors.username = '请输入用户名';
      } else if (formData.username.length < 3) {
        newErrors.username = '用户名至少3个字符';
      }
      
      if (!formData.password.trim()) {
        newErrors.password = '请输入密码';
      } else if (formData.password.length < 6) {
        newErrors.password = '密码至少6个字符';
      }
    }
    
    if (!formData.real_name.trim()) {
      newErrors.real_name = '请输入姓名';
    }
    
    if (!formData.employee_id.trim()) {
      newErrors.employee_id = '请输入工号';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    try {
      if (isEditMode && user) {
        const updateData: UserUpdateRequest = {
          real_name: formData.real_name,
          employee_id: formData.employee_id,
          department_id: formData.department_id ? parseInt(formData.department_id) : null,
        };
        await updateUser.mutateAsync({ id: user.id, data: updateData });
      } else {
        const createData: UserCreateRequest = {
          username: formData.username,
          password: formData.password,
          real_name: formData.real_name,
          employee_id: formData.employee_id,
          department_id: formData.department_id ? parseInt(formData.department_id) : undefined,
        };
        await createUser.mutateAsync(createData);
      }
      
      onSuccess?.();
      onClose();
    } catch (error) {
      // Error handling is done by the mutation
      console.error('Form submission error:', error);
    }
  };
  
  const departmentOptions: SelectOption[] = [
    { value: '', label: '请选择部门' },
    ...departments.map(dept => ({
      value: dept.id.toString(),
      label: dept.name,
    })),
  ];
  
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditMode ? '编辑用户' : '新建用户'}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            取消
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSubmit}
            loading={isLoading}
          >
            {isEditMode ? '保存' : '创建'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <FormGrid columns={2} gap={4}>
          {!isEditMode && (
            <>
              <FormField>
                <Input
                  label="用户名"
                  placeholder="请输入用户名"
                  value={formData.username}
                  onChange={handleInputChange('username')}
                  error={errors.username}
                  disabled={isLoading}
                  autoComplete="off"
                />
              </FormField>
              
              <FormField>
                <Input
                  label="密码"
                  type="password"
                  placeholder="请输入密码"
                  value={formData.password}
                  onChange={handleInputChange('password')}
                  error={errors.password}
                  disabled={isLoading}
                  autoComplete="new-password"
                />
              </FormField>
            </>
          )}
          
          <FormField>
            <Input
              label="姓名"
              placeholder="请输入姓名"
              value={formData.real_name}
              onChange={handleInputChange('real_name')}
              error={errors.real_name}
              disabled={isLoading}
            />
          </FormField>
          
          <FormField>
            <Input
              label="工号"
              placeholder="请输入工号"
              value={formData.employee_id}
              onChange={handleInputChange('employee_id')}
              error={errors.employee_id}
              disabled={isLoading}
            />
          </FormField>
          
          <FormField fullWidth>
            <Select
              label="所属部门"
              options={departmentOptions}
              value={formData.department_id}
              onChange={handleSelectChange('department_id')}
              error={errors.department_id}
              disabled={isLoading}
            />
          </FormField>
        </FormGrid>
      </form>
    </Modal>
  );
};

UserForm.displayName = 'UserForm';
