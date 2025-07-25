import { useState } from "react";
import { Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@acme/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@acme/ui/components/ui/dialog";
import { Textarea } from "@acme/ui/components/ui/textarea";

import { useSendFeedback } from "~/features/transcription/use-send-feedback";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  transcriptionId: number;
  transcriptionContent: string;
}

// Character limit for feedback (matching backend constraint)
const MAX_FEEDBACK_LENGTH = 1000;

export function FeedbackModal({
  isOpen,
  onClose,
  transcriptionId,
  transcriptionContent,
}: FeedbackModalProps) {
  const [feedback, setFeedback] = useState("");
  const { sendFeedback, isSending } = useSendFeedback();

  const handleSubmit = async () => {
    const trimmedFeedback = feedback.trim();

    if (!trimmedFeedback) {
      toast.error("Please enter your feedback before submitting.");
      return;
    }

    if (trimmedFeedback.length > MAX_FEEDBACK_LENGTH) {
      toast.error(
        `Feedback is too long. Maximum ${MAX_FEEDBACK_LENGTH} characters allowed.`,
      );
      return;
    }

    try {
      await sendFeedback({
        transcriptionId,
        feedback: trimmedFeedback,
      });

      toast.success(
        "Feedback sent successfully! Thank you for helping us improve.",
      );

      // Reset form and close modal
      setFeedback("");
      onClose();
    } catch (error) {
      console.error("Failed to send feedback:", error);
      // The error message from the backend should be user-friendly
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to send feedback. Please try again later.";
      toast.error(errorMessage);
    }
  };

  const handleClose = () => {
    if (!isSending) {
      setFeedback("");
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
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
              <label htmlFor="feedback" className="text-sm font-medium">
                What did you expect instead?
              </label>
              <span
                className={`text-xs ${
                  feedback.length > MAX_FEEDBACK_LENGTH
                    ? "text-red-500"
                    : feedback.length > MAX_FEEDBACK_LENGTH * 0.9
                      ? "text-yellow-500"
                      : "text-muted-foreground"
                }`}
              >
                {feedback.length}/{MAX_FEEDBACK_LENGTH}
              </span>
            </div>
            <Textarea
              id="feedback"
              placeholder="Describe what you expected instead..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className={`min-h-[150px] w-full max-w-full resize-none whitespace-pre-wrap ${
                feedback.length > MAX_FEEDBACK_LENGTH ? "border-red-500" : ""
              }`}
              disabled={isSending}
              maxLength={MAX_FEEDBACK_LENGTH + 50} // Allow a bit over for better UX
              style={{ fieldSizing: "fixed" } as any} // Override field-sizing-content from base component
            />
            {feedback.length > MAX_FEEDBACK_LENGTH && (
              <p className="text-xs text-red-500">
                Feedback is too long. Please shorten it by{" "}
                {feedback.length - MAX_FEEDBACK_LENGTH} characters.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isSending ||
              !feedback.trim() ||
              feedback.length > MAX_FEEDBACK_LENGTH
            }
          >
            {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Feedback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
