import AvisoReposicion from '@/components/aviso-reposicion';
import EstadoBadge from '@/components/estado-badge';
import MovimientoDialog from '@/components/movimiento-dialog';
import PageHeader from '@/components/page-header';
import ResumenStock from '@/components/resumen-stock';
import StockMeter from '@/components/stock-meter';
import AppLayout from '@/layouts/app-layout';
import { clasePildora, ESTADOS, formatoCantidad, nuevaClave } from '@/lib/inventario';
import { cn } from '@/lib/utils';
import { type Categoria, type EstadoStock, type Producto, type SharedData, type TipoMovimiento } from '@/types';
import { Head, Link, router, usePage, usePoll } from '@inertiajs/react';
import { ClipboardCheck, FileSpreadsheet, Pencil, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface Filtros {
    buscar?: string;
    categoria?: string;
    estado?: string;
}

interface Props {
    productos: Producto[];
    categorias: Categoria[];
    filtros: Filtros;
    alertas: Producto[];
    resumen: { total: number; bien: number; bajo: number; agotado: number };
}

/** Columnas de la tabla; bajo 900px quedan solo producto y stock. */
const fila =
    'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2.5 min-[900px]:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_168px_minmax(0,0.8fr)_110px_96px]';

const botonCuadrado =
    'flex size-11 items-center justify-center rounded-lg border border-border bg-card font-mono text-lg font-semibold transition-colors hover:bg-campo disabled:cursor-not-allowed disabled:opacity-40';

const botonIcono = 'text-muted-foreground hover:bg-campo hover:text-foreground flex size-11 items-center justify-center rounded-lg';

/** − cantidad + (los botones rápidos de 1 en 1). */
function ControlesStock({ producto: p, ocupado, onMover }: { producto: Producto; ocupado: boolean; onMover: (tipo: 'entrada' | 'salida') => void }) {
    return (
        <div className="flex items-center gap-1">
            <button
                type="button"
                className={botonCuadrado}
                aria-label={`Restar 1 a ${p.nombre}`}
                disabled={p.stock_actual < 1 || ocupado}
                onClick={() => onMover('salida')}
            >
                −
            </button>
            <span className={cn('min-w-16 text-center font-mono text-sm font-bold', ESTADOS[p.estado].texto)}>
                {formatoCantidad(p.stock_actual)} {p.unidad}
            </span>
            <button
                type="button"
                className={botonCuadrado}
                aria-label={`Sumar 1 a ${p.nombre}`}
                disabled={ocupado}
                onClick={() => onMover('entrada')}
            >
                +
            </button>
        </div>
    );
}

function AccionesFila({ producto: p, onContar }: { producto: Producto; onContar: () => void }) {
    const esAdmin = usePage<SharedData>().props.auth.user.es_admin;

    return (
        <div className="flex items-center justify-end">
            <button type="button" onClick={onContar} aria-label={`Contar o ajustar ${p.nombre}`} title="Contar / ajustar" className={botonIcono}>
                <ClipboardCheck className="size-[18px]" strokeWidth={1.8} />
            </button>
            {/* Editar nombres, mínimos o borrar es solo del administrador. */}
            {esAdmin && (
                <Link href={route('productos.edit', p.id)} aria-label={`Editar ${p.nombre}`} title="Editar" className={botonIcono}>
                    <Pencil className="size-[18px]" strokeWidth={1.8} />
                </Link>
            )}
        </div>
    );
}

export default function Inventario({ productos, categorias, filtros, alertas, resumen }: Props) {
    const [buscar, setBuscar] = useState(filtros.buscar ?? '');
    const [dialogo, setDialogo] = useState<{ producto: Producto; tipo: TipoMovimiento } | null>(null);
    const [enviando, setEnviando] = useState<number | null>(null);
    // Freno inmediato contra el doble toque (el estado de React tarda un render en aplicarse).
    const enCurso = useRef(false);
    const primeraCarga = useRef(true);
    const esAdmin = usePage<SharedData>().props.auth.user.es_admin;

    // Varias personas usan el inventario a la vez: cada 20 s se trae el stock al día.
    usePoll(20000, { only: ['productos', 'alertas', 'resumen'] });

    // El diálogo muestra siempre el stock actual del producto, aunque cambie mientras está abierto.
    const productoDialogo = dialogo ? (productos.find((p) => p.id === dialogo.producto.id) ?? dialogo.producto) : null;

    const filtrar = (cambios: Filtros) => {
        const nuevos = { ...filtros, buscar, ...cambios };
        // No mandar filtros vacíos en la URL.
        const limpios = Object.fromEntries(Object.entries(nuevos).filter(([, v]) => v));

        router.get(route('inventario'), limpios, { preserveState: true, preserveScroll: true, replace: true });
    };

    // Búsqueda mientras escribes, esperando a que termines de tipear.
    useEffect(() => {
        if (primeraCarga.current) {
            primeraCarga.current = false;
            return;
        }
        const timer = setTimeout(() => filtrar({ buscar }), 300);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [buscar]);

    // Botones rápidos +1 / -1.
    const moverUno = (producto: Producto, tipo: 'entrada' | 'salida') => {
        if (enCurso.current) return;
        enCurso.current = true;
        setEnviando(producto.id);
        router.post(
            route('movimientos.store', producto.id),
            { tipo, cantidad: 1, clave: nuevaClave() },
            {
                preserveScroll: true,
                preserveState: true,
                onFinish: () => {
                    enCurso.current = false;
                    setEnviando(null);
                },
            },
        );
    };

    const soloBajos = filtros.estado === 'alerta';
    // Filtros que llegan desde el panel (ej. "Sin stock"): se muestran como chip para poder quitarlos.
    const estadoPuntual = filtros.estado && filtros.estado !== 'alerta' ? (filtros.estado as EstadoStock) : null;
    const hayFiltros = Boolean(filtros.buscar || filtros.categoria || filtros.estado);

    return (
        <AppLayout>
            <Head title="Inventario" />

            <PageHeader
                selectorPiso
                seccion="Bodega y cámaras"
                titulo="Inventario"
                acciones={
                    <>
                        {/* Enlace normal (no de Inertia) para que el navegador descargue el archivo. */}
                        <a
                            href={route('inventario.excel')}
                            download
                            className="border-tinta hover:bg-card flex min-h-11 items-center gap-2 rounded-full border px-5 text-sm font-semibold transition-colors"
                        >
                            <FileSpreadsheet className="size-4" aria-hidden />
                            Descargar Excel
                        </a>
                        {esAdmin && (
                            <Link
                                href={route('productos.create')}
                                className="bg-acento hover:bg-acento-oscuro flex min-h-11 items-center rounded-full px-5 text-sm font-semibold text-white transition-colors"
                            >
                                + Agregar producto
                            </Link>
                        )}
                    </>
                }
            />

            <AvisoReposicion productos={alertas} />

            <ResumenStock total={resumen.total} bajo={resumen.bajo} agotado={resumen.agotado} />

            <section aria-labelledby="lista-titulo" className="tarjeta overflow-hidden">
                <div className="border-linea flex flex-wrap items-center justify-between gap-3 border-b px-4 py-[18px] sm:px-[22px]">
                    <h2 id="lista-titulo" className="titulo-seccion">
                        Productos
                    </h2>
                    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                        <label className="relative flex w-full items-center sm:w-auto">
                            <span className="sr-only">Buscar producto</span>
                            <Search className="text-muted-foreground absolute left-3 size-4" aria-hidden />
                            <input
                                type="search"
                                value={buscar}
                                onChange={(e) => setBuscar(e.target.value)}
                                placeholder="Buscar…"
                                className={cn(clasePildora, 'pl-9 sm:w-[200px]')}
                            />
                        </label>
                        <label className="flex min-w-0 flex-1 sm:flex-none">
                            <span className="sr-only">Filtrar por categoría</span>
                            <select className={clasePildora} value={filtros.categoria ?? ''} onChange={(e) => filtrar({ categoria: e.target.value })}>
                                <option value="">Todas las categorías</option>
                                {categorias.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.nombre}
                                    </option>
                                ))}
                                <option value="sin">Sin categoría</option>
                            </select>
                        </label>
                        <button
                            type="button"
                            aria-pressed={soloBajos}
                            onClick={() => filtrar({ estado: soloBajos ? '' : 'alerta' })}
                            className={cn(
                                'min-h-11 shrink-0 rounded-full border px-4 text-sm font-semibold whitespace-nowrap transition-colors',
                                soloBajos ? 'border-secondary bg-secondary text-secondary-foreground' : 'border-border bg-card hover:bg-campo',
                            )}
                        >
                            {/* Texto corto en celular para que el filtro de categoría no se corte. */}
                            <span className="sm:hidden">Solo bajos</span>
                            <span className="hidden sm:inline">Solo bajo mínimo</span>
                        </button>
                        {estadoPuntual && (
                            <button
                                type="button"
                                onClick={() => filtrar({ estado: '' })}
                                className="bg-secondary text-secondary-foreground flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-semibold"
                                aria-label={`Quitar filtro ${ESTADOS[estadoPuntual].etiqueta}`}
                            >
                                {ESTADOS[estadoPuntual].etiqueta} <X className="size-4" />
                            </button>
                        )}
                    </div>
                </div>

                <div
                    className={cn(fila, 'bg-campo text-muted-foreground hidden px-[22px] py-2.5 font-mono text-xs tracking-[0.1em] min-[900px]:grid')}
                >
                    <span>PRODUCTO</span>
                    <span>CATEGORÍA</span>
                    <span>STOCK</span>
                    <span>MÍNIMO</span>
                    <span>ESTADO</span>
                    <span className="sr-only">Acciones</span>
                </div>

                {productos.map((p) => {
                    const controles = <ControlesStock producto={p} ocupado={enviando === p.id} onMover={(tipo) => moverUno(p, tipo)} />;
                    const acciones = <AccionesFila producto={p} onContar={() => setDialogo({ producto: p, tipo: 'ajuste' })} />;

                    return (
                        <div key={p.id} className="border-linea border-t">
                            {/* Escritorio y tablet horizontal: fila de tabla, como el diseño. */}
                            <div className={cn(fila, 'hidden px-[22px] py-3 min-[900px]:grid')}>
                                <div className="flex min-w-0 flex-col gap-1.5">
                                    <span className="truncate text-[15px] font-semibold" title={p.nombre}>
                                        {p.nombre}
                                    </span>
                                    <StockMeter producto={p} />
                                </div>
                                <span className="text-muted-foreground text-sm">{p.categoria?.nombre ?? 'Sin categoría'}</span>
                                {controles}
                                <span className="text-muted-foreground font-mono text-[13px]">
                                    {formatoCantidad(p.stock_minimo)} {p.unidad}
                                </span>
                                <EstadoBadge estado={p.estado} />
                                {acciones}
                            </div>

                            {/* Celular: tarjeta con el nombre completo arriba y los botones grandes abajo. */}
                            <div className="flex flex-col gap-2.5 px-4 py-3.5 min-[900px]:hidden">
                                <div className="flex items-start justify-between gap-3">
                                    <span className="text-[15px] leading-snug font-semibold break-words">{p.nombre}</span>
                                    <EstadoBadge estado={p.estado} className="shrink-0" />
                                </div>
                                <div className="flex items-center gap-3">
                                    <StockMeter producto={p} className="max-w-none flex-1" />
                                    <span className="text-muted-foreground shrink-0 font-mono text-xs">
                                        mín. {formatoCantidad(p.stock_minimo)} {p.unidad}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                    {controles}
                                    {acciones}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {productos.length === 0 && (
                    <div className="border-linea text-muted-foreground border-t px-[22px] py-9 text-center text-sm">
                        {hayFiltros ? (
                            <>
                                No hay productos que coincidan.{' '}
                                <Link href={route('inventario')} className="font-semibold underline">
                                    Quitar filtros
                                </Link>
                            </>
                        ) : (
                            <>
                                Todavía no hay productos.{' '}
                                {esAdmin && (
                                    <Link href={route('productos.create')} className="font-semibold underline">
                                        Agrega el primero
                                    </Link>
                                )}
                            </>
                        )}
                    </div>
                )}
            </section>

            <MovimientoDialog producto={productoDialogo} tipoInicial={dialogo?.tipo} onClose={() => setDialogo(null)} />
        </AppLayout>
    );
}
