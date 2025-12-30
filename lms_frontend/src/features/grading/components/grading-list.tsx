import { useState } from 'react';
import { Table, Button, Typography, Empty, Card } from 'antd';
import { EditOutlined, UserOutlined, FileTextOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { usePendingGrading } from '../api/get-pending-grading';
import { PageHeader, StatusBadge } from '@/components/ui';
import type { GradingList as GradingListType } from '@/types/api';
import dayjs from '@/lib/dayjs';

const { Text } = Typography;

/**
 * 待评分列表组件
 */
export const GradingList: React.FC = () => {
  const [page, setPage] = useState(1);
  const { data, isLoading } = usePendingGrading(page);
  const navigate = useNavigate();

  const columns = [
    {
      title: '学员',
      dataIndex: 'user_name',
      key: 'user_name',
      render: (text: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-full)',
              background: 'linear-gradient(135deg, var(--color-primary-400) 0%, var(--color-primary-600) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 600,
              fontSize: 'var(--font-size-sm)',
            }}
          >
            {text?.charAt(0) || <UserOutlined />}
          </div>
          <Text strong>{text}</Text>
        </div>
      ),
    },
    {
      title: '试卷',
      dataIndex: 'quiz_title',
      key: 'quiz_title',
      render: (text: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
          <FileTextOutlined style={{ color: 'var(--color-primary-500)' }} />
          <Text>{text}</Text>
        </div>
      ),
    },
    {
      title: '任务',
      dataIndex: 'task_title',
      key: 'task_title',
    },
    {
      title: '提交时间',
      dataIndex: 'submitted_at',
      key: 'submitted_at',
      render: (text: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', color: 'var(--color-gray-500)' }}>
          <ClockCircleOutlined style={{ fontSize: 12 }} />
          <span>{text ? dayjs(text).format('YYYY-MM-DD HH:mm') : '-'}</span>
        </div>
      ),
    },
    {
      title: '状态',
      key: 'status',
      render: () => (
        <StatusBadge status="pending" text="待评分" size="small" />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: unknown, record: GradingListType) => (
        <Button
          type="primary"
          icon={<EditOutlined />}
          onClick={() => navigate(`/grading/${record.submission}`)}
          style={{
            fontWeight: 600,
            borderRadius: 'var(--radius-md)',
          }}
        >
          评分
        </Button>
      ),
    },
  ];

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="评分中心"
        subtitle="查看待评分的答卷并进行评分"
        icon={<EditOutlined />}
      />

      <Card>
        {data?.results && data.results.length > 0 ? (
          <Table
            columns={columns}
            dataSource={data.results}
            rowKey="id"
            loading={isLoading}
            pagination={{
              current: page,
              total: data.count || 0,
              pageSize: 20,
              onChange: setPage,
              showSizeChanger: false,
              showTotal: (total) => `共 ${total} 份待评分`,
            }}
          />
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div style={{ textAlign: 'center' }}>
                <Text type="secondary">暂无待评分答卷</Text>
              </div>
            }
            style={{ padding: 'var(--spacing-12) 0' }}
          />
        )}
      </Card>
    </div>
  );
};
