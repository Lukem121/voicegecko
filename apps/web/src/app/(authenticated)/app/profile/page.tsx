import { getServerSession } from '@acme/auth/utils/get-session';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@acme/ui/components/ui/avatar';
import { Badge } from '@acme/ui/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@acme/ui/components/ui/card';
import { Separator } from '@acme/ui/components/ui/separator';
import { Calendar, Mail, Shield, User2 } from 'lucide-react';

export default async function WebProfilePage() {
  const session = await getServerSession();
  const user = session?.user ?? null;

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="mb-2 font-semibold text-2xl tracking-tight">Profile</h1>
        <p className="text-muted-foreground">
          View your account settings and preferences
        </p>
      </div>

      <section>
        <div className="mb-6">
          <h2 className="mb-2 font-semibold text-xl">Account Information</h2>
          <p className="text-muted-foreground text-sm">
            Your personal details and account status
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-semibold text-lg">
                <User2 className="h-5 w-5" />
                Profile Information
              </CardTitle>
              <CardDescription>Your personal account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage alt={user?.name ?? ''} src={user?.image ?? ''} />
                  <AvatarFallback>
                    {user?.name
                      ? user.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                      : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <h3 className="font-semibold text-lg">
                    {user?.name ?? 'Unknown User'}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {user?.email ?? 'No email'}
                  </p>
                  <Badge className="w-fit" variant="outline">
                    {user?.emailVerified ? 'Verified' : 'Unverified'}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">Email</p>
                    <p className="text-muted-foreground text-sm">
                      {user?.email ?? 'Not provided'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">Member Since</p>
                    <p className="text-muted-foreground text-sm">
                      {user?.createdAt
                        ? new Date(user.createdAt).toLocaleDateString()
                        : 'Unknown'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">User ID</p>
                    <p className="font-mono text-muted-foreground text-sm">
                      {user?.id ?? 'Unknown'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
