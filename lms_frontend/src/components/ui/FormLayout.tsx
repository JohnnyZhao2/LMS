/**
 * FormLayout Component
 * Responsive form layout utilities for organizing form fields
 * Requirements: 22.4
 */

import * as React from "react"
import { cn } from "@/utils/cn"

/**
 * FormGrid - Responsive grid container for form fields
 * - Mobile: Single column
 * - Tablet: 2 columns
 * - Desktop: Configurable columns (default 2)
 */
export interface FormGridProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Number of columns on desktop (default: 2) */
    columns?: 1 | 2 | 3 | 4
    /** Gap between items (default: 4 = 1rem) */
    gap?: 2 | 3 | 4 | 5 | 6
    children: React.ReactNode
}

export function FormGrid({ 
    columns = 2, 
    gap = 4, 
    className, 
    children, 
    ...props 
}: FormGridProps) {
    const columnClasses = {
        1: 'md:grid-cols-1',
        2: 'md:grid-cols-2',
        3: 'md:grid-cols-3',
        4: 'md:grid-cols-4',
    }
    
    const gapClasses = {
        2: 'gap-2',
        3: 'gap-3',
        4: 'gap-4',
        5: 'gap-5',
        6: 'gap-6',
    }

    return (
        <div 
            className={cn(
                "grid grid-cols-1",
                columnClasses[columns],
                gapClasses[gap],
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
}

/**
 * FormField - Wrapper for individual form fields with optional span
 */
export interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Span full width (all columns) */
    fullWidth?: boolean
    /** Span specific number of columns */
    span?: 1 | 2 | 3 | 4
    children: React.ReactNode
}

export function FormField({ 
    fullWidth, 
    span, 
    className, 
    children, 
    ...props 
}: FormFieldProps) {
    const spanClasses = {
        1: 'md:col-span-1',
        2: 'md:col-span-2',
        3: 'md:col-span-3',
        4: 'md:col-span-4',
    }

    return (
        <div 
            className={cn(
                fullWidth && 'col-span-full',
                span && spanClasses[span],
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
}


/**
 * FormSection - Groups related form fields with a title
 */
export interface FormSectionProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Section title */
    title?: string
    /** Section description */
    description?: string
    children: React.ReactNode
}

export function FormSection({ 
    title, 
    description, 
    className, 
    children, 
    ...props 
}: FormSectionProps) {
    return (
        <div 
            className={cn("space-y-4", className)}
            {...props}
        >
            {(title || description) && (
                <div className="space-y-1">
                    {title && (
                        <h3 className="text-sm font-medium text-text-primary">
                            {title}
                        </h3>
                    )}
                    {description && (
                        <p className="text-xs text-text-muted">
                            {description}
                        </p>
                    )}
                </div>
            )}
            {children}
        </div>
    )
}

/**
 * FormActions - Container for form action buttons
 * Responsive: stacks vertically on mobile, horizontal on larger screens
 */
export interface FormActionsProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Alignment of buttons */
    align?: 'left' | 'center' | 'right' | 'between'
    /** Stack buttons vertically on mobile */
    stackOnMobile?: boolean
    children: React.ReactNode
}

export function FormActions({ 
    align = 'right', 
    stackOnMobile = true,
    className, 
    children, 
    ...props 
}: FormActionsProps) {
    const alignClasses = {
        left: 'justify-start',
        center: 'justify-center',
        right: 'justify-end',
        between: 'justify-between',
    }

    return (
        <div 
            className={cn(
                "flex gap-3 pt-4 border-t border-white/5",
                stackOnMobile ? "flex-col-reverse sm:flex-row" : "flex-row",
                alignClasses[align],
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
}

/**
 * FormRow - Horizontal row of form elements that wraps on mobile
 */
export interface FormRowProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Gap between items */
    gap?: 2 | 3 | 4
    /** Vertical alignment */
    align?: 'start' | 'center' | 'end'
    children: React.ReactNode
}

export function FormRow({ 
    gap = 4, 
    align = 'end',
    className, 
    children, 
    ...props 
}: FormRowProps) {
    const gapClasses = {
        2: 'gap-2',
        3: 'gap-3',
        4: 'gap-4',
    }
    
    const alignClasses = {
        start: 'items-start',
        center: 'items-center',
        end: 'items-end',
    }

    return (
        <div 
            className={cn(
                "flex flex-col sm:flex-row",
                gapClasses[gap],
                alignClasses[align],
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
}

export default { FormGrid, FormField, FormSection, FormActions, FormRow }
