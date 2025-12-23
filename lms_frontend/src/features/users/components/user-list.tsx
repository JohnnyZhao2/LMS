import { useState } from 'react';
import { Table, Button, Typography, Modal, message, Space, Tag, Input } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  UserSwitchOutlined,
  LockOutlined,
  SearchOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useUsers } from '../api/get-users';
import { useActivateUser, useDeactivateUser, useResetPassword } from '../api/manage-users';
import { UserFormModal } from './user-form-modal';
import { Card, PageHeader, StatusBadge } from '@/components/ui';
import type { UserList as UserListType, Role } from '@/types/api';
import { showApiError } from '@/utils/error-handler';
import dayjs from '@/lib/dayjs';

const { Text } = Typography;
const { Search } = Input;

/**
 * 用户列表组件
 */
export const UserList: React.FC = () => {
  const [search, setSearch] = useState('');
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | undefined>();
  const { data, isLoading, refetch } = useUsers({ search });
  const activateUser = useActivateUser();
  const deactivateUser = useDeactivateUser();
  const resetPassword = useResetPassword();
  const navigate = useNavigate();

  const handleToggleActive = async (user: UserListType) => {
    try {
      if (user.is_active) {
        await deactivateUser.mutateAsync(user.id);
        message.success('已停用');
      } else {
        await activateUser.mutateAsync(user.id);
        message.success('已启用');
      }
    } catch (error) {
      showApiError(error, '操作失败');
    }
  };

  const handleResetPassword = (id: number) => {
    Modal.confirm({
      title: '确认重置密码',
      content: '确定要重置该用户的密码吗？重置后会生成临时密码。',
      okText: '确定重置',
      cancelText: '取消',
      onOk: async () => {
        try {
          const result = await resetPassword.mutateAsync(id);
          Modal.success({
            title: '密码重置成功',
            content: (
              <div>
                <p>临时密码：<Text code copyable>{result.temporary_password}</Text></p>
                <p style={{ marginTop: 'var(--spacing-2)', color: 'var(--color-gray-600)' }}>
                  请通知用户使用临时密码登录并修改密码。
                </p>
              </div>
            ),
            width: 500,
          });
        } catch (error) {
          showApiError(error, '重置失败');
        }
      },
    });
  };

  const columns = [
    {
      title: '用户信息',
      key: 'basic_info',
      render: (_: unknown, record: UserListType) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 'var(--radius-full)',
              background: 'linear-gradient(135deg, var(--color-primary-400) 0%, var(--color-primary-600) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 600,
              fontSize: 'var(--font-size-base)',
            }}
          >
            {record.username?.charAt(0) || '?'}
          </div>
          <div>
            <Text strong style={{ display: 'block' }}>{record.username}</Text>
            <Text type="secondary" style={{ fontSize: 'var(--font-size-xs)' }}>{record.employee_id}</Text>
          </div>
        </div>
      ),
    },
    {
      title: '角色',
      key: 'roles',
      render: (_: unknown, record: UserListType) => (
        <Space size={[4, 4]} wrap>
          {record.roles.map((role: Role) => (
            <Tag
              key={role.code}
              style={{
                margin: 0,
                borderRadius: 'var(--radius-full)',
                background: 'var(--color-primary-50)',
                color: 'var(--color-primary-600)',
                border: 'none',
              }}
            >
              {role.name}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '部门',
      key: 'department',
      render: (_: unknown, record: UserListType) => (
        <Text type={record.department ? 'default' : 'secondary'}>
          {record.department?.name || '-'}
        </Text>
      ),
    },
    {
      title: '导师',
      key: 'mentor',
      render: (_: unknown, record: UserListType) => {
        if (record.mentor) {
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--color-success-50)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-success-500)',
                  fontSize: 12,
                }}
              >
                <TeamOutlined />
              </div>
              <Text>{record.mentor.username}</Text>
            </div>
          );
        }
        return <Text type="secondary">-</Text>;
      },
    },
    {
      title: '状态',
      key: 'is_active',
      width: 100,
      render: (_: unknown, record: UserListType) => (
        <StatusBadge
          status={record.is_active ? 'success' : 'default'}
          text={record.is_active ? '已启用' : '已停用'}
          size="small"
          showIcon={false}
        />
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (text: string) => (
        <Text type="secondary" style={{ fontSize: 'var(--font-size-sm)' }}>
          {text ? dayjs(text).format('YYYY-MM-DD') : '-'}
        </Text>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: unknown, record: UserListType) => {
        const isSuperuser = record.is_superuser || false;
        
        return (
          <Space size={4} onClick={(e) => e.stopPropagation()}>
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setEditingUserId(record.id);
                setFormModalOpen(true);
              }}
            >
              编辑
            </Button>
            {!isSuperuser && (
              <Button
                type="text"
                size="small"
                icon={record.is_active ? <StopOutlined /> : <CheckCircleOutlined />}
                onClick={() => handleToggleActive(record)}
                danger={record.is_active}
              >
                {record.is_active ? '停用' : '启用'}
              </Button>
            )}
            <Button
              type="text"
              size="small"
              icon={<LockOutlined />}
              onClick={() => handleResetPassword(record.id)}
            >
              重置
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="用户管理"
        subtitle="管理系统用户账号、角色权限及组织归属"
        icon={<TeamOutlined />}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingUserId(undefined);
              setFormModalOpen(true);
            }}
            style={{
              height: 44,
              paddingLeft: 'var(--spacing-5)',
              paddingRight: 'var(--spacing-5)',
              fontWeight: 600,
              borderRadius: 'var(--radius-lg)',
            }}
          >
            新建用户
          </Button>
        }
      />

      <Card>
        {/* 搜索栏 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 'var(--spacing-5)',
          }}
        >
          <Search
            placeholder="搜索姓名或工号..."
            allowClear
            onSearch={setSearch}
            prefix={<SearchOutlined style={{ color: 'var(--color-gray-400)' }} />}
            style={{ width: 320 }}
          />
          {data && (
            <Text type="secondary" style={{ fontSize: 'var(--font-size-sm)' }}>
              共 {data.length} 个用户
            </Text>
          )}
        </div>

        <Table
          columns={columns}
          dataSource={data || []}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 1000 }}
          onRow={(record) => ({
            onClick: () => {
              setEditingUserId(record.id);
              setFormModalOpen(true);
            },
            style: { cursor: 'pointer' },
          })}
        />
      </Card>

      <UserFormModal
        open={formModalOpen}
        userId={editingUserId}
        onClose={() => {
          setFormModalOpen(false);
          setEditingUserId(undefined);
        }}
        onSuccess={() => {
          refetch();
        }}
      />
    </div>
  );
};
