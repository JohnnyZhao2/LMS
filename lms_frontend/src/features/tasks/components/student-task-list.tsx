import { useState } from 'react';
import { Select, Row, Col, Empty, Spin, Typography } from 'antd';
import { FileTextOutlined, FilterOutlined } from '@ant-design/icons';
import { useStudentTasks } from '../api/get-tasks';
import { TaskCard } from './task-card';
import { PageHeader } from '@/components/ui';
import type { TaskStatus } from '@/types/api';

const { Text } = Typography;

/**
 * 学员任务列表组件
 * 使用卡片式布局展示任务
 */
export const StudentTaskList: React.FC = () => {
    const [status, setStatus] = useState<TaskStatus | undefined>();

    const { data, isLoading } = useStudentTasks({ status });
    const tasks = data?.results ?? [];
    const totalLabel = data?.count ?? 0;

    const statusOptions = [
        { value: 'IN_PROGRESS', label: '进行中' },
        { value: 'PENDING_EXAM', label: '待考试' },
        { value: 'COMPLETED', label: '已完成' },
        { value: 'OVERDUE', label: '已逾期' },
    ];

    return (
        <div>
            <PageHeader
                title="任务中心"
                subtitle="查看和管理学习任务、练习任务和考试任务"
                icon={<FileTextOutlined />}
            />

            {/* 筛选区 */}
            <div
                className="animate-fadeInUp"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-4)',
                    marginBottom: 'var(--spacing-6)',
                    padding: 'var(--spacing-4)',
                    background: 'var(--color-white)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-sm)',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-2)',
                        color: 'var(--color-gray-500)',
                    }}
                >
                    <FilterOutlined />
                    <Text type="secondary">筛选</Text>
                </div>
                <Select
                    style={{ width: 140 }}
                    placeholder="状态"
                    allowClear
                    onChange={(value) => setStatus(value)}
                    options={statusOptions}
                />
                {tasks && (
                    <Text
                        type="secondary"
                        style={{ marginLeft: 'auto', fontSize: 'var(--font-size-sm)' }}
                    >
                        共 {totalLabel} 个任务
                    </Text>
                )}
            </div>

            {/* 任务列表 */}
            <Spin spinning={isLoading}>
                {tasks && tasks.length > 0 ? (
                    <Row gutter={[24, 24]}>
                        {tasks.map((task, index) => (
                            <Col xs={24} sm={12} lg={8} key={task.id}>
                                <div
                                    className="animate-fadeInUp"
                                    style={{
                                        animationDelay: `${index * 50}ms`,
                                        animationFillMode: 'both',
                                    }}
                                >
                                    <TaskCard task={task} variant="student" />
                                </div>
                            </Col>
                        ))}
                    </Row>
                ) : (
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="暂无任务"
                        style={{ padding: 'var(--spacing-12) 0' }}
                    />
                )}
            </Spin>
        </div>
    );
};

export default StudentTaskList;
