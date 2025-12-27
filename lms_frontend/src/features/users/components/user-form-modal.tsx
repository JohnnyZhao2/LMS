import { useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  Typography,
  Card,
  Avatar,
  message,
  Select,
  ConfigProvider,
} from 'antd';
import {
  UserOutlined,
  SafetyOutlined,
  ApartmentOutlined,
  TeamOutlined,
  CloseOutlined,
  CheckCircleFilled,
  IdcardOutlined,
  LockOutlined,
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
 * 极致美学重构：采用分层动效、精致卡片、现代排版
 */
export const UserFormModal: React.FC<UserFormModalProps> = ({
  open,
  userId,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const isEdit = !!userId;

  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const assignRoles = useAssignRoles();
  const assignMentor = useAssignMentor();
  const { data: userDetail } = useUserDetail(userId || 0);
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
        form.setFieldsValue({
          username: userDetail.username,
          employee_id: userDetail.employee_id,
          department_id: userDetail.department?.id,
          role_codes: currentRoleCodes,
          mentor_id: userDetail.mentor?.id || null,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          role_codes: [],
        });
      }
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
        await updateUser.mutateAsync({
          id: userId!,
          data: {
            username: values.username,
            employee_id: values.employee_id,
            department_id: values.department_id,
          },
        });

        if (values.role_codes !== undefined) {
          await assignRoles.mutateAsync({
            id: userId!,
            roles: values.role_codes,
          });
        }

        const currentMentorId = userDetail?.mentor?.id ?? null;
        const newMentorId = values.mentor_id ?? null;

        if (currentMentorId !== newMentorId) {
          await assignMentor.mutateAsync({
            id: userId!,
            mentorId: newMentorId,
          });
        }

        message.success('用户信息更新成功');
      } else {
        await createUser.mutateAsync({
          password: values.password!,
          employee_id: values.employee_id!,
          username: values.username,
          department_id: values.department_id,
          mentor_id: values.mentor_id || null,
        });

        message.success('用户创建成功');
      }
      onClose();
      form.resetFields();
      onSuccess?.();
    } catch (error) {
      showApiError(error, isEdit ? '更新失败' : '创建失败');
    }
  };

  const getAvatarText = (name?: string) => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  };

  const roleDescriptions: Record<string, string> = {
    ADMIN: '全平台治理与系统维护',
    DEPT_MANAGER: '本室资源调配与人员治理',
    MENTOR: '指导学员完成学习任务',
    TEAM_MANAGER: '团队日常治理与考核',
    STUDENT: '参与学习与技能提升',
  };

  const roleIcons: Record<string, React.ReactNode> = {
    ADMIN: <SafetyOutlined />,
    DEPT_MANAGER: <ApartmentOutlined />,
    MENTOR: <TeamOutlined />,
    TEAM_MANAGER: <TeamOutlined />,
    STUDENT: <UserOutlined />,
  };

  const getRoleColor = (code: string) => {
    const colors: Record<string, string> = {
      ADMIN: 'var(--color-error-500)',
      DEPT_MANAGER: 'var(--color-purple-500)',
      MENTOR: 'var(--color-warning-500)',
      TEAM_MANAGER: 'var(--color-cyan-500)',
      STUDENT: 'var(--color-primary-500)',
    };
    return colors[code] || 'var(--color-primary-500)';
  };

  const selectedRoleCodes = Form.useWatch('role_codes', form) || [];
  const selectedDepartmentId = Form.useWatch('department_id', form);
  const username = Form.useWatch('username', form) || userDetail?.username;

  return (
    <ConfigProvider
      theme={{
        components: {
          Modal: {
            contentBg: '#ffffff',
            headerBg: '#ffffff',
            paddingContentHorizontal: 0,
            paddingMD: 0,
          },
        },
      }}
    >
      <Modal
        open={open}
        onCancel={onClose}
        footer={null}
        width={720}
        centered
        closeIcon={<CloseOutlined style={{ color: 'var(--color-gray-400)' }} />}
        styles={{
          mask: {
            backdropFilter: 'blur(4px)',
            backgroundColor: 'rgba(0,0,0,0.4)',
          },
          content: {
            borderRadius: 'var(--radius-xl)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-xl)',
          },
        }}
      >
        <div className="animate-fadeIn">
          {/* Header Section */}
          <div
            style={{
              padding: '40px 40px 32px',
              background: 'linear-gradient(135deg, #f8faff 0%, #ffffff 100%)',
              borderBottom: '1px solid var(--color-gray-100)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Decoration */}
            <div
              style={{
                position: 'absolute',
                top: -20,
                right: -20,
                width: 140,
                height: 140,
                background: 'radial-gradient(circle, var(--color-primary-50) 0%, transparent 70%)',
                borderRadius: '50%',
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', position: 'relative', zIndex: 1 }}>
              <div style={{ position: 'relative' }}>
                <Avatar
                  size={80}
                  style={{
                    background: 'linear-gradient(135deg, var(--color-primary-400), var(--color-primary-600))',
                    fontSize: 32,
                    fontWeight: 700,
                    boxShadow: 'var(--shadow-glow-primary)',
                    border: '4px solid #fff',
                  }}
                >
                  {getAvatarText(username)}
                </Avatar>
                {isEdit && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      width: 24,
                      height: 24,
                      background: 'var(--color-success-500)',
                      borderRadius: '50%',
                      border: '3px solid #fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      color: '#fff',
                    }}
                  >
                    <CheckCircleFilled />
                  </div>
                )}
              </div>
              <div style={{ marginLeft: 24 }}>
                <Title level={2} style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>
                  {isEdit ? '编辑详细资料' : '创建新成员'}
                </Title>
                <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>
                    {isEdit ? (
                      <>
                        <IdcardOutlined style={{ marginRight: 4 }} />
                        {userDetail?.employee_id || 'ID LOADING...'}
                      </>
                    ) : (
                      '请完善下方基础信息以邀请新成员'
                    )}
                  </Text>
                  {isEdit && (
                    <span
                      style={{
                        padding: '2px 8px',
                        background: 'var(--color-primary-50)',
                        color: 'var(--color-primary-600)',
                        borderRadius: 'var(--radius-full)',
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      已激活
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            style={{ padding: '32px 40px 40px' }}
            requiredMark={false}
          >
            {/* 1. Basic Info */}
            <div className="animate-fadeInUp" style={{ marginBottom: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-primary-50)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-primary-500)',
                    marginRight: 12,
                  }}
                >
                  <UserOutlined />
                </div>
                <Title level={5} style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
                  核心身份信息
                </Title>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                <Form.Item
                  name="username"
                  label="真实姓名"
                  rules={[{ required: true, message: '请填写姓名' }]}
                >
                  <Input
                    placeholder="例如: 张三"
                    prefix={<UserOutlined style={{ color: 'var(--color-gray-400)' }} />}
                    size="large"
                    className="card-hover"
                    style={{ borderRadius: 'var(--radius-lg)' }}
                  />
                </Form.Item>
                <Form.Item
                  name="employee_id"
                  label="工号"
                  rules={[{ required: true, message: '请填写工号' }]}
                >
                  <Input
                    placeholder="例如: EMP888"
                    prefix={<IdcardOutlined style={{ color: 'var(--color-gray-400)' }} />}
                    size="large"
                    className="card-hover"
                    style={{ borderRadius: 'var(--radius-lg)' }}
                  />
                </Form.Item>
              </div>

              {!isEdit && (
                <Form.Item
                  name="password"
                  label="初始密码"
                  rules={[{ required: true, message: '请设置初始密码' }]}
                  className="animate-fadeInUp stagger-1"
                >
                  <Input.Password
                    placeholder="设置一个安全的初始密码"
                    prefix={<LockOutlined style={{ color: 'var(--color-gray-400)' }} />}
                    size="large"
                    style={{ borderRadius: 'var(--radius-lg)' }}
                  />
                </Form.Item>
              )}
            </div>

            {/* 2. Role Configuration */}
            <div className="animate-fadeInUp stagger-2" style={{ marginBottom: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-success-50)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-success-500)',
                    marginRight: 12,
                  }}
                >
                  <SafetyOutlined />
                </div>
                <Title level={5} style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
                  角色与权限分配
                </Title>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                {roles.map((role) => {
                  const isSelected = selectedRoleCodes.includes(role.code as RoleCode);
                  const roleColor = getRoleColor(role.code);

                  return (
                    <Card
                      key={role.code}
                      onClick={() => {
                        const currentCodes = form.getFieldValue('role_codes') || [];
                        if (isSelected) {
                          form.setFieldsValue({
                            role_codes: currentCodes.filter((c: RoleCode) => c !== role.code),
                          });
                        } else {
                          form.setFieldsValue({
                            role_codes: [...currentCodes, role.code as RoleCode],
                          });
                        }
                      }}
                      className="card-hover"
                      style={{
                        cursor: 'pointer',
                        border: '2px solid transparent',
                        borderColor: isSelected ? roleColor : 'var(--color-gray-100)',
                        backgroundColor: isSelected ? `${roleColor}08` : '#fff',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        borderRadius: 'var(--radius-lg)',
                        position: 'relative',
                        boxShadow: isSelected ? `0 8px 16px ${roleColor}15` : 'none',
                      }}
                      styles={{ body: { padding: '16px' } }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: '10px',
                            background: isSelected ? roleColor : 'var(--color-gray-50)',
                            color: isSelected ? '#fff' : 'var(--color-gray-500)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 20,
                            transition: 'all 0.3s',
                          }}
                        >
                          {roleIcons[role.code] || <UserOutlined />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 14, color: isSelected ? 'var(--color-gray-900)' : 'var(--color-gray-700)' }}>
                            {role.name}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--color-gray-400)', marginTop: 2 }}>
                            {roleDescriptions[role.code] || '基础操作权限'}
                          </div>
                        </div>
                        {isSelected && (
                          <CheckCircleFilled style={{ color: roleColor, fontSize: 18, animation: 'scaleIn 0.3s' }} />
                        )}
                      </div>
                    </Card>
                  );
                })}
                {/* Always Student (ReadOnly) */}
                <Card
                  style={{
                    border: '2px solid var(--color-primary-500)',
                    backgroundColor: 'var(--color-primary-50)',
                    borderRadius: 'var(--radius-lg)',
                    cursor: 'default',
                    opacity: 0.8,
                  }}
                  styles={{ body: { padding: '16px' } }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '10px',
                        background: 'var(--color-primary-500)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 20,
                      }}
                    >
                      <UserOutlined />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-gray-900)' }}>
                        学员
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-gray-500)', marginTop: 2 }}>
                        核心学习权限 (内置)
                      </div>
                    </div>
                    <CheckCircleFilled style={{ color: 'var(--color-primary-500)', fontSize: 18 }} />
                  </div>
                </Card>
              </div>
              <Form.Item name="role_codes" hidden>
                <Input />
              </Form.Item>
            </div>

            {/* 3. Organization & Mentorship */}
            <div className="animate-fadeInUp stagger-3" style={{ marginBottom: 40 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
                {/* Department */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--color-purple-50)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-purple-500)',
                        marginRight: 12,
                      }}
                    >
                      <ApartmentOutlined />
                    </div>
                    <Title level={5} style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
                      所属组织架构
                    </Title>
                  </div>
                  <Form.Item name="department_id" rules={[{ required: true, message: '请选择部门' }]}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {departments.map((dept) => {
                        const isSelected = selectedDepartmentId === dept.id;
                        return (
                          <div
                            key={dept.id}
                            onClick={() => form.setFieldsValue({ department_id: dept.id })}
                            style={{
                              padding: '8px 16px',
                              borderRadius: 'var(--radius-full)',
                              background: isSelected ? 'var(--color-primary-500)' : 'var(--color-gray-50)',
                              color: isSelected ? '#fff' : 'var(--color-gray-600)',
                              fontSize: 13,
                              fontWeight: isSelected ? 600 : 400,
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              border: '1px solid',
                              borderColor: isSelected ? 'var(--color-primary-500)' : 'var(--color-gray-100)',
                              boxShadow: isSelected ? '0 4px 10px rgba(77, 108, 255, 0.2)' : 'none',
                            }}
                            className="btn-press"
                          >
                            {dept.name}
                          </div>
                        );
                      })}
                    </div>
                  </Form.Item>
                </div>

                {/* Mentor */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--color-cyan-50)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-cyan-500)',
                        marginRight: 12,
                      }}
                    >
                      <TeamOutlined />
                    </div>
                    <Title level={5} style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
                      师徒关系绑定
                    </Title>
                  </div>
                  <Form.Item name="mentor_id">
                    <Select
                      placeholder="点击搜索并指定导师"
                      allowClear
                      showSearch
                      optionFilterProp="children"
                      size="large"
                      style={{ borderRadius: 'var(--radius-lg)' }}
                    >
                      {mentors
                        .filter((m) => !isEdit || m.id !== userId)
                        .map((mentor) => (
                          <Option key={mentor.id} value={mentor.id}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <Avatar
                                size="small"
                                style={{
                                  background: 'var(--color-cyan-500)',
                                  fontSize: 12,
                                  fontWeight: 600
                                }}
                              >
                                {getAvatarText(mentor.username)}
                              </Avatar>
                              <span>{mentor.username}</span>
                              <span style={{ color: 'var(--color-gray-400)', fontSize: 12 }}>({mentor.employee_id})</span>
                            </div>
                          </Option>
                        ))}
                    </Select>
                  </Form.Item>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div
              className="animate-fadeInUp stagger-4"
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 16,
                paddingTop: 32,
                borderTop: '1px solid var(--color-gray-100)'
              }}
            >
              <Button
                onClick={onClose}
                size="large"
                style={{
                  borderRadius: 'var(--radius-lg)',
                  padding: '0 32px',
                  fontWeight: 500,
                  color: 'var(--color-gray-500)',
                  border: 'none',
                  background: 'var(--color-gray-50)'
                }}
                className="btn-press"
              >
                取消
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                loading={createUser.isPending || updateUser.isPending || assignRoles.isPending || assignMentor.isPending}
                style={{
                  borderRadius: 'var(--radius-lg)',
                  padding: '0 48px',
                  fontWeight: 600,
                  boxShadow: 'var(--shadow-glow-primary)',
                  height: 48,
                  background: 'var(--color-primary-500)'
                }}
                className="btn-press"
              >
                {isEdit ? '保存更改' : '立即创建'}
              </Button>
            </div>
          </Form>
        </div>
      </Modal>
    </ConfigProvider>
  );
};


