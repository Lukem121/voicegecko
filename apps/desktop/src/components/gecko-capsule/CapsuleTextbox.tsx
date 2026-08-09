import { Button } from '@acme/ui/components/ui/button';
import { Textarea } from '@acme/ui/components/ui/textarea';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { useState } from 'react';
import { useDictationStore } from '~/stores/dictation.store';

type CapsuleTextboxProps = {
  initialText?: string;
  onConfirm?: (text: string) => void;
  onCancel?: () => void;
};

export function CapsuleTextbox({
  initialText = '',
  onConfirm,
  onCancel,
}: CapsuleTextboxProps) {
  const [text, setText] = useState(initialText);
  const confirmPaste = useDictationStore((s) => s.confirmPaste);

  const handlePaste = async () => {
    await confirmPaste(text);
    onConfirm?.(text);
  };

  const handleCopy = async () => {
    await writeText(text);
    onConfirm?.(text);
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-background p-3 shadow-lg">
      <Textarea
        className="min-h-[80px] resize-none"
        onChange={(e) => setText(e.target.value)}
        placeholder="Edit your dictation…"
        value={text}
      />
      <div className="flex justify-end gap-2">
        <Button onClick={onCancel} type="button" variant="ghost">
          Cancel
        </Button>
        <Button onClick={handleCopy} type="button" variant="secondary">
          Copy
        </Button>
        <Button onClick={handlePaste} type="button">
          Paste
        </Button>
      </div>
    </div>
  );
}
