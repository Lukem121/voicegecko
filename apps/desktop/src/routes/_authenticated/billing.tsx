import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  Calendar,
  CreditCard,
  DollarSign,
  Download,
  FileText,
} from "lucide-react";

import { Badge } from "@acme/ui/components/ui/badge";
import { Button } from "@acme/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@acme/ui/components/ui/card";
import { Progress } from "@acme/ui/components/ui/progress";
import { Separator } from "@acme/ui/components/ui/separator";

export const Route = createFileRoute("/_authenticated/billing")({
  component: BillingPage,
});

function BillingPage() {
  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Billing & Subscription
          </h1>
          <p className="text-muted-foreground">
            Manage your subscription and billing information
          </p>
        </div>
        <Button>Upgrade Plan</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Current Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Current Plan
            </CardTitle>
            <CardDescription>Your subscription details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">Pro Plan</span>
                <Badge>Active</Badge>
              </div>
              <p className="text-muted-foreground text-sm">$19.99/month</p>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Next billing date</span>
                <span className="text-muted-foreground text-sm">
                  Jan 15, 2024
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Renewal amount</span>
                <span className="text-muted-foreground text-sm">$19.99</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usage This Month */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Usage This Month
            </CardTitle>
            <CardDescription>Your current usage metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Transcription Hours</span>
                <span className="text-muted-foreground text-sm">45 / 100</span>
              </div>
              <Progress value={45} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">API Calls</span>
                <span className="text-muted-foreground text-sm">
                  1,234 / 5,000
                </span>
              </div>
              <Progress value={25} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Storage Used</span>
                <span className="text-muted-foreground text-sm">
                  2.3 GB / 10 GB
                </span>
              </div>
              <Progress value={23} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Payment Method */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Method
            </CardTitle>
            <CardDescription>Your current payment details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-100">
                <CreditCard className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">•••• •••• •••• 4242</p>
                <p className="text-muted-foreground text-xs">Expires 12/25</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Button variant="outline" size="sm" className="w-full">
                Update Payment Method
              </Button>
              <Button variant="outline" size="sm" className="w-full">
                Download Invoice
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Billing History
          </CardTitle>
          <CardDescription>Your recent billing transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                date: "Dec 15, 2023",
                amount: "$19.99",
                status: "Paid",
                invoice: "INV-2023-12-001",
              },
              {
                date: "Nov 15, 2023",
                amount: "$19.99",
                status: "Paid",
                invoice: "INV-2023-11-001",
              },
              {
                date: "Oct 15, 2023",
                amount: "$19.99",
                status: "Paid",
                invoice: "INV-2023-10-001",
              },
              {
                date: "Sep 15, 2023",
                amount: "$19.99",
                status: "Paid",
                invoice: "INV-2023-09-001",
              },
            ].map((transaction, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-green-100">
                    <Calendar className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{transaction.invoice}</p>
                    <p className="text-muted-foreground text-xs">
                      {transaction.date}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {transaction.amount}
                  </span>
                  <Badge variant="outline">{transaction.status}</Badge>
                  <Button variant="outline" size="sm">
                    <Download className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Plan Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Available Plans</CardTitle>
          <CardDescription>
            Compare and upgrade to a plan that fits your needs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-3 rounded-lg border p-4">
              <div>
                <h3 className="font-semibold">Basic</h3>
                <p className="text-2xl font-bold">
                  $9.99
                  <span className="text-muted-foreground text-sm font-normal">
                    /month
                  </span>
                </p>
              </div>
              <ul className="space-y-1 text-sm">
                <li>• 25 hours transcription</li>
                <li>• 1,000 API calls</li>
                <li>• 5 GB storage</li>
                <li>• Email support</li>
              </ul>
              <Button variant="outline" size="sm" className="w-full">
                Downgrade
              </Button>
            </div>

            <div className="relative space-y-3 rounded-lg border-2 border-blue-500 p-4">
              <Badge className="absolute -top-2 left-4">Current</Badge>
              <div>
                <h3 className="font-semibold">Pro</h3>
                <p className="text-2xl font-bold">
                  $19.99
                  <span className="text-muted-foreground text-sm font-normal">
                    /month
                  </span>
                </p>
              </div>
              <ul className="space-y-1 text-sm">
                <li>• 100 hours transcription</li>
                <li>• 5,000 API calls</li>
                <li>• 10 GB storage</li>
                <li>• Priority support</li>
              </ul>
              <Button size="sm" className="w-full" disabled>
                Current Plan
              </Button>
            </div>

            <div className="space-y-3 rounded-lg border p-4">
              <div>
                <h3 className="font-semibold">Enterprise</h3>
                <p className="text-2xl font-bold">
                  $49.99
                  <span className="text-muted-foreground text-sm font-normal">
                    /month
                  </span>
                </p>
              </div>
              <ul className="space-y-1 text-sm">
                <li>• Unlimited transcription</li>
                <li>• Unlimited API calls</li>
                <li>• 100 GB storage</li>
                <li>• 24/7 phone support</li>
              </ul>
              <Button size="sm" className="w-full">
                Upgrade
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
