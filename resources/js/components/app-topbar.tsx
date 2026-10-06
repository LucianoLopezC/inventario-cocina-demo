import AppearanceToggleDropdown from '@/components/appearance-dropdown';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { UserMenuContent } from '@/components/user-menu-content';
import { useInitials } from '@/hooks/use-initials';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ChevronDown } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface Seccion {
    titulo: string;
    url: string;
    tambien?: string[];
    soloAdmin?: boolean;
}

const secciones: Seccion[] = [
    { titulo: 'Panel', url: '/dashboard' },
    { titulo: 'Inventario', url: '/inventario', tambien: ['/productos'] },
    { titulo: 'Historial', url: '/movimientos' },
    { titulo: 'Categorías', url: '/categorias' },
    { titulo: 'Usuarios', url: '/usuarios', soloAdmin: true },
];

/** Nombre de la app en texto simple, sin logotipo de marca. Sale de APP_NAME. */
export function NombreApp({ className }: { className?: string }) {
    const { name } = usePage<SharedData>().props;

    return <span className={cn('font-display truncate text-xl leading-none font-bold tracking-[-0.02em]', className)}>{name}</span>;
}

export function AppTopbar() {
    const page = usePage<SharedData>();
    const { auth } = page.props;
    const ruta = page.url.split('?')[0];
    const getInitials = useInitials();

    const activa = (s: Seccion) => [s.url, ...(s.tambien ?? [])].some((url) => ruta === url || ruta.startsWith(`${url}/`));
    const hoy = new Intl.DateTimeFormat('es', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date()).replace(/[.,]/g, '');

    // Ocultar el enlace es solo comodidad: el servidor igual rechaza a quien no es admin.
    const visibles = secciones.filter((s) => !s.soloAdmin || auth.user.es_admin);

    // En celular, si la sección actual quedó fuera de la fila (ej. "Usuarios"), se desliza hasta ella.
    const filaMovil = useRef<HTMLElement>(null);
    useEffect(() => {
        const actual = filaMovil.current?.querySelector<HTMLElement>('[aria-current="page"]');
        actual?.scrollIntoView({ block: 'nearest', inline: 'center' });
    }, [ruta]);

    const enlaces = visibles.map((s) => (
        <Link
            key={s.url}
            href={s.url}
            aria-current={activa(s) ? 'page' : undefined}
            className={cn(
                'flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm font-semibold transition-colors',
                activa(s) ? 'bg-[#E7EAE8] text-[#17201C]' : 'text-[#B9C2BD] hover:bg-white/10 hover:text-white',
            )}
        >
            {s.titulo}
        </Link>
    ));

    return (
        <div className="bg-tinta text-[#E7EAE8]">
            <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4 px-4 py-3 md:px-8 md:py-4">
                <Link href="/dashboard" aria-label="Ir al panel" className="flex min-h-11 min-w-0 items-center">
                    <NombreApp />
                </Link>

                <nav className="hidden items-center gap-1 lg:flex" aria-label="Secciones">
                    {enlaces}
                </nav>

                <div className="flex items-center gap-3">
                    <span className="etiqueta hidden text-[#B9C2BD] md:inline">{hoy}</span>
                    <AppearanceToggleDropdown />
                    <DropdownMenu>
                        <DropdownMenuTrigger
                            className="flex min-h-11 items-center gap-2 rounded-full py-1 pr-3 pl-1 hover:bg-white/10"
                            aria-label="Menú de usuario"
                        >
                            <span className="bg-brasa text-tinta flex size-9 items-center justify-center rounded-full text-sm font-bold">
                                {getInitials(auth.user.name)}
                            </span>
                            <ChevronDown className="size-4 text-[#B9C2BD]" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="min-w-56 rounded-xl" align="end">
                            <UserMenuContent user={auth.user} />
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* En pantallas chicas las secciones van en una fila que se desliza; el borde
                derecho se desvanece para que se note que hay más. */}
            <nav
                ref={filaMovil}
                className="flex gap-1 overflow-x-auto px-3 pb-3 [mask-image:linear-gradient(to_right,black_calc(100%-2.5rem),transparent)] [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden"
                aria-label="Secciones"
            >
                {enlaces}
                <span className="w-6 shrink-0" aria-hidden />
            </nav>
        </div>
    );
}
