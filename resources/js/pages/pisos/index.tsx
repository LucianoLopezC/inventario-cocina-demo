import InputError from '@/components/input-error';
import PageHeader from '@/components/page-header';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { claseCampo } from '@/lib/inventario';
import { cn } from '@/lib/utils';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

interface PisoConConteo {
    id: number;
    nombre: string;
    productos_count: number;
    categorias_count: number;
}

const botonIcono = 'text-muted-foreground hover:bg-campo hover:text-foreground flex size-11 items-center justify-center rounded-lg';

/** Administración de pisos (solo admin): cada piso tiene su propio inventario. */
export default function Pisos({ pisos }: { pisos: PisoConConteo[] }) {
    const { errors } = usePage().props as { errors: Record<string, string> };
    const [editandoId, setEditandoId] = useState<number | null>(null);
    const [borrando, setBorrando] = useState<PisoConConteo | null>(null);

    const nuevo = useForm({ nombre: '' });

    const crear: FormEventHandler = (e) => {
        e.preventDefault();
        nuevo.post(route('pisos.store'), { preserveScroll: true, onSuccess: () => nuevo.reset() });
    };

    return (
        <AppLayout>
            <Head title="Pisos" />

            <PageHeader
                seccion="Administración"
                titulo="Pisos"
                descripcion="Cada piso tiene su propio inventario, categorías e historial. Cada persona elige en qué piso trabaja con el selector."
            />

            <div className="grid max-w-3xl gap-6">
                <form onSubmit={crear} className="bg-panel flex flex-col gap-3.5 rounded-[14px] border px-[22px] py-5">
                    <h2 className="titulo-seccion">Nuevo piso</h2>
                    <div className="flex flex-wrap items-end gap-3">
                        <label className="flex min-w-48 grow flex-col gap-1.5 text-[13px] font-semibold">
                            Nombre
                            <input
                                value={nuevo.data.nombre}
                                onChange={(e) => nuevo.setData('nombre', e.target.value)}
                                placeholder="Ej: Piso 2, Terraza, Bodega"
                                maxLength={60}
                                className={cn(claseCampo, 'font-normal')}
                            />
                        </label>
                        <button
                            type="submit"
                            disabled={nuevo.processing || !nuevo.data.nombre.trim()}
                            className="bg-secondary text-secondary-foreground min-h-11 rounded-lg px-5 text-sm font-semibold disabled:opacity-50"
                        >
                            Crear piso
                        </button>
                    </div>
                    <InputError message={nuevo.errors.nombre} />
                </form>

                {errors.piso && (
                    <p role="alert" className="bg-etiqueta-bajo text-etiqueta-bajo-texto rounded-lg px-4 py-3 text-sm font-medium">
                        {errors.piso}
                    </p>
                )}

                <section aria-labelledby="pisos-titulo" className="tarjeta overflow-hidden">
                    <div className="border-linea border-b px-[22px] py-[18px]">
                        <h2 id="pisos-titulo" className="titulo-seccion">
                            Pisos <span className="text-muted-foreground ml-2 font-mono text-sm font-normal">{pisos.length}</span>
                        </h2>
                    </div>
                    <ul>
                        {pisos.map((p) =>
                            editandoId === p.id ? (
                                <FilaEditar key={p.id} piso={p} onTerminar={() => setEditandoId(null)} />
                            ) : (
                                <li key={p.id} className="border-linea flex items-center gap-2 border-t px-[22px] py-2 first:border-t-0">
                                    <div className="flex-1">
                                        <p className="text-[15px] font-semibold">{p.nombre}</p>
                                        <p className="text-muted-foreground font-mono text-xs">
                                            {p.productos_count} {p.productos_count === 1 ? 'producto' : 'productos'} · {p.categorias_count}{' '}
                                            {p.categorias_count === 1 ? 'categoría' : 'categorías'}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        className={botonIcono}
                                        aria-label={`Renombrar ${p.nombre}`}
                                        onClick={() => setEditandoId(p.id)}
                                    >
                                        <Pencil className="size-[18px]" strokeWidth={1.8} />
                                    </button>
                                    <button
                                        type="button"
                                        className={cn(botonIcono, 'disabled:cursor-not-allowed disabled:opacity-30')}
                                        aria-label={`Eliminar ${p.nombre}`}
                                        title={p.productos_count || p.categorias_count ? 'Solo se pueden borrar pisos vacíos' : 'Eliminar'}
                                        disabled={pisos.length <= 1 || p.productos_count > 0 || p.categorias_count > 0}
                                        onClick={() => setBorrando(p)}
                                    >
                                        <Trash2 className="size-[18px]" strokeWidth={1.8} />
                                    </button>
                                </li>
                            ),
                        )}
                    </ul>
                </section>
            </div>

            <Dialog open={borrando !== null} onOpenChange={(abierto) => !abierto && setBorrando(null)}>
                <DialogContent className="rounded-[14px]">
                    <DialogTitle className="titulo-seccion">¿Eliminar el piso "{borrando?.nombre}"?</DialogTitle>
                    <DialogDescription>Está vacío, así que no se pierde ningún producto.</DialogDescription>
                    <DialogFooter className="gap-2">
                        <DialogClose asChild>
                            <button type="button" className="min-h-11 rounded-lg border px-5 text-sm font-semibold">
                                Cancelar
                            </button>
                        </DialogClose>
                        <button
                            type="button"
                            className="bg-acento hover:bg-acento-oscuro min-h-11 rounded-lg px-5 text-sm font-semibold text-white"
                            onClick={() =>
                                borrando &&
                                router.delete(route('pisos.destroy', borrando.id), { preserveScroll: true, onFinish: () => setBorrando(null) })
                            }
                        >
                            Eliminar
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

function FilaEditar({ piso, onTerminar }: { piso: PisoConConteo; onTerminar: () => void }) {
    const { data, setData, put, processing, errors } = useForm({ nombre: piso.nombre });

    const guardar: FormEventHandler = (e) => {
        e.preventDefault();
        put(route('pisos.update', piso.id), { preserveScroll: true, onSuccess: onTerminar });
    };

    return (
        <li className="border-linea border-t px-[22px] py-2 first:border-t-0">
            <form onSubmit={guardar} className="flex items-center gap-2">
                <input
                    value={data.nombre}
                    onChange={(e) => setData('nombre', e.target.value)}
                    autoFocus
                    maxLength={60}
                    aria-label="Nombre"
                    className={claseCampo}
                />
                <button
                    type="submit"
                    disabled={processing}
                    aria-label="Guardar"
                    className="bg-secondary text-secondary-foreground flex size-11 shrink-0 items-center justify-center rounded-lg"
                >
                    <Check className="size-[18px]" />
                </button>
                <button type="button" onClick={onTerminar} aria-label="Cancelar" className={botonIcono}>
                    <X className="size-[18px]" />
                </button>
            </form>
            <InputError message={errors.nombre} className="mt-1" />
        </li>
    );
}
