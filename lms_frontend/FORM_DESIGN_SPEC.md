# 表单设计规范 - 平面设计系统

## 设计原则

表单遵循**平面设计系统**的核心原则：
- **零阴影**：所有输入框、按钮、卡片不使用阴影
- **纯色块**：使用背景色定义边界，不使用边框（除非聚焦状态）
- **几何形状**：统一的圆角半径（rounded-md 或 rounded-lg）
- **扁平交互**：通过颜色变化和缩放提供反馈，不使用深度效果

## 字体系统

- **字体族**：`'Outfit', sans-serif`
- **标签（Label）**：`font-semibold` (600) 或 `font-medium` (500)，`text-xs` 或 `text-sm`，`uppercase tracking-wider`（适合标签）
- **输入文本**：`font-medium` 或 `font-normal` (400)，`text-base` 或 `text-sm`
- **错误消息**：`font-medium` (500)，`text-xs` 或 `text-sm`

## 颜色规范

### 输入框状态
- **默认背景**：`bg-gray-100` (`#F3F4F6`)
- **聚焦背景**：`bg-white` (`#FFFFFF`)
- **聚焦边框**：`border-2 border-blue-600` (`#3B82F6`)
- **文本颜色**：`text-gray-900` (`#111827`)
- **占位符**：`text-gray-500` (`#6B7280`)
- **禁用状态**：`bg-gray-50`，`text-gray-400`，`opacity-50`

### 错误状态
- **错误文本**：`text-red-600` (`#DC2626`)
- **错误边框**（如需要）：`border-2 border-red-600`

### 标签颜色
- **默认标签**：`text-gray-700` 或 `text-gray-600`
- **必填标识**：可使用红色星号或红色标签文本

## 尺寸规范

### 输入框
- **高度**：`h-14` (56px) - 标准输入框和选择框
- **内边距**：`px-6 py-4` 或 `px-4`（根据内容调整）
- **圆角**：`rounded-md` (6px)
- **最小宽度**：`min-w-full` 或根据布局需要

### 多行文本（Textarea）
- **最小高度**：`min-h-[120px]` 或 `min-h-[160px]`
- **内边距**：`px-6 py-4`
- **圆角**：`rounded-md`
- **行高**：`leading-relaxed` 或 `leading-normal`

### 复选框
- **尺寸**：`h-5 w-5` 或 `h-4 w-4`
- **圆角**：`rounded-sm` 或 `rounded-md`

### 标签
- **间距**：标签与输入框之间 `space-y-2` (8px)
- **标签组间距**：`space-y-4` (16px) 或 `space-y-6` (24px)

## 组件规范

### 1. Input（输入框）

```tsx
// 标准输入框
<Input 
  className="h-14 rounded-md bg-gray-100 border-none 
             text-base text-gray-900 px-6 py-4
             placeholder:text-gray-500
             focus:bg-white focus:border-2 focus:border-blue-600 focus:outline-none
             disabled:bg-gray-50 disabled:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed
             transition-all duration-200"
/>
```

**关键样式**：
- `bg-gray-100` - 默认背景
- `border-none` - 无边框（除非聚焦）
- `focus:bg-white` - 聚焦时白色背景
- `focus:border-2 focus:border-blue-600` - 聚焦时蓝色边框
- `transition-all duration-200` - 平滑过渡
- 无阴影：绝对不使用 `shadow-*` 类

### 2. Textarea（多行文本）

```tsx
<Textarea
  className="min-h-[120px] w-full rounded-md bg-gray-100 border-none
             text-base text-gray-900 px-6 py-4
             placeholder:text-gray-500
             focus:bg-white focus:border-2 focus:border-blue-600 focus:outline-none
             disabled:bg-gray-50 disabled:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed
             transition-all duration-200 resize-y"
/>
```

### 3. Select（选择框）

```tsx
<Select>
  <SelectTrigger className="h-14 rounded-md bg-gray-100 border-none
                            text-base text-gray-900 px-6 py-4
                            focus:bg-white focus:border-2 focus:border-blue-600
                            transition-all duration-200">
    <SelectValue placeholder="请选择..." />
  </SelectTrigger>
  <SelectContent className="rounded-lg border-2 border-gray-200 bg-white shadow-none">
    {/* 选项 */}
  </SelectContent>
</Select>
```

**关键样式**：
- 触发器和 Input 相同样式
- 下拉菜单：`border-2 border-gray-200`，`bg-white`，`shadow-none`
- 选项悬停：`hover:bg-gray-100`

### 4. Checkbox（复选框）

```tsx
<Checkbox
  className="h-5 w-5 rounded-sm border-2 border-gray-300
             bg-white
             data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600
             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2
             transition-all duration-200"
/>
```

**关键样式**：
- 边框：`border-2`（不聚焦时使用边框定义形状）
- 选中：`bg-blue-600 border-blue-600`
- 无阴影

### 5. Label（标签）

```tsx
<Label 
  className="text-sm font-semibold text-gray-700 uppercase tracking-wider"
  // 或用于描述性标签（非必填字段）
  className="text-sm font-medium text-gray-600"
>
  字段名称
</Label>
```

**两种标签样式**：
- **表单标签（必填/重要）**：`text-sm font-semibold text-gray-700 uppercase tracking-wider`
- **描述性标签（可选字段）**：`text-sm font-medium text-gray-600`

### 6. FormItem（表单项容器）

```tsx
<FormItem className="space-y-2">
  <FormLabel>标签</FormLabel>
  <FormControl>
    <Input />
  </FormControl>
  <FormMessage />
</FormItem>
```

**间距**：
- FormItem 内部：`space-y-2` (8px)
- FormItem 之间：`space-y-4` (16px) 或 `space-y-6` (24px)

### 7. FormMessage（错误消息）

```tsx
<FormMessage className="text-xs font-medium text-red-600" />
```

**关键样式**：
- `text-xs` 或 `text-sm`
- `font-medium`
- `text-red-600`

## 布局规范

### 表单分组

```tsx
// 表单分组标题
<div className="space-y-4">
  <div className="flex items-center gap-3">
    <div className="w-1 h-5 rounded-full bg-blue-600" />
    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
      分组标题
    </h3>
  </div>
  
  {/* 表单字段 */}
  <div className="space-y-4">
    <FormItem>...</FormItem>
  </div>
</div>
```

### 网格布局

```tsx
// 两列网格
<div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
  <FormItem>...</FormItem>
  <FormItem>...</FormItem>
</div>
```

### 表单容器

```tsx
// 表单卡片
<div className="bg-white rounded-lg p-6 md:p-8 space-y-6">
  {/* 表单内容 */}
</div>
```

## 交互反馈

### 聚焦状态
- 背景从 `bg-gray-100` 变为 `bg-white`
- 显示 `border-2 border-blue-600`
- 过渡时间：`duration-200`

### 禁用状态
- `bg-gray-50`
- `text-gray-400`
- `opacity-50`
- `cursor-not-allowed`

### 错误状态
- 输入框可保持聚焦样式或添加错误边框
- 错误消息显示在输入框下方
- 错误文本：`text-red-600`

### 悬停状态（Select 选项、Checkbox）
- Select 选项：`hover:bg-gray-100`
- 按钮：使用 `hover:scale-105` 等缩放效果（在按钮组件中定义）

## 必填标识

### 方式一：星号
```tsx
<Label>
  字段名称 <span className="text-red-600">*</span>
</Label>
```

### 方式二：标签颜色
```tsx
<Label className="text-red-600">必填字段</Label>
```

## 示例：完整表单结构

```tsx
<Form {...form}>
  <form onSubmit={handleSubmit} className="space-y-6">
    {/* 表单分组 */}
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-1 h-5 rounded-full bg-blue-600" />
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
          基础信息
        </h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                用户名 <span className="text-red-600">*</span>
              </FormLabel>
              <FormControl>
                <Input 
                  {...field}
                  placeholder="请输入用户名"
                  className="h-14 rounded-md bg-gray-100 border-none 
                             text-base text-gray-900 px-6 py-4
                             placeholder:text-gray-500
                             focus:bg-white focus:border-2 focus:border-blue-600 focus:outline-none
                             transition-all duration-200"
                />
              </FormControl>
              <FormMessage className="text-xs font-medium text-red-600" />
            </FormItem>
          )}
        />
      </div>
    </div>
    
    {/* 提交按钮 */}
    <div className="flex gap-4 justify-end">
      <Button type="button" variant="outline">取消</Button>
      <Button type="submit">提交</Button>
    </div>
  </form>
</Form>
```

## 注意事项

1. **绝对不使用阴影**：所有输入框、选择框、表单容器都不使用 `shadow-*` 类
2. **统一高度**：标准输入框和选择框统一使用 `h-14`
3. **颜色一致性**：聚焦使用 `border-blue-600`，错误使用 `text-red-600`
4. **过渡动画**：所有状态变化使用 `transition-all duration-200`
5. **字体系统**：标签使用 Outfit 字体，可通过全局 CSS 或内联样式设置
6. **响应式设计**：使用 Tailwind 响应式类（`md:`, `lg:` 等）确保移动端友好
