/**
 * 目录项接口
 */
export interface OutlineItem {
    id: string;
    level: number;
    text: string;
}

/**
 * 应急类知识的结构化标签页
 */
export const EMERGENCY_TABS = [
    { key: 'fault_scenario', label: '故障场景' },
    { key: 'trigger_process', label: '触发流程' },
    { key: 'solution', label: '解决方案' },
    { key: 'verification_plan', label: '验证方案' },
    { key: 'recovery_plan', label: '恢复方案' },
] as const;

/**
 * 从 HTML 内容解析标题生成目录
 */
export function parseOutlineFromHtml(html: string): OutlineItem[] {
    if (!html) return [];

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const headings = doc.querySelectorAll('h1, h2, h3');

    return Array.from(headings).map((heading, index) => ({
        id: `heading-${index}`,
        level: parseInt(heading.tagName.charAt(1), 10),
        text: heading.textContent || '',
    }));
}

/**
 * 从内容解析目录（支持应急类和标准类）
 */
export function parseOutline(content: string, isEmergency: boolean): OutlineItem[] {
    if (isEmergency) {
        // 应急类使用固定的标签页作为目录
        return EMERGENCY_TABS.map((tab, index) => ({
            id: `tab-${index}`,
            level: 1,
            text: tab.label,
        }));
    }
    return parseOutlineFromHtml(content);
}
