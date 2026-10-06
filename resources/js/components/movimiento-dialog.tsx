import InputError from '@/components/input-error';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { claseCampo, formatoCantidad, nuevaClave, soloCantidad, unidadesDeIngreso } from '@/lib/inventario';
import { cn } from '@/lib/utils';
import { type Producto, type TipoMovimiento } from '@/types';
import { useForm } from '@inertiajs/react';
import { ArrowRight, TriangleAlert } from 'lucide-react';
import { FormEventHandler, useEffect } from 'react';

const OPCIONES: { tipo: TipoMovimiento; etiqueta: string; ayuda: string }[] = [
    { tipo: 'entrada', etiqueta: 'Sumar', ayuda: 'Llegó mercadería o se repuso.' },
    { tipo: 'salida', etiqueta: 'Restar', ayuda: 'Se usó, se venció o se perdió.' },
    { tipo: 'ajuste', etiqueta: 'Contar', ayuda: 'Escribe lo que hay físicamente; el stock queda exactamente en ese valor.' },
];

interface Props {
    producto: Producto | null;
    tipoInicial?: TipoMovimiento;
    onClose: () => void;
}

export default function MovimientoDialog({ producto, tipoInicial = 'ajuste', onClose }: Props) {
    const { data, setData, post, transform, processing, errors, reset, clearErrors } = useForm({
        tipo: tipoInicial,
        cantidad: '',
        // Unidad en que se escribe la cantidad (ej. "g" para un producto en kg).
        unidad: '',
        nota: '',
        // Clave de este envío (evita registrarlo dos veces) y stock que se veía al abrir.
        clave: '',
        stock_visto: 0,
    });

    // Cada vez que se abre para otro producto, arranca limpio y en la unidad del producto.
    // (Depende del id: el producto se actualiza solo cada tanto y eso no debe borrar lo escrito.)
    useEffect(() => {
        if (producto) {
            clearErrors();
            reset();
            setData((d) => ({ ...d, tipo: tipoInicial, unidad: producto.unidad, clave: nuevaClave(), stock_visto: producto.stock_actual }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [producto?.id, tipoInicial]);

    if (!producto) return null;

    const unidades = unidadesDeIngreso(producto.unidad);
    const unidadIngreso = data.unidad in unidades ? data.unidad : producto.unidad;
    const escrita = parseFloat(data.cantidad.replace(',', '.'));
    // Cantidad llevada a la unidad del producto, con la misma precisión que el servidor (3 decimales).
    const cantidad = isNaN(escrita) ? NaN : Math.round(escrita * unidades[unidadIngreso] * 1000) / 1000;
    const resultado = isNaN(cantidad)
        ? null
        : data.tipo === 'entrada'
          ? producto.stock_actual + cantidad
          : data.tipo === 'salida'
            ? producto.stock_actual - cantidad
            : cantidad;

    const enviar = (confirmar: boolean) => {
        // Acepta "2,5" además de "2.5".
        transform((d) => ({ ...d, cantidad: d.cantidad.replace(',', '.'), confirmar }));
        post(route('movimientos.store', producto.id), {
            preserveScroll: true,
            onSuccess: () => onClose(),
        });
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        enviar(false);
    };

    // Otra persona movió el stock mientras se contaba: se decide antes de guardar.
    const conflicto = (errors as Record<string, string | undefined>).conflicto;

    const ayuda = OPCIONES.find((o) => o.tipo === data.tipo)?.ayuda;

    return (
        <Dialog open onOpenChange={(abierto) => !abierto && onClose()}>
            <DialogContent className="gap-5 rounded-[14px]">
                <DialogHeader>
                    <span className="etiqueta text-muted-foreground">{producto.categoria?.nombre ?? 'Sin categoría'}</span>
                    <DialogTitle className="font-display text-[28px] leading-tight font-extrabold tracking-[-0.03em]">{producto.nombre}</DialogTitle>
                    <DialogDescription>
                        Mínimo:{' '}
                        <span className="font-mono">
                            {formatoCantidad(producto.stock_minimo)} {producto.unidad}
                        </span>
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={submit} className="space-y-5">
                    <div className="bg-campo grid grid-cols-3 gap-1 rounded-full border p-1" role="radiogroup" aria-label="Tipo de movimiento">
                        {OPCIONES.map((o) => (
                            <button
                                key={o.tipo}
                                type="button"
                                role="radio"
                                aria-checked={data.tipo === o.tipo}
                                onClick={() => {
                                    if (conflicto) clearErrors('conflicto' as never);
                                    setData('tipo', o.tipo);
                                }}
                                className={cn(
                                    'min-h-10 rounded-full text-sm font-semibold transition-colors',
                                    data.tipo === o.tipo ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:text-foreground',
                                )}
                            >
                                {o.etiqueta}
                            </button>
                        ))}
                    </div>
                    <p className="text-muted-foreground -mt-2 text-sm">{ayuda}</p>

                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="cantidad" className="text-[13px] font-semibold">
                            {data.tipo === 'ajuste' ? 'Cantidad contada' : 'Cantidad'}
                        </label>
                        <div className="flex gap-2">
                            <input
                                id="cantidad"
                                type="text"
                                inputMode="decimal"
                                autoFocus
                                autoComplete="off"
                                value={data.cantidad}
                                onChange={(e) => {
                                    // Si corrige tras el aviso, su conteo ya considera el stock nuevo.
                                    if (conflicto) {
                                        clearErrors('conflicto' as never);
                                        setData('stock_visto', producto.stock_actual);
                                    }
                                    setData('cantidad', soloCantidad(e.target.value));
                                }}
                                placeholder="0"
                                className={cn(claseCampo, 'min-h-14 min-w-0 flex-1 text-center font-mono text-2xl font-bold md:text-2xl')}
                            />
                            {/* Kg o g, litros o ml: se escribe como sea más cómodo y se convierte solo. */}
                            {Object.keys(unidades).length > 1 ? (
                                <div className="bg-campo flex shrink-0 rounded-lg border p-1" role="radiogroup" aria-label="Unidad de la cantidad">
                                    {Object.keys(unidades).map((u) => (
                                        <button
                                            key={u}
                                            type="button"
                                            role="radio"
                                            aria-checked={unidadIngreso === u}
                                            onClick={() => setData('unidad', u)}
                                            className={cn(
                                                'min-w-12 rounded-md px-3 font-mono text-sm font-bold transition-colors',
                                                unidadIngreso === u
                                                    ? 'bg-secondary text-secondary-foreground'
                                                    : 'text-muted-foreground hover:text-foreground',
                                            )}
                                        >
                                            {u}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <span className="text-muted-foreground flex shrink-0 items-center px-1 font-mono text-sm font-bold">
                                    {producto.unidad}
                                </span>
                            )}
                        </div>
                        {unidadIngreso !== producto.unidad && !isNaN(escrita) && (
                            <p className="text-muted-foreground font-mono text-sm">
                                {formatoCantidad(escrita)} {unidadIngreso} = {formatoCantidad(cantidad)} {producto.unidad}
                            </p>
                        )}
                        <InputError message={errors.cantidad || errors.unidad} />
                    </div>

                    {/* Antes → después. */}
                    <div className="bg-campo grid grid-cols-[1fr_auto_1fr] items-center rounded-xl border px-4 py-3 text-center">
                        <div>
                            <p className="etiqueta text-muted-foreground text-xs">Ahora</p>
                            <p className="font-mono text-xl font-bold">
                                {formatoCantidad(producto.stock_actual)} <span className="text-muted-foreground text-sm">{producto.unidad}</span>
                            </p>
                        </div>
                        <ArrowRight className="text-muted-foreground size-5" />
                        <div>
                            <p className="etiqueta text-muted-foreground text-xs">Quedará</p>
                            <p
                                className={cn(
                                    'font-mono text-xl font-bold',
                                    resultado === null
                                        ? 'text-muted-foreground'
                                        : resultado < 0
                                          ? 'text-estado-agotado'
                                          : resultado <= producto.stock_minimo
                                            ? 'text-estado-bajo'
                                            : 'text-estado-bien',
                                )}
                            >
                                {resultado === null ? '—' : formatoCantidad(resultado)}{' '}
                                {resultado !== null && <span className="text-muted-foreground text-sm">{producto.unidad}</span>}
                            </p>
                        </div>
                    </div>

                    <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
                        Nota (opcional)
                        <input
                            value={data.nota}
                            onChange={(e) => setData('nota', e.target.value)}
                            placeholder="Ej: pedido del proveedor, merma, conteo semanal…"
                            maxLength={255}
                            className={cn(claseCampo, 'font-normal')}
                        />
                        <InputError message={errors.nota} className="font-normal" />
                    </label>

                    {conflicto && (
                        <div role="alert" className="border-estado-bajo bg-panel flex flex-col gap-3 rounded-xl border-[1.5px] px-4 py-3">
                            <p className="flex gap-2 text-sm">
                                <TriangleAlert className="text-estado-bajo mt-0.5 size-4 shrink-0" aria-hidden />
                                <span>
                                    <strong>{conflicto}</strong> Revisa que tu conteo incluya ese cambio antes de guardar.
                                </span>
                            </p>
                            <button
                                type="button"
                                disabled={processing}
                                onClick={() => enviar(true)}
                                className="border-tinta hover:bg-card min-h-11 self-start rounded-lg border px-4 text-sm font-semibold disabled:opacity-50"
                            >
                                Guardar mi conteo igual ({data.cantidad || '0'} {unidadIngreso})
                            </button>
                        </div>
                    )}

                    <DialogFooter className="gap-2">
                        <button type="button" onClick={onClose} className="hover:bg-campo min-h-11 rounded-lg border px-5 text-sm font-semibold">
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={processing || data.cantidad.trim() === '' || Boolean(conflicto)}
                            className="bg-acento hover:bg-acento-oscuro min-h-11 rounded-lg px-5 text-sm font-semibold text-white disabled:opacity-50"
                        >
                            Guardar
                        </button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
