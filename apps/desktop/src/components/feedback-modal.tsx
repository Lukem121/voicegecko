import { log } from '@acme/observability/log';
import { Button } from '@acme/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@acme/ui/components/ui/dialog';

import { Textarea } from '@acme/ui/components/ui/textarea';
import { Loader2, MessageSquare } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';

import { useSendFeedback } from '~/features/transcription/use-send-feedback';
import { analytics } from '~/lib/analytics/posthog-analytics';

type FeedbackModalProps = {
  isOpen: boolean;
  onClose: () => void;
  transcriptionId: number;
  transcriptionContent: string;
};

// Character limit for feedback (matching backend constraint)
const MAX_FEEDBACK_LENGTH = 1000;

// Threshold for showing warning color (90% of max length)
const WARNING_THRESHOLD_RATIO = 0.9;

// Extra buffer for textarea maxLength to improve UX
const MAX_LENGTH_BUFFER = 50;

// Helper function to determine text color based on feedback length
function getFeedbackLengthColor(length: number): string {
  if (length > MAX_FEEDBACK_LENGTH) {
    return 'text-red-500';
  }
  if (length > MAX_FEEDBACK_LENGTH * WARNING_THRESHOLD_RATIO) {
    return 'text-yellow-500';
  }
  return 'text-muted-foreground';
}

export function FeedbackModal({
  isOpen,
  onClose,
  transcriptionId,
  // biome-ignore lint: transcriptionContent may be used in future to show original content
  transcriptionContent,
}: FeedbackModalProps) {
  const [feedback, setFeedback] = useState('');
  const { sendFeedback, isSending } = useSendFeedback();

  // Track feedback modal open
  React.useEffect(() => {
    if (isOpen) {
      analytics.trackFeatureFirstUse('feedback_modal');
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    const trimmedFeedback = feedback.trim();

    if (!trimmedFeedback) {
      toast.error('Please enter your feedback before submitting.');
      return;
    }

    if (trimmedFeedback.length > MAX_FEEDBACK_LENGTH) {
      toast.error(
        `Feedback is too long. Maximum ${MAX_FEEDBACK_LENGTH} characters allowed.`
      );
      return;
    }

    try {
      await sendFeedback({
        transcriptionId,
        feedback: trimmedFeedback,
      });

      // Track successful feedback submission
      analytics.track('feedback_submitted', {
        type: 'transcription_quality',
        rating: undefined,
        has_text: trimmedFeedback.length > 0,
      });

      toast.success(
        'Feedback sent successfully! Thank you for helping us improve.'
      );

      // Reset form and close modal
      setFeedback('');
      onClose();
    } catch (error) {
      log.error('Failed to send feedback:', error);
      // The error message from the backend should be user-friendly
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to send feedback. Please try again later.';
      toast.error(errorMessage);
    }
  };

  const handleClose = () => {
    if (!isSending) {
      setFeedback('');
      onClose();
    }
  };

  return (
    <Dialog onOpenChange={handleClose} open={isOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Report Feedback
          </DialogTitle>
          <DialogDescription>
            Help us improve by sharing what you expected to see instead. Your
            feedback helps us make transcriptions more accurate.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Feedback input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-medium text-sm" htmlFor="feedback">
                What did you expect instead?
              </label>
              <span
                className={`text-xs ${getFeedbackLengthColor(feedback.length)}`}
              >
                {feedback.length}/{MAX_FEEDBACK_LENGTH}
              </span>
            </div>
            <Textarea
              className={`min-h-[150px] w-full max-w-full resize-none whitespace-pre-wrap ${
                feedback.length > MAX_FEEDBACK_LENGTH ? 'border-red-500' : ''
              }`}
              disabled={isSending}
              id="feedback"
              maxLength={MAX_FEEDBACK_LENGTH + MAX_LENGTH_BUFFER}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Describe what you expected instead..."
              // biome-ignore lint/suspicious/noExplicitAny: fieldSizing is a newer CSS property not fully typed in React
              style={{ fieldSizing: 'fixed' } as any} // Allow a bit over for better UX
              value={feedback} // Override field-sizing-content from base component
            />
            {feedback.length > MAX_FEEDBACK_LENGTH && (
              <p className="text-red-500 text-xs">
                Feedback is too long. Please shorten it by{' '}
                {feedback.length - MAX_FEEDBACK_LENGTH} characters.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button disabled={isSending} onClick={handleClose} variant="outline">
            Cancel
          </Button>
          <Button
            disabled={
              isSending ||
              !feedback.trim() ||
              feedback.length > MAX_FEEDBACK_LENGTH
            }
            onClick={handleSubmit}
          >
            {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Feedback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
