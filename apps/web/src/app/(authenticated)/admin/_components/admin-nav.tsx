'use client';

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from '@acme/ui/components/ui/navigation-menu';
import { usePathname } from 'next/navigation';

export function AdminNav() {
  const pathname = usePathname();
  const isDashboard = pathname === '/admin';
  const isUsers = pathname?.startsWith('/admin/users');
  const isDictations = pathname?.startsWith('/admin/dictations');

  return (
    <div className="mb-6">
      <NavigationMenu viewport={false}>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuLink data-active={isDashboard} href="/admin">
              Dashboard
            </NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink data-active={isUsers} href="/admin/users">
              Users
            </NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink
              data-active={isDictations}
              href="/admin/dictations"
            >
              Dictations
            </NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  );
}
