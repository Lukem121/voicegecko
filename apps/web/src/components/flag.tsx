import { cn } from '@acme/ui/lib/utils';
import { getFlag } from '~/lib/flags';

export const Flag = ({
  code,
  emojiBackup,
  className,
}: {
  code: string | undefined;
  emojiBackup?: string;
  className?: string;
}) => {
  if (!code) {
    return emojiBackup;
  }

  const flagPath = getFlag(code);

  if (!flagPath) {
    return emojiBackup;
  }

  return (
    // biome-ignore lint/performance/noImgElement: Rendering SVG
    // biome-ignore lint/nursery/useImageSize: Rendering SVG
    <img
      alt={`${code} flag`}
      className={cn('inline', className)}
      src={flagPath}
    />
  );
};
