import AvisoReposicion from '@/components/aviso-reposicion';
import EstadoBadge from '@/components/estado-badge';
import PageHeader from '@/components/page-header';
import ResumenStock from '@/components/resumen-stock';
import StockMeter from '@/components/stock-meter';
import AppLayout from '@/layouts/app-layout';
import { ESTADOS, formatoCantidad, formatoFecha, productoDe, TIPOS_MOVIMIENTO } from '@/lib/inventario';
import { cn } from '@/lib/utils';
import { type Movimiento, type Producto, type SharedData } from '@/types';
import { Head, Link, usePage, usePoll } from '@inertiajs/react';

interface Props {
    resumen: { total: number; bien: number; bajo: number; agotado: number };
    alertas: Producto[];
    recientes: Movimiento[];
}

function saludo() {
    const hora = new Date().getHours();
    if (hora < 12) return 'Buenos días';
    if (hora < 20) return 'Buenas tardes';
    return 'Buenas noches';
}

export default function Dashboard({ resumen, alertas, recientes }: Props) {
    const { auth } = usePage<SharedData>().props;

    // Lo que hacen otras personas aparece solo, cada 30 s.
    usePoll(30000, { only: ['resumen', 'alertas', 'recientes'] });
    const nombre = auth.user.name.split(' ')[0];

    return (
        <AppLayout>
            <Head title="Panel" />

            <PageHeader
                selectorPiso
                seccion={`${saludo()}, ${nombre}`}
                titulo="Estado de la cocina"
                acciones={
                    <Link
                        href={route('inventario')}
                        className="bg-acento hover:bg-acento-oscuro flex min-h-11 items-center rounded-full px-5 text-sm font-semibold text-white transition-colors"
                    >
                        Ir al inventario
                    </Link>
                }
            />

            <AvisoReposicion productos={alertas} />

            <ResumenStock total={resumen.total} bajo={resumen.bajo} agotado={resumen.agotado} />

            <div className="grid gap-6 lg:grid-cols-2">
                <section aria-labelledby="reponer-titulo" className="tarjeta overflow-hidden">
                    <header className="border-linea flex items-center justify-between gap-3 border-b px-4 py-[18px] sm:px-[22px]">
                        <h2 id="reponer-titulo" className="titulo-seccion">
                            Hay que reponer
                        </h2>
                        {alertas.length > 0 && (
                            <Link
                                href={route('inventario', { estado: 'alerta' })}
                                className="text-acento toque shrink-0 text-sm font-semibold whitespace-nowrap hover:underline"
                            >
                                Ver en inventario
                            </Link>
                        )}
                    </header>
                    {alertas.length === 0 ? (
                        <p className="text-muted-foreground px-[22px] py-9 text-center text-sm">
                            {resumen.total === 0 ? (
                                <>
                                    Aún no hay productos.{' '}
                                    {auth.user.es_admin && (
                                        <Link href={route('productos.create')} className="text-acento font-semibold underline">
                                            Agrega el primero
                                        </Link>
                                    )}
                                </>
                            ) : (
                                'Todo en orden: ningún producto está bajo su mínimo.'
                            )}
                        </p>
                    ) : (
                        <ul>
                            {alertas.slice(0, 8).map((p) => (
                                // Dos filas: nombre completo + estado arriba, barra + cantidades abajo (no se corta en celular).
                                <li
                                    key={p.id}
                                    className="border-linea grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 border-t px-4 py-3 first:border-t-0 sm:px-[22px]"
                                >
                                    <span className="text-[15px] leading-snug font-semibold break-words">{p.nombre}</span>
                                    <EstadoBadge estado={p.estado} className="justify-self-end" />
                                    <StockMeter producto={p} />
                                    <span className="text-right font-mono text-sm whitespace-nowrap">
                                        <strong className={ESTADOS[p.estado].texto}>{formatoCantidad(p.stock_actual)}</strong>
                                        <span className="text-muted-foreground">
                                            {' '}
                                            / {formatoCantidad(p.stock_minimo)} {p.unidad}
                                        </span>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <section aria-labelledby="movimientos-titulo" className="tarjeta overflow-hidden">
                    <header className="border-linea flex items-center justify-between gap-3 border-b px-4 py-[18px] sm:px-[22px]">
                        <h2 id="movimientos-titulo" className="titulo-seccion">
                            Últimos movimientos
                        </h2>
                        {recientes.length > 0 && (
                            <Link
                                href={route('movimientos.index')}
                                className="text-acento toque shrink-0 text-sm font-semibold whitespace-nowrap hover:underline"
                            >
                                Ver historial
                            </Link>
                        )}
                    </header>
                    {recientes.length === 0 ? (
                        <p className="text-muted-foreground px-[22px] py-9 text-center text-sm">Todavía no hay movimientos.</p>
                    ) : (
                        <ul>
                            {recientes.map((m) => {
                                const tipo = TIPOS_MOVIMIENTO[m.tipo];
                                return (
                                    <li key={m.id} className="border-linea flex items-center gap-3 border-t px-4 py-3 first:border-t-0 sm:px-[22px]">
                                        <span
                                            className={cn(
                                                'bg-campo flex size-9 shrink-0 items-center justify-center rounded-lg font-mono text-lg font-bold',
                                                tipo.clase,
                                            )}
                                            title={tipo.etiqueta}
                                        >
                                            {tipo.signo}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-[15px] font-semibold">
                                                {productoDe(m).nombre}
                                                {productoDe(m).eliminado && (
                                                    <span className="text-muted-foreground ml-2 font-mono text-[11px] font-normal uppercase">
                                                        eliminado
                                                    </span>
                                                )}
                                            </p>
                                            <p className="text-muted-foreground text-xs">
                                                {m.user?.name ?? m.usuario_nombre ?? '—'} · {formatoFecha(m.created_at)}
                                            </p>
                                        </div>
                                        <div className="text-right font-mono text-sm whitespace-nowrap">
                                            <p className={cn('font-bold', tipo.clase)}>
                                                {tipo.signo} {formatoCantidad(m.cantidad)}
                                            </p>
                                            <p className="text-muted-foreground text-xs">
                                                queda {formatoCantidad(m.stock_nuevo)} {productoDe(m).unidad}
                                            </p>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </section>
            </div>
        </AppLayout>
    );
}
