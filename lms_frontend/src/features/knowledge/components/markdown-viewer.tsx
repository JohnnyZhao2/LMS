import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Code, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface MarkdownViewerProps {
  content: string;
}

export function MarkdownViewer({ content }: MarkdownViewerProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      className="prose prose-sm max-w-none"
      components={{
        code: ({ node, inline, className, children, ...props }) => {
          const match = /language-(\w+)/.exec(className || '');
          const code = String(children).replace(/\n$/, '');

          if (inline) {
            return (
              <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                {children}
              </code>
            );
          }

          return (
            <div className="relative bg-gray-50 rounded-lg overflow-hidden my-4">
              <div className="flex items-center justify-between px-4 py-2 bg-gray-200">
                <span className="text-xs font-mono text-gray-600">
                  {match ? match[1] : 'code'}
                </span>
                <button
                  onClick={() => handleCopyCode(code)}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  {copiedCode === code ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <pre className="p-4 overflow-x-auto">
                <code>{children}</code>
              </pre>
            </div>
          );
        },
        a: ({ node, ...props }) => (
          <a {...props} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer" />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}