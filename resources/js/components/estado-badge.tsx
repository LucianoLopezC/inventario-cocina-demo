import { ESTADOS } from '@/lib/inventario';
import { cn } from '@/lib/utils';
import { type EstadoStock } from '@/types';

/** Etiqueta de estado: OK / BAJO / SIN STOCK, en mono. */
export default function EstadoBadge({ estado, className }: { estado: EstadoStock; className?: string }) {
    const { etiqueta, insignia } = ESTADOS[estado];

    return (
        <span
            className={cn(
                'inline-flex justify-self-start rounded-md px-[9px] py-[5px] font-mono text-xs font-bold tracking-[0.06em] whitespace-nowrap uppercase',
                insignia,
                className,
            )}
        >
            {etiqueta}
        </span>
    );
}
