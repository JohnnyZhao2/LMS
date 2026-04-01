# 仓库指南
用中文回复，言简意赅，不要废话
**No backward compatibility** - Break old formats freely

## 全局原则
- 不要写兜底代码！！！
- 前端不要加太多说明文字，不要因为截图是局部而导致ui过大，要结合当前页面密度！！！
- 永远不做向后兼容，旧格式可直接破坏性调整
- 避免冗余与重复代码，优先简化与抽象；能删除就删除
- 组件拆分：超过 200 行或嵌套渲染函数时提取子组件

## 截图驱动 UI 规则
- 用户提供的截图默认是局部参考，不是独立页面设计稿，禁止脑补后整块放大
- 先对齐当前页面的容器宽度、栅格、字号、行高、padding、间距密度，再决定视觉改动
- 默认保持与现有页面相同的信息密度；除非用户明确要求放大、突出展示或重做布局
- 禁止因为截图内容少、截图是局部、或想“更有设计感”，就擅自增大卡片高度、按钮尺寸、字号和留白
- 高密度业务页面优先做局部微调，不要轻易改成展示型大块 UI

## 组件复用原则
- 写新 UI 前，**先检查项目中是否已有可复用的组件**（如 `components/` 目录）
- 优先使用现有组件，**禁止重复造轮子**——不要为相似功能新建组件
- 如果现有组件不完全满足需求，**扩展或修改它**，而不是新建一个
- 引用组件时使用项目已有的 import 路径，保持风格统一
- 新增组件前需说明：为什么现有组件无法满足需求

<frontend_aesthetics>
You tend to converge toward generic, "on distribution" outputs. In frontend design,this creates what users call the "AI slop" aesthetic. Avoid this: make creative,distinctive frontends that surprise and delight. 

Focus on:
- Typography: Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt instead for distinctive choices that elevate the frontend's aesthetics.
- Color & Theme: Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes. Draw from IDE themes and cultural aesthetics for inspiration.
- Motion: Use animations for effects and micro-interactions. Prioritize CSS-only solutions for HTML. Use Motion library for React when available. Focus on high-impact moments: one well-orchestrated page load with staggered reveals (animation-delay) creates more delight than scattered micro-interactions.
- Backgrounds: Create atmosphere and depth rather than defaulting to solid colors. Layer CSS gradients, use geometric patterns, or add contextual effects that match the overall aesthetic.

Avoid generic AI-generated aesthetics:
- Overused font families (Inter, Roboto, Arial, system fonts)
- Clichéd color schemes (particularly purple gradients on white backgrounds)
- Predictable layouts and component patterns
- Cookie-cutter design that lacks context-specific character

Interpret creatively and make unexpected choices that feel genuinely designed for the context. Vary between light and dark themes, different fonts, different aesthetics. You still tend to converge on common choices (Space Grotesk, for example) across generations. Avoid this: it is critical that you think outside the box!
</frontend_aesthetics>
