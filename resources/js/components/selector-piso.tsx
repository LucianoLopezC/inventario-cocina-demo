import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { Layers } from 'lucide-react';
import { useState } from 'react';

/**
 * Elige el piso con que se trabaja. Se guarda en la cuenta del usuario, así que cambia
 * a la vez en Panel, Inventario, Historial, Categorías y el Excel.
 */
export default function SelectorPiso({ className }: { className?: string }) {
    const { pisos, pisoActual, auth } = usePage<SharedData>().props;
    const [cambiando, setCambiando] = useState(false);

    if (!pisoActual) return null;

    const elegir = (id: string) => {
        setCambiando(true);
        router.post(
            route('pisos.seleccionar'),
            { piso_id: Number(id) },
            {
                preserveScroll: true,
                // Ninguna página guardada del piso anterior debe volver a mostrarse.
                onSuccess: () => router.flushAll(),
                onFinish: () => setCambiando(false),
            },
        );
    };

    // Con un solo piso no hay nada que elegir: se muestra fijo (el admin conserva el enlace para crear más).
    if (pisos.length === 1 && !auth.user.es_admin) {
        return (
            <div className={cn('flex', className)}>
                <p className="bg-card border-border flex min-h-11 items-center gap-2 rounded-full border px-4">
                    <Layers className="text-acento size-4 shrink-0" aria-hidden />
                    <span className="etiqueta text-muted-foreground text-xs">Piso</span>
                    <span className="text-base font-semibold md:text-sm">{pisoActual.nombre}</span>
                </p>
            </div>
        );
    }

    return (
        <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-1', className)}>
            <label className="bg-card border-border flex min-h-11 items-center gap-2 rounded-full border py-1 pr-1 pl-4">
                <Layers className="text-acento size-4 shrink-0" aria-hidden />
                <span className="etiqueta text-muted-foreground text-xs">Piso</span>
                <select
                    value={pisoActual.id}
                    onChange={(e) => elegir(e.target.value)}
                    disabled={cambiando}
                    aria-label="Piso con que trabajas"
                    className="bg-campo min-h-9 max-w-[60vw] rounded-full px-3 text-base font-semibold disabled:opacity-60 sm:max-w-xs md:text-sm"
                >
                    {pisos.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.nombre}
                        </option>
                    ))}
                </select>
            </label>
            {auth.user.es_admin && (
                <Link href={route('pisos.index')} className="text-muted-foreground hover:text-acento toque text-xs font-semibold underline">
                    Administrar pisos
                </Link>
            )}
        </div>
    );
}
