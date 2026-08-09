import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@acme/ui/components/ui/alert';
import { Button } from '@acme/ui/components/ui/button';
import { AlertTriangle, X } from 'lucide-react';

type AlertBannerProps = {
  show: boolean;
  variant: 'default' | 'destructive';
  title: string;
  message: string;
  onClose: () => void;
};

export const AlertBanner = ({
  show,
  variant,
  title,
  message,
  onClose,
}: AlertBannerProps) => {
  if (!show) {
    return null;
  }

  return (
    <Alert className="mb-8" variant={variant}>
      <AlertTriangle />
      <AlertTitle className="flex items-center justify-between">
        {title}
        <Button
          className="h-auto p-1"
          onClick={onClose}
          size="sm"
          variant="ghost"
        >
          <X className="h-4 w-4" />
        </Button>
      </AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
};
