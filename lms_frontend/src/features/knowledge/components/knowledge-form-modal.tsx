import { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, Space, Button, message, Spin, Tabs, Divider } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useKnowledgeDetail } from '../api/get-admin-knowledge';
import { useLineTypeTags, useSystemTags, useOperationTags } from '../api/get-tags';
import { useCreateKnowledge, useUpdateKnowledge, usePublishKnowledge } from '../api/manage-knowledge';
import { showApiError } from '@/utils/error-handler';
import type { KnowledgeType, KnowledgeCreateRequest, KnowledgeUpdateRequest, Tag } from '@/types/api';

const { TextArea } = Input;
const { Option } = Select;

/**
 * 知识类型选项
 */
const KNOWLEDGE_TYPE_OPTIONS = [
  { value: 'EMERGENCY', label: '应急类' },
  { value: 'OTHER', label: '标准类' },
];

interface KnowledgeFormModalProps {
  /** 是否打开 */
  open: boolean;
  /** 知识ID（编辑模式时传入） */
  knowledgeId?: number;
  /** 默认知识类型（新建时使用） */
  defaultKnowledgeType?: KnowledgeType;
  /** 关闭回调 */
  onClose: () => void;
  /** 成功回调 */
  onSuccess?: () => void;
}

/**
 * 知识文档表单弹窗
 * 支持创建和编辑两种模式
 */
export const KnowledgeFormModal: React.FC<KnowledgeFormModalProps> = ({
  open,
  knowledgeId,
  defaultKnowledgeType = 'OTHER',
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const isEdit = !!knowledgeId;

  // 表单状态
  const [knowledgeType, setKnowledgeType] = useState<KnowledgeType>('OTHER');
  const [systemTagInput, setSystemTagInput] = useState('');
  const [operationTagInput, setOperationTagInput] = useState('');

  // API Hooks - 列出所有标签
  const { data: knowledgeDetail, isLoading: detailLoading } = useKnowledgeDetail(knowledgeId || 0);
  const { data: lineTypeTags = [] } = useLineTypeTags();
  const { data: systemTags = [] } = useSystemTags();
  const { data: operationTags = [] } = useOperationTags();
  const createKnowledge = useCreateKnowledge();
  const updateKnowledge = useUpdateKnowledge();
  const publishKnowledge = usePublishKnowledge();

  /**
   * 编辑模式下填充表单
   */
  useEffect(() => {
    if (isEdit && knowledgeDetail && open) {
      const formValues = {
        title: knowledgeDetail.title,
        knowledge_type: knowledgeDetail.knowledge_type,
        line_type_id: knowledgeDetail.line_type?.id,
        fault_scenario: knowledgeDetail.fault_scenario,
        trigger_process: knowledgeDetail.trigger_process,
        solution: knowledgeDetail.solution,
        verification_plan: knowledgeDetail.verification_plan,
        recovery_plan: knowledgeDetail.recovery_plan,
        content: knowledgeDetail.content,
        system_tag_names: knowledgeDetail.system_tags?.map(t => t.name) || [],
        operation_tag_names: knowledgeDetail.operation_tags?.map(t => t.name) || [],
      };
      form.setFieldsValue(formValues);
      setKnowledgeType(knowledgeDetail.knowledge_type);
    }
  }, [isEdit, knowledgeDetail, form, open]);

  /**
   * 新建模式下重置表单
   */
  useEffect(() => {
    if (!isEdit && open) {
      form.resetFields();
      setKnowledgeType(defaultKnowledgeType);
      // 设置默认条线类型（其他）
      const defaultLineType = lineTypeTags.find(t => t.name === '其他');
      form.setFieldsValue({
        knowledge_type: defaultKnowledgeType,
        line_type_id: defaultLineType?.id,
        system_tag_names: [],
        operation_tag_names: [],
      });
    }
  }, [isEdit, open, form, lineTypeTags, defaultKnowledgeType]);

  /**
   * 处理知识类型变化
   */
  const handleKnowledgeTypeChange = (value: KnowledgeType) => {
    setKnowledgeType(value);
  };

  /**
   * 添加自定义系统标签
   */
  const handleAddSystemTag = () => {
    if (!systemTagInput.trim()) return;
    const currentTags = form.getFieldValue('system_tag_names') || [];
    if (!currentTags.includes(systemTagInput.trim())) {
      form.setFieldsValue({ system_tag_names: [...currentTags, systemTagInput.trim()] });
    }
    setSystemTagInput('');
  };

  /**
   * 添加自定义操作标签
   */
  const handleAddOperationTag = () => {
    if (!operationTagInput.trim()) return;
    const currentTags = form.getFieldValue('operation_tag_names') || [];
    if (!currentTags.includes(operationTagInput.trim())) {
      form.setFieldsValue({ operation_tag_names: [...currentTags, operationTagInput.trim()] });
    }
    setOperationTagInput('');
  };

  /**
   * 提交表单（保存为草稿）
   */
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      // 构建请求数据
      const requestData: KnowledgeCreateRequest | KnowledgeUpdateRequest = {
        title: values.title,
        knowledge_type: values.knowledge_type,
        line_type_id: values.line_type_id,
        system_tag_names: values.system_tag_names || [],
        operation_tag_names: values.operation_tag_names || [],
      };

      if (values.knowledge_type === 'EMERGENCY') {
        // 应急类：添加结构化字段
        requestData.fault_scenario = values.fault_scenario || '';
        requestData.trigger_process = values.trigger_process || '';
        requestData.solution = values.solution || '';
        requestData.verification_plan = values.verification_plan || '';
        requestData.recovery_plan = values.recovery_plan || '';
        // 清空正文内容
        requestData.content = '';
      } else {
        // 其他类型：添加正文内容
        requestData.content = values.content || '';
        // 清空结构化字段
        requestData.fault_scenario = '';
        requestData.trigger_process = '';
        requestData.solution = '';
        requestData.verification_plan = '';
        requestData.recovery_plan = '';
      }

      if (isEdit && knowledgeId) {
        await updateKnowledge.mutateAsync({ id: knowledgeId, data: requestData });
        message.success('保存成功（已保存为草稿）');
      } else {
        await createKnowledge.mutateAsync(requestData as KnowledgeCreateRequest);
        message.success('创建成功（已保存为草稿）');
      }

      onSuccess?.();
      onClose();
    } catch (error) {
      if (error && typeof error === 'object' && 'errorFields' in error) {
        // 表单验证错误，不需要处理
        return;
      }
      showApiError(error, isEdit ? '保存失败' : '创建失败');
    }
  };

  /**
   * 保存并发布
   */
  const handleSubmitAndPublish = async () => {
    try {
      const values = await form.validateFields();
      
      // 构建请求数据
      const requestData: KnowledgeCreateRequest | KnowledgeUpdateRequest = {
        title: values.title,
        knowledge_type: values.knowledge_type,
        line_type_id: values.line_type_id,
        system_tag_names: values.system_tag_names || [],
        operation_tag_names: values.operation_tag_names || [],
      };

      if (values.knowledge_type === 'EMERGENCY') {
        // 应急类：添加结构化字段
        requestData.fault_scenario = values.fault_scenario || '';
        requestData.trigger_process = values.trigger_process || '';
        requestData.solution = values.solution || '';
        requestData.verification_plan = values.verification_plan || '';
        requestData.recovery_plan = values.recovery_plan || '';
        // 清空正文内容
        requestData.content = '';
      } else {
        // 其他类型：添加正文内容
        requestData.content = values.content || '';
        // 清空结构化字段
        requestData.fault_scenario = '';
        requestData.trigger_process = '';
        requestData.solution = '';
        requestData.verification_plan = '';
        requestData.recovery_plan = '';
      }

      let savedKnowledgeId: number;
      if (isEdit && knowledgeId) {
        const result = await updateKnowledge.mutateAsync({ id: knowledgeId, data: requestData });
        savedKnowledgeId = result.id;
      } else {
        const result = await createKnowledge.mutateAsync(requestData as KnowledgeCreateRequest);
        savedKnowledgeId = result.id;
      }

      // 发布知识
      await publishKnowledge.mutateAsync(savedKnowledgeId);
      message.success('保存并发布成功');

      onSuccess?.();
      onClose();
    } catch (error) {
      if (error && typeof error === 'object' && 'errorFields' in error) {
        // 表单验证错误，不需要处理
        return;
      }
      showApiError(error, '保存并发布失败');
    }
  };

  /**
   * 渲染应急类知识表单
   */
  const renderEmergencyForm = () => (
    <Tabs
      defaultActiveKey="fault"
      items={[
        {
          key: 'fault',
          label: '故障场景',
          children: (
            <Form.Item
              name="fault_scenario"
              rules={[
                {
                  validator: async (_, value) => {
                    if (knowledgeType !== 'EMERGENCY') return;
                    const hasAnyContent = value ||
                      form.getFieldValue('trigger_process') ||
                      form.getFieldValue('solution') ||
                      form.getFieldValue('verification_plan') ||
                      form.getFieldValue('recovery_plan');
                    if (!hasAnyContent) {
                      throw new Error('至少需要填写一个结构化字段');
                    }
                  },
                },
              ]}
            >
              <TextArea
                rows={8}
                placeholder="描述故障发生的场景和现象..."
                showCount
                maxLength={5000}
              />
            </Form.Item>
          ),
        },
        {
          key: 'trigger',
          label: '触发流程',
          children: (
            <Form.Item name="trigger_process">
              <TextArea
                rows={8}
                placeholder="描述故障的触发条件和流程..."
                showCount
                maxLength={5000}
              />
            </Form.Item>
          ),
        },
        {
          key: 'solution',
          label: '解决方案',
          children: (
            <Form.Item name="solution">
              <TextArea
                rows={8}
                placeholder="描述故障的解决方案和操作步骤..."
                showCount
                maxLength={5000}
              />
            </Form.Item>
          ),
        },
        {
          key: 'verification',
          label: '验证方案',
          children: (
            <Form.Item name="verification_plan">
              <TextArea
                rows={8}
                placeholder="描述如何验证故障已被解决..."
                showCount
                maxLength={5000}
              />
            </Form.Item>
          ),
        },
        {
          key: 'recovery',
          label: '恢复方案',
          children: (
            <Form.Item name="recovery_plan">
              <TextArea
                rows={8}
                placeholder="描述系统恢复后的操作和注意事项..."
                showCount
                maxLength={5000}
              />
            </Form.Item>
          ),
        },
      ]}
    />
  );

  /**
   * 渲染其他类型知识表单
   */
  const renderOtherForm = () => (
    <Form.Item
      name="content"
      label="正文内容"
      rules={[
        {
          required: knowledgeType === 'OTHER',
          message: '请填写正文内容',
        },
      ]}
    >
      <TextArea
        rows={12}
        placeholder="支持 Markdown 格式..."
        showCount
        maxLength={50000}
      />
    </Form.Item>
  );

  const isSubmitting = createKnowledge.isPending || updateKnowledge.isPending || publishKnowledge.isPending;

  return (
    <Modal
      title={isEdit ? '编辑知识文档' : '新建知识文档'}
      open={open}
      onCancel={onClose}
      width={900}
      footer={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button
          key="submit"
          loading={isSubmitting}
          onClick={handleSubmit}
        >
          {isEdit ? '保存' : '创建'}
        </Button>,
        <Button
          key="submitAndPublish"
          type="primary"
          loading={isSubmitting}
          onClick={handleSubmitAndPublish}
        >
          {isEdit ? '保存并发布' : '创建并发布'}
        </Button>,
      ]}
      destroyOnClose
    >
      <Spin spinning={isEdit && detailLoading}>
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            knowledge_type: 'OTHER',
            system_tag_names: [],
            operation_tag_names: [],
          }}
        >
          {/* 基础信息 */}
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="请输入知识文档标题" maxLength={200} showCount />
          </Form.Item>

          <Space size={16} style={{ display: 'flex', width: '100%' }}>
            <Form.Item
              name="knowledge_type"
              label="知识类型"
              rules={[{ required: true, message: '请选择知识类型' }]}
              style={{ flex: 1 }}
            >
              <Select
                placeholder="选择知识类型"
                onChange={handleKnowledgeTypeChange}
              >
                {KNOWLEDGE_TYPE_OPTIONS.map((opt) => (
                  <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="line_type_id"
              label="条线类型"
              rules={[{ required: true, message: '请选择条线类型' }]}
              style={{ flex: 1 }}
            >
              <Select placeholder="选择条线类型">
                {lineTypeTags.map((tag: Tag) => (
                  <Option key={tag.id} value={tag.id}>{tag.name}</Option>
                ))}
              </Select>
            </Form.Item>
          </Space>

          {/* 标签 */}
          <Space size={16} style={{ display: 'flex', width: '100%' }}>
            <Form.Item
              name="system_tag_names"
              label="系统标签"
              style={{ flex: 1 }}
              tooltip="选择或输入该知识相关的系统标签（如：手机银行、数字人民币等）"
            >
              <Select
                mode="tags"
                placeholder="选择或输入系统标签"
                allowClear
                dropdownRender={(menu) => (
                  <>
                    {menu}
                    <Divider style={{ margin: '8px 0' }} />
                    <Space style={{ padding: '0 8px 8px' }}>
                      <Input
                        placeholder="新建标签"
                        value={systemTagInput}
                        onChange={(e) => setSystemTagInput(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        style={{ width: 150 }}
                      />
                      <Button type="text" icon={<PlusOutlined />} onClick={handleAddSystemTag}>
                        添加
                      </Button>
                    </Space>
                  </>
                )}
              >
                {systemTags.map((tag: Tag) => (
                  <Option key={tag.name} value={tag.name}>
                    {tag.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="operation_tag_names"
              label="操作标签"
              style={{ flex: 1 }}
              tooltip="选择或输入该知识相关的操作类型（如：重启、隔离、扩容等）"
            >
              <Select
                mode="tags"
                placeholder="选择或输入操作标签"
                allowClear
                dropdownRender={(menu) => (
                  <>
                    {menu}
                    <Divider style={{ margin: '8px 0' }} />
                    <Space style={{ padding: '0 8px 8px' }}>
                      <Input
                        placeholder="新建标签"
                        value={operationTagInput}
                        onChange={(e) => setOperationTagInput(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        style={{ width: 150 }}
                      />
                      <Button type="text" icon={<PlusOutlined />} onClick={handleAddOperationTag}>
                        添加
                      </Button>
                    </Space>
                  </>
                )}
              >
                {operationTags.map((tag: Tag) => (
                  <Option key={tag.name} value={tag.name}>
                    {tag.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Space>

          <Divider />

          {/* 内容区域 */}
          {knowledgeType === 'EMERGENCY' ? renderEmergencyForm() : renderOtherForm()}
        </Form>
      </Spin>
    </Modal>
  );
};
