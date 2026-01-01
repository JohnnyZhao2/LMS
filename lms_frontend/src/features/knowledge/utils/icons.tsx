import {
    Cloud,
    Database,
    Network,
    Shield,
    Settings,
    FileText,
    LayoutGrid,
} from 'lucide-react';

/**
 * 条线类型图标映射
 */
export const LINE_TYPE_ICONS: Record<string, React.ReactNode> = {
    '双云': <Cloud className="w-4.5 h-4.5" />,
    '数据库': <Database className="w-4.5 h-4.5" />,
    '网络': <Network className="w-4.5 h-4.5" />,
    '应用': <LayoutGrid className="w-4.5 h-4.5" />,
    '应急': <Shield className="w-4.5 h-4.5" />,
    '规章制度': <FileText className="w-4.5 h-4.5" />,
    '其他': <Settings className="w-4.5 h-4.5" />,
};

/**
 * 获取条线类型图标
 */
export const getLineTypeIcon = (name: string): React.ReactNode => {
    return LINE_TYPE_ICONS[name] || <FileText className="w-4.5 h-4.5" />;
};
