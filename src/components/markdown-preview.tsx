"use client"

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

export function MarkdownPreview({ content, className }: MarkdownPreviewProps) {
  return (
    <ScrollArea className={cn("h-64 w-full rounded-md border bg-background", className)}>
      <div className="p-4">
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={{
            // 自定义标题样式
            h1: ({ children }) => (
              <h1 className="text-2xl font-bold text-primary mb-4 mt-6 first:mt-0 border-b border-border pb-2">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-xl font-semibold text-primary mb-3 mt-5 first:mt-0 border-b border-border pb-1">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-lg font-medium text-primary mb-2 mt-4 first:mt-0">
                {children}
              </h3>
            ),
            h4: ({ children }) => (
              <h4 className="text-base font-medium text-primary mb-2 mt-3 first:mt-0">
                {children}
              </h4>
            ),
            h5: ({ children }) => (
              <h5 className="text-sm font-medium text-primary mb-2 mt-3 first:mt-0">
                {children}
              </h5>
            ),
            h6: ({ children }) => (
              <h6 className="text-sm font-medium text-muted-foreground mb-2 mt-3 first:mt-0">
                {children}
              </h6>
            ),
            // 段落样式
            p: ({ children }) => (
              <p className="mb-4 text-foreground leading-relaxed">
                {children}
              </p>
            ),
            // 列表样式
            ul: ({ children }) => (
              <ul className="mb-4 ml-6 list-disc space-y-1">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="mb-4 ml-6 list-decimal space-y-1">
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li className="text-foreground">
                {children}
              </li>
            ),
            // 表格样式
            table: ({ children }) => (
              <div className="mb-4 overflow-x-auto">
                <table className="min-w-full border-collapse border border-border">
                  {children}
                </table>
              </div>
            ),
            thead: ({ children }) => (
              <thead className="bg-muted">
                {children}
              </thead>
            ),
            tbody: ({ children }) => (
              <tbody>
                {children}
              </tbody>
            ),
            tr: ({ children }) => (
              <tr className="border-b border-border">
                {children}
              </tr>
            ),
            th: ({ children }) => (
              <th className="border border-border px-4 py-2 text-left font-medium text-foreground">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="border border-border px-4 py-2 text-foreground">
                {children}
              </td>
            ),
            // 代码块样式
            code: ({ children, ...props }) => {
              const inline = 'inline' in props && props.inline;
              if (inline) {
                return (
                  <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono text-foreground">
                    {children}
                  </code>
                );
              }
              return (
                <code className="block rounded bg-muted p-4 text-sm font-mono text-foreground overflow-x-auto">
                  {children}
                </code>
              );
            },
            pre: ({ children }) => (
              <pre className="mb-4 rounded bg-muted p-4 overflow-x-auto">
                {children}
              </pre>
            ),
            // 引用样式
            blockquote: ({ children }) => (
              <blockquote className="mb-4 border-l-4 border-primary pl-4 italic text-muted-foreground">
                {children}
              </blockquote>
            ),
            // 链接样式
            a: ({ children, href }) => (
              <a 
                href={href} 
                className="text-primary underline hover:text-primary/80 transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                {children}
              </a>
            ),
            // 分割线样式
            hr: () => (
              <hr className="my-6 border-t border-border" />
            ),
            // 图片样式
            img: ({ src, alt }) => (
              <img 
                src={src} 
                alt={alt} 
                className="mb-4 max-w-full h-auto rounded border border-border"
              />
            ),
          }}
        >
          {content}
        </ReactMarkdown>
        </div>
      </div>
    </ScrollArea>
  );
}
