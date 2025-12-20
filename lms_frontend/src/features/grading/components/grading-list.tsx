import { useState } from 'react';
import { Table, Card, Button, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { usePendingGrading } from '../api/get-pending-grading';
import type { GradingList as GradingListType } from '@/types/api';
import dayjs from '@/lib/dayjs';

const { Title } = Typography;

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
    },
    {
      title: '试卷',
      dataIndex: 'quiz_title',
      key: 'quiz_title',
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
      render: (text: string) => text ? dayjs(text).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: GradingListType) => (
        <Button type="link" onClick={() => navigate(`/grading/${record.submission}`)}>
          评分
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Title level={2}>评分中心</Title>
      <Card>
        <Table
          columns={columns}
          dataSource={data?.results || []}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: page,
            total: data?.count || 0,
            pageSize: 20,
            onChange: setPage,
          }}
        />
      </Card>
    </div>
  );
};


