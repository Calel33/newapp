'use client';

import * as React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ConvertedContentCardProps {
  siteName: string;
  content: string;
  className?: string;
}

export function ConvertedContentCard({
  siteName,
  content,
  className,
}: ConvertedContentCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <Card
      className={cn("cursor-pointer p-4 transition-all duration-200", className)}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-semibold">{siteName}</h3>
        {isExpanded && (
          <div className="mt-2 text-sm text-gray-600">
            <pre className="whitespace-pre-wrap">{content}</pre>
          </div>
        )}
      </div>
    </Card>
  );
}
