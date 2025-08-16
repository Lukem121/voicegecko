import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@acme/ui/components/ui/alert';
import { Button } from '@acme/ui/components/ui/button';
import { Card, CardContent } from '@acme/ui/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface PlansErrorStateProps {
  error: {
    code?: string | undefined;
    message?: string | undefined;
    status: number;
    statusText: string;
  };
}

export const PlansErrorState = ({ error }: PlansErrorStateProps) => {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-5xl p-8">
      <div className="mb-8 text-center">
        <h1 className="mb-2 font-semibold text-2xl tracking-tight">Plans</h1>
        <p className="text-muted-foreground">
          Choose the plan that works for you
        </p>
      </div>

      <Alert variant="destructive">
        <AlertTriangle />
        <AlertTitle>Failed to Load Pricing Data</AlertTitle>
        <AlertDescription>
          {error.message ??
            `Failed to load pricing information (${error.status}: ${error.statusText})`}
        </AlertDescription>
      </Alert>

      <Card className="mt-8">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-3">
            <Button onClick={() => window.location.reload()} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
            <Button onClick={() => router.push('/app')} variant="outline">
              Go to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
