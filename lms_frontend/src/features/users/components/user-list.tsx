import { useState } from 'react';
import { Table, Card, Button, Typography, Modal, message, Space, Tag, Input } from 'antd';
import { PlusOutlined, EditOutlined, UserSwitchOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useUsers } from '../api/get-users';
import { useActivateUser, useDeactivateUser, useResetPassword } from '../api/manage-users';
import { UserFormModal } from './user-form-modal';
import type { UserList as UserListType, Role } from '@/types/api';
import { showApiError } from '@/utils/error-handler';
import dayjs from '@/lib/dayjs';

const { Title } = Typography;
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
      onOk: async () => {
        try {
          const result = await resetPassword.mutateAsync(id);
          Modal.success({
            title: '密码重置成功',
            content: `临时密码：${result.temporary_password}\n请通知用户使用临时密码登录并修改密码。`,
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
      title: '基础信息/工号',
      key: 'basic_info',
      render: (_: unknown, record: UserListType) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              backgroundColor: '#1890ff',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: 14,
            }}
          >
            {record.username?.charAt(0) || '?'}
          </div>
          <div>
            <div style={{ fontWeight: 500 }}>{record.username}</div>
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>{record.employee_id}</div>
          </div>
        </div>
      ),
    },
    {
      title: '权限角色',
      key: 'roles',
      render: (_: unknown, record: UserListType) => (
        <>
          {record.roles.map((role: Role) => (
            <Tag key={role.code}>{role.name}</Tag>
          ))}
        </>
      ),
    },
    {
      title: '组织归属',
      key: 'department',
      render: (_: unknown, record: UserListType) => record.department?.name || '-',
    },
    {
      title: '导师绑定',
      key: 'mentor',
      render: (_: unknown, record: UserListType) => {
        if (record.mentor) {
          return (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 12 }}>◎</span>
              <span>{record.mentor.username}</span>
            </span>
          );
        }
        return '-';
      },
    },
    {
      title: '状态控制',
      key: 'is_active',
      render: (_: unknown, record: UserListType) => {
        // 超级用户（is_superuser）不能停用
        if (record.is_superuser) {
          return (
            <Button
              type="primary"
              size="small"
              disabled
              style={{
                backgroundColor: '#52c41a',
                borderColor: '#52c41a',
                color: '#fff',
                cursor: 'not-allowed',
              }}
            >
              已启用
            </Button>
          );
        }
        
        return (
          <Button
            type={record.is_active ? 'primary' : 'default'}
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleActive(record);
            }}
            style={{
              backgroundColor: record.is_active ? '#52c41a' : undefined,
              borderColor: record.is_active ? '#52c41a' : undefined,
              color: record.is_active ? '#fff' : undefined,
            }}
          >
            {record.is_active ? '已启用' : '已停用'}
          </Button>
        );
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => text ? dayjs(text).format('YYYY-MM-DD') : '-',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: UserListType) => {
        // 超级用户（is_superuser）不能停用
        const isSuperuser = record.is_superuser || false;
        
        return (
          <Space onClick={(e) => e.stopPropagation()}>
            <Button
              type="link"
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
                type="link"
                icon={<UserSwitchOutlined />}
                onClick={() => handleToggleActive(record)}
              >
                {record.is_active ? '停用' : '启用'}
              </Button>
            )}
            <Button
              type="link"
              icon={<LockOutlined />}
              onClick={() => handleResetPassword(record.id)}
            >
              重置密码
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>身份与用户治理</Title>
          <Typography.Text type="secondary" style={{ fontSize: 14 }}>
            统一管控全员账号、权限等级及组织归属,支持内联式快捷操作。
          </Typography.Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingUserId(undefined);
            setFormModalOpen(true);
          }}
        >
          新建用户
        </Button>
      </div>
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <Search
            placeholder="搜索姓名或工号..."
            allowClear
            onSearch={setSearch}
            style={{ width: 300 }}
          />
        </div>
        <Table
          columns={columns}
          dataSource={data || []}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 1200 }}
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


