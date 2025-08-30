'use client';

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@acme/ui/components/ui/tabs';
import { useParams } from 'next/navigation';
import { DictationsTab } from './_components/dictations-tab';
import { DictionaryTab } from './_components/dictionary-tab';
import { ImpersonationTab } from './_components/impersonation-tab';
import { ModerationTab } from './_components/moderation-tab';
import { ProfileTab } from './_components/profile-tab';
import { SessionsTab } from './_components/sessions-tab';
import { SubscriptionTab } from './_components/subscription-tab';
import { UsageTab } from './_components/usage-tab';

export default function AdminUserDetailPage() {
  const params = useParams<{ userId: string }>();
  const userId = params?.userId;

  if (!userId) {
    return <div>User ID not found</div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-10">
      <h1 className="font-semibold text-2xl tracking-tight">User</h1>
      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="dictations">Dictations</TabsTrigger>
          <TabsTrigger value="dictionary">Dictionary</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="moderation">Moderation</TabsTrigger>
          <TabsTrigger value="impersonate">Impersonate</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab userId={userId} />
        </TabsContent>

        <TabsContent value="subscription">
          <SubscriptionTab userId={userId} />
        </TabsContent>

        <TabsContent value="usage">
          <UsageTab userId={userId} />
        </TabsContent>

        <TabsContent value="dictations">
          <DictationsTab userId={userId} />
        </TabsContent>

        <TabsContent value="dictionary">
          <DictionaryTab userId={userId} />
        </TabsContent>

        <TabsContent value="sessions">
          <SessionsTab userId={userId} />
        </TabsContent>

        <TabsContent value="moderation">
          <ModerationTab userId={userId} />
        </TabsContent>

        <TabsContent value="impersonate">
          <ImpersonationTab userId={userId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
