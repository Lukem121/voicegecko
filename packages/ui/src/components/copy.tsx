'use client';

import { Button } from '@acme/ui/components/ui/button';
import { log } from '@acme/observability';
import {
Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@acme/ui/components/ui/tooltip'

import { cn } from '@acme/ui/lib/utils';
import { CheckIcon, CopyIcon } from 'lucide-react';
import { useState } from 'react';

export const CopyButton = ({
  text,
  className,
  variant = 'outline',
  onClick,
}: {
  text: string;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  onClick?: () => void;
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onClick?.();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      log.error('Failed to copy text: ', err);
    }
  };

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            aria-label={copied ? 'Copied' : 'Copy to clipboard'}
            className={cn('disabled:opacity-100', className)}
            disabled={copied}
            onClick={handleCopy}
            size="icon"
            variant={variant}
          >
            <div
              className={cn(
                'transition-all',
                copied ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
              )}
            >
              <CheckIcon
                aria-hidden="true"
                className="stroke-emerald-500"
                size={16}
              />
            </div>
            <div
              className={cn(
                'absolute transition-all',
                copied ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
              )}
            >
              <CopyIcon aria-hidden="true" size={16} />
            </div>
          </Button>
        </TooltipTrigger>
        <TooltipContent className="px-2 py-1 text-xs">
          Click to copy
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
