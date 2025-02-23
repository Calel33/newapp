'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Copy, Download, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cleanMarkdown } from '@/lib/markdown-utils';
import { useState, useEffect } from 'react';
import type { Components } from 'react-markdown';
import type { ReactNode } from 'react';

interface ConvertedContentCardProps {
  title: string;
  markdown: string;
  sourceUrl?: string;
  onCopy?: () => void;
  onDownload?: () => void;
  defaultOpen?: boolean;
}

interface MarkdownComponentProps {
  children?: ReactNode;
  [key: string]: any;
}

// Define markdown components with proper types
const markdownComponents: Components = {
  h1: ({ children, ...props }: MarkdownComponentProps) => (
    <h1 className="text-2xl font-bold mb-4" {...props}>{children}</h1>
  ),
  h2: ({ children, ...props }: MarkdownComponentProps) => (
    <h2 className="text-xl font-bold mb-3" {...props}>{children}</h2>
  ),
  h3: ({ children, ...props }: MarkdownComponentProps) => (
    <h3 className="text-lg font-bold mb-2" {...props}>{children}</h3>
  ),
  h4: ({ children, ...props }: MarkdownComponentProps) => (
    <h4 className="text-base font-bold mb-2" {...props}>{children}</h4>
  ),
  h5: ({ children, ...props }: MarkdownComponentProps) => (
    <h5 className="text-sm font-bold mb-1" {...props}>{children}</h5>
  ),
  h6: ({ children, ...props }: MarkdownComponentProps) => (
    <h6 className="text-xs font-bold mb-1" {...props}>{children}</h6>
  ),
  
  p: ({ children, ...props }: MarkdownComponentProps) => {
    // Check if the children contain a pre element
    const hasPreElement = React.Children.toArray(children).some(
      child => React.isValidElement(child) && child.type === 'pre'
    );

    // If there's a pre element, just render the children without the p wrapper
    if (hasPreElement) {
      return <>{children}</>;
    }

    // Otherwise, render as normal paragraph
    return <p className="mb-4" {...props}>{children}</p>;
  },
  
  ul: ({ children, ...props }: MarkdownComponentProps) => (
    <ul className="list-disc list-inside mb-4" {...props}>{children}</ul>
  ),
  ol: ({ children, ...props }: MarkdownComponentProps) => (
    <ol className="list-decimal list-inside mb-4" {...props}>{children}</ol>
  ),
  li: ({ children, ...props }: MarkdownComponentProps) => (
    <li className="mb-1" {...props}>{children}</li>
  ),
  
  blockquote: ({ children, ...props }: MarkdownComponentProps) => (
    <blockquote className="border-l-4 border-gray-300 pl-4 italic mb-4" {...props}>
      {children}
    </blockquote>
  ),
  
  code: ({ inline, className, children, ...props }: MarkdownComponentProps & { inline?: boolean }) => {
    const content = String(children).replace(/\n$/, '');
    
    if (inline) {
      return (
        <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded" {...props}>
          {content}
        </code>
      );
    }

    const match = /language-(\w+)/.exec(className || '');
    // Don't wrap in div, use pre directly
    return (
      <pre className="overflow-x-auto p-4 bg-gray-100 dark:bg-gray-800 rounded-lg mb-4">
        <code className={className} {...props}>
          {content}
        </code>
      </pre>
    );
  },
  
  pre: ({ children, ...props }: MarkdownComponentProps) => (
    <div className="not-prose mb-4" {...props}>
      {children}
    </div>
  ),
  
  a: ({ href, children, ...props }: MarkdownComponentProps & { href?: string }) => {
    if (!href) return <span {...props}>{children}</span>;
    
    return (
      <a 
        className="text-blue-600 hover:underline" 
        href={href}
        target={href.startsWith('http') ? '_blank' : undefined}
        rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
        {...props}
      >
        {children}
      </a>
    );
  },
  
  table: ({ children, ...props }: MarkdownComponentProps) => (
    <div className="mb-4 overflow-x-auto" {...props}>
      <table className="min-w-full border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children, ...props }: MarkdownComponentProps) => (
    <thead className="bg-gray-50" {...props}>{children}</thead>
  ),
  tbody: ({ children, ...props }: MarkdownComponentProps) => (
    <tbody {...props}>{children}</tbody>
  ),
  tr: ({ children, ...props }: MarkdownComponentProps) => (
    <tr {...props}>{children}</tr>
  ),
  th: ({ children, ...props }: MarkdownComponentProps) => (
    <th className="border p-2" {...props}>{children}</th>
  ),
  td: ({ children, ...props }: MarkdownComponentProps) => (
    <td className="border p-2" {...props}>{children}</td>
  ),
  
  hr: (props: MarkdownComponentProps) => (
    <hr className="my-4 border-t border-gray-300" {...props} />
  ),
  
  img: ({ src, alt, ...props }: MarkdownComponentProps & { src?: string; alt?: string }) => (
    <img
      src={src || ''}
      alt={alt || ''}
      className="max-w-full h-auto rounded-lg my-4"
      loading="lazy"
      {...props}
    />
  ),
};

export function ConvertedContentCard({
  title,
  markdown,
  sourceUrl,
  onCopy,
  onDownload,
  defaultOpen = false,
}: ConvertedContentCardProps) {
  const { toast } = useToast();
  const [processedMarkdown, setProcessedMarkdown] = useState(markdown);
  const [isOpen, setIsOpen] = useState(defaultOpen);

  useEffect(() => {
    setProcessedMarkdown(cleanMarkdown(markdown));
  }, [markdown]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(processedMarkdown);
      toast({
        title: "Copied to clipboard",
        description: "The content has been copied to your clipboard.",
      });
      onCopy?.();
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy content to clipboard. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    try {
      const blob = new Blob([processedMarkdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.toLowerCase().replace(/\s+/g, '-')}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onDownload?.();
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Failed to download content. Please try again.",
        variant: "destructive",
      });
    }
  };

  const toggleCard = () => {
    setIsOpen(!isOpen);
  };

  return (
    <Card className="w-full">
      <CardHeader 
        className="flex flex-row items-center justify-between space-y-0 pb-2 cursor-pointer select-none"
        onClick={toggleCard}
      >
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          {title}
          <Button 
            variant="ghost" 
            size="sm" 
            className="p-0 h-auto"
            onClick={(e) => {
              e.stopPropagation();
              toggleCard();
            }}
          >
            {isOpen ? (
              <ChevronUp className="h-4 w-4 text-gray-500 transition-transform" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-500 transition-transform" />
            )}
          </Button>
        </CardTitle>
        <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
          {sourceUrl && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => window.open(sourceUrl, '_blank')}
              title="Open source URL"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={handleCopy}
            title="Copy content"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleDownload}
            title="Download content"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <div
        className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out ${
          isOpen ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <CardContent className="pt-2">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              components={markdownComponents}
              remarkPlugins={[remarkGfm]}
            >
              {processedMarkdown}
            </ReactMarkdown>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
