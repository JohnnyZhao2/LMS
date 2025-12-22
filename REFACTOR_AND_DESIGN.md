# LMS 页面重构与 UI 设计文档

## 1. 概述 (Overview)

本文档旨在基于现有 LMS 前端代码，结合 `design.json` 设计系统规范与 `AGENTS.md` 的美学指导原则，制定全面的 UI 重构与视觉升级计划。

**核心目标：**
*   **严格遵循 `design.json`**：确保所有颜色、间距、圆角、排版等设计令牌（Design Tokens）在代码中精确落地。
*   **拒绝平庸 ("No AI Slop")**：根据 `AGENTS.md`，引入更具氛围感、深度和动态效果的视觉设计，避免通用的“企业级后台”刻板印象。
*   **彻底重构 ("Break old formats")**：不拘泥于现有 Ant Design 的默认样式，通过深度定制和 CSS 覆盖，打造现代化的用户界面。

---

## 2. 设计系统映射 (Design System Mapping)

我们将通过 Ant Design 的 `ConfigProvider` 和 CSS Variables (CSS 变量) 来落实 `design.json`。

### 2.1 色彩系统 (Color Palette)

基于 `design.json` 的 `colorPalette`，定义以下语义化变量映射到 Ant Design 主题：

| 语义 (Semantic) | 颜色值 (Value) | design.json 来源 | Antd Token 映射 |
| :--- | :--- | :--- | :--- |
| **Primary (主色)** | `#4D6CFF` | `primary.blue.500` | `colorPrimary` |
| **Success (成功)** | `#10B759` | `primary.green.500` | `colorSuccess` |
| **Warning (警告)** | `#F5C200` | `secondary.yellow.500` | `colorWarning` |
| **Error (错误)** | `#FF3D71` | `secondary.red.500` | `colorError` |
| **Info (信息)** | `#00C7E6` | `secondary.cyan.500` | `colorInfo` |
| **Text Base (正文)** | `#212529` | `neutral.gray900` | `colorText` |
| **Text Secondary** | `#868E96` | `neutral.gray600` | `colorTextSecondary` |
| **Background** | `#F8F9FA` | `neutral.gray50` | `colorBgLayout` |
| **Component Bg** | `#FFFFFF` | `neutral.white` | `colorBgContainer` |

**特殊说明：**
*   **Accent Colors**: 引入 Purple (`#9B00FF`) 和 Pink (`#FF3D8F`) 作为特定高亮或高级功能（如“考试冲刺”、“专家模式”）的点缀色。

### 2.2 排版 (Typography)

*遵循 `design.json` 同时也响应 `AGENTS.md` 的 "Distinctive Choices" 要求，我们将在 CSS 中优先指定更现代的无衬线字体，后备回退到 system-ui。*

*   **Font Family**: `design.json` 指定了系统字体栈。为了增强个性，建议引入 **'Outfit'** 或 **'Manrope'** (Google Fonts) 作为首选英文字体，中文继续使用系统默认（PingFang SC 等）。
    *   *Refined Stack*: `'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`
*   **Base Size**: `14px` (Line Height 1.5)
*   **Weights**: 400 (Normal), 500 (Medium), 600 (Semibold), 700 (Bold)

### 2.3 形状与间距 (Shape & Spacing)

*   **Border Radius**:
    *   `sm`: 4px (Tag, Small Inputs)
    *   `md`: 8px (Buttons, Inputs)
    *   `lg`: 12px (Cards, Modals) -> **Antd `borderRadiusLG` 设为 12px**
*   **Spacing Scale**: 使用 4px 的倍数（4, 8, 12, 16, 24, 32...）。

---

## 3. UI 重构与美学升级方案 (UI Refactoring & Aesthetic Upgrade)

### 3.1 布局与背景 (Layout & Backgrounds)

**现状问题**：典型的一片灰底 (`#f5f5f5`) 加上白色卡片，缺乏层次感。

**重构方案 (依据 AGENTS.md)：**
1.  **Atmosphere (氛围感)**：
    *   背景不再是纯色。使用 CSS Mesh Gradient（网格渐变）或微妙的几何图案作为 `body` 背景。
    *   例如：在 `#F8F9FA` 基础上，添加极淡的 `#E8EEFF` (Blue 50) 和 `#FFE9ED` (Red 50) 模糊光晕，呼应品牌色，创造“呼吸感”。
2.  **Glassmorphism (轻微毛玻璃)**：
    *   侧边栏 (Sidebar) 和 顶部导航 (Header) 使用半透明背景 + 背景模糊 (`backdrop-filter: blur(10px)`), 增加现代感。
    *   侧边栏宽度：`280px` (design.json `sidebarWidth`)。

### 3.2 仪表盘 (Dashboard) - `StudentDashboard`

**现状**：Ant Design 默认 List 和 Card。

**重构方案**：
1.  **卡片设计 (Cards)**：
    *   移除 Antd Card 默认边框，改用 `design.json` 定义的 `shadows.sm` 或 `shadows.md`。
    *   Padding 统一增加至 `24px` (`elementStyling.colorSwatches.container.padding`)。
    *   **Hover Effect**: 添加 `transform: translateY(-2px)` 和阴影加深 (参照 `interactions.hoverEffects`)。
2.  **待办任务列表 (Task List)**：
    *   **不再使用默认 List 组件**。重构为自定义 Grid 布局。
    *   每个任务项为一个独立的“微型卡片”或“板块”，带有状态指示条（左侧 4px 彩色条）。
    *   **状态标签 (Tags)**：使用 `design.json` 中的 `statusBadges` 样式（带背景色Tint + 对应边框），而不是 Antd 默认的实心 Tag。
3.  **欢迎区 (Welcome Section)**：
    *   增加一个 Hero 区域，显示学员进度概览，使用大号排版（`fontSize.3xl`）和动态问候。

### 3.3 交互与动效 (Interaction & Motion)

**依据 AGENTS.md "Motion"：**
1.  **页面加载 (Staggered Reveals)**：
    *   内容块（如仪表盘的卡片）在加载时应按顺序淡入上浮 (`slideUp` animation in `design.json`).
    *   使用 `framer-motion` 或纯 CSS `@keyframes` 实现。
2.  **微交互 (Micro-interactions)**：
    *   按钮点击要有明确的缩放反馈 (`scale(0.95)`).
    *   列表项 Hover 时，背景色平滑过渡 (`transitions.base` = 0.2s).

---

## 4. 实施步骤 (Implementation Roadmap)

1.  **配置基础设施**：
    *   创建 `src/config/theme.ts`，将 `design.json` 转换为 Ant Design `ThemeConfig` 对象。
    *   在 `src/index.css` 中定义全局 CSS 变量（用于非 Antd 组件）。
    *   引入 `framer-motion` (可选，或手写 CSS 动画类)。

2.  **封装核心组件 (Wrapper Components)**：
    *   创建 `@/components/ui/card.tsx`：封装 Antd Card，预设圆角、阴影和 Hover 效果。
    *   创建 `@/components/ui/status-badge.tsx`：实现 `design.json` 中定义的复杂状态徽章。
    *   创建 `@/components/ui/button.tsx`：覆盖默认按钮样式，支持 `large`, `medium`, `small`, `tiny` 尺寸定义。

3.  **页面逐个重构**：
    *   **Priority 1**: `AppLayout` (Sidebar, Header, Main Background).
    *   **Priority 2**: `StudentDashboard` (作为首页，定调).
    *   **Priority 3**: `TaskList` & `KnowledgeList`.

4.  **清理旧代码**：
    *   移除所有文件中的内联样式 (`style={{...}}`)。
    *   替换所有硬编码的颜色值为 CSS 变量或 Antd Token 引用。

---

## 5. 代码示例 (Code Previews)

### 5.1 Antd Theme Config
```typescript
// src/config/theme.ts
import { ThemeConfig } from 'antd';

export const appTheme: ThemeConfig = {
  token: {
    colorPrimary: '#4D6CFF', // primary.blue.500
    colorSuccess: '#10B759', // primary.green.500
    colorWarning: '#F5C200', // secondary.yellow.500
    colorError: '#FF3D71',   // secondary.red.500
    colorInfo: '#00C7E6',    // secondary.cyan.500
    colorTextBase: '#212529', // neutral.gray900
    borderRadius: 8,
    borderRadiusLG: 12,      // borderRadius.lg
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  components: {
    Card: {
      boxShadowTertiary: '0 4px 6px rgba(0, 0, 0, 0.07)', // shadows.md
      paddingLG: 24,
    },
    Button: {
      controlHeight: 40, // medium height
      controlHeightLG: 48, // large height
      borderRadius: 10,
    }
  }
};
```

### 5.2 CSS 氛围背景
```css
/* src/index.css */
body {
  background-color: #F8F9FA;
  background-image: 
    radial-gradient(at 0% 0%, rgba(77, 108, 255, 0.05) 0px, transparent 50%),
    radial-gradient(at 100% 0%, rgba(255, 61, 143, 0.05) 0px, transparent 50%);
  background-attachment: fixed;
}
```

