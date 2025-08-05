import { Badge } from '@acme/ui/components/ui/badge';
import { Button } from '@acme/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@acme/ui/components/ui/dialog';
import { Keyboard } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { analytics } from '~/lib/analytics/posthog-analytics';
import { isValidShortcut, normalizeKeys } from '~/lib/shortcuts/utils';

interface ShortcutRecorderProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (keys: string[]) => void;
  actionName: string;
}

export function ShortcutRecorder({
  isOpen,
  onClose,
  onSave,
  actionName,
}: ShortcutRecorderProps) {
  const [recordedKeys, setRecordedKeys] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Helper function to extract modifier keys
  const getModifierKeys = useCallback((event: KeyboardEvent): string[] => {
    const keys: string[] = [];
    if (event.metaKey) {
      keys.push('Command');
    }
    if (event.ctrlKey) {
      keys.push('Control');
    }
    if (event.altKey) {
      keys.push('Alt');
    }
    if (event.shiftKey) {
      keys.push('Shift');
    }
    return keys;
  }, []);

  // Helper function to process the main key
  const processMainKey = useCallback((key: string): string | null => {
    const keyName = key.toLowerCase();

    // Skip modifier keys
    if (['control', 'alt', 'shift', 'meta'].includes(keyName)) {
      return null;
    }

    // Handle special keys
    if (keyName === ' ') {
      return 'Space';
    }
    if (keyName.startsWith('arrow')) {
      return key; // Keep arrow keys as-is
    }
    return key.toUpperCase();
  }, []);

  // Helper function to validate and set error state
  const validateAndSetKeys = useCallback(
    (keys: string[], normalizedKeys: string[]) => {
      setRecordedKeys(normalizedKeys);

      if (keys.length > 0 && !isValidShortcut(normalizedKeys)) {
        setError(
          'Please include at least one modifier key (Ctrl, Alt, Shift, Cmd)'
        );
      } else {
        setError(null);
      }
    },
    []
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      event.preventDefault();

      const modifierKeys = getModifierKeys(event);
      const mainKey = processMainKey(event.key);

      const allKeys = [...modifierKeys];
      if (mainKey) {
        allKeys.push(mainKey);
      }

      const normalizedKeys = normalizeKeys(allKeys);
      validateAndSetKeys(allKeys, normalizedKeys);
    },
    [getModifierKeys, processMainKey, validateAndSetKeys]
  );

  useEffect(() => {
    if (isOpen) {
      setRecordedKeys([]);
      setError(null);
      document.addEventListener('keydown', handleKeyDown);
    } else {
      document.removeEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  const handleSave = () => {
    if (isValidShortcut(recordedKeys)) {
      // Track shortcut configuration
      analytics.track('settings_changed', {
        category: 'shortcuts',
        setting_key: actionName,
        old_value: 'previous', // Could be enhanced to track actual old value
        new_value: recordedKeys.join('+'),
      });

      analytics.trackFeatureFirstUse('custom_shortcut');

      onSave(recordedKeys);
      onClose();
    }
  };

  const handleClear = () => {
    setRecordedKeys([]);
    setError(null);
  };

  return (
    <Dialog onOpenChange={onClose} open={isOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Shortcut for "{actionName}"</DialogTitle>
          <DialogDescription>
            Press the desired key combination. The new shortcut will be
            displayed below.
          </DialogDescription>
        </DialogHeader>
        <div className="flex min-h-[100px] items-center justify-center rounded-lg border-2 border-dashed bg-muted">
          {recordedKeys.length > 0 ? (
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2">
                {recordedKeys.map((key, _) => (
                  <Badge
                    className="px-3 py-2 text-lg"
                    key={key}
                    variant="outline"
                  >
                    {key}
                  </Badge>
                ))}
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Keyboard className="h-8 w-8" />
              <span>Waiting for input...</span>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button onClick={handleClear} variant="outline">
            Clear
          </Button>
          <Button
            disabled={recordedKeys.length === 0 || !!error}
            onClick={handleSave}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
