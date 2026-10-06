import AppLayoutTemplate from '@/layouts/app/app-topbar-layout';
import { type BreadcrumbItem } from '@/types';

interface AppLayoutProps {
    children: React.ReactNode;
    /** Se mantiene por compatibilidad con las páginas; el diseño actual no muestra migas de pan. */
    breadcrumbs?: BreadcrumbItem[];
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default ({ children, breadcrumbs, ...props }: AppLayoutProps) => <AppLayoutTemplate {...props}>{children}</AppLayoutTemplate>;
