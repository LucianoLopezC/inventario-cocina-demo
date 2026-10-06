import { formatoCantidad } from '@/lib/inventario';
import { cn } from '@/lib/utils';
import { type Producto } from '@/types';
import { Link } from '@inertiajs/react';

const MAX_CHIPS = 6;

/** Aviso rojo con chips de los productos bajo el mínimo o sin stock. */
export default function AvisoReposicion({ productos }: { productos: Producto[] }) {
    if (productos.length === 0) return null;

    return (
        <section role="status" className="bg-panel border-acento flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[14px] border-[1.5px] px-5 py-4">
            <span className="bg-acento flex size-9 shrink-0 items-center justify-center rounded-full">
                <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                >
                    <path d="M12 8v5M12 17h.01" />
                    <path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
                </svg>
            </span>
            <div className="flex grow flex-col gap-0.5">
                <span className="text-base font-semibold">
                    {productos.length === 1 ? '1 producto necesita reposición' : `${productos.length} productos necesitan reposición`}
                </span>
                <span className="text-muted-foreground text-sm">Revisa y haz el pedido antes del próximo servicio.</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
                {productos.slice(0, MAX_CHIPS).map((p) => (
                    <span
                        key={p.id}
                        className={cn(
                            'rounded-full px-2.5 py-1.5 font-mono text-xs font-semibold',
                            p.stock_actual <= 0 ? 'bg-etiqueta-agotado text-etiqueta-agotado-texto' : 'bg-etiqueta-bajo text-etiqueta-bajo-texto',
                        )}
                    >
                        {p.nombre} · {formatoCantidad(p.stock_actual)} {p.unidad}
                    </span>
                ))}
                {/* Con muchos productos el aviso llenaría la pantalla del celular. */}
                {productos.length > MAX_CHIPS && (
                    <Link
                        href={route('inventario', { estado: 'alerta' })}
                        // Se ve como chip de 32px, pero el área táctil invisible llega a 44px.
                        className="border-acento text-acento relative flex min-h-8 items-center rounded-full border px-3 font-mono text-xs font-semibold after:absolute after:-inset-1.5 after:content-['']"
                    >
                        +{productos.length - MAX_CHIPS} más
                    </Link>
                )}
            </div>
        </section>
    );
}
