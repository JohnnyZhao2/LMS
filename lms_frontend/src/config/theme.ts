/**
 * LMS 设计系统主题配置
 * 基于 design.json 规范，映射到 Ant Design ThemeConfig
 */
import type { ThemeConfig } from 'antd';

// ============================================
// 设计令牌 (Design Tokens)
// ============================================

export const colors = {
  // Primary Colors
  primary: {
    blue: {
      50: '#E8EEFF',
      100: '#C7D7FF',
      200: '#9AB8FF',
      300: '#6B94FF',
      400: '#4D7CFF',
      500: '#4D6CFF', // Main primary
      600: '#3D5FE6',
      700: '#2F4AC7',
    },
    green: {
      50: '#E6F9F0',
      100: '#B8EDCE',
      200: '#7FE0A8',
      300: '#4DD688',
      400: '#2CC96B',
      500: '#10B759', // Success
      600: '#0DA34F',
    },
  },
  // Secondary Colors
  secondary: {
    orange: {
      50: '#FFF4ED',
      100: '#FFE5D1',
      500: '#FF8C52', // Alert/Warning accent
      600: '#E67743',
    },
    yellow: {
      50: '#FFFBEB',
      100: '#FFF4C7',
      300: '#FFE577',
      500: '#F5C200', // Warning
    },
    red: {
      50: '#FFE9ED',
      100: '#FFC9D3',
      500: '#FF3D71', // Error
      600: '#E6355F',
    },
    purple: {
      500: '#9B00FF', // Premium/Special
      600: '#8000E6',
    },
    pink: {
      500: '#FF3D8F', // Creative highlight
      600: '#E6357F',
    },
    cyan: {
      500: '#00C7E6', // Info
      600: '#00B0CC',
    },
  },
  // Neutral Colors
  neutral: {
    white: '#FFFFFF',
    gray50: '#F8F9FA',
    gray100: '#F1F3F5',
    gray200: '#E9ECEF',
    gray300: '#DEE2E6',
    gray400: '#CED4DA',
    gray500: '#ADB5BD',
    gray600: '#868E96',
    gray700: '#495057',
    gray800: '#343A40',
    gray900: '#212529',
    black: '#000000',
  },
} as const;

export const typography = {
  fontFamily: {
    primary: "'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
  },
  fontSize: {
    xs: 11,
    sm: 12,
    base: 14,
    md: 15,
    lg: 16,
    xl: 18,
    '2xl': 20,
    '3xl': 24,
    '4xl': 30,
    '5xl': 36,
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.6,
  },
} as const;

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

export const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  full: 9999,
} as const;

export const shadows = {
  none: 'none',
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  base: '0 1px 3px rgba(0, 0, 0, 0.1)',
  md: '0 4px 6px rgba(0, 0, 0, 0.07)',
  lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px rgba(0, 0, 0, 0.1)',
  glow: {
    primary: '0 0 20px rgba(77, 108, 255, 0.3)',
    success: '0 0 20px rgba(16, 183, 89, 0.3)',
    error: '0 0 20px rgba(255, 61, 113, 0.3)',
  },
} as const;

export const transitions = {
  fast: '0.15s ease',
  base: '0.2s ease',
  slow: '0.3s ease',
  spring: '0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const;

export const layout = {
  containerMaxWidth: 1280,
  contentMaxWidth: 960,
  sidebarWidth: 280,
  headerHeight: 64,
  gridGap: 24,
  sectionSpacing: 48,
} as const;

// ============================================
// Ant Design 主题配置
// ============================================

export const appTheme: ThemeConfig = {
  token: {
    // Colors
    colorPrimary: colors.primary.blue[500],
    colorSuccess: colors.primary.green[500],
    colorWarning: colors.secondary.yellow[500],
    colorError: colors.secondary.red[500],
    colorInfo: colors.secondary.cyan[500],
    
    // Text
    colorTextBase: colors.neutral.gray900,
    colorText: colors.neutral.gray900,
    colorTextSecondary: colors.neutral.gray600,
    colorTextTertiary: colors.neutral.gray500,
    colorTextQuaternary: colors.neutral.gray400,
    
    // Backgrounds
    colorBgBase: colors.neutral.white,
    colorBgContainer: colors.neutral.white,
    colorBgElevated: colors.neutral.white,
    colorBgLayout: colors.neutral.gray50,
    colorBgSpotlight: colors.neutral.gray100,
    
    // Borders
    colorBorder: colors.neutral.gray200,
    colorBorderSecondary: colors.neutral.gray100,
    
    // Typography
    fontFamily: typography.fontFamily.primary,
    fontSize: typography.fontSize.base,
    fontSizeHeading1: typography.fontSize['5xl'],
    fontSizeHeading2: typography.fontSize['4xl'],
    fontSizeHeading3: typography.fontSize['3xl'],
    fontSizeHeading4: typography.fontSize['2xl'],
    fontSizeHeading5: typography.fontSize.xl,
    fontSizeLG: typography.fontSize.lg,
    fontSizeSM: typography.fontSize.sm,
    fontSizeXL: typography.fontSize.xl,
    
    // Border Radius
    borderRadius: borderRadius.md,
    borderRadiusLG: borderRadius.lg,
    borderRadiusSM: borderRadius.sm,
    borderRadiusXS: borderRadius.sm,
    
    // Shadows
    boxShadow: shadows.base,
    boxShadowSecondary: shadows.md,
    
    // Layout
    controlHeight: 40,
    controlHeightLG: 48,
    controlHeightSM: 32,
    
    // Motion
    motionDurationFast: '0.15s',
    motionDurationMid: '0.2s',
    motionDurationSlow: '0.3s',
    motionEaseInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    motionEaseOut: 'cubic-bezier(0, 0, 0.2, 1)',
    motionEaseInQuint: 'cubic-bezier(0.4, 0, 1, 1)',
    
    // Sizes
    sizeStep: 4,
    sizeUnit: 4,
    
    // Links
    colorLink: colors.primary.blue[500],
    colorLinkHover: colors.primary.blue[400],
    colorLinkActive: colors.primary.blue[600],
  },
  
  components: {
    // Layout
    Layout: {
      headerBg: 'transparent',
      bodyBg: 'transparent',
      siderBg: 'transparent',
    },
    
    // Card
    Card: {
      borderRadiusLG: borderRadius.lg,
      paddingLG: spacing[6],
      boxShadowTertiary: shadows.md,
    },
    
    // Button
    Button: {
      borderRadius: borderRadius.md,
      controlHeight: 40,
      controlHeightLG: 48,
      controlHeightSM: 32,
      fontWeight: typography.fontWeight.semibold,
      primaryShadow: 'none',
      defaultShadow: 'none',
      dangerShadow: 'none',
    },
    
    // Input
    Input: {
      borderRadius: borderRadius.md,
      controlHeight: 40,
      paddingInline: 14,
      activeShadow: `0 0 0 3px ${colors.primary.blue[50]}`,
    },
    
    // Select
    Select: {
      borderRadius: borderRadius.md,
      controlHeight: 40,
    },
    
    // Menu
    Menu: {
      itemBorderRadius: borderRadius.md,
      itemMarginInline: 8,
      itemPaddingInline: 16,
      itemHeight: 44,
      iconSize: 18,
      collapsedIconSize: 18,
      itemSelectedBg: colors.primary.blue[50],
      itemSelectedColor: colors.primary.blue[600],
      itemHoverBg: colors.neutral.gray100,
    },
    
    // Table
    Table: {
      borderRadius: borderRadius.lg,
      headerBg: colors.neutral.gray50,
      rowHoverBg: colors.neutral.gray50,
    },
    
    // Modal
    Modal: {
      borderRadiusLG: borderRadius.xl,
      paddingContentHorizontalLG: spacing[6],
    },
    
    // Tag
    Tag: {
      borderRadiusSM: borderRadius.sm,
    },
    
    // Tabs
    Tabs: {
      itemSelectedColor: colors.primary.blue[600],
      inkBarColor: colors.primary.blue[500],
    },
    
    // Message
    Message: {
      contentBg: colors.neutral.white,
    },
    
    // Notification
    Notification: {
      borderRadiusLG: borderRadius.lg,
    },
    
    // Form
    Form: {
      labelFontSize: typography.fontSize.base,
      verticalLabelPadding: `0 0 ${spacing[2]}px`,
    },
    
    // Typography
    Typography: {
      titleMarginBottom: '0.5em',
      titleMarginTop: 0,
    },
    
    // Dropdown
    Dropdown: {
      borderRadiusLG: borderRadius.lg,
      paddingBlock: spacing[2],
    },
    
    // Tooltip
    Tooltip: {
      borderRadius: borderRadius.md,
    },
    
    // Avatar
    Avatar: {
      borderRadius: borderRadius.full,
    },
    
    // Badge
    Badge: {
      dotSize: 8,
    },
    
    // Progress
    Progress: {
      defaultColor: colors.primary.blue[500],
    },
    
    // Spin
    Spin: {
      colorPrimary: colors.primary.blue[500],
    },
    
    // Empty
    Empty: {
      colorTextDescription: colors.neutral.gray500,
    },
    
    // Breadcrumb
    Breadcrumb: {
      separatorMargin: spacing[2],
      itemColor: colors.neutral.gray600,
      lastItemColor: colors.neutral.gray900,
      linkColor: colors.primary.blue[500],
      linkHoverColor: colors.primary.blue[400],
    },
    
    // Pagination
    Pagination: {
      borderRadius: borderRadius.md,
      itemActiveBg: colors.primary.blue[500],
    },
    
    // Steps
    Steps: {
      colorPrimary: colors.primary.blue[500],
    },
    
    // Switch
    Switch: {
      colorPrimary: colors.primary.blue[500],
    },
    
    // Checkbox
    Checkbox: {
      borderRadiusSM: borderRadius.sm,
    },
    
    // Radio
    Radio: {
      buttonSolidCheckedBg: colors.primary.blue[500],
    },
    
    // DatePicker
    DatePicker: {
      borderRadius: borderRadius.md,
      controlHeight: 40,
    },
    
    // Slider
    Slider: {
      trackBg: colors.primary.blue[100],
      trackHoverBg: colors.primary.blue[200],
      handleColor: colors.primary.blue[500],
      handleActiveColor: colors.primary.blue[600],
      dotActiveBorderColor: colors.primary.blue[500],
    },
    
    // Rate
    Rate: {
      starColor: colors.secondary.yellow[500],
    },
    
    // Alert
    Alert: {
      borderRadiusLG: borderRadius.md,
    },
    
    // Result
    Result: {
      titleFontSize: typography.fontSize['2xl'],
    },
    
    // Skeleton
    Skeleton: {
      borderRadiusSM: borderRadius.sm,
    },
    
    // Drawer
    Drawer: {
      borderRadius: 0,
    },
    
    // Popover
    Popover: {
      borderRadiusLG: borderRadius.lg,
    },
    
    // Collapse
    Collapse: {
      borderRadiusLG: borderRadius.lg,
      headerBg: colors.neutral.gray50,
    },
    
    // Tree
    Tree: {
      borderRadius: borderRadius.md,
    },
    
    // TreeSelect
    TreeSelect: {
      borderRadius: borderRadius.md,
    },
    
    // Upload
    Upload: {
      borderRadiusLG: borderRadius.lg,
    },
    
    // Segmented
    Segmented: {
      borderRadius: borderRadius.md,
      borderRadiusSM: borderRadius.sm,
      itemSelectedBg: colors.neutral.white,
    },
    
    // FloatButton
    FloatButton: {
      borderRadiusLG: borderRadius.lg,
    },
  },
};

// ============================================
// 状态徽章配色 (Status Badge Colors)
// ============================================

export const statusBadgeStyles = {
  success: {
    background: colors.primary.green[50],
    color: colors.primary.green[500],
    border: `1px solid ${colors.primary.green[500]}`,
  },
  warning: {
    background: colors.secondary.yellow[50],
    color: '#8B7000', // Dark yellow for readability
    border: 'none',
  },
  error: {
    background: colors.secondary.red[50],
    color: colors.secondary.red[500],
    border: `1px solid ${colors.secondary.red[500]}`,
  },
  info: {
    background: colors.primary.blue[50],
    color: colors.primary.blue[600],
    border: `1px solid ${colors.primary.blue[500]}`,
  },
  open: {
    background: colors.secondary.orange[50],
    color: colors.secondary.orange[500],
    border: `1px solid ${colors.secondary.orange[500]}`,
  },
  pending: {
    background: colors.secondary.yellow[50],
    color: '#8B7000',
    border: 'none',
  },
  default: {
    background: colors.neutral.gray100,
    color: colors.neutral.gray700,
    border: 'none',
  },
} as const;

// ============================================
// 任务类型配色
// ============================================

export const taskTypeColors = {
  LEARNING: {
    background: colors.primary.green[50],
    color: colors.primary.green[600],
    border: colors.primary.green[200],
  },
  PRACTICE: {
    background: colors.primary.blue[50],
    color: colors.primary.blue[600],
    border: colors.primary.blue[200],
  },
  EXAM: {
    background: colors.secondary.red[50],
    color: colors.secondary.red[600],
    border: colors.secondary.red[100],
  },
} as const;

export default appTheme;

