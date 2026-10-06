import { LucideIcon } from 'lucide-react';

export interface Auth {
    user: User;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    url: string;
    icon?: LucideIcon | null;
    isActive?: boolean;
}

/** Piso del restaurante: cada uno tiene su propio inventario. */
export interface Piso {
    id: number;
    nombre: string;
}

export interface SharedData {
    name: string;
    auth: Auth;
    /** Todos los pisos (para el selector). */
    pisos: Piso[];
    /** Piso con que trabaja el usuario (guardado en su cuenta). */
    pisoActual: Piso | null;
    flash: { success: string | null };
    /** Version de demostracion: enlace de contacto opcional para el aviso. */
    demo: { contacto: string | null };
    [key: string]: unknown;
}

export type EstadoStock = 'bien' | 'bajo' | 'agotado';

export type TipoMovimiento = 'entrada' | 'salida' | 'ajuste';

export interface Categoria {
    id: number;
    nombre: string;
    productos_count?: number;
}

export interface Producto {
    id: number;
    nombre: string;
    unidad: string;
    categoria_id: number | null;
    categoria?: Categoria | null;
    stock_actual: number;
    stock_minimo: number;
    estado: EstadoStock;
}

export interface Movimiento {
    id: number;
    tipo: TipoMovimiento;
    cantidad: number;
    stock_anterior: number;
    stock_nuevo: number;
    nota: string | null;
    created_at: string;
    producto: Pick<Producto, 'id' | 'nombre' | 'unidad'> | null;
    user: Pick<User, 'id' | 'name'> | null;
    /** Nombre guardado cuando la cuenta fue eliminada. */
    usuario_nombre: string | null;
    /** Nombre y unidad guardados cuando el producto fue eliminado. */
    producto_nombre: string | null;
    producto_unidad: string | null;
}

export interface Paginado<T> {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

/** Datos del usuario conectado que comparte el servidor (solo estos campos). */
export interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    apariencia?: 'light' | 'dark' | 'system';
    es_admin: boolean;
    debe_cambiar_password: boolean;
    [key: string]: unknown; // This allows for additional properties...
}
