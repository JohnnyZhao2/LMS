import * as React from 'react'

export const IconDashboard = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="2.5" y="2.5" width="6" height="6" rx="1" />
    <rect x="11.5" y="2.5" width="6" height="6" rx="1" />
    <rect x="2.5" y="11.5" width="6" height="6" rx="1" />
    <rect x="11.5" y="11.5" width="6" height="6" rx="1" />
  </svg>
)

export const IconKnowledge = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 16V4.5A1.5 1.5 0 0 1 4.5 3H16v14H4.5A1.5 1.5 0 0 1 3 15.5V16z" />
    <path d="M3 15.5A1.5 1.5 0 0 1 4.5 14H16" />
  </svg>
)

export const IconTask = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="3" width="14" height="14" rx="2" />
    <path d="M7 10l2 2 4-4" />
  </svg>
)

export const IconUsers = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="7" cy="6" r="2.5" />
    <path d="M2 17v-1a4 4 0 0 1 4-4h2a4 4 0 0 1 4 4v1" />
    <circle cx="14" cy="6" r="2" />
    <path d="M18 17v-.5a3 3 0 0 0-3-3" />
  </svg>
)

export const IconQuiz = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="10" cy="10" r="7" />
    <path d="M8 8a2 2 0 1 1 2.5 1.94c-.39.12-.5.44-.5.81V12" />
    <circle cx="10" cy="14" r="0.5" fill="currentColor" />
  </svg>
)

export const IconSpotCheck = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7l-5-5z" />
    <path d="M12 2v5h5" />
    <circle cx="9" cy="12" r="2.5" />
    <path d="M11 14l2 2" />
  </svg>
)

export const IconAnalytics = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 3v14h14" />
    <path d="M6 13l3-3 3 3 4-5" />
  </svg>
)

export const IconPersonal = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="10" cy="6" r="3" />
    <path d="M4 18v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1" />
  </svg>
)

/** 根据路由路径返回对应的菜单图标 */
export const getMenuIcon = (path: string): React.ReactNode => {
  const pathParts = path.split('/').filter(Boolean)
  const actualPath = pathParts.length > 1 ? pathParts.slice(1).join('/') : pathParts[0]

  const iconMap: Record<string, React.ReactNode> = {
    'dashboard': <IconDashboard className="w-[18px] h-[18px]" />,
    'knowledge': <IconKnowledge className="w-[18px] h-[18px]" />,
    'tasks': <IconTask className="w-[18px] h-[18px]" />,
    'users': <IconUsers className="w-[18px] h-[18px]" />,
    'quiz-center': <IconQuiz className="w-[18px] h-[18px]" />,
    'spot-checks': <IconSpotCheck className="w-[18px] h-[18px]" />,
    'grading-center': <IconQuiz className="w-[18px] h-[18px]" />,
    'authorization': <IconUsers className="w-[18px] h-[18px]" />,
    'analytics': <IconAnalytics className="w-[18px] h-[18px]" />,
    'personal': <IconPersonal className="w-[18px] h-[18px]" />,
  }

  return iconMap[actualPath] || <IconDashboard className="w-[18px] h-[18px]" />
}
