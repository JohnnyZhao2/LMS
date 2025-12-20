import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Typography, Tag, Spin, List, Descriptions, message } from 'antd';
import { CheckCircleOutlined, PlayCircleOutlined, BookOutlined, FileTextOutlined } from '@ant-design/icons';
import { useStudentTaskDetail } from '../api/get-task-detail';
import { useCompleteLearning } from '../api/complete-learning';
import dayjs from '@/lib/dayjs';

const { Title, Text } = Typography;

/**
 * 任务详情组件
 */
export const TaskDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useStudentTaskDetail(Number(id));
  const completeLearning = useCompleteLearning();

  if (isLoading) {
    return <Spin />;
  }

  if (!data) {
    return <div>任务不存在</div>;
  }

  const handleCompleteLearning = async () => {
    const assignment = data.assignments.find((a) => a.status === 'IN_PROGRESS');
    if (assignment) {
      try {
        await completeLearning.mutateAsync(assignment.id);
        message.success('学习任务已完成');
      } catch (error) {
        message.error('操作失败');
      }
    }
  };

  const handleStartQuiz = (quizId: number) => {
    const assignment = data.assignments.find((a) => a.status === 'IN_PROGRESS');
    if (assignment) {
      navigate(`/quiz/${quizId}?assignment=${assignment.id}`);
    }
  };

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Tag color={data.task_type === 'EXAM' ? 'red' : data.task_type === 'PRACTICE' ? 'blue' : 'green'}>
            {data.task_type_display}
          </Tag>
        </div>
        <Title level={2}>{data.title}</Title>
        <Descriptions column={2}>
          <Descriptions.Item label="创建人">{data.created_by_name}</Descriptions.Item>
          <Descriptions.Item label="截止时间">{dayjs(data.deadline).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
          {data.task_type === 'EXAM' && data.start_time && (
            <>
              <Descriptions.Item label="考试开始时间">{dayjs(data.start_time).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
              <Descriptions.Item label="考试时长">{data.duration} 分钟</Descriptions.Item>
            </>
          )}
        </Descriptions>
        {data.description && (
          <Text type="secondary" style={{ display: 'block', marginTop: 16 }}>
            {data.description}
          </Text>
        )}
      </Card>

      {/* 学习任务 - 知识列表 */}
      {data.task_type === 'LEARNING' && data.knowledge_items.length > 0 && (
        <Card title="学习内容" style={{ marginTop: 16 }}>
          <List
            dataSource={data.knowledge_items}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Button
                    type="link"
                    icon={<BookOutlined />}
                    onClick={() => navigate(`/knowledge/${item.knowledge}`)}
                  >
                    查看
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  title={item.knowledge_title}
                  description={item.knowledge_type}
                />
              </List.Item>
            )}
          />
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={handleCompleteLearning}
            loading={completeLearning.isPending}
            style={{ marginTop: 16 }}
          >
            我已学习掌握
          </Button>
        </Card>
      )}

      {/* 练习/考试任务 - 试卷列表 */}
      {(data.task_type === 'PRACTICE' || data.task_type === 'EXAM') && data.quizzes.length > 0 && (
        <Card title="试卷" style={{ marginTop: 16 }}>
          <List
            dataSource={data.quizzes}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Button
                    type="primary"
                    icon={<PlayCircleOutlined />}
                    onClick={() => handleStartQuiz(item.quiz)}
                  >
                    {data.task_type === 'EXAM' ? '开始考试' : '开始练习'}
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  avatar={<FileTextOutlined style={{ fontSize: 24 }} />}
                  title={item.quiz_title}
                />
              </List.Item>
            )}
          />
        </Card>
      )}
    </div>
  );
};


