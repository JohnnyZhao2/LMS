import { Card, Row, Col, List, Typography, Tag, Empty } from 'antd';
import { BookOutlined, FileTextOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useStudentDashboard } from '../api/student-dashboard';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/config/routes';
import dayjs from '@/lib/dayjs';

const { Title, Text } = Typography;

/**
 * 学员仪表盘组件
 */
export const StudentDashboard: React.FC = () => {
  const { data, isLoading } = useStudentDashboard();
  const navigate = useNavigate();

  return (
    <div>
      <Title level={2}>仪表盘</Title>
      <Row gutter={[16, 16]}>
        {/* 待办任务 */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <span>
                <FileTextOutlined style={{ marginRight: 8 }} />
                待办任务
              </span>
            }
            loading={isLoading}
          >
            {data?.pending_tasks && data.pending_tasks.length > 0 ? (
              <List
                dataSource={data.pending_tasks}
                renderItem={(task) => (
                  <List.Item
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`${ROUTES.TASKS}/${task.id}`)}
                  >
                    <List.Item.Meta
                      title={
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span>{task.title}</span>
                          <Tag color={task.task_type === 'EXAM' ? 'red' : task.task_type === 'PRACTICE' ? 'blue' : 'green'}>
                            {task.task_type_display}
                          </Tag>
                        </div>
                      }
                      description={
                        <div>
                          <ClockCircleOutlined style={{ marginRight: 4 }} />
                          <Text type="secondary">
                            截止时间: {dayjs(task.deadline).format('YYYY-MM-DD HH:mm')}
                          </Text>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="暂无待办任务" />
            )}
          </Card>
        </Col>

        {/* 最新知识 */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <span>
                <BookOutlined style={{ marginRight: 8 }} />
                最新知识
              </span>
            }
            loading={isLoading}
          >
            {data?.latest_knowledge && data.latest_knowledge.length > 0 ? (
              <List
                dataSource={data.latest_knowledge}
                renderItem={(knowledge) => (
                  <List.Item
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`${ROUTES.KNOWLEDGE}/${knowledge.id}`)}
                  >
                    <List.Item.Meta
                      title={knowledge.title}
                      description={
                        <div>
                          <Text type="secondary" ellipsis>
                            {knowledge.summary}
                          </Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {dayjs(knowledge.updated_at).format('YYYY-MM-DD HH:mm')}
                          </Text>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="暂无最新知识" />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

