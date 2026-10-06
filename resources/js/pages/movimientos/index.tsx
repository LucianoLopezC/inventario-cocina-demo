import PageHeader from '@/components/page-header';
import AppLayout from '@/layouts/app-layout';
import { clasePildora, formatoCantidad, formatoFecha, productoDe, TIPOS_MOVIMIENTO } from '@/lib/inventario';
import { cn } from '@/lib/utils';
import { type Movimiento, type Paginado } from '@/types';
import { Head, Link, router, usePoll } from '@inertiajs/react';

interface Filtros {
    producto?: string;
    tipo?: string;
}

interface Props {
    movimientos: Paginado<Movimiento>;
    productos: { id: number; nombre: string }[];
    filtros: Filtros;
}

export default function Movimientos({ movimientos, productos, filtros }: Props) {
    // Los movimientos de otras personas aparecen solos, cada 30 s.
    usePoll(30000, { only: ['movimientos'] });

    const filtrar = (cambios: Filtros) => {
        const limpios = Object.fromEntries(Object.entries({ ...filtros, ...cambios }).filter(([, v]) => v));
        router.get(route('movimientos.index'), limpios, { preserveState: true, replace: true });
    };

    return (
        <AppLayout>
            <Head title="Historial" />

            <PageHeader selectorPiso seccion="Registro" titulo="Historial" descripcion="Quién sumó, restó o contó cada producto, y cuándo." />

            <section aria-labelledby="historial-titulo" className="tarjeta overflow-hidden">
                <div className="border-linea flex flex-wrap items-center justify-between gap-3 border-b px-4 py-[18px] sm:px-[22px]">
                    <h2 id="historial-titulo" className="titulo-seccion">
                        Movimientos
                        <span className="text-muted-foreground ml-2 font-mono text-sm font-normal">{movimientos.total}</span>
                    </h2>
                    <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                        <label className="flex w-full min-w-0 sm:w-auto">
                            <span className="sr-only">Filtrar por producto</span>
                            <select className={clasePildora} value={filtros.producto ?? ''} onChange={(e) => filtrar({ producto: e.target.value })}>
                                <option value="">Todos los productos</option>
                                {productos.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.nombre}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="flex">
                            <span className="sr-only">Filtrar por tipo</span>
                            <select className={clasePildora} value={filtros.tipo ?? ''} onChange={(e) => filtrar({ tipo: e.target.value })}>
                                <option value="">Todos los tipos</option>
                                <option value="entrada">Entradas</option>
                                <option value="salida">Salidas</option>
                                <option value="ajuste">Conteos</option>
                            </select>
                        </label>
                    </div>
                </div>

                {movimientos.data.length === 0 ? (
                    <p className="text-muted-foreground px-[22px] py-9 text-center text-sm">No hay movimientos registrados.</p>
                ) : (
                    <>
                        {/* Celular: tarjetas. Una tabla de 7 columnas no cabe en 360px. */}
                        <ul className="md:hidden">
                            {movimientos.data.map((m) => (
                                <TarjetaMovimiento key={m.id} movimiento={m} />
                            ))}
                        </ul>

                        <div className="hidden overflow-x-auto md:block">
                            <table className="w-full text-sm">
                                <thead className="bg-campo text-muted-foreground text-left font-mono text-xs tracking-[0.1em]">
                                    <tr>
                                        <th className="px-[22px] py-2.5 font-normal">FECHA</th>
                                        <th className="px-3 py-2.5 font-normal">PRODUCTO</th>
                                        <th className="px-3 py-2.5 font-normal">TIPO</th>
                                        <th className="px-3 py-2.5 text-right font-normal">CANTIDAD</th>
                                        <th className="px-3 py-2.5 text-right font-normal">STOCK</th>
                                        <th className="px-3 py-2.5 font-normal">USUARIO</th>
                                        <th className="px-[22px] py-2.5 font-normal">NOTA</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {movimientos.data.map((m) => (
                                        <FilaMovimiento key={m.id} movimiento={m} />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </section>

            {movimientos.last_page > 1 && (
                <nav className="flex flex-wrap gap-1.5" aria-label="Paginación">
                    {movimientos.links.map((link, i) => {
                        const clase = cn(
                            'flex min-h-11 min-w-11 items-center justify-center rounded-full border px-4 text-sm font-semibold',
                            link.active ? 'border-secondary bg-secondary text-secondary-foreground' : 'border-border bg-card',
                            !link.url && 'opacity-40',
                        );
                        return link.url ? (
                            <Link key={i} href={link.url} preserveScroll className={clase} dangerouslySetInnerHTML={{ __html: link.label }} />
                        ) : (
                            <span key={i} className={clase} dangerouslySetInnerHTML={{ __html: link.label }} />
                        );
                    })}
                </nav>
            )}
        </AppLayout>
    );
}

/** Marca los movimientos de productos que ya no existen (su historial se conserva). */
function Eliminado() {
    return <span className="text-muted-foreground ml-2 font-mono text-[11px] font-normal tracking-[0.06em] uppercase">eliminado</span>;
}

function TarjetaMovimiento({ movimiento: m }: { movimiento: Movimiento }) {
    const tipo = TIPOS_MOVIMIENTO[m.tipo];
    const { nombre, unidad, eliminado } = productoDe(m);

    return (
        <li className="border-linea flex flex-col gap-1 border-t px-4 py-3 first:border-t-0">
            <div className="flex items-start justify-between gap-3">
                <span className="text-[15px] leading-snug font-semibold break-words">
                    {nombre}
                    {eliminado && <Eliminado />}
                </span>
                <span className={cn('shrink-0 font-mono text-base font-bold whitespace-nowrap', tipo.clase)}>
                    {tipo.signo} {formatoCantidad(m.cantidad)} {unidad}
                </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-xs">
                <span className="text-muted-foreground">
                    <span className={cn('font-mono font-bold tracking-[0.06em] uppercase', tipo.clase)}>{tipo.etiqueta}</span> ·{' '}
                    {m.user?.name ?? m.usuario_nombre ?? '—'}
                </span>
                <span className="text-muted-foreground font-mono">
                    {formatoCantidad(m.stock_anterior)} → <strong className="text-foreground">{formatoCantidad(m.stock_nuevo)}</strong>
                </span>
            </div>
            <span className="text-muted-foreground font-mono text-xs">{formatoFecha(m.created_at)}</span>
            {m.nota && <p className="text-muted-foreground text-sm break-words">{m.nota}</p>}
        </li>
    );
}

function FilaMovimiento({ movimiento: m }: { movimiento: Movimiento }) {
    const tipo = TIPOS_MOVIMIENTO[m.tipo];
    const { nombre, unidad, eliminado } = productoDe(m);

    return (
        <tr className="border-linea hover:bg-panel border-t">
            <td className="text-muted-foreground px-[22px] py-3 font-mono text-xs whitespace-nowrap">{formatoFecha(m.created_at)}</td>
            <td className="px-3 py-3 font-semibold">
                {nombre}
                {eliminado && <Eliminado />}
            </td>
            <td className={cn('px-3 py-3 font-mono text-xs font-bold tracking-[0.08em] uppercase', tipo.clase)}>{tipo.etiqueta}</td>
            <td className={cn('px-3 py-3 text-right font-mono font-bold whitespace-nowrap', tipo.clase)}>
                {tipo.signo} {formatoCantidad(m.cantidad)} {unidad}
            </td>
            <td className="text-muted-foreground px-3 py-3 text-right font-mono whitespace-nowrap">
                {formatoCantidad(m.stock_anterior)} → <span className="text-foreground font-bold">{formatoCantidad(m.stock_nuevo)}</span>
            </td>
            <td className="px-3 py-3 whitespace-nowrap">{m.user?.name ?? m.usuario_nombre ?? '—'}</td>
            <td className="text-muted-foreground px-[22px] py-3">{m.nota}</td>
        </tr>
    );
}
