import { type EstadoStock, type Movimiento, type TipoMovimiento } from '@/types';

/** Muestra cantidades sin decimales innecesarios: 5 -> "5", 2.5 -> "2,5", 0.125 -> "0,125". */
export function formatoCantidad(valor: number): string {
    return new Intl.NumberFormat('es', { maximumFractionDigits: 3 }).format(valor);
}

/**
 * Unidades en que se puede escribir una cantidad según la unidad del producto, con su factor
 * (el servidor hace la misma conversión y es quien manda). Ej.: producto en kg -> kg o g.
 */
export const CONVERSIONES: Record<string, Record<string, number>> = {
    kg: { kg: 1, g: 0.001 },
    g: { g: 1, kg: 1000 },
    litros: { litros: 1, ml: 0.001 },
    ml: { ml: 1, litros: 1000 },
};

/**
 * Deja escribir solo números en una cantidad: dígitos, una coma o punto decimal y hasta 3 decimales.
 * Cualquier otra tecla (letras, signos, espacios) se ignora.
 */
export function soloCantidad(valor: string): string {
    const limpio = valor.replace(/[^\d.,]/g, '');
    const separador = limpio.search(/[.,]/);
    if (separador === -1) return limpio;

    const decimales = limpio.slice(separador + 1).replace(/[.,]/g, '');

    return limpio.slice(0, separador + 1) + decimales.slice(0, 3);
}

/** Clave única para cada envío de un movimiento: si el mismo envío llega dos veces, el servidor ignora la copia. */
export function nuevaClave(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();

    // Navegadores antiguos: UUID v4 con números aleatorios seguros.
    const b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Nombre y unidad del producto de un movimiento, aunque el producto ya se haya eliminado. */
export function productoDe(m: Movimiento): { nombre: string; unidad: string; eliminado: boolean } {
    if (m.producto) return { nombre: m.producto.nombre, unidad: m.producto.unidad, eliminado: false };

    return { nombre: m.producto_nombre ?? 'Producto eliminado', unidad: m.producto_unidad ?? '', eliminado: true };
}

export function unidadesDeIngreso(unidad: string): Record<string, number> {
    return CONVERSIONES[unidad] ?? { [unidad]: 1 };
}

export function formatoFecha(fecha: string): string {
    return new Intl.DateTimeFormat('es', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(fecha));
}

interface EstiloEstado {
    etiqueta: string;
    /** Fondo y texto de la etiqueta de estado. */
    insignia: string;
    /** Relleno de la barra de stock. */
    barra: string;
    /** Color de las cifras. */
    texto: string;
}

export const ESTADOS: Record<EstadoStock, EstiloEstado> = {
    bien: {
        etiqueta: 'OK',
        insignia: 'bg-etiqueta-bien text-etiqueta-bien-texto',
        barra: 'bg-estado-bien',
        texto: 'text-foreground',
    },
    bajo: {
        etiqueta: 'Bajo',
        insignia: 'bg-etiqueta-bajo text-etiqueta-bajo-texto',
        barra: 'bg-estado-bajo',
        texto: 'text-estado-bajo',
    },
    agotado: {
        etiqueta: 'Sin stock',
        insignia: 'bg-etiqueta-agotado text-etiqueta-agotado-texto',
        barra: 'bg-estado-agotado',
        texto: 'text-estado-agotado',
    },
};

export const TIPOS_MOVIMIENTO: Record<TipoMovimiento, { etiqueta: string; clase: string; signo: string }> = {
    entrada: { etiqueta: 'Entrada', clase: 'text-estado-bien', signo: '+' },
    salida: { etiqueta: 'Salida', clase: 'text-estado-agotado', signo: '−' },
    ajuste: { etiqueta: 'Conteo', clase: 'text-estado-bajo', signo: '=' },
};

/** Campo de formulario del diseño: 44px de alto, borde gris verdoso, esquinas de 8px. */
export const claseCampo =
    'min-h-11 w-full rounded-lg border border-input bg-card px-3 text-base md:text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

/**
 * Píldora de búsqueda y filtros. 16px en celular: con menos, Safari de iPhone hace zoom al tocarla.
 * Ocupa todo el ancho en celular y nunca se sale de la pantalla aunque una opción sea muy larga.
 */
export const clasePildora =
    'min-h-11 w-full max-w-full min-w-0 rounded-full border border-border bg-campo px-4 text-base sm:w-auto md:text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';
