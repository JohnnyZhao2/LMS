import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
    Bold,
    Italic,
    Strikethrough,
    Code,
    List,
    ListOrdered,
    Heading1,
    Heading2,
    Heading3,
    Quote,
    Minus,
    Undo,
    Redo,
} from 'lucide-react';

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    contentClassName?: string;
}

/**
 * 工具栏按钮组件
 */
const ToolbarButton: React.FC<{
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    title: string;
    children: React.ReactNode;
}> = ({ onClick, isActive, disabled, title, children }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={`w-8 h-8 flex items-center justify-center rounded-md transition-all ${isActive
            ? 'bg-primary-50 text-primary'
            : 'text-text-muted hover:bg-muted'
            } ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
    >
        {children}
    </button>
);

/**
 * 编辑器工具栏
 */
const Toolbar: React.FC<{ editor: Editor | null }> = ({ editor }) => {
    if (!editor) return null;

    return (
        <div className="flex items-center gap-0.5 p-1 border-b border-border bg-background flex-wrap">
            {/* 撤销/重做 */}
            <ToolbarButton
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().undo()}
                title="撤销"
            >
                <Undo className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().redo()}
                title="重做"
            >
                <Redo className="w-4 h-4" />
            </ToolbarButton>

            <div className="w-px h-4 bg-muted mx-1" />

            {/* 标题 */}
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                isActive={editor.isActive('heading', { level: 1 })}
                title="一级标题"
            >
                <Heading1 className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                isActive={editor.isActive('heading', { level: 2 })}
                title="二级标题"
            >
                <Heading2 className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                isActive={editor.isActive('heading', { level: 3 })}
                title="三级标题"
            >
                <Heading3 className="w-4 h-4" />
            </ToolbarButton>

            <div className="w-px h-4 bg-muted mx-1" />

            {/* 文本格式 */}
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleBold().run()}
                isActive={editor.isActive('bold')}
                title="加粗"
            >
                <Bold className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleItalic().run()}
                isActive={editor.isActive('italic')}
                title="斜体"
            >
                <Italic className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleStrike().run()}
                isActive={editor.isActive('strike')}
                title="删除线"
            >
                <Strikethrough className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleCode().run()}
                isActive={editor.isActive('code')}
                title="行内代码"
            >
                <Code className="w-4 h-4" />
            </ToolbarButton>

            <div className="w-px h-4 bg-muted mx-1" />

            {/* 列表 */}
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                isActive={editor.isActive('bulletList')}
                title="无序列表"
            >
                <List className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                isActive={editor.isActive('orderedList')}
                title="有序列表"
            >
                <ListOrdered className="w-4 h-4" />
            </ToolbarButton>

            <div className="w-px h-4 bg-muted mx-1" />

            {/* 块级元素 */}
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                isActive={editor.isActive('blockquote')}
                title="引用"
            >
                <Quote className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                isActive={editor.isActive('codeBlock')}
                title="代码块"
            >
                <Code className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().setHorizontalRule().run()}
                title="分割线"
            >
                <Minus className="w-4 h-4" />
            </ToolbarButton>
        </div>
    );
};

/**
 * 富文本编辑器组件
 * 基于 tiptap 实现所见即所得编辑
 */
export const RichTextEditor: React.FC<RichTextEditorProps> = ({
    value,
    onChange,
    placeholder = '开始输入...',
    className = '',
    contentClassName = '',
}) => {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
            }),
        ],
        content: value,
        editorProps: {
            attributes: {
                class: cn('prose prose-gray !max-w-none focus:outline-none min-h-[calc(100vh-100px)] text-foreground prose-p:my-0 prose-headings:mb-4 prose-headings:mt-0 p-0', contentClassName),
            },
        },
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
    });

    // 外部 value 变化时同步到编辑器
    useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value);
        }
    }, [editor, value]);

    return (
        <div className={cn("bg-background overflow-hidden flex flex-col", className)}>
            <Toolbar editor={editor} />
            <div className="relative flex-1">
                <EditorContent editor={editor} className="h-full" />
                {editor?.isEmpty && !value && (
                    <div className={cn("absolute top-4 left-4 text-text-muted pointer-events-none text-sm", (contentClassName?.includes('p-0') || contentClassName?.includes('px-0')) && "top-2 left-2 p-0")}>
                        {placeholder}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RichTextEditor;
