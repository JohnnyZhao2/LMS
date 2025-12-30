import { useState } from 'react';
import { Table, Button, Typography, Empty, Rate, Card } from 'antd';
import { PlusOutlined, SearchOutlined, UserOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useSpotChecks } from '../api/get-spot-checks';
import { PageHeader } from '@/components/ui';
import dayjs from '@/lib/dayjs';

const { Text } = Typography;

/**
 * 抽查记录列表组件
 */
export const SpotCheckList: React.FC = () => {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useSpotChecks(page);
  const navigate = useNavigate();

  const columns = [
    {
      title: '被抽查学员',
      dataIndex: 'student_name',
      key: 'student_name',
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
      title: '抽查内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      render: (text: string) => (
        <Text ellipsis={{ tooltip: text }} style={{ maxWidth: 300 }}>
          {text}
        </Text>
      ),
    },
    {
      title: '评分',
      dataIndex: 'score',
      key: 'score',
      width: 150,
      render: (score: number) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
          <Rate disabled defaultValue={Math.round(score / 20)} style={{ fontSize: 14 }} />
          <Text strong style={{ color: score >= 80 ? 'var(--color-success-500)' : score >= 60 ? 'var(--color-warning-500)' : 'var(--color-error-500)' }}>
            {score}
          </Text>
        </div>
      ),
    },
    {
      title: '抽查人',
      dataIndex: 'checker_name',
      key: 'checker_name',
      render: (text: string) => (
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
            <UserOutlined />
          </div>
          <Text>{text}</Text>
        </div>
      ),
    },
    {
      title: '抽查时间',
      dataIndex: 'checked_at',
      key: 'checked_at',
      width: 180,
      render: (text: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', color: 'var(--color-gray-500)' }}>
          <ClockCircleOutlined style={{ fontSize: 12 }} />
          <span>{dayjs(text).format('YYYY-MM-DD HH:mm')}</span>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="抽查中心"
        subtitle="对学员进行知识抽查，记录和追踪抽查结果"
        icon={<SearchOutlined />}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/spot-checks/create')}
            style={{
              height: 44,
              paddingLeft: 'var(--spacing-5)',
              paddingRight: 'var(--spacing-5)',
              fontWeight: 600,
              borderRadius: 'var(--radius-lg)',
            }}
          >
            发起抽查
          </Button>
        }
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
              showTotal: (total) => `共 ${total} 条抽查记录`,
            }}
          />
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div style={{ textAlign: 'center' }}>
                <Text type="secondary">暂无抽查记录</Text>
                <div style={{ marginTop: 'var(--spacing-4)' }}>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => navigate('/spot-checks/create')}
                  >
                    发起第一次抽查
                  </Button>
                </div>
              </div>
            }
            style={{ padding: 'var(--spacing-12) 0' }}
          />
        )}
      </Card>
    </div>
  );
};
