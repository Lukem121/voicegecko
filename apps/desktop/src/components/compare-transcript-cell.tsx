import { CopyButton } from '@acme/ui/components/copy';

type CompareTranscriptCellProps = {
  text: string;
  textSnippet?: string;
};

export const CompareTranscriptCell = ({
  text,
  textSnippet,
}: CompareTranscriptCellProps) => {
  const displayText = text || textSnippet;

  if (!displayText) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <div className="flex min-w-[12rem] max-w-prose items-start gap-2">
      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
        {displayText}
      </p>
      <CopyButton className="shrink-0" text={displayText} variant="ghost" />
    </div>
  );
};
