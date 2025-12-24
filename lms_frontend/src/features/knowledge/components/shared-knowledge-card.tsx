import { useMemo } from 'react';
import { Dropdown } from 'antd';
import {
  MoreOutlined,
  EditOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import type { KnowledgeListItem, SimpleTag } from '@/types/api';
import dayjs from '@/lib/dayjs';
import styles from './knowledge-library.module.css';

/**
 * 知识卡片 Props
 */
export interface SharedKnowledgeCardProps {
  /** 知识项数据 */
  item: KnowledgeListItem;
  /** 点击查看回调 */
  onView: (id: number) => void;
  /** 是否显示管理操作（编辑、发布等） */
  showActions?: boolean;
  /** 是否显示状态徽章 */
  showStatus?: boolean;
  /** 编辑回调（管理端） */
  onEdit?: (id: number) => void;
  /** 发布回调（管理端） */
  onPublish?: (id: number) => Promise<void>;
  /** 取消发布回调（管理端） */
  onUnpublish?: (id: number) => Promise<void>;
  /** 卡片变体：admin 显示完整功能，student 隐藏管理功能 */
  variant?: 'admin' | 'student';
}

/**
 * 共用知识卡片组件
 * 管理端和学员端使用相同的布局风格
 * 区别：学员端不显示状态徽章和操作菜单
 */
export const SharedKnowledgeCard: React.FC<SharedKnowledgeCardProps> = ({
  item,
  onView,
  showActions,
  showStatus,
  onEdit,
  onPublish,
  onUnpublish,
  variant = 'admin',
}) => {
  // 根据 variant 设置默认值
  const shouldShowActions = showActions ?? (variant === 'admin');
  const shouldShowStatus = showStatus ?? (variant === 'admin');

  const isEmergency = item.knowledge_type === 'EMERGENCY';
  const isPublished = item.status === 'PUBLISHED';
  const isRevising = item.edit_status === 'REVISING';
  const isDraft = item.status === 'DRAFT';

  /**
   * 获取状态样式类和文本
   */
  const getStatusInfo = () => {
    if (isRevising) {
      return { className: styles.statusRevising, text: '修订中' };
    }
    if (isPublished) {
      return { className: styles.statusPublished, text: '已发布' };
    }
    return { className: styles.statusDraft, text: '草稿' };
  };

  const statusInfo = getStatusInfo();

  /**
   * 处理操作菜单点击
   */
  const handleMenuClick: MenuProps['onClick'] = async ({ key, domEvent }) => {
    domEvent.stopPropagation();
    if (key === 'edit' && onEdit) {
      onEdit(item.id);
    } else if (key === 'publish' && onPublish) {
      const idToPublish = item.pending_draft_id || item.id;
      await onPublish(idToPublish);
    } else if (key === 'unpublish' && onUnpublish) {
      await onUnpublish(item.id);
    }
  };

  /**
   * 操作菜单项
   */
  const menuItems: MenuProps['items'] = [
    {
      key: 'edit',
      label: '编辑',
      icon: <EditOutlined />,
    },
    ...(isRevising
      ? [{ key: 'publish', label: '发布修订', icon: <CheckCircleOutlined /> }]
      : isPublished
        ? [{ key: 'unpublish', label: '取消发布', icon: <CloseCircleOutlined /> }]
        : [{ key: 'publish', label: '发布', icon: <CheckCircleOutlined /> }]),
  ];

  /**
   * 获取所有标签（系统标签 + 操作标签）
   */
  const allTags = useMemo(() => {
    const tags: SimpleTag[] = [];
    if (item.system_tags) tags.push(...item.system_tags);
    if (item.operation_tags) tags.push(...item.operation_tags);
    return tags;
  }, [item.system_tags, item.operation_tags]);

  /**
   * 显示的标签（最多3个）
   */
  const displayTags = allTags.slice(0, 3);
  const moreTags = allTags.length - 3;

  /**
   * 获取卡片样式类名（根据状态）
   * 学员端不显示草稿/修订中的特殊样式
   */
  const getCardClassName = () => {
    const classes = [styles.card];
    if (shouldShowStatus) {
      if (isRevising) {
        classes.push(styles.cardRevising);
      } else if (isDraft) {
        classes.push(styles.cardDraft);
      }
    }
    return classes.join(' ');
  };

  return (
    <div className={getCardClassName()} onClick={() => onView(item.id)}>
      {/* 卡片头部：文档类型 + 状态 */}
      <div className={styles.cardHeader}>
        <div className={styles.docType}>
          <span className={`${styles.docTypeDot} ${isEmergency ? styles.docTypeDotEmergency : styles.docTypeDotStandard}`} />
          <span className={`${styles.docTypeLabel} ${isEmergency ? styles.docTypeLabelEmergency : ''}`}>
            {isEmergency ? 'EMERGENCY' : 'STANDARD'}
          </span>
        </div>
        <div className={styles.cardHeaderRight}>
          {/* 状态徽章 - 仅管理端显示 */}
          {shouldShowStatus && (
            <span className={`${styles.statusBadge} ${statusInfo.className}`}>
              {statusInfo.text}
            </span>
          )}
          {/* 操作菜单 - 仅管理端显示 */}
          {shouldShowActions && (
            <Dropdown
              menu={{ items: menuItems, onClick: handleMenuClick }}
              trigger={['click']}
              placement="bottomRight"
            >
              <button
                className={styles.actionButton}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreOutlined />
              </button>
            </Dropdown>
          )}
        </div>
      </div>

      {/* 卡片主体 */}
      <div className={styles.cardBody}>
        {/* 标题 */}
        <h3 className={styles.cardTitle}>{item.title}</h3>

        {/* 标签 */}
        <div className={styles.cardTags}>
          {displayTags.map((tag) => (
            <span key={tag.id} className={styles.cardTag}>
              <span className={styles.tagIcon}>◇</span>
              {tag.name}
            </span>
          ))}
          {moreTags > 0 && (
            <span className={`${styles.cardTag} ${styles.moreTag}`}>
              +{moreTags}
            </span>
          )}
        </div>

        {/* 横线分隔 + 内容预览 */}
        <div className={styles.contentSection}>
          <div className={styles.cardPreview}>
            {item.content_preview || '暂无内容预览'}
          </div>
        </div>
      </div>

      {/* 卡片底部 */}
      <div className={styles.cardFooter}>
        <div className={styles.footerLeft}>
          <div className={styles.authorAvatar}>
            {(item.updated_by_name || item.created_by_name || '?').charAt(0)}
          </div>
          <div className={styles.authorInfo}>
            <span className={styles.authorName}>
              {item.updated_by_name || item.created_by_name || '-'}
            </span>
            <span className={styles.updateTime}>
              {item.updated_at ? dayjs(item.updated_at).format('YYYY-MM-DD') : '-'}
            </span>
          </div>
        </div>
        <div className={styles.footerRight}>
          <EyeOutlined />
          <span>{item.view_count || 0}</span>
        </div>
      </div>
    </div>
  );
};
