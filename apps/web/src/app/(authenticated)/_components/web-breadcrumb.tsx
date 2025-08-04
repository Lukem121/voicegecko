import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@acme/ui/components/ui/breadcrumb';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function AppBreadcrumb() {
  const pathname = usePathname();

  // Parse the current path to create breadcrumbs
  const pathSegments = pathname.split('/').filter(Boolean);

  // Generate breadcrumb items
  const breadcrumbItems = pathSegments.map((segment, index) => {
    const path = '/' + pathSegments.slice(0, index + 1).join('/');
    const isLast = index === pathSegments.length - 1;

    // Convert segment to readable format
    const title = segment
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    return {
      title,
      path,
      isLast,
    };
  });

  // If we're on the root path, show Dashboard
  if (pathSegments.length === 0) {
    breadcrumbItems.push({
      title: 'Dashboard',
      path: '/',
      isLast: true,
    });
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbItems.map((item, index) => (
          <div className="flex items-center" key={item.path}>
            {index > 0 && <BreadcrumbSeparator className="mx-2" />}
            <BreadcrumbItem>
              {item.isLast ? (
                <BreadcrumbPage>{item.title}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={item.path}>{item.title}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </div>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
