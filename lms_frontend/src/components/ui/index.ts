/**
 * UI 组件统一导出 - ShadCN UI Components
 */

// Button
export { Button, buttonVariants } from './button';
export type { ButtonProps } from './button';

// Card
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from './card';

// Input
export { Input } from './input';

// Label
export { Label } from './label';

// Select
export {
    Select,
    SelectGroup,
    SelectValue,
    SelectTrigger,
    SelectContent,
    SelectLabel,
    SelectItem,
    SelectSeparator,
    SelectScrollUpButton,
    SelectScrollDownButton,
} from './select';

// Dialog
export {
    Dialog,
    DialogPortal,
    DialogOverlay,
    DialogTrigger,
    DialogClose,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription,
} from './dialog';

// Dropdown Menu
export {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuCheckboxItem,
    DropdownMenuRadioItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuGroup,
    DropdownMenuPortal,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuRadioGroup,
} from './dropdown-menu';

// Table
export {
    Table,
    TableHeader,
    TableBody,
    TableFooter,
    TableHead,
    TableRow,
    TableCell,
    TableCaption,
} from './table';

// Badge
export { Badge, badgeVariants } from './badge';
export type { BadgeProps } from './badge';

// Avatar
export { Avatar, AvatarImage, AvatarFallback } from './avatar';

// Skeleton
export { Skeleton } from './skeleton';

// Toast/Sonner
export { Toaster } from './sonner';

// Tabs
export { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';

// Popover
export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor } from './popover';

// Calendar
export { Calendar } from './calendar';
export type { CalendarProps } from './calendar';

// DatePicker
export { DatePicker, DateRangePicker } from './date-picker';

// Separator
export { Separator } from './separator';

// ScrollArea
export { ScrollArea, ScrollBar } from './scroll-area';

// Textarea
export { Textarea } from './textarea';
export type { TextareaProps } from './textarea';

// Checkbox
export { Checkbox } from './checkbox';

// RadioGroup
export { RadioGroup, RadioGroupItem } from './radio-group';

// Spinner (Spin replacement)
export { Spinner, Spin } from './spinner';
export type { SpinnerProps } from './spinner';

// Progress
export { Progress } from './progress';
export type { ProgressProps } from './progress';

// Tooltip
export { Tooltip, TooltipRoot, TooltipTrigger, TooltipContent, TooltipProvider } from './tooltip';

// Pagination
export { Pagination } from './pagination';
export type { PaginationProps } from './pagination';

// Legacy components (kept for backward compatibility during migration)
export { StatusBadge } from './status-badge';
export type { StatusBadgeProps, StatusType } from './status-badge';

export { PageHeader } from './page-header';
export type { PageHeaderProps, BreadcrumbItem } from './page-header';

export { AnimatedContainer, StaggeredList } from './animated-container';
export type { AnimatedContainerProps, StaggeredListProps, AnimationType } from './animated-container';

export * from "./stat-card";

// Card System - Claymorphism 统一样式
export { ActionCard } from './action-card';
export { ContentPanel } from './content-panel';
