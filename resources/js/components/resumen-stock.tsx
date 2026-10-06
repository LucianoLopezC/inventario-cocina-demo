import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';

interface Props {
    total: number;
    bajo: number;
    agotado: number;
}

/** Tarjeta de resumen en tres columnas separadas por líneas punteadas (también en celular). */
export default function ResumenStock({ total, bajo, agotado }: Props) {
    const celdas = [
        { titulo: 'Productos', valor: total, clase: '', href: route('inventario') },
        { titulo: 'Bajo el mínimo', valor: bajo, clase: 'text-estado-bajo', href: route('inventario', { estado: 'bajo' }) },
        { titulo: 'Sin stock', valor: agotado, clase: 'text-estado-agotado', href: route('inventario', { estado: 'agotado' }) },
    ];

    return (
        <section aria-label="Resumen" className="tarjeta grid grid-cols-3 overflow-hidden">
            {celdas.map((c, i) => (
                <Link
                    key={c.titulo}
                    href={c.href}
                    className={cn(
                        'hover:bg-panel flex flex-col gap-0.5 px-3 py-3 transition-colors sm:px-[22px] sm:py-4',
                        i > 0 && 'border-l border-dashed',
                    )}
                >
                    <span className="text-muted-foreground text-xs leading-tight sm:text-[13px]">{c.titulo}</span>
                    <span className={cn('font-display text-[26px] font-bold tracking-[-0.03em] sm:text-[32px]', c.clase)}>{c.valor}</span>
                </Link>
            ))}
        </section>
    );
}
