# Design System 重构计划

## 📋 总览

**目标**: 建立统一、可维护的设计系统
**时间**: 2-3 周
**原则**: 渐进式重构，不影响现有功能

---

## Phase 1: Token 标准化 (2-3天)

### 1.1 颜色审计
- [ ] 扫描所有组件中的硬编码颜色
- [ ] 列出所有使用的颜色值
- [ ] 映射到现有 token 或创建新 token
- [ ] 生成颜色使用报告

**工具**:
```bash
# 查找硬编码颜色
grep -r "bg-\[#" lms_frontend/src/
grep -r "text-\[#" lms_frontend/src/
grep -r "border-\[#" lms_frontend/src/
```

### 1.2 间距审计
- [ ] 检查自定义间距使用 (style={{ padding: '15px' }})
- [ ] 替换为 Tailwind 标准间距
- [ ] 统一组件内外边距

### 1.3 圆角审计
- [ ] 检查自定义圆角
- [ ] 统一使用 radius-sm/md/lg/xl

### 1.4 字体审计
- [ ] 检查自定义字号
- [ ] 统一字重使用
- [ ] 确保中文字体优化

**输出**: `TOKEN_AUDIT_REPORT.md`

---

## Phase 2: 基础组件整合 (5-7天)

### 2.1 Badge 组件族重构 (1天)

**现状**:
- Badge (基础)
- Status Badge
- Category Badge
- Metric Badge

**目标**: 统一为一个 Badge 组件

```tsx
// 新 API 设计
<Badge
  variant="default|status|category|metric"
  color="primary|secondary|warning|destructive"
  size="sm|md|lg"
>
  内容
</Badge>
```

**步骤**:
1. 设计新 Badge API
2. 实现新 Badge 组件
3. 创建迁移脚本
4. 逐步替换旧组件
5. 删除旧组件

### 2.2 Card 组件族重构 (2天)

**现状**:
- Card (基础)
- Stat Card
- Action Card
- Editorial Card
- Task Card (业务)
- Knowledge Card (业务)

**目标**: 统一基础 Card，业务卡片通过组合实现

```tsx
// 新 API 设计
<Card variant="default|elevated|bordered">
  <CardHeader>
    <CardTitle />
    <CardDescription />
  </CardHeader>
  <CardContent />
  <CardFooter />
</Card>

// 业务卡片示例
<Card>
  <CardHeader>
    <div className="flex items-center justify-between">
      <CardTitle>{task.title}</CardTitle>
      <StatusBadge status={task.status} />
    </div>
  </CardHeader>
  <CardContent>{task.description}</CardContent>
  <CardFooter>
    <Button>查看详情</Button>
  </CardFooter>
</Card>
```

**步骤**:
1. 重构基础 Card 组件
2. 提取 Stat Card 为独立组件（保留）
3. 移除 Action Card（用 Card + CardFooter 替代）
4. 重构业务卡片为组合模式
5. 更新所有引用

### 2.3 Avatar 组件族重构 (1天)

**现状**:
- Avatar (基础)
- User Avatar
- Avatar Circle
- Avatar Picker Popover

**目标**: 统一 Avatar，Picker 保持独立

```tsx
// 新 API 设计
<Avatar
  src={user.avatar}
  fallback={user.name}
  size="xs|sm|md|lg|xl"
  shape="circle|square"
/>

// User Avatar 简化为
<Avatar
  src={user.avatar}
  fallback={user.name}
  size="md"
/>
```

**步骤**:
1. 增强基础 Avatar 组件
2. 简化 User Avatar 为 Avatar 的简单包装
3. 移除 Avatar Circle（合并到 Avatar）
4. 保留 Avatar Picker Popover
5. 更新所有引用

### 2.4 Form 组件优化 (1天)

**现状**: 多个业务表单有重复布局

**目标**: 提取通用 FormLayout

```tsx
// 新组件
<FormLayout
  title="表单标题"
  description="表单描述"
  onSubmit={handleSubmit}
  submitText="提交"
  cancelText="取消"
>
  {/* 表单字段 */}
</FormLayout>
```

**步骤**:
1. 分析现有表单布局模式
2. 设计 FormLayout 组件
3. 实现 FormLayout
4. 在新表单中使用
5. 逐步迁移旧表单

### 2.5 List 组件优化 (1天)

**现状**: 多个列表组件有重复逻辑

**目标**: 提取通用 ListContainer

```tsx
// 新组件
<ListContainer
  items={items}
  renderItem={(item) => <TaskItem task={item} />}
  emptyState={<EmptyState />}
  loading={loading}
  loadingState={<Skeleton />}
/>
```

**步骤**:
1. 分析现有列表模式
2. 设计 ListContainer API
3. 实现 ListContainer
4. 在新列表中使用
5. 逐步迁移旧列表

---

## Phase 3: 组件文档化 (3-4天)

### 3.1 组件文档编写 (2天)

为每个基础组件编写文档：
- 组件用途
- API 说明
- 使用示例
- 最佳实践
- 可访问性说明

**模板**:
```markdown
# Button

## 用途
用于触发操作的按钮组件

## API
| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| variant | string | 'default' | 按钮样式 |
| size | string | 'md' | 按钮大小 |

## 示例
\`\`\`tsx
<Button variant="primary">点击</Button>
\`\`\`

## 可访问性
- 支持键盘导航
- 提供 aria-label
```

### 3.2 组件展示页 (1-2天)

创建组件展示页面：
- 所有组件的可视化展示
- 交互式示例
- 代码复制功能

**选项**:
1. 使用 Storybook
2. 创建自定义展示页 `/design-system`

### 3.3 使用指南 (1天)

编写设计系统使用指南：
- 快速开始
- 设计原则
- 组件选择指南
- 常见模式
- 最佳实践

---

## Phase 4: 持续优化 (持续进行)

### 4.1 性能优化
- [ ] 识别性能瓶颈
- [ ] 优化大列表渲染
- [ ] 实现组件懒加载
- [ ] 优化打包体积

### 4.2 可访问性增强
- [ ] 审计所有组件的可访问性
- [ ] 添加缺失的 ARIA 标签
- [ ] 确保键盘导航
- [ ] 测试屏幕阅读器

### 4.3 测试覆盖
- [ ] 为基础组件添加单元测试
- [ ] 添加集成测试
- [ ] 添加视觉回归测试

### 4.4 监控与维护
- [ ] 建立组件使用统计
- [ ] 收集开发者反馈
- [ ] 定期审查和更新

---

## 🚀 执行策略

### 渐进式迁移
1. **新功能优先**: 新功能直接使用新组件
2. **修改时迁移**: 修改旧代码时顺便迁移
3. **批量迁移**: 集中时间批量迁移某个模块

### 向后兼容
1. 保留旧组件一段时间
2. 添加 deprecation 警告
3. 提供迁移指南
4. 设置移除时间表

### 团队协作
1. 定期同步进度
2. Code Review 重点关注设计系统使用
3. 分享最佳实践
4. 收集反馈并迭代

---

## 📊 成功指标

### 量化指标
- [ ] 组件重复度降低 50%
- [ ] 硬编码颜色减少 90%
- [ ] 组件文档覆盖率 100%
- [ ] 新功能开发效率提升 30%

### 质量指标
- [ ] 视觉一致性提升
- [ ] 代码可维护性提升
- [ ] 开发体验改善
- [ ] 用户体验优化

---

## 🔗 相关文档

- [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) - 设计系统总览
- [COMPONENT_INVENTORY.md](./COMPONENT_INVENTORY.md) - 组件清单
- [TOKEN_AUDIT_REPORT.md](./TOKEN_AUDIT_REPORT.md) - Token 审计报告（待生成）

---

## 📝 下一步行动

1. **立即开始**: Phase 1 - Token 审计
2. **本周完成**: Token 标准化
3. **下周开始**: Phase 2 - 组件整合
4. **持续进行**: 文档编写和优化