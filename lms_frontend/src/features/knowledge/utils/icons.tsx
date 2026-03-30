import {
    Cloud,
    Database,
    Network,
    Settings,
    FileText,
    LayoutGrid,
} from 'lucide-react';

/**
 * space图标映射
 */
export const SPACE_TYPE_ICONS: Record<string, React.ReactNode> = {
    '双云': <Cloud className="w-4.5 h-4.5" />,
    '数据库': <Database className="w-4.5 h-4.5" />,
    '网络': <Network className="w-4.5 h-4.5" />,
    '应用': <LayoutGrid className="w-4.5 h-4.5" />,
    '规章制度': <FileText className="w-4.5 h-4.5" />,
    '其他': <Settings className="w-4.5 h-4.5" />,
};

/**
 * 获取space图标
 */
export const getSpaceTypeIcon = (name: string): React.ReactNode => {
    return SPACE_TYPE_ICONS[name] || <FileText className="w-4.5 h-4.5" />;
};
