import { useState } from 'react';
import { Table, Card, Button, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useSpotChecks } from '../api/get-spot-checks';
// SpotCheck type for reference
import dayjs from '@/lib/dayjs';

const { Title } = Typography;

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
    },
    {
      title: '抽查内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
    },
    {
      title: '评分',
      dataIndex: 'score',
      key: 'score',
    },
    {
      title: '抽查人',
      dataIndex: 'checker_name',
      key: 'checker_name',
    },
    {
      title: '抽查时间',
      dataIndex: 'checked_at',
      key: 'checked_at',
      render: (text: string) => dayjs(text).format('YYYY-MM-DD HH:mm'),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>抽查中心</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/spot-checks/create')}>
          发起抽查
        </Button>
      </div>
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

