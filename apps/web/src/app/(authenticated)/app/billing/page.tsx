import {
  Activity,
  AlertTriangle,
  Calendar,
  CreditCard,
  Download,
} from "lucide-react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@acme/ui/components/ui/alert";
import { Badge } from "@acme/ui/components/ui/badge";
import { Button } from "@acme/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@acme/ui/components/ui/card";

export default function BillingPage() {
  const invoices = [
    {
      id: "INV-001",
      date: "Dec 1, 2024",
      amount: "$29.00",
      status: "Overdue",
      plan: "Voice Gecko Pro",
      needsAction: true,
    },
    {
      id: "INV-002",
      date: "Nov 15, 2024",
      amount: "$29.00",
      status: "Failed",
      plan: "Voice Gecko Pro",
      needsAction: true,
    },
    {
      id: "INV-003",
      date: "Nov 1, 2024",
      amount: "$29.00",
      status: "Paid",
      plan: "Voice Gecko Pro",
      needsAction: false,
    },
    {
      id: "INV-004",
      date: "Oct 1, 2024",
      amount: "$29.00",
      status: "Paid",
      plan: "Voice Gecko Pro",
      needsAction: false,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-medium">Billing</h1>
        <p className="text-muted-foreground">
          Manage your subscription and billing information
        </p>
      </div>

      {/* Payment Alert */}
      <Alert variant="destructive">
        <AlertTriangle />
        <AlertTitle>Payment Action Required</AlertTitle>
        <AlertDescription>
          You have overdue invoices that need immediate attention.
        </AlertDescription>
      </Alert>

      {/* Current Plan */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="mb-2 text-xl font-medium">
                Current Plan
              </CardTitle>
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-medium">Voice Gecko Pro</h3>
                <Badge variant="secondary">Active</Badge>
              </div>
            </div>
            <div>
              <Button variant="outline">Manage Subscription</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            $29/month • Billed monthly • Next billing date: Jan 1, 2025
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Payment Method */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-medium">
              <CreditCard className="h-5 w-5" />
              Payment Method
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-5 w-8 items-center justify-center rounded bg-blue-600 text-xs font-medium text-white">
                  VISA
                </div>
                <div>
                  <p className="font-medium">•••• •••• •••• 4242</p>
                  <p className="text-muted-foreground text-sm">Expires 12/26</p>
                </div>
              </div>
              <Badge variant="secondary">Default</Badge>
            </div>
            <Button variant="outline" className="w-full">
              Update Payment Method
            </Button>
          </CardContent>
        </Card>

        {/* Usage Overview */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-medium">
              <Activity className="h-5 w-5" />
              Usage This Month
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">Transcriptions</span>
                <span className="text-sm font-medium">247 / Unlimited</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-200">
                <div className="bg-primary h-2 w-1/4 rounded-full"></div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">Words processed</span>
                <span className="text-sm font-medium">45,832</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Time saved</span>
                <span className="text-sm font-medium">2.4 hours</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Billing History */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-medium">
            <Calendar className="h-5 w-5" />
            Billing History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-medium">{invoice.id}</p>
                    <p className="text-muted-foreground text-sm">
                      {invoice.plan}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm">{invoice.date}</p>
                    <Badge
                      variant={
                        invoice.status === "Paid"
                          ? "secondary"
                          : invoice.status === "Overdue" ||
                              invoice.status === "Failed"
                            ? "destructive"
                            : "default"
                      }
                      className="text-xs"
                    >
                      {invoice.status}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium">{invoice.amount}</span>
                  {invoice.needsAction ? (
                    <div className="flex gap-2">
                      <Button variant="destructive" size="sm">
                        Pay Now
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
