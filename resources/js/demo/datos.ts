/**
 * "Base de datos" de la demo: vive en la memoria del navegador.
 * Se copia a sessionStorage para sobrevivir a recargar la página (F5), y desaparece
 * al cerrar la pestaña. Cada visitante tiene la suya: nadie ve los cambios de otro.
 */

export type TipoMovimiento = 'entrada' | 'salida' | 'ajuste';
export type Apariencia = 'light' | 'dark' | 'system';

export interface PisoR {
    id: number;
    nombre: string;
    created_at: string;
    updated_at: string;
}

export interface CategoriaR {
    id: number;
    piso_id: number;
    nombre: string;
    created_at: string;
    updated_at: string;
}

export interface ProductoR {
    id: number;
    piso_id: number;
    categoria_id: number | null;
    nombre: string;
    unidad: string;
    stock_actual: number;
    stock_minimo: number;
    created_at: string;
    updated_at: string;
}

export interface MovimientoR {
    id: number;
    piso_id: number;
    producto_id: number | null;
    producto_nombre: string | null;
    producto_unidad: string | null;
    user_id: number | null;
    usuario_nombre: string | null;
    tipo: TipoMovimiento;
    cantidad: number;
    stock_anterior: number;
    stock_nuevo: number;
    nota: string | null;
    clave_envio: string | null;
    created_at: string;
    updated_at: string;
}

export interface UsuarioR {
    id: number;
    name: string;
    email: string;
    /** En la demo la clave se guarda tal cual: nunca sale del navegador de quien la escribió. */
    password: string;
    apariencia: Apariencia;
    es_admin: boolean;
    todos_los_pisos: boolean;
    activo: boolean;
    debe_cambiar_password: boolean;
    ultimo_acceso_at: string | null;
    piso_id: number | null;
    pisos: number[];
}

export interface Sesion {
    userId: number | null;
    /** Ultima vez que confirmo su clave (para entrar a Usuarios), en ms. */
    claveConfirmadaAt: number | null;
    /** Pagina a la que queria ir antes de que se le pidiera entrar o confirmar la clave. */
    intended: string | null;
}

export interface Db {
    version: number;
    ids: Record<'pisos' | 'categorias' | 'productos' | 'movimientos' | 'usuarios', number>;
    pisos: PisoR[];
    categorias: CategoriaR[];
    productos: ProductoR[];
    movimientos: MovimientoR[];
    usuarios: UsuarioR[];
    sesion: Sesion;
}

/** Cuentas que se muestran en el login para entrar con un clic. */
export const CUENTAS_DEMO = [
    {
        rol: 'Administrador',
        descripcion: 'Ve todo: productos, categorías, pisos y usuarios.',
        nombre: 'Administrador Demo',
        email: 'admin@demo.cl',
        password: 'DemoCocina2026',
        es_admin: true,
    },
    {
        rol: 'Cocinero',
        descripcion: 'Solo suma, resta y cuenta stock en la Cocina principal.',
        nombre: 'Cocinero Demo',
        email: 'cocina@demo.cl',
        password: 'DemoCocina2026',
        es_admin: false,
    },
] as const;

const CLAVE_ALMACEN = 'inventario-demo';
const VERSION = 1;

/**
 * piso => categoria => [nombre, unidad, stock minimo, stock final].
 * El stock final deja productos "bien", "bajo" y "agotado" para que se vean las alertas.
 */
const CATALOGO: Record<string, Record<string, [string, string, number, number][]>> = {
    'Cocina principal': {
        Carnes: [
            ['Lomo vetado', 'kg', 3, 6.5],
            ['Pechuga de pollo', 'kg', 5, 2.4],
            ['Carne molida', 'kg', 4, 0],
            ['Salmón', 'kg', 2, 3.2],
        ],
        Verduras: [
            ['Tomate', 'kg', 5, 12],
            ['Cebolla', 'kg', 5, 8.75],
            ['Papa', 'kg', 10, 22],
            ['Palta', 'kg', 3, 1.2],
            ['Lechuga', 'unidades', 6, 14],
            ['Limón', 'kg', 2, 4],
        ],
        Lácteos: [
            ['Leche', 'litros', 6, 9],
            ['Crema', 'litros', 2, 1.5],
            ['Mantequilla', 'kg', 1, 2.25],
            ['Queso mantecoso', 'kg', 2, 0],
        ],
        Abarrotes: [
            ['Arroz', 'kg', 10, 18],
            ['Aceite de oliva', 'litros', 3, 4.5],
            ['Harina', 'kg', 10, 7],
            ['Sal', 'kg', 2, 5],
            ['Azúcar', 'kg', 3, 6],
        ],
    },
    Bar: {
        Bebidas: [
            ['Bebida cola', 'latas', 24, 60],
            ['Agua mineral', 'botellas', 24, 18],
            ['Jugo natural', 'litros', 5, 8],
        ],
        Licores: [
            ['Pisco', 'botellas', 6, 11],
            ['Vino tinto', 'botellas', 12, 30],
            ['Cerveza', 'botellas', 24, 0],
        ],
        'Frutas y hierbas': [
            ['Limón', 'kg', 3, 5],
            ['Menta', 'paquetes', 2, 3],
        ],
    },
};

const NOTAS: Record<TipoMovimiento, (string | null)[]> = {
    entrada: ['Pedido del proveedor', 'Compra en feria', null, null],
    salida: ['Servicio de almuerzo', 'Servicio de cena', 'Merma', null, null],
    ajuste: ['Conteo semanal', 'Conteo de cierre'],
};

export const ahora = () => new Date().toISOString();

export function siguienteId(db: Db, tabla: keyof Db['ids']): number {
    db.ids[tabla] += 1;

    return db.ids[tabla];
}

/** Azar con semilla fija: todos los visitantes parten con los mismos datos. */
function azarConSemilla(semilla: number) {
    let estado = semilla;

    return (min: number, max: number) => {
        estado = (estado + 0x6d2b79f5) | 0;
        let t = Math.imul(estado ^ (estado >>> 15), 1 | estado);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        const r = ((t ^ (t >>> 14)) >>> 0) / 4294967296;

        return Math.floor(r * (max - min + 1)) + min;
    };
}

const redondear = (valor: number, decimales = 3) => Math.round(valor * 10 ** decimales) / 10 ** decimales;

/** Datos de ejemplo: dos pisos, productos en los tres estados y dos semanas de historial. */
export function datosIniciales(): Db {
    const azar = azarConSemilla(2026);
    const db: Db = {
        version: VERSION,
        ids: { pisos: 0, categorias: 0, productos: 0, movimientos: 0, usuarios: 0 },
        pisos: [],
        categorias: [],
        productos: [],
        movimientos: [],
        usuarios: [],
        sesion: { userId: null, claveConfirmadaAt: null, intended: null },
    };
    const creado = new Date(Date.now() - 30 * 86400_000).toISOString();

    for (const nombre of Object.keys(CATALOGO)) {
        db.pisos.push({ id: siguienteId(db, 'pisos'), nombre, created_at: creado, updated_at: creado });
    }
    const [cocina, bar] = db.pisos;

    const usuario = (name: string, email: string, password: string, esAdmin: boolean, pisos: number[]): UsuarioR => {
        const u: UsuarioR = {
            id: siguienteId(db, 'usuarios'),
            name,
            email,
            password,
            apariencia: 'system',
            es_admin: esAdmin,
            todos_los_pisos: esAdmin,
            activo: true,
            debe_cambiar_password: false,
            ultimo_acceso_at: null,
            piso_id: null,
            pisos,
        };
        db.usuarios.push(u);

        return u;
    };

    const [admin, cocinero] = CUENTAS_DEMO.map((c) => usuario(c.nombre, c.email, c.password, c.es_admin, c.es_admin ? [] : [cocina.id]));
    // Una cuenta mas, sin clave conocida, para tener a quien editar en "Usuarios".
    const beto = usuario('Beto Soto', 'beto@demo.cl', generarClaveTemporal(), false, [bar.id]);

    for (const piso of db.pisos) {
        for (const [nombreCategoria, productos] of Object.entries(CATALOGO[piso.nombre])) {
            const categoria: CategoriaR = {
                id: siguienteId(db, 'categorias'),
                piso_id: piso.id,
                nombre: nombreCategoria,
                created_at: creado,
                updated_at: creado,
            };
            db.categorias.push(categoria);

            for (const [nombre, unidad, minimo, final] of productos) {
                const producto: ProductoR = {
                    id: siguienteId(db, 'productos'),
                    piso_id: piso.id,
                    categoria_id: categoria.id,
                    nombre,
                    unidad,
                    stock_actual: final,
                    stock_minimo: minimo,
                    created_at: creado,
                    updated_at: creado,
                };
                db.productos.push(producto);

                // En el Bar no trabaja el cocinero (no tiene ese piso asignado).
                const autores = piso.id === bar.id ? [admin, beto] : [admin, cocinero, beto];
                db.movimientos.push(...historial(db, producto, autores, azar));
            }
        }
    }

    // El historial se muestra por orden de id dentro de la misma fecha: ids en orden cronologico.
    db.movimientos.sort((a, b) => a.created_at.localeCompare(b.created_at)).forEach((m, i) => (m.id = i + 1));

    return db;
}

/**
 * Movimientos de las ultimas dos semanas que terminan exactamente en el stock actual.
 * Se calculan hacia atras, desde el stock final hasta el inicial.
 */
function historial(db: Db, producto: ProductoR, autores: UsuarioR[], azar: (min: number, max: number) => number): MovimientoR[] {
    const enteros = !['kg', 'g', 'litros', 'ml'].includes(producto.unidad);
    const minimo = Math.max(producto.stock_minimo, 1);
    const fechas = Array.from({ length: azar(4, 9) }, () => azar(3600, 14 * 86400)).sort((a, b) => a - b);

    const filas: MovimientoR[] = [];
    let stock = producto.stock_actual;

    // Del mas reciente al mas antiguo.
    for (const segundosAtras of fechas) {
        const n = azar(1, 10);
        let tipo: TipoMovimiento = n <= 6 ? 'salida' : n <= 9 ? 'entrada' : 'ajuste';
        let valor = (minimo * azar(20, 150)) / 100;
        valor = enteros ? Math.max(1, Math.round(valor)) : redondear(valor, 2);
        // Un conteo corrige una diferencia pequeña (nunca cero: no seria un movimiento).
        const diferencia = (enteros ? azar(-2, 2) : azar(-50, 50) / 100) || 1;

        const nuevo = stock;
        let anterior = tipo === 'salida' ? stock + valor : tipo === 'entrada' ? stock - valor : stock + diferencia;

        // No puede haber stock negativo: esa entrada pasa a ser una salida.
        if (anterior < 0) {
            tipo = 'salida';
            anterior = stock + valor;
        }
        anterior = redondear(anterior);

        const fecha = new Date(Date.now() - segundosAtras * 1000).toISOString();
        const notas = NOTAS[tipo];

        filas.push({
            id: siguienteId(db, 'movimientos'),
            piso_id: producto.piso_id,
            producto_id: producto.id,
            producto_nombre: null,
            producto_unidad: null,
            user_id: autores[azar(0, autores.length - 1)].id,
            usuario_nombre: null,
            tipo,
            cantidad: tipo === 'ajuste' ? nuevo : valor,
            stock_anterior: anterior,
            stock_nuevo: nuevo,
            nota: notas[azar(0, notas.length - 1)],
            clave_envio: null,
            created_at: fecha,
            updated_at: fecha,
        });

        stock = anterior;
    }

    return filas;
}

/**
 * Clave temporal de 14 caracteres con mayusculas, minusculas y numeros, sin los que
 * se confunden al dictarla (0/O, 1/l/I).
 */
export function generarClaveTemporal(): string {
    const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let clave = '';

    do {
        const azar = crypto.getRandomValues(new Uint32Array(14));
        clave = Array.from(azar, (n) => alfabeto[n % alfabeto.length]).join('');
    } while (!/[A-Z]/.test(clave) || !/[a-z]/.test(clave) || !/\d/.test(clave));

    return clave;
}

// sessionStorage puede fallar (modo privado estricto): entonces la demo vive solo en memoria.
export function cargar(): Db {
    try {
        const guardado = sessionStorage.getItem(CLAVE_ALMACEN);
        if (guardado) {
            const db = JSON.parse(guardado) as Db;
            if (db.version === VERSION) return db;
        }
    } catch {
        // Datos ilegibles o almacenamiento bloqueado: se parte de cero.
    }

    return datosIniciales();
}

export function guardar(db: Db): void {
    try {
        sessionStorage.setItem(CLAVE_ALMACEN, JSON.stringify(db));
    } catch {
        // Sin almacenamiento: los cambios duran hasta recargar la página.
    }
}

/** Borra los cambios del visitante: la próxima carga parte con los datos de ejemplo. */
export function borrar(): void {
    try {
        sessionStorage.removeItem(CLAVE_ALMACEN);
    } catch {
        // Nada que borrar.
    }
}
