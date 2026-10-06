import { ESTADOS, formatoCantidad } from '@/lib/inventario';
import { cn } from '@/lib/utils';
import { type Producto } from '@/types';

/** Barra fina de stock: se llena por completo al doble del mínimo. */
export default function StockMeter({ producto, className }: { producto: Producto; className?: string }) {
    const { stock_actual: stock, stock_minimo: minimo } = producto;
    const relleno = Math.min(100, Math.round((stock / Math.max(1, minimo * 2)) * 100));

    return (
        <div
            className={cn('bg-background h-1 max-w-[220px] overflow-hidden rounded-sm', className)}
            role="meter"
            aria-valuemin={0}
            aria-valuemax={Math.max(1, minimo * 2)}
            aria-valuenow={stock}
            aria-label={`Stock ${formatoCantidad(stock)} de mínimo ${formatoCantidad(minimo)}`}
        >
            <div className={cn('h-full transition-[width] duration-300', ESTADOS[producto.estado].barra)} style={{ width: `${relleno}%` }} />
        </div>
    );
}
