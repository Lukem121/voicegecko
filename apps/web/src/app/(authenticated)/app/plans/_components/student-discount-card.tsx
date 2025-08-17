import { Button } from '@acme/ui/components/ui/button';
import { Card } from '@acme/ui/components/ui/card';

type StudentDiscountCardProps = {
  onGetStarted: () => void;
};

export const StudentDiscountCard = ({
  onGetStarted,
}: StudentDiscountCardProps) => {
  return (
    <Card className="mb-12 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">Student Discount</p>
          <p className="text-muted-foreground text-sm">
            Students get 50% off the Pro plan
          </p>
        </div>
        <Button onClick={onGetStarted} variant="outline">
          Get started
        </Button>
      </div>
    </Card>
  );
};
