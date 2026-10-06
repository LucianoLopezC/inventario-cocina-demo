import PageHeader from '@/components/page-header';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';

const secciones = [
    { titulo: 'Perfil', url: '/settings/profile' },
    { titulo: 'Contraseña', url: '/settings/password' },
    { titulo: 'Apariencia', url: '/settings/appearance' },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    const currentPath = window.location.pathname;

    return (
        <>
            <PageHeader seccion="Tu cuenta" titulo="Configuración" />

            <nav className="flex flex-wrap gap-2" aria-label="Secciones de configuración">
                {secciones.map((s) => (
                    <Link
                        key={s.url}
                        href={s.url}
                        aria-current={currentPath === s.url ? 'page' : undefined}
                        className={cn(
                            'flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold transition-colors',
                            currentPath === s.url
                                ? 'border-secondary bg-secondary text-secondary-foreground'
                                : 'border-border bg-card hover:bg-campo',
                        )}
                    >
                        {s.titulo}
                    </Link>
                ))}
            </nav>

            <section className="tarjeta max-w-2xl space-y-12 px-[22px] py-6">{children}</section>
        </>
    );
}
