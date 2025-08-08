'use client';

import { Card } from '@acme/ui/components/ui/card';
import { Input } from '@acme/ui/components/ui/input';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@acme/ui/components/ui/tabs';
import { useMemo, useState } from 'react';
import { ApplyDialog } from './ApplyDialog';
import type { Role } from './data';

export function Roles({ roles }: { roles: Role[] }) {
  const [query, setQuery] = useState('');
  const departments = useMemo(
    () => Array.from(new Set(roles.map((r) => r.department))),
    [roles]
  );

  function filter(role: Role) {
    const q = query.toLowerCase().trim();
    if (!q) {
      return true;
    }
    const inTitle = role.title.toLowerCase().includes(q);
    const inDepartment = role.department.toLowerCase().includes(q);
    const inLocation = role.location.toLowerCase().includes(q);
    return inTitle || inDepartment || inLocation;
  }

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-2xl">Open roles</h2>
        <div className="w-64">
          <Input
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, department, or location"
            value={query}
          />
        </div>
      </div>

      <Tabs className="mt-4" defaultValue={departments[0]}>
        <TabsList>
          {departments.map((d) => (
            <TabsTrigger key={d} value={d}>
              {d}
            </TabsTrigger>
          ))}
        </TabsList>
        {departments.map((d) => (
          <TabsContent key={d} value={d}>
            <div className="mt-4 grid gap-6 md:grid-cols-3">
              {roles
                .filter((r) => r.department === d)
                .filter(filter)
                .map((role) => (
                  <Card
                    className="flex flex-col justify-between p-6"
                    key={role.id}
                  >
                    <div>
                      <p className="font-semibold">{role.title}</p>
                      <p className="mt-1 text-muted-foreground text-sm">
                        {role.location} • {role.type}
                      </p>
                      <p className="mt-2 text-muted-foreground text-sm">
                        Compensation: {role.compensation}
                      </p>
                      <p className="mt-3 text-sm">{role.description}</p>
                    </div>
                    <div className="mt-4">
                      <ApplyDialog role={role} />
                    </div>
                  </Card>
                ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
