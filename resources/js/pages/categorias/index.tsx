import InputError from '@/components/input-error';
import PageHeader from '@/components/page-header';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { claseCampo } from '@/lib/inventario';
import { cn } from '@/lib/utils';
import { type Categoria, type SharedData } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

const botonIcono = 'text-muted-foreground hover:bg-campo hover:text-foreground flex size-11 items-center justify-center rounded-lg';

export default function Categorias({ categorias }: { categorias: Categoria[] }) {
    const [editandoId, setEditandoId] = useState<number | null>(null);
    const [borrando, setBorrando] = useState<Categoria | null>(null);
    // Crear, renombrar y borrar es solo para administradores (el servidor también lo exige).
    const esAdmin = usePage<SharedData>().props.auth.user.es_admin;

    const nueva = useForm({ nombre: '' });

    const crear: FormEventHandler = (e) => {
        e.preventDefault();
        nueva.post(route('categorias.store'), { preserveScroll: true, onSuccess: () => nueva.reset() });
    };

    return (
        <AppLayout>
            <Head title="Categorías" />

            <PageHeader
                selectorPiso
                seccion="Organización"
                titulo="Categorías"
                descripcion="Agrupa los productos de este piso: carnes, lácteos, verduras, abarrotes…"
            />

            <div className="grid max-w-3xl gap-6">
                {esAdmin && (
                    <form onSubmit={crear} className="bg-panel flex flex-col gap-3.5 rounded-[14px] border px-[22px] py-5">
                        <h2 className="titulo-seccion">Nueva categoría</h2>
                        <div className="flex flex-wrap items-end gap-3">
                            <label className="flex min-w-48 grow flex-col gap-1.5 text-[13px] font-semibold">
                                Nombre
                                <input
                                    value={nueva.data.nombre}
                                    onChange={(e) => nueva.setData('nombre', e.target.value)}
                                    placeholder="Ej: Carnes y pescados"
                                    maxLength={100}
                                    className={cn(claseCampo, 'font-normal')}
                                />
                            </label>
                            <button
                                type="submit"
                                disabled={nueva.processing || !nueva.data.nombre.trim()}
                                className="bg-secondary text-secondary-foreground min-h-11 rounded-lg px-5 text-sm font-semibold disabled:opacity-50"
                            >
                                Guardar
                            </button>
                        </div>
                        <InputError message={nueva.errors.nombre} />
                    </form>
                )}

                <section aria-labelledby="categorias-titulo" className="tarjeta overflow-hidden">
                    <div className="border-linea border-b px-[22px] py-[18px]">
                        <h2 id="categorias-titulo" className="titulo-seccion">
                            Categorías
                            <span className="text-muted-foreground ml-2 font-mono text-sm font-normal">{categorias.length}</span>
                        </h2>
                    </div>
                    {categorias.length === 0 ? (
                        <p className="text-muted-foreground px-[22px] py-9 text-center text-sm">Todavía no hay categorías.</p>
                    ) : (
                        <ul>
                            {categorias.map((c) =>
                                editandoId === c.id ? (
                                    <FilaEditar key={c.id} categoria={c} onTerminar={() => setEditandoId(null)} />
                                ) : (
                                    <li key={c.id} className="border-linea flex items-center gap-2 border-t px-[22px] py-2 first:border-t-0">
                                        <div className="flex-1">
                                            <p className="text-[15px] font-semibold">{c.nombre}</p>
                                            <Link
                                                href={route('inventario', { categoria: c.id })}
                                                className="text-muted-foreground hover:text-acento toque font-mono text-xs hover:underline"
                                            >
                                                {c.productos_count} {c.productos_count === 1 ? 'producto' : 'productos'}
                                            </Link>
                                        </div>
                                        {esAdmin && (
                                            <button
                                                type="button"
                                                className={botonIcono}
                                                aria-label={`Renombrar ${c.nombre}`}
                                                onClick={() => setEditandoId(c.id)}
                                            >
                                                <Pencil className="size-[18px]" strokeWidth={1.8} />
                                            </button>
                                        )}
                                        {esAdmin && (
                                            <button
                                                type="button"
                                                className={botonIcono}
                                                aria-label={`Eliminar ${c.nombre}`}
                                                onClick={() => setBorrando(c)}
                                            >
                                                <Trash2 className="size-[18px]" strokeWidth={1.8} />
                                            </button>
                                        )}
                                    </li>
                                ),
                            )}
                        </ul>
                    )}
                </section>
            </div>

            <Dialog open={borrando !== null} onOpenChange={(abierto) => !abierto && setBorrando(null)}>
                <DialogContent className="rounded-[14px]">
                    <DialogTitle className="titulo-seccion">¿Eliminar la categoría "{borrando?.nombre}"?</DialogTitle>
                    <DialogDescription>Sus productos no se borran: quedan como "Sin categoría".</DialogDescription>
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
                                router.delete(route('categorias.destroy', borrando.id), { preserveScroll: true, onFinish: () => setBorrando(null) })
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

function FilaEditar({ categoria, onTerminar }: { categoria: Categoria; onTerminar: () => void }) {
    const { data, setData, put, processing, errors } = useForm({ nombre: categoria.nombre });

    const guardar: FormEventHandler = (e) => {
        e.preventDefault();
        put(route('categorias.update', categoria.id), { preserveScroll: true, onSuccess: onTerminar });
    };

    return (
        <li className="border-linea border-t px-[22px] py-2 first:border-t-0">
            <form onSubmit={guardar} className="flex items-center gap-2">
                <input
                    value={data.nombre}
                    onChange={(e) => setData('nombre', e.target.value)}
                    autoFocus
                    maxLength={100}
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
