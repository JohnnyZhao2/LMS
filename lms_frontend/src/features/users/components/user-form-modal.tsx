import { useEffect, useState } from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  Space,
  Typography,
  Card,
  Avatar,
  message,
  Select,
} from 'antd';
import {
  UserOutlined,
  SafetyOutlined,
  ApartmentOutlined,
  TeamOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { useCreateUser, useUpdateUser, useAssignRoles, useAssignMentor } from '../api/manage-users';
import { useUserDetail, useMentors, useDepartments, useRoles } from '../api/get-users';
import { showApiError } from '@/utils/error-handler';
import type { RoleCode } from '@/types/api';

const { Title, Text } = Typography;
const { Option } = Select;

interface UserFormModalProps {
  open: boolean;
  userId?: number;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * 用户表单弹窗组件（用于创建和编辑）
 * 参考设计稿，采用卡片式角色选择和按钮组部门选择
 */
export const UserFormModal: React.FC<UserFormModalProps> = ({
  open,
  userId,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const isEdit = !!userId;
  // 使用 useState 管理选中状态，确保 UI 立即响应
  const [selectedRoleCodes, setSelectedRoleCodes] = useState<RoleCode[]>([]);

  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const assignRoles = useAssignRoles();
  const assignMentor = useAssignMentor();
  const { data: userDetail, isLoading: detailLoading } = useUserDetail(userId || 0);
  const { data: mentors = [] } = useMentors();
  const { data: departments = [] } = useDepartments();
  const { data: roles = [] } = useRoles();

  // 编辑模式下填充表单
  useEffect(() => {
    if (open) {
      if (isEdit && userDetail) {
        const currentRoleCodes = userDetail.roles
          .filter((r) => r.code !== 'STUDENT')
          .map((r) => r.code as RoleCode);
        setSelectedRoleCodes(currentRoleCodes);
        form.setFieldsValue({
          username: userDetail.username,
          employee_id: userDetail.employee_id,
          department_id: userDetail.department?.id,
          role_codes: currentRoleCodes,
          mentor_id: userDetail.mentor?.id || null,
        });
      } else {
        // 新建模式：重置表单和状态
        form.resetFields();
        setSelectedRoleCodes([]);
        form.setFieldsValue({
          role_codes: [],
        });
      }
    } else {
      // 弹窗关闭时重置状态
      setSelectedRoleCodes([]);
    }
  }, [open, isEdit, userDetail, form]);

  const handleSubmit = async (values: {
    password?: string;
    employee_id: string;
    username: string;
    department_id: number;
    role_codes?: RoleCode[];
    mentor_id?: number | null;
  }) => {
    try {
      if (isEdit) {
        // 编辑模式：更新基本信息（包括姓名和工号）、部门和角色
        await updateUser.mutateAsync({
          id: userId!,
          data: {
            username: values.username,
            employee_id: values.employee_id,
            department_id: values.department_id,
          },
        });

        // 更新角色（如果提供了）
        if (values.role_codes !== undefined) {
          await assignRoles.mutateAsync({
            id: userId!,
            roles: values.role_codes,
          });
        }

        // 更新导师
        // 注意：当用户清空选择时，mentor_id 可能是 undefined，需要转换为 null
        // 需要检查是否有变化：如果原本有导师现在清空了，或者原本没有导师现在选择了，都需要更新
        const currentMentorId = userDetail?.mentor?.id ?? null;
        const newMentorId = values.mentor_id ?? null;
        
        // 只有当导师信息发生变化时才调用 API
        if (currentMentorId !== newMentorId) {
          await assignMentor.mutateAsync({
            id: userId!,
            mentorId: newMentorId,
          });
        }

        message.success('用户信息更新成功');
      } else {
        // 创建模式
        await createUser.mutateAsync({
          password: values.password!,
          employee_id: values.employee_id!,
          username: values.username,
          department_id: values.department_id,
          mentor_id: values.mentor_id || null,
        });

        message.success('用户创建成功');
      }
      handleClose();
      onSuccess?.();
    } catch (error) {
      showApiError(error, isEdit ? '更新失败' : '创建失败');
    }
  };

  // 获取用户头像（首字母）
  const getAvatarText = (name?: string) => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  };

  // 角色描述映射
  const roleDescriptions: Record<string, string> = {
    ADMIN: '全平台治理',
    DEPT_MANAGER: '本室资源分配',
    MENTOR: '标准执行权限',
    TEAM_MANAGER: '标准执行权限',
    STUDENT: '标准执行权限',
  };

  // 角色图标映射
  const roleIcons: Record<string, React.ReactNode> = {
    ADMIN: <SafetyOutlined style={{ fontSize: 24 }} />,
    DEPT_MANAGER: <ApartmentOutlined style={{ fontSize: 24 }} />,
    MENTOR: <TeamOutlined style={{ fontSize: 24 }} />,
    TEAM_MANAGER: <TeamOutlined style={{ fontSize: 24 }} />,
    STUDENT: <UserOutlined style={{ fontSize: 24 }} />,
  };

  // 获取角色颜色
  const getRoleColor = (code: string) => {
    const colors: Record<string, string> = {
      ADMIN: '#ff4d4f',
      DEPT_MANAGER: '#722ed1',
      MENTOR: '#faad14',
      TEAM_MANAGER: '#13c2c2',
      STUDENT: '#1890ff',
    };
    return colors[code] || '#1890ff';
  };

  const selectedDepartmentId = Form.useWatch('department_id', form);
  const username = Form.useWatch('username', form) || userDetail?.username;

  // 处理弹窗关闭，重置状态
  const handleClose = () => {
    form.resetFields();
    setSelectedRoleCodes([]);
    onClose();
  };

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      footer={null}
      width={800}
      closeIcon={<CloseOutlined />}
      styles={{
        body: {
          padding: '24px',
        },
      }}
    >
      {/* 头部 */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
        <Avatar
          size={64}
          style={{
            backgroundColor: '#1890ff',
            marginRight: 16,
            fontSize: 24,
            fontWeight: 'bold',
          }}
        >
          {getAvatarText(username)}
        </Avatar>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            {isEdit ? '编辑用户信息' : '新建平台用户'}
          </Title>
          {isEdit && userDetail && (
            <Text type="secondary" style={{ fontSize: 14 }}>
              {userDetail.employee_id}
            </Text>
          )}
          {!isEdit && (
            <Text type="secondary" style={{ fontSize: 14 }}>
              NEW ACCOUNT
            </Text>
          )}
        </div>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          role_codes: [],
        }}
      >
        {/* 1. 基础身份信息 */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
            <UserOutlined style={{ fontSize: 18, marginRight: 8 }} />
            <Title level={5} style={{ margin: 0 }}>
              基础身份信息
            </Title>
          </div>
          <Space.Compact style={{ width: '100%' }}>
            <Form.Item
              name="username"
              rules={[{ required: true, message: '请输入姓名' }]}
              style={{ flex: 1, marginBottom: 0 }}
            >
              <Input placeholder="请输入姓名..." size="large" />
            </Form.Item>
            <Form.Item
              name="employee_id"
              rules={[{ required: true, message: '请输入工号' }]}
              style={{ flex: 1, marginBottom: 0 }}
            >
              <Input placeholder="EMP000" size="large" />
            </Form.Item>
          </Space.Compact>
          {!isEdit && (
            <Form.Item
              name="password"
              rules={[{ required: true, message: '请输入密码' }]}
              style={{ marginTop: 16, marginBottom: 0 }}
            >
              <Input.Password placeholder="请输入密码..." size="large" />
            </Form.Item>
          )}
        </div>

        {/* 2. 角色权限配置 */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
            <SafetyOutlined style={{ fontSize: 18, marginRight: 8 }} />
            <Title level={5} style={{ margin: 0 }}>
              角色权限配置
            </Title>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 16,
            }}
          >
            {roles.filter((role) => role.code !== 'STUDENT').map((role) => {
              const roleCode = role.code as RoleCode;
              const isSelected = selectedRoleCodes.includes(roleCode);
              const roleColor = getRoleColor(role.code);
              return (
                <Card
                  key={role.code}
                  onClick={(e) => {
                    e.stopPropagation();
                    // 更新状态和表单值，确保 UI 立即响应
                    let newCodes: RoleCode[];
                    if (isSelected) {
                      newCodes = selectedRoleCodes.filter((c: RoleCode) => c !== roleCode);
                    } else {
                      newCodes = [...selectedRoleCodes, roleCode];
                    }
                    setSelectedRoleCodes(newCodes);
                    form.setFieldsValue({
                      role_codes: newCodes,
                    });
                  }}
                  style={{
                    cursor: 'pointer',
                    border: isSelected ? `2px solid ${roleColor}` : '1px solid #d9d9d9',
                    backgroundColor: isSelected ? `${roleColor}15` : '#ffffff',
                    transition: 'all 0.3s',
                    boxShadow: isSelected ? `0 2px 8px ${roleColor}30` : '0 1px 2px rgba(0,0,0,0.1)',
                    transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                  }}
                  bodyStyle={{ padding: '16px', textAlign: 'center' }}
                >
                  <div style={{ marginBottom: 8, color: roleColor }}>
                    {roleIcons[role.code] || <UserOutlined style={{ fontSize: 24 }} />}
                  </div>
                  <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{role.name}</div>
                  <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                    {roleDescriptions[role.code] || '标准执行权限'}
                  </div>
                </Card>
              );
            })}
            {/* 学员角色（始终选中，不可取消） */}
            <Card
              style={{
                border: '2px solid #1890ff',
                backgroundColor: '#1890ff10',
                cursor: 'not-allowed',
              }}
              bodyStyle={{ padding: '16px', textAlign: 'center' }}
            >
              <div style={{ marginBottom: 8, color: '#1890ff' }}>
                <UserOutlined style={{ fontSize: 24 }} />
              </div>
              <div style={{ fontWeight: 'bold', marginBottom: 4 }}>普通学员</div>
              <div style={{ fontSize: 12, color: '#8c8c8c' }}>标准执行权限</div>
            </Card>
          </div>
          <Form.Item name="role_codes" hidden>
            <Input />
          </Form.Item>
        </div>

        {/* 3. 组织架构调整 */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
            <ApartmentOutlined style={{ fontSize: 18, marginRight: 8 }} />
            <Title level={5} style={{ margin: 0 }}>
              组织架构调整
            </Title>
          </div>
          <Form.Item
            name="department_id"
            rules={[{ required: true, message: '请选择部门' }]}
            style={{ marginBottom: 0 }}
          >
            <Space.Compact style={{ width: '100%' }}>
              {departments.map((dept) => {
                const isSelected = selectedDepartmentId === dept.id;
                return (
                  <Button
                    key={dept.id}
                    type={isSelected ? 'primary' : 'default'}
                    size="large"
                    onClick={() => {
                      form.setFieldsValue({ department_id: dept.id });
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: isSelected ? '#fff' : 'transparent',
                      color: isSelected ? '#000' : undefined,
                      borderColor: isSelected ? '#1890ff' : undefined,
                    }}
                  >
                    {dept.name}
                  </Button>
                );
              })}
            </Space.Compact>
          </Form.Item>
        </div>

        {/* 4. 师徒关系绑定 */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
            <TeamOutlined style={{ fontSize: 18, marginRight: 8 }} />
            <Title level={5} style={{ margin: 0 }}>
              师徒关系绑定
            </Title>
          </div>
          <Form.Item name="mentor_id" style={{ marginBottom: 0 }}>
            <Select
              placeholder="指定导师（可选）"
              allowClear
              showSearch
              optionFilterProp="children"
              size="large"
            >
              {mentors
                .filter((m) => !isEdit || m.id !== userId)
                .map((mentor) => (
                  <Option key={mentor.id} value={mentor.id}>
                    {mentor.username} ({mentor.employee_id})
                  </Option>
                ))}
            </Select>
          </Form.Item>
        </div>

        {/* 底部按钮 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 32 }}>
          <Button size="large" onClick={handleClose}>
            取消
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            loading={createUser.isPending || updateUser.isPending || assignRoles.isPending || assignMentor.isPending}
          >
            {isEdit ? '确认更新' : '确认创建用户'}
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

