import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  User,
  IdCard,
  Lock,
  Building2,
  Users,
  X,
  Loader2,
  ArrowLeft,
} from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

import { useCreateUser, useUpdateUser } from '../api/manage-users';
import { useUserDetail, useMentors, useDepartments } from '../api/get-users';
import { showApiError } from '@/utils/error-handler';

/**
 * 创建用户表单验证 Schema
 */
const createUserSchema = z.object({
  employee_id: z.string().min(1, '请输入工号'),
  password: z.string().min(1, '请输入密码'),
  username: z.string().min(1, '请输入姓名'),
  department_id: z.number({ message: '请选择部门' }),
  mentor_id: z.number().nullable().optional(),
});

/**
 * 编辑用户表单验证 Schema
 */
const editUserSchema = z.object({
  username: z.string().min(1, '请输入姓名'),
  department_id: z.number({ message: '请选择部门' }),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;
type EditUserFormData = z.infer<typeof editUserSchema>;

/**
 * 用户表单组件（用于创建和编辑）
 * 使用 ShadCN UI + react-hook-form + zod
 */
export const UserForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const { data: userDetail, isLoading: detailLoading } = useUserDetail(Number(id || 0));
  const { data: mentors = [] } = useMentors();
  const { data: departments = [] } = useDepartments();

  // 使用不同的 schema 根据是否编辑模式
  const form = useForm<CreateUserFormData | EditUserFormData>({
    resolver: zodResolver(isEdit ? editUserSchema : createUserSchema),
    defaultValues: isEdit
      ? { username: '', department_id: undefined }
      : { employee_id: '', password: '', username: '', department_id: undefined, mentor_id: null },
  });

  // 编辑模式下填充表单
  useEffect(() => {
    if (isEdit && userDetail) {
      form.reset({
        username: userDetail.username,
        department_id: userDetail.department?.id,
      });
    }
  }, [isEdit, userDetail, form]);

  const handleSubmit = async (values: CreateUserFormData | EditUserFormData) => {
    try {
      if (isEdit) {
        const editValues = values as EditUserFormData;
        await updateUser.mutateAsync({
          id: Number(id),
          data: {
            username: editValues.username,
            department_id: editValues.department_id,
          },
        });
        toast.success('用户信息更新成功');
      } else {
        const createValues = values as CreateUserFormData;
        await createUser.mutateAsync({
          password: createValues.password,
          employee_id: createValues.employee_id,
          username: createValues.username,
          department_id: createValues.department_id,
          mentor_id: createValues.mentor_id || null,
        });
        toast.success('用户创建成功');
      }
      navigate('/users');
    } catch (error) {
      showApiError(error, isEdit ? '更新失败' : '创建失败');
    }
  };

  const handleClose = () => {
    navigate('/users');
  };

  const getAvatarText = (name?: string) => (name ? name.charAt(0).toUpperCase() : '?');

  const isLoading = createUser.isPending || updateUser.isPending;

  if (isEdit && detailLoading) {
    return (
      <div className="max-w-200 mx-auto p-4">
        <div className="flex justify-center items-center min-h-100">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-200 mx-auto p-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-400">
      {/* 头部 */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={handleClose}
            className="w-10 h-10 rounded-lg border border-gray-200 bg-white cursor-pointer flex items-center justify-center transition-all text-gray-500 hover:bg-gray-50 hover:text-gray-700 hover:border-gray-300"
            title="返回"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-gray-900 m-0">
              {isEdit ? '编辑用户' : '新建用户'}
            </h1>
            <span className="text-xs font-medium text-gray-500">
              {isEdit ? '修改用户基本信息' : '创建新的系统用户'}
            </span>
          </div>
        </div>
        <button
          onClick={handleClose}
          className="w-10 h-10 rounded-lg border border-gray-200 bg-white cursor-pointer flex items-center justify-center transition-all text-gray-500 hover:bg-gray-50 hover:text-gray-700 hover:border-gray-300"
          title="关闭"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <Card>
        {/* 用户头像区域 */}
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-gray-100">
              <AvatarFallback
                className="text-xl font-bold text-white"
                style={{ background: 'linear-gradient(135deg, rgb(99, 130, 255), rgb(77, 108, 255))' }}
              >
                {getAvatarText(form.watch('username') || userDetail?.username)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">
                {form.watch('username') || userDetail?.username || '新用户'}
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                {isEdit ? `工号: ${userDetail?.employee_id || ''}` : '请填写用户信息'}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* 基本信息区域 */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(77, 108, 255, 0.1)', color: 'rgb(77, 108, 255)' }}
                  >
                    <User className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">基本信息</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 工号 - 仅创建时显示 */}
                  {!isEdit && (
                    <FormField
                      control={form.control}
                      name="employee_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>工号</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                              <Input
                                placeholder="请输入工号"
                                className="pl-9 h-10"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* 密码 - 仅创建时显示 */}
                  {!isEdit && (
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>密码</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                              <Input
                                type="password"
                                placeholder="请输入密码"
                                className="pl-9 h-10"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* 姓名 */}
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>姓名</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                              placeholder="请输入姓名"
                              className="pl-9 h-10"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* 部门 */}
                  <FormField
                    control={form.control}
                    name="department_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>部门</FormLabel>
                        <Select
                          value={field.value?.toString()}
                          onValueChange={(value) => field.onChange(Number(value))}
                        >
                          <FormControl>
                            <SelectTrigger className="h-10">
                              <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-gray-400" />
                                <SelectValue placeholder="请选择部门" />
                              </div>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {departments.map((dept) => (
                              <SelectItem key={dept.id} value={dept.id.toString()}>
                                {dept.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* 导师选择 - 仅创建时显示 */}
              {!isEdit && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: 'rgba(6, 182, 212, 0.1)', color: 'rgb(6, 182, 212)' }}
                    >
                      <Users className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900">导师指定</h3>
                  </div>

                  <FormField
                    control={form.control}
                    name="mentor_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>导师（可选）</FormLabel>
                        <Select
                          value={field.value?.toString() || ''}
                          onValueChange={(value) =>
                            field.onChange(value ? Number(value) : null)
                          }
                        >
                          <FormControl>
                            <SelectTrigger className="h-10">
                              <SelectValue placeholder="请选择导师（可选）" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {mentors.map((mentor) => (
                              <SelectItem key={mentor.id} value={mentor.id.toString()}>
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback
                                      className="text-xs font-semibold text-white"
                                      style={{ background: 'rgb(6, 182, 212)' }}
                                    >
                                      {getAvatarText(mentor.username)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span>{mentor.username}</span>
                                  <span className="text-xs text-gray-400">
                                    ({mentor.employee_id})
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          可选，创建后也可以随时指定或更换导师
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* 底部按钮 */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="px-6 h-10"
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 h-10"
                  style={{
                    background: 'rgb(77, 108, 255)',
                    boxShadow: '0 4px 12px rgba(77, 108, 255, 0.25)',
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      处理中...
                    </>
                  ) : isEdit ? (
                    '更新'
                  ) : (
                    '创建'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};
