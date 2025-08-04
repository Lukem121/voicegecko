import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@acme/ui/components/ui/card';

export default function AppPage() {
  return (
    <Card className="p-4">
      <CardHeader>
        <CardTitle>Dashboard</CardTitle>
        <CardDescription>View your dashboard</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Dashboard</p>
      </CardContent>
      <CardFooter>
        <p>Dashboard footer</p>
      </CardFooter>
    </Card>
  );
}
