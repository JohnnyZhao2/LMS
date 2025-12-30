import { useEffect } from 'react';
import { createPortal } from 'react-dom';
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

  return createPortal(
    <div className="fixed inset-0 flex flex-col bg-gray-50 z-[1000] animate-fadeIn">
      {/* 顶部导航栏 */}
      <div className="flex items-center justify-between h-16 px-6 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={handleClose}
            className="w-9 h-9 flex items-center justify-center bg-transparent border border-gray-200 rounded-lg text-gray-500 cursor-pointer transition-all hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300"
            title="返回"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-gray-900 m-0 leading-tight">
              {isEdit ? '编辑用户' : '新建用户'}
            </h1>
            <span className="text-xs text-gray-500">
              {isEdit ? '修改系统用户信息' : '创建新的用户账号'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            className="h-9 px-4"
          >
            取消
          </Button>
          <Button
            onClick={form.handleSubmit(handleSubmit)}
            disabled={isLoading}
            className="h-9 px-6 bg-primary-600 hover:bg-primary-700 text-white shadow-sm transition-all hover:shadow-md"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                处理中...
              </>
            ) : isEdit ? (
              '保存修改'
            ) : (
              '立即创建'
            )}
          </Button>
        </div>
      </div>

      {/* 主体内容区域 - 可滚动 */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          <Card className="border-none shadow-sm ring-1 ring-gray-900/5">
            {/* 用户头像区域 */}
            <CardHeader className="pb-6 border-b border-gray-100 bg-white rounded-t-xl">
              <div className="flex items-center gap-5">
                <Avatar className="h-20 w-20 border-4 border-white shadow-lg shadow-primary-500/10">
                  <AvatarFallback
                    className="text-2xl font-bold text-white bg-gradient-to-br from-primary-400 to-primary-600"
                  >
                    {getAvatarText(form.watch('username') || userDetail?.username)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-xl text-gray-900">
                    {form.watch('username') || userDetail?.username || '新用户'}
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      {isEdit ? `工号: ${userDetail?.employee_id || '未设置'}` : '待创建'}
                    </span>
                    {form.watch('department_id') && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                        {departments.find(d => d.id === form.watch('department_id'))?.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-8 bg-white rounded-b-xl">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
                  {/* 基本信息区域 */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
                      <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600">
                        <User className="w-4 h-4" />
                      </div>
                      <h3 className="text-base font-bold text-gray-900">基本信息</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                      {/* 姓名 */}
                      <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>姓名</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
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
                              <SelectContent className="z-[1050]">
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
                                  <IdCard className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
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
                                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                  <Input
                                    type="password"
                                    placeholder="请输入初始密码"
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
                    </div>
                  </div>

                  {/* 导师选择 - 仅创建时显示 */}
                  {!isEdit && (
                    <div className="space-y-6 pt-2">
                      <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
                        <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center text-cyan-600">
                          <Users className="w-4 h-4" />
                        </div>
                        <h3 className="text-base font-bold text-gray-900">
                          导师分配 <span className="text-xs font-normal text-gray-400 ml-2">(可选)</span>
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="mentor_id"
                          render={({ field }) => (
                            <FormItem className="col-span-2 md:col-span-1">
                              <FormLabel>选择导师</FormLabel>
                              <Select
                                value={field.value?.toString() || ''}
                                onValueChange={(value) =>
                                  field.onChange(value ? Number(value) : null)
                                }
                              >
                                <FormControl>
                                  <SelectTrigger className="h-10">
                                    <SelectValue placeholder="暂不指定导师" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="z-[1050]">
                                  {mentors.map((mentor) => (
                                    <SelectItem key={mentor.id} value={mentor.id.toString()}>
                                      <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-full bg-cyan-100 flex items-center justify-center text-[10px] text-cyan-700 font-bold">
                                          {getAvatarText(mentor.username)}
                                        </div>
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
                                可以稍后在用户详情页进行分配或变更
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  )}
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>,
    document.body
  );
};

