import InputError from '@/components/input-error';
import PageHeader from '@/components/page-header';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { claseCampo, formatoCantidad, soloCantidad } from '@/lib/inventario';
import { cn } from '@/lib/utils';
import { type Categoria, type Piso, type Producto, type SharedData } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, type ReactNode } from 'react';

interface Props {
    producto: Producto | null;
    /** Piso del producto (al crear: el piso elegido). */
    piso: Piso;
    categorias: Categoria[];
    unidades: string[];
}

const aNumero = (valor: string) => valor.replace(',', '.');

function Campo({
    etiqueta,
    error,
    ayuda,
    className,
    children,
}: {
    etiqueta: string;
    error?: string;
    ayuda?: string;
    className?: string;
    children: ReactNode;
}) {
    return (
        <label className={cn('flex flex-col gap-1.5 text-[13px] font-semibold', className)}>
            {etiqueta}
            {children}
            {ayuda && <span className="text-muted-foreground text-xs font-normal">{ayuda}</span>}
            <InputError message={error} className="font-normal" />
        </label>
    );
}

export default function ProductoForm({ producto, piso, categorias, unidades }: Props) {
    const editando = producto !== null;
    // Borrar es solo para administradores (el servidor también lo exige).
    const { auth } = usePage<SharedData>().props;

    const { data, setData, post, put, transform, processing, errors } = useForm({
        nombre: producto?.nombre ?? '',
        categoria_id: producto?.categoria_id ? String(producto.categoria_id) : '',
        unidad: producto?.unidad ?? 'kg',
        stock_minimo: producto ? String(producto.stock_minimo) : '',
        stock_inicial: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        transform((d) => ({
            ...d,
            categoria_id: d.categoria_id || null,
            stock_minimo: aNumero(d.stock_minimo || '0'),
            stock_inicial: aNumero(d.stock_inicial || '0'),
        }));

        if (editando) {
            put(route('productos.update', producto.id));
        } else {
            post(route('productos.store'));
        }
    };

    return (
        <AppLayout>
            <Head title={editando ? `Editar ${producto.nombre}` : 'Nuevo producto'} />

            <PageHeader
                seccion={piso.nombre}
                titulo={editando ? producto.nombre : 'Nuevo producto'}
                descripcion={editando ? undefined : `Se agregará al inventario de ${piso.nombre}.`}
                acciones={
                    <Link
                        href={route('inventario')}
                        className="border-tinta flex min-h-11 items-center rounded-full border px-5 text-sm font-semibold"
                    >
                        Volver al inventario
                    </Link>
                }
            />

            <form onSubmit={submit} className="bg-panel flex max-w-4xl flex-col gap-5 rounded-[14px] border px-[22px] py-5">
                <h2 className="titulo-seccion">{editando ? 'Datos del producto' : 'Nuevo producto'}</h2>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1fr)]">
                    <Campo etiqueta="Nombre" error={errors.nombre} className="sm:col-span-2 lg:col-span-1">
                        <input
                            value={data.nombre}
                            onChange={(e) => setData('nombre', e.target.value)}
                            required
                            autoFocus={!editando}
                            maxLength={150}
                            placeholder="Ej: Harina sin polvos"
                            className={cn(claseCampo, 'font-normal')}
                        />
                    </Campo>

                    <Campo etiqueta="Categoría" error={errors.categoria_id}>
                        <select
                            value={data.categoria_id}
                            onChange={(e) => setData('categoria_id', e.target.value)}
                            className={cn(claseCampo, 'font-normal')}
                        >
                            <option value="">Sin categoría</option>
                            {categorias.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.nombre}
                                </option>
                            ))}
                        </select>
                    </Campo>

                    <Campo etiqueta="Unidad" error={errors.unidad}>
                        <select value={data.unidad} onChange={(e) => setData('unidad', e.target.value)} className={cn(claseCampo, 'font-normal')}>
                            {unidades.map((u) => (
                                <option key={u} value={u}>
                                    {u}
                                </option>
                            ))}
                        </select>
                    </Campo>

                    {!editando && (
                        <Campo etiqueta="Cantidad actual" error={errors.stock_inicial} ayuda="Cuánto hay ahora mismo.">
                            <input
                                inputMode="decimal"
                                value={data.stock_inicial}
                                onChange={(e) => setData('stock_inicial', soloCantidad(e.target.value))}
                                placeholder="0"
                                className={cn(claseCampo, 'font-mono font-normal')}
                            />
                        </Campo>
                    )}

                    <Campo etiqueta="Mínimo" error={errors.stock_minimo} ayuda='En este valor o menos se marca como "Bajo".'>
                        <input
                            inputMode="decimal"
                            value={data.stock_minimo}
                            onChange={(e) => setData('stock_minimo', soloCantidad(e.target.value))}
                            placeholder="0"
                            className={cn(claseCampo, 'font-mono font-normal')}
                        />
                    </Campo>
                </div>

                <p className="text-muted-foreground text-xs">
                    ¿Falta una categoría?{' '}
                    <Link href={route('categorias.index')} className="text-acento toque font-semibold underline">
                        Administrar categorías
                    </Link>
                </p>

                {editando && (
                    <p className="bg-card rounded-lg border px-4 py-3 text-sm">
                        Stock actual:{' '}
                        <strong className="font-mono">
                            {formatoCantidad(producto.stock_actual)} {producto.unidad}
                        </strong>
                        . Para cambiarlo usa − / + o "Contar" en el inventario, así queda en el historial.
                    </p>
                )}

                <div className="flex items-center gap-2">
                    <button
                        type="submit"
                        disabled={processing}
                        className="bg-secondary text-secondary-foreground min-h-11 rounded-lg px-5 text-sm font-semibold disabled:opacity-50"
                    >
                        {editando ? 'Guardar cambios' : 'Guardar'}
                    </button>
                    <Link href={route('inventario')} className="hover:bg-campo flex min-h-11 items-center rounded-lg px-5 text-sm font-semibold">
                        Cancelar
                    </Link>
                </div>
            </form>

            {editando && auth.user.es_admin && <EliminarProducto producto={producto} />}
        </AppLayout>
    );
}

function EliminarProducto({ producto }: { producto: Producto }) {
    return (
        <section className="bg-panel border-acento flex max-w-4xl flex-wrap items-center justify-between gap-4 rounded-[14px] border-[1.5px] px-[22px] py-4">
            <div>
                <p className="font-semibold">Eliminar producto</p>
                <p className="text-muted-foreground text-sm">
                    Desaparece del inventario, pero su historial de movimientos se conserva. No se puede deshacer.
                </p>
            </div>
            <Dialog>
                <DialogTrigger asChild>
                    <button type="button" className="bg-acento hover:bg-acento-oscuro min-h-11 rounded-lg px-5 text-sm font-semibold text-white">
                        Eliminar
                    </button>
                </DialogTrigger>
                <DialogContent className="rounded-[14px]">
                    <DialogTitle className="titulo-seccion">¿Eliminar "{producto.nombre}"?</DialogTitle>
                    <DialogDescription>
                        El producto desaparece del inventario. Su historial se conserva y queda registrado que lo eliminaste.
                    </DialogDescription>
                    <DialogFooter className="gap-2">
                        <DialogClose asChild>
                            <button type="button" className="min-h-11 rounded-lg border px-5 text-sm font-semibold">
                                Cancelar
                            </button>
                        </DialogClose>
                        <button
                            type="button"
                            className="bg-acento hover:bg-acento-oscuro min-h-11 rounded-lg px-5 text-sm font-semibold text-white"
                            onClick={() => router.delete(route('productos.destroy', producto.id))}
                        >
                            Sí, eliminar
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </section>
    );
}
