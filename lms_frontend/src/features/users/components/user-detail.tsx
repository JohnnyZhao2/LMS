import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  Typography,
  Descriptions,
  Tag,
  Space,
  Modal,
  Form,
  Select,
  message,
  Spin,
  Divider,
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  UserSwitchOutlined,
  LockOutlined,
  TeamOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import { useUserDetail, useMentors, useRoles } from '../api/get-users';
import {
  useActivateUser,
  useDeactivateUser,
  useResetPassword,
  useAssignRoles,
  useAssignMentor,
} from '../api/manage-users';
import { UserFormModal } from './user-form-modal';
import type { RoleCode } from '@/types/api';
import dayjs from '@/lib/dayjs';

const { Title } = Typography;
const { Option } = Select;

/**
 * 用户详情组件
 */
export const UserDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: user, isLoading, refetch } = useUserDetail(Number(id || 0));
  const { data: mentors = [] } = useMentors();
  const { data: roles = [] } = useRoles();
  const activateUser = useActivateUser();
  const deactivateUser = useDeactivateUser();
  const resetPassword = useResetPassword();
  const assignRoles = useAssignRoles();
  const assignMentor = useAssignMentor();

  const [roleForm] = Form.useForm();
  const [mentorForm] = Form.useForm();
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [mentorModalVisible, setMentorModalVisible] = useState(false);

  // 过滤掉当前用户（不能指定自己为导师）
  const availableMentors = mentors.filter((m) => m.id !== Number(id));

  const handleToggleActive = async () => {
    if (!user) return;

    Modal.confirm({
      title: user.is_active ? '确认停用' : '确认启用',
      content: `确定要${user.is_active ? '停用' : '启用'}该用户吗？`,
      onOk: async () => {
        try {
          if (user.is_active) {
            await deactivateUser.mutateAsync(user.id);
            message.success('已停用');
          } else {
            await activateUser.mutateAsync(user.id);
            message.success('已启用');
          }
          refetch();
        } catch {
          message.error('操作失败');
        }
      },
    });
  };

  const handleResetPassword = () => {
    if (!user) return;

    Modal.confirm({
      title: '确认重置密码',
      content: '确定要重置该用户的密码吗？重置后会生成临时密码。',
      onOk: async () => {
        try {
          const result = await resetPassword.mutateAsync(user.id);
          Modal.success({
            title: '密码重置成功',
            content: `临时密码：${result.temporary_password}\n请通知用户使用临时密码登录并修改密码。`,
            width: 500,
          });
        } catch {
          message.error('重置失败');
        }
      },
    });
  };

  const handleAssignRoles = async (values: { role_codes: RoleCode[] }) => {
    if (!user) return;

    try {
      await assignRoles.mutateAsync({
        id: user.id,
        roles: values.role_codes,
      });
      message.success('角色分配成功');
      setRoleModalVisible(false);
      refetch();
    } catch {
      message.error('角色分配失败');
    }
  };

  const handleAssignMentor = async (values: { mentor_id: number | null }) => {
    if (!user) return;

    try {
      await assignMentor.mutateAsync({
        id: user.id,
        mentorId: values.mentor_id,
      });
      message.success(values.mentor_id ? '导师指定成功' : '已解除导师绑定');
      setMentorModalVisible(false);
      refetch();
    } catch {
      message.error('操作失败');
    }
  };


  if (isLoading) {
    return <Spin />;
  }

  if (!user) {
    return <div>用户不存在</div>;
  }

  // 获取当前用户已有的角色代码（排除学员角色）
  const currentRoleCodes = user.roles.filter((r) => r.code !== 'STUDENT').map((r) => r.code as RoleCode);
  
  // 判断是否是超级用户（is_superuser）
  const isSuperuser = user.is_superuser || false;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/users')}>
            返回
          </Button>
          <Title level={2} style={{ margin: 0 }}>
            用户详情
          </Title>
        </Space>
        <Space>
          <Button
            icon={<EditOutlined />}
            onClick={() => {
              setFormModalOpen(true);
            }}
          >
            编辑信息
          </Button>
          {!isSuperuser && (
            <Button icon={<UserSwitchOutlined />} onClick={handleToggleActive}>
              {user.is_active ? '停用' : '启用'}
            </Button>
          )}
          <Button icon={<LockOutlined />} onClick={handleResetPassword}>
            重置密码
          </Button>
        </Space>
      </div>

      <Card>
        <Descriptions title="基本信息" bordered column={2}>
          <Descriptions.Item label="工号">{user.employee_id}</Descriptions.Item>
          <Descriptions.Item label="姓名">{user.username}</Descriptions.Item>
          <Descriptions.Item label="部门">{user.department?.name || '-'}</Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={user.is_active ? 'green' : 'red'}>{user.is_active ? '启用' : '停用'}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="导师">
            {user.mentor ? `${user.mentor.username} (${user.mentor.employee_id})` : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {user.created_at ? dayjs(user.created_at).format('YYYY-MM-DD HH:mm:ss') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="更新时间">
            {user.updated_at ? dayjs(user.updated_at).format('YYYY-MM-DD HH:mm:ss') : '-'}
          </Descriptions.Item>
        </Descriptions>

        <Divider />

        <div style={{ marginBottom: 16 }}>
          <Space>
            <SafetyOutlined />
            <Title level={4} style={{ margin: 0 }}>
              角色管理
            </Title>
          </Space>
          <div style={{ marginTop: 8 }}>
            {user.roles.map((role) => (
              <Tag key={role.code} color={role.code === 'STUDENT' ? 'blue' : 'purple'}>
                {role.name}
              </Tag>
            ))}
            <Button
              type="link"
              size="small"
              onClick={() => {
                roleForm.setFieldsValue({ role_codes: currentRoleCodes });
                setRoleModalVisible(true);
              }}
            >
              分配角色
            </Button>
          </div>
        </div>

        <div>
          <Space>
            <TeamOutlined />
            <Title level={4} style={{ margin: 0 }}>
              导师管理
            </Title>
          </Space>
          <div style={{ marginTop: 8 }}>
            <Button
              type="link"
              size="small"
              onClick={() => {
                mentorForm.setFieldsValue({ mentor_id: user.mentor?.id || null });
                setMentorModalVisible(true);
              }}
            >
              {user.mentor ? '更换导师' : '指定导师'}
            </Button>
            {user.mentor && (
              <Button
                type="link"
                size="small"
                danger
                onClick={() => {
                  Modal.confirm({
                    title: '确认解除绑定',
                    content: '确定要解除该用户的导师绑定吗？',
                    onOk: async () => {
                      try {
                        await assignMentor.mutateAsync({
                          id: user.id,
                          mentorId: null,
                        });
                        message.success('已解除导师绑定');
                        refetch();
                      } catch {
                        message.error('操作失败');
                      }
                    },
                  });
                }}
              >
                解除绑定
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* 分配角色弹窗 */}
      <Modal
        title="分配角色"
        open={roleModalVisible}
        onCancel={() => setRoleModalVisible(false)}
        footer={null}
      >
        <Form form={roleForm} layout="vertical" onFinish={handleAssignRoles}>
          <Form.Item
            name="role_codes"
            label="角色"
            rules={[{ required: false, message: '请选择角色' }]}
          >
            <Select mode="multiple" placeholder="请选择角色（学员角色自动保留）">
              {roles.map((role) => (
                <Option key={role.code} value={role.code}>
                  {role.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={assignRoles.isPending}>
                确定
              </Button>
              <Button onClick={() => setRoleModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 指定导师弹窗 */}
      <Modal
        title="指定导师"
        open={mentorModalVisible}
        onCancel={() => setMentorModalVisible(false)}
        footer={null}
      >
        <Form form={mentorForm} layout="vertical" onFinish={handleAssignMentor}>
          <Form.Item name="mentor_id" label="导师">
            <Select placeholder="请选择导师（留空解除绑定）" allowClear showSearch optionFilterProp="children">
              {availableMentors.map((mentor) => (
                <Option key={mentor.id} value={mentor.id}>
                  {mentor.username} ({mentor.employee_id})
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={assignMentor.isPending}>
                确定
              </Button>
              <Button onClick={() => setMentorModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑用户信息弹窗 */}
      <UserFormModal
        open={formModalOpen}
        userId={user?.id}
        onClose={() => setFormModalOpen(false)}
        onSuccess={() => {
          refetch();
        }}
      />
    </div>
  );
};

