'use client';

import * as React from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Copy, Download, ExternalLink } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

interface ConvertedContentCardProps {
  title: string;
  markdown: string;
  sourceUrl: string;
}

export function ConvertedContentCard({
  title,
  markdown,
  sourceUrl,
}: ConvertedContentCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const { toast } = useToast();

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card expansion when clicking copy
    try {
      await navigator.clipboard.writeText(markdown);
      toast({
        title: 'Copied!',
        description: 'Markdown content copied to clipboard',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card expansion when clicking download
    const urlPath = new URL(sourceUrl).pathname;
    const lastPathSegment = urlPath.split('/').filter(Boolean).pop() || 'converted-doc';
    const filename = `${lastPathSegment.replace(/[^a-z0-9-]/gi, '-').toLowerCase()}.md`;
    
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Downloaded',
      description: `Saved as ${filename}`,
    });
  };

  const handleExternalLink = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card expansion when clicking external link
  };

  return (
    <Card
      className={cn(
        "transition-all duration-200",
        isExpanded ? "cursor-default" : "cursor-pointer hover:bg-accent/50"
      )}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center justify-between">
          <span className="truncate">{title}</span>
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground ml-2 shrink-0"
            onClick={handleExternalLink}
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </CardTitle>
      </CardHeader>

      {isExpanded && (
        <>
          <CardContent>
            <pre className="whitespace-pre-wrap break-words text-sm bg-muted p-4 rounded-md">
              {markdown}
            </pre>
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy}>
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </CardFooter>
        </>
      )}
    </Card>
  );
}
