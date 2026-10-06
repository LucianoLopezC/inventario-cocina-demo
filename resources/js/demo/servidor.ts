/**
 * Servidor simulado: responde a las peticiones de Inertia igual que los controladores de
 * Laravel de la app real (mismas validaciones, mensajes y datos para cada pantalla),
 * pero todo ocurre en el navegador, sobre la "base" en memoria de datos.ts.
 */
import {
    ahora,
    cargar,
    CUENTAS_DEMO,
    generarClaveTemporal,
    guardar,
    siguienteId,
    type CategoriaR,
    type Db,
    type MovimientoR,
    type PisoR,
    type ProductoR,
    type TipoMovimiento,
    type UsuarioR,
} from './datos';

export interface Pagina {
    component: string;
    props: Record<string, unknown>;
    url: string;
    version: string | null;
    encryptHistory: boolean;
    clearHistory: boolean;
}

type Cuerpo = Record<string, unknown>;
type Errores = Record<string, string>;

interface Peticion {
    metodo: string;
    url: URL;
    cuerpo: Cuerpo;
    /** Pagina desde donde se hizo la peticion (para "volver" tras guardar). */
    anterior: string;
}

/** Lo que Laravel guarda en la sesion para la siguiente pagina (->with(...) y errores). */
interface Flash {
    success?: string | null;
    clave_temporal?: { nombre: string; email: string; clave: string } | null;
    status?: string | null;
    errors?: Errores;
}

/** Redireccion: la siguiente pagina se pide al instante, como hace el navegador con un 303. */
class Redireccion {
    constructor(
        public url: string,
        public flash: Flash = {},
    ) {}
}

/** Error de validacion: se vuelve a la pagina anterior con los mensajes. */
class Validacion {
    constructor(public errores: Errores) {}
}

const UNIDADES = ['unidades', 'kg', 'g', 'litros', 'ml', 'paquetes', 'cajas', 'latas', 'botellas', 'bolsas'];
const CONVERSIONES: Record<string, Record<string, number>> = {
    kg: { kg: 1, g: 0.001 },
    g: { g: 1, kg: 1000 },
    litros: { litros: 1, ml: 0.001 },
    ml: { ml: 1, litros: 1000 },
};
const REGLA_CANTIDAD = /^\d{1,8}(\.\d{1,3})?$/;
const MENSAJE_CANTIDAD = 'Escribe solo números (hasta 3 decimales). Ej: 2 o 0,5';
/** Minutos que vale la confirmacion de clave para entrar a Usuarios (AUTH_PASSWORD_TIMEOUT). */
const CONFIRMACION_MS = 15 * 60 * 1000;
const POR_PAGINA = 30;
const NOMBRE_APP = 'Inventario Cocina (Demo)';

const ATRIBUTOS: Record<string, string> = {
    nombre: 'nombre',
    name: 'nombre',
    email: 'correo electrónico',
    categoria_id: 'categoría',
    stock_minimo: 'stock mínimo',
    stock_inicial: 'stock inicial',
    unidad: 'unidad de medida',
    tipo: 'tipo de movimiento',
    cantidad: 'cantidad',
    password: 'contraseña',
    current_password: 'contraseña actual',
    apariencia: 'apariencia',
    pisos: 'pisos',
    piso_id: 'piso',
};

const redondear = (valor: number) => Math.round(valor * 1000) / 1000;

/** 1234.5 -> "1.234,5" (como number_format en PHP, sin ceros sobrantes). */
function formato(valor: number): string {
    const [entero, decimales] = redondear(valor).toFixed(3).split('.');
    const miles = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const resto = decimales.replace(/0+$/, '');

    return resto ? `${miles},${resto}` : miles;
}

/** "Limón" y "limon" son lo mismo al buscar o al comparar nombres. */
const normalizar = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const porNombre = <T extends { nombre: string }>(a: T, b: T) => a.nombre.localeCompare(b.nombre, 'es');

const texto = (valor: unknown) => (typeof valor === 'string' ? valor : valor === null || valor === undefined ? '' : String(valor));
const booleano = (valor: unknown, porDefecto = false) =>
    valor === undefined || valor === null ? porDefecto : valor === true || valor === 1 || valor === '1' || valor === 'true';

// ---------------------------------------------------------------- validacion

class Validador {
    errores: Errores = {};

    constructor(private datos: Cuerpo) {}

    private nombre(campo: string) {
        return ATRIBUTOS[campo] ?? campo;
    }

    falla(campo: string, mensaje: string) {
        this.errores[campo] ??= mensaje;
    }

    valor(campo: string): string {
        return texto(this.datos[campo]).trim();
    }

    requerido(campo: string): boolean {
        if (this.valor(campo) === '') {
            this.falla(campo, `El campo ${this.nombre(campo)} es obligatorio.`);
            return false;
        }
        return true;
    }

    maximo(campo: string, max: number) {
        if (this.valor(campo).length > max) this.falla(campo, `El campo ${this.nombre(campo)} no debe ser mayor que ${max} caracteres.`);
    }

    unico(campo: string, existe: boolean) {
        if (existe) this.falla(campo, `El campo ${this.nombre(campo)} ya ha sido registrado.`);
    }

    en(campo: string, opciones: string[]) {
        if (!opciones.includes(this.valor(campo))) this.falla(campo, `El campo ${this.nombre(campo)} no está en la lista de valores permitidos.`);
    }

    cantidad(campo: string, opciones: { mayorQueCero?: boolean } = {}) {
        if (!this.requerido(campo)) return;
        const valor = this.valor(campo);
        if (!REGLA_CANTIDAD.test(valor)) return this.falla(campo, MENSAJE_CANTIDAD);
        if (opciones.mayorQueCero && Number(valor) <= 0) this.falla(campo, `El campo ${this.nombre(campo)} debe ser mayor que 0.`);
    }

    correo(campo: string) {
        if (!this.requerido(campo)) return;
        const valor = this.valor(campo);
        if (valor !== valor.toLowerCase()) this.falla(campo, `El campo ${this.nombre(campo)} debe estar en minúscula.`);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)) this.falla(campo, `El campo ${this.nombre(campo)} no es un correo válido.`);
        this.maximo(campo, 255);
    }

    /** Password::defaults() de la app real: 10+ caracteres, mayusculas, minusculas y numeros. */
    claveSegura(campo: string) {
        if (!this.requerido(campo)) return;
        const valor = texto(this.datos[campo]);
        if (valor.length < 10) this.falla(campo, `El campo ${this.nombre(campo)} debe contener al menos 10 caracteres.`);
        if (!/[a-z]/.test(valor) || !/[A-Z]/.test(valor))
            this.falla(campo, `La ${this.nombre(campo)} debe contener al menos una letra mayúscula y una minúscula.`);
        if (!/\d/.test(valor)) this.falla(campo, `La ${this.nombre(campo)} debe contener al menos un número.`);
        if (valor.length > 128) this.falla(campo, `El campo ${this.nombre(campo)} no debe ser mayor que 128 caracteres.`);
        if (valor !== texto(this.datos[`${campo}_confirmation`])) this.falla(campo, `La confirmación de ${this.nombre(campo)} no coincide.`);
    }

    terminar() {
        if (Object.keys(this.errores).length) throw new Validacion(this.errores);
    }
}

// ---------------------------------------------------------------- servidor

export class Servidor {
    db: Db = cargar();

    // -------------------------------------------- modelo

    private usuario(): UsuarioR | null {
        const u = this.db.usuarios.find((u) => u.id === this.db.sesion.userId) ?? null;

        // Cuenta desactivada o eliminada: la sesion se cierra sola.
        if (this.db.sesion.userId && (!u || !u.activo)) {
            this.db.sesion = { userId: null, claveConfirmadaAt: null, intended: null };
            return null;
        }

        return u;
    }

    private pisosPermitidos(u: UsuarioR): PisoR[] {
        const pisos = [...this.db.pisos].sort((a, b) => a.id - b.id);

        return u.es_admin || u.todos_los_pisos ? pisos : pisos.filter((p) => u.pisos.includes(p.id));
    }

    private puedeUsarPiso(u: UsuarioR, pisoId: number) {
        return this.pisosPermitidos(u).some((p) => p.id === pisoId);
    }

    /** El primer piso; si no existe ninguno, crea "Piso 1". */
    private pisoPredeterminado(): PisoR {
        if (!this.db.pisos.length) {
            this.db.pisos.push({ id: siguienteId(this.db, 'pisos'), nombre: 'Piso 1', created_at: ahora(), updated_at: ahora() });
        }

        return [...this.db.pisos].sort((a, b) => a.id - b.id)[0];
    }

    /** Piso elegido por el usuario, siempre entre los que tiene permitidos. */
    private pisoActualDe(u: UsuarioR): PisoR | null {
        this.pisoPredeterminado();
        const elegido = u.piso_id ? this.db.pisos.find((p) => p.id === u.piso_id) : undefined;

        if (elegido && this.puedeUsarPiso(u, elegido.id)) return elegido;

        return this.pisosPermitidos(u)[0] ?? null;
    }

    private estado(p: ProductoR): 'agotado' | 'bajo' | 'bien' {
        if (p.stock_actual <= 0) return 'agotado';

        return p.stock_actual <= p.stock_minimo ? 'bajo' : 'bien';
    }

    private enAlerta(p: ProductoR) {
        return this.estado(p) !== 'bien';
    }

    private productosDelPiso(piso: PisoR) {
        return this.db.productos.filter((p) => p.piso_id === piso.id);
    }

    private productoJson(p: ProductoR, conCategoria = true) {
        const categoria = this.db.categorias.find((c) => c.id === p.categoria_id);

        return {
            ...p,
            estado: this.estado(p),
            ...(conCategoria ? { categoria: categoria ? { id: categoria.id, nombre: categoria.nombre } : null } : {}),
        };
    }

    private movimientoJson(m: MovimientoR) {
        const producto = m.producto_id ? this.db.productos.find((p) => p.id === m.producto_id) : undefined;
        const usuario = m.user_id ? this.db.usuarios.find((u) => u.id === m.user_id) : undefined;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { clave_envio, ...visible } = m;

        return {
            ...visible,
            producto: producto ? { id: producto.id, nombre: producto.nombre, unidad: producto.unidad } : null,
            user: usuario ? { id: usuario.id, name: usuario.name } : null,
        };
    }

    /** Mas reciente primero; a igual fecha, el de id mayor. */
    private recientesPrimero(a: MovimientoR, b: MovimientoR) {
        return b.created_at.localeCompare(a.created_at) || b.id - a.id;
    }

    private resumen(piso: PisoR) {
        const productos = this.productosDelPiso(piso);
        const contar = (estado: string) => productos.filter((p) => this.estado(p) === estado).length;

        return { total: productos.length, bien: contar('bien'), bajo: contar('bajo'), agotado: contar('agotado') };
    }

    private nombreOcupado<T extends { id: number; nombre: string }>(lista: T[], nombre: string, ignorar?: number) {
        return lista.some((x) => x.id !== ignorar && x.nombre.trim().toLowerCase() === nombre.trim().toLowerCase());
    }

    // -------------------------------------------- respuesta

    private render(component: string, props: Record<string, unknown>, flash: Flash, url: string): Pagina {
        const u = this.usuario();
        const pisoActual = u ? this.pisoActualDe(u) : null;

        return {
            component,
            url,
            version: null,
            encryptHistory: false,
            clearHistory: false,
            props: {
                errors: flash.errors ?? {},
                name: NOMBRE_APP,
                demo: { contacto: import.meta.env.VITE_DEMO_CONTACTO || null },
                auth: {
                    user: u
                        ? {
                              id: u.id,
                              name: u.name,
                              email: u.email,
                              apariencia: u.apariencia,
                              es_admin: u.es_admin,
                              debe_cambiar_password: u.debe_cambiar_password,
                          }
                        : null,
                },
                pisos: u ? this.pisosPermitidos(u).map((p) => ({ id: p.id, nombre: p.nombre })) : [],
                pisoActual: pisoActual ? { id: pisoActual.id, nombre: pisoActual.nombre } : null,
                flash: { success: flash.success ?? null, clave_temporal: flash.clave_temporal ?? null },
                ...props,
            },
        };
    }

    /**
     * Atiende una peticion de Inertia y devuelve la pagina final (siguiendo redirecciones).
     */
    atender(metodo: string, direccion: string, cuerpo: Cuerpo = {}, anterior = window.location.href): Pagina {
        let peticion: Peticion = { metodo: metodo.toUpperCase(), url: new URL(direccion, window.location.origin), cuerpo, anterior };
        let flash: Flash = {};

        for (let saltos = 0; saltos < 10; saltos++) {
            try {
                const pagina = this.despachar(peticion, flash);
                guardar(this.db);

                return pagina;
            } catch (e) {
                if (e instanceof Redireccion) {
                    flash = e.flash;
                    peticion = { metodo: 'GET', url: new URL(e.url, window.location.origin), cuerpo: {}, anterior: peticion.anterior };
                } else if (e instanceof Validacion) {
                    // Como back()->withErrors(): vuelve a la pagina anterior con los mensajes.
                    flash = { errors: e.errores };
                    peticion = { metodo: 'GET', url: new URL(peticion.anterior, window.location.origin), cuerpo: {}, anterior: peticion.anterior };
                } else {
                    throw e;
                }
            }
        }

        throw new Error('Demasiadas redirecciones');
    }

    private despachar(pet: Peticion, flash: Flash): Pagina {
        const ruta = pet.url.pathname.replace(/\/+$/, '') || '/';
        const url = pet.url.pathname + pet.url.search;
        const m = pet.metodo;
        const render = (component: string, props: Record<string, unknown> = {}) => this.render(component, props, flash, url);
        const coincide = (patron: RegExp) => ruta.match(patron);
        let partes: RegExpMatchArray | null;

        if (ruta === '/') throw new Redireccion('/dashboard');

        // ---- Invitados
        if (ruta === '/login') {
            // A diferencia de la app real, entrar con otra cuenta estando conectado cambia de
            // cuenta: en la demo se vuelve atras al login para probar el otro rol.
            if (m === 'POST') return this.iniciarSesion(pet);
            // Con errores (clave mala al cambiar de cuenta) se queda en el login para mostrarlos.
            if (this.usuario() && !flash.errors) throw new Redireccion('/dashboard');
            if (m === 'GET') {
                return render('auth/login', {
                    status: flash.status ?? null,
                    cuentasDemo: CUENTAS_DEMO.map(({ rol, descripcion, email, password }) => ({ rol, descripcion, email, password })),
                });
            }
        }

        // ---- Todo lo demas exige sesion
        const u = this.usuario();
        if (!u) {
            if (m === 'GET') this.db.sesion.intended = url;
            throw new Redireccion('/login');
        }

        if (ruta === '/logout' && m === 'POST') {
            this.db.sesion = { userId: null, claveConfirmadaAt: null, intended: null };
            throw new Redireccion('/login');
        }

        // Clave temporal: hay que cambiarla antes de usar la app.
        const permitidasConClaveTemporal = ['/settings/password', '/logout', '/settings/appearance'];
        if (u.debe_cambiar_password && !permitidasConClaveTemporal.includes(ruta)) {
            throw new Redireccion('/settings/password');
        }

        if (ruta === '/confirm-password') {
            if (m === 'GET') return render('auth/confirm-password');
            if (m === 'POST') {
                if (texto(pet.cuerpo.password) !== u.password) throw new Validacion({ password: 'La contraseña es incorrecta.' });
                this.db.sesion.claveConfirmadaAt = Date.now();
                throw new Redireccion(this.tomarIntended('/dashboard'));
            }
        }

        // ---- Ajustes de la cuenta
        if (ruta === '/settings') throw new Redireccion('/settings/profile');
        if (ruta === '/settings/profile') {
            if (m === 'GET') return render('settings/profile', { status: null });
            if (m === 'PATCH') return this.actualizarPerfil(pet, u);
        }
        if (ruta === '/settings/password') {
            if (m === 'GET') return render('settings/password', { debeCambiar: u.debe_cambiar_password });
            if (m === 'PUT') return this.cambiarClave(pet, u);
        }
        if (ruta === '/settings/appearance') {
            if (m === 'GET') return render('settings/appearance');
            if (m === 'PATCH') {
                const v = new Validador(pet.cuerpo);
                if (v.requerido('apariencia')) v.en('apariencia', ['light', 'dark', 'system']);
                v.terminar();
                u.apariencia = texto(pet.cuerpo.apariencia) as UsuarioR['apariencia'];
                throw new Redireccion(pet.anterior);
            }
        }

        if (ruta === '/piso-actual' && m === 'POST') {
            const pisoId = Number(pet.cuerpo.piso_id);
            if (!this.puedeUsarPiso(u, pisoId)) throw new Validacion({ piso_id: 'El campo piso no está en la lista de valores permitidos.' });
            u.piso_id = pisoId;
            // Misma pagina sin filtros: los del piso anterior no existen en el nuevo.
            throw new Redireccion(new URL(pet.anterior, window.location.origin).pathname);
        }

        // ---- Pantallas del inventario: necesitan un piso
        const esDelInventario =
            ['/dashboard', '/inventario', '/movimientos', '/categorias'].includes(ruta) || /^\/productos\/\d+\/movimientos$/.test(ruta);
        const piso = this.pisoActualDe(u);
        if (esDelInventario && !piso) return render('sin-piso');

        if (piso && m === 'GET') {
            if (ruta === '/dashboard') return render('dashboard', this.panel(piso));
            if (ruta === '/inventario') return render('inventario/index', this.inventario(piso, pet.url.searchParams));
            if (ruta === '/movimientos') return render('movimientos/index', this.historial(piso, pet.url));
            if (ruta === '/categorias') return render('categorias/index', { categorias: this.categorias(piso) });
        }

        if ((partes = coincide(/^\/productos\/(\d+)\/movimientos$/)) && m === 'POST') {
            return this.registrarMovimiento(pet, u, this.buscar(this.db.productos, partes[1]));
        }

        // ---- Solo administradores
        if (!u.es_admin) throw new Redireccion('/dashboard');

        if (ruta === '/productos/create' && m === 'GET') {
            const p = this.pisoActualDe(u)!;
            return render('productos/form', {
                producto: null,
                piso: { id: p.id, nombre: p.nombre },
                categorias: this.categoriasParaSelector(p.id),
                unidades: UNIDADES,
            });
        }
        if (ruta === '/productos' && m === 'POST') return this.crearProducto(pet, u);
        if ((partes = coincide(/^\/productos\/(\d+)\/edit$/)) && m === 'GET') {
            const producto = this.buscar(this.db.productos, partes[1]);
            const p = this.db.pisos.find((x) => x.id === producto.piso_id)!;
            return render('productos/form', {
                producto: this.productoJson(producto, false),
                piso: { id: p.id, nombre: p.nombre },
                categorias: this.categoriasParaSelector(p.id),
                unidades: UNIDADES,
            });
        }
        if ((partes = coincide(/^\/productos\/(\d+)$/))) {
            const producto = this.buscar(this.db.productos, partes[1]);
            if (m === 'PUT') return this.actualizarProducto(pet, producto);
            if (m === 'DELETE') return this.eliminarProducto(u, producto);
        }

        if (ruta === '/categorias' && m === 'POST') {
            const p = this.pisoActualDe(u)!;
            const v = new Validador(pet.cuerpo);
            const nombre = v.valor('nombre');
            if (v.requerido('nombre')) v.maximo('nombre', 100);
            v.unico(
                'nombre',
                this.nombreOcupado(
                    this.db.categorias.filter((c) => c.piso_id === p.id),
                    nombre,
                ),
            );
            v.terminar();
            this.db.categorias.push({ id: siguienteId(this.db, 'categorias'), piso_id: p.id, nombre, created_at: ahora(), updated_at: ahora() });
            throw new Redireccion(pet.anterior, { success: `Categoría "${nombre}" creada en ${p.nombre}.` });
        }
        if ((partes = coincide(/^\/categorias\/(\d+)$/))) {
            const categoria = this.buscar(this.db.categorias, partes[1]);
            if (m === 'PUT') {
                const v = new Validador(pet.cuerpo);
                const nombre = v.valor('nombre');
                if (v.requerido('nombre')) v.maximo('nombre', 100);
                v.unico(
                    'nombre',
                    this.nombreOcupado(
                        this.db.categorias.filter((c) => c.piso_id === categoria.piso_id),
                        nombre,
                        categoria.id,
                    ),
                );
                v.terminar();
                Object.assign(categoria, { nombre, updated_at: ahora() });
                throw new Redireccion(pet.anterior, { success: 'Categoría actualizada.' });
            }
            if (m === 'DELETE') {
                // Los productos de la categoria no se borran: quedan "sin categoria".
                this.db.productos.filter((p) => p.categoria_id === categoria.id).forEach((p) => (p.categoria_id = null));
                this.db.categorias = this.db.categorias.filter((c) => c !== categoria);
                throw new Redireccion(pet.anterior, { success: `Categoría "${categoria.nombre}" eliminada.` });
            }
        }

        if (ruta === '/pisos') {
            if (m === 'GET') {
                return render('pisos/index', {
                    pisos: [...this.db.pisos]
                        .sort((a, b) => a.id - b.id)
                        .map((p) => ({
                            id: p.id,
                            nombre: p.nombre,
                            productos_count: this.db.productos.filter((x) => x.piso_id === p.id).length,
                            categorias_count: this.db.categorias.filter((x) => x.piso_id === p.id).length,
                        })),
                });
            }
            if (m === 'POST') {
                const nombre = this.validarNombrePiso(pet.cuerpo);
                this.db.pisos.push({ id: siguienteId(this.db, 'pisos'), nombre, created_at: ahora(), updated_at: ahora() });
                throw new Redireccion(pet.anterior, { success: `Piso "${nombre}" creado.` });
            }
        }
        if ((partes = coincide(/^\/pisos\/(\d+)$/))) {
            const p = this.buscar(this.db.pisos, partes[1]);
            if (m === 'PUT') {
                Object.assign(p, { nombre: this.validarNombrePiso(pet.cuerpo, p.id), updated_at: ahora() });
                throw new Redireccion(pet.anterior, { success: 'Piso actualizado.' });
            }
            if (m === 'DELETE') return this.eliminarPiso(p);
        }

        // ---- Usuarios: ademas, reconfirmar la clave cada 15 minutos
        if (ruta === '/usuarios' || ruta.startsWith('/usuarios/')) {
            if (!this.db.sesion.claveConfirmadaAt || Date.now() - this.db.sesion.claveConfirmadaAt > CONFIRMACION_MS) {
                if (m === 'GET') this.db.sesion.intended = url;
                throw new Redireccion('/confirm-password');
            }
            if (ruta === '/usuarios' && m === 'GET') return render('usuarios/index', this.usuarios());
            if (ruta === '/usuarios' && m === 'POST') return this.crearUsuario(pet);
            if ((partes = coincide(/^\/usuarios\/(\d+)$/))) {
                const otro = this.buscar(this.db.usuarios, partes[1]);
                if (m === 'PUT') return this.actualizarUsuario(pet, u, otro);
                if (m === 'DELETE') return this.eliminarUsuario(pet, u, otro);
            }
            if ((partes = coincide(/^\/usuarios\/(\d+)\/restablecer$/)) && m === 'POST') {
                const otro = this.buscar(this.db.usuarios, partes[1]);
                const clave = generarClaveTemporal();
                Object.assign(otro, { password: clave, debe_cambiar_password: true });
                throw new Redireccion(pet.anterior, { clave_temporal: { nombre: otro.name, email: otro.email, clave } });
            }
        }

        // Pagina inexistente: al panel.
        throw new Redireccion('/dashboard');
    }

    /** Registro por id; si no existe (ej. lo borro en otra pestaña), al panel. */
    private buscar<T extends { id: number }>(lista: T[], id: string): T {
        const encontrado = lista.find((x) => x.id === Number(id));
        if (!encontrado) throw new Redireccion('/dashboard');

        return encontrado;
    }

    private tomarIntended(porDefecto: string) {
        const destino = this.db.sesion.intended ?? porDefecto;
        this.db.sesion.intended = null;

        return destino;
    }

    // -------------------------------------------- sesion

    private iniciarSesion(pet: Peticion): never {
        const v = new Validador(pet.cuerpo);
        v.requerido('email');
        v.requerido('password');
        v.terminar();

        const email = texto(pet.cuerpo.email).trim().toLowerCase();
        const u = this.db.usuarios.find((x) => x.email === email && x.password === texto(pet.cuerpo.password) && x.activo);
        if (!u) throw new Validacion({ email: 'Estas credenciales no coinciden con nuestros registros.' });

        // Si cambia de cuenta, la pagina pendiente era de la cuenta anterior: se descarta.
        const intended = this.db.sesion.userId ? null : this.db.sesion.intended;
        this.db.sesion = { userId: u.id, claveConfirmadaAt: null, intended };
        u.ultimo_acceso_at = ahora();

        throw new Redireccion(this.tomarIntended('/dashboard'));
    }

    private actualizarPerfil(pet: Peticion, u: UsuarioR): never {
        const v = new Validador(pet.cuerpo);
        if (v.requerido('name')) v.maximo('name', 255);
        v.correo('email');
        const email = v.valor('email');
        v.unico(
            'email',
            this.db.usuarios.some((x) => x.id !== u.id && x.email === email),
        );

        // Cambiar el correo (el usuario para entrar) exige la clave actual.
        if (email.toLowerCase() !== u.email) {
            if (v.requerido('current_password') && texto(pet.cuerpo.current_password) !== u.password) {
                v.falla('current_password', 'La contraseña es incorrecta.');
            }
        }
        v.terminar();

        Object.assign(u, { name: v.valor('name'), email });
        throw new Redireccion('/settings/profile', { success: 'Perfil actualizado.' });
    }

    private cambiarClave(pet: Peticion, u: UsuarioR): never {
        const temporal = u.debe_cambiar_password;
        const v = new Validador(pet.cuerpo);
        const nueva = texto(pet.cuerpo.password);

        if (!temporal) {
            if (v.requerido('current_password') && texto(pet.cuerpo.current_password) !== u.password) {
                v.falla('current_password', 'La contraseña es incorrecta.');
            }
        }
        v.claveSegura('password');
        if (!temporal && nueva === texto(pet.cuerpo.current_password)) {
            v.falla('password', 'El campo contraseña y contraseña actual deben ser diferentes.');
        }
        if (temporal && nueva === u.password) v.falla('password', 'La nueva contraseña debe ser distinta a la temporal.');
        v.terminar();

        Object.assign(u, { password: nueva, debe_cambiar_password: false });

        if (temporal) throw new Redireccion('/dashboard', { success: 'Contraseña creada. ¡Bienvenido!' });
        throw new Redireccion('/settings/password', { success: 'Contraseña actualizada. Se cerró tu sesión en otros dispositivos.' });
    }

    // -------------------------------------------- inventario

    private panel(piso: PisoR) {
        return {
            resumen: this.resumen(piso),
            // Primero los agotados, luego los que estan mas cerca de su minimo.
            alertas: this.productosDelPiso(piso)
                .filter((p) => this.enAlerta(p))
                .sort(
                    (a, b) =>
                        Number(a.stock_actual > 0) - Number(b.stock_actual > 0) ||
                        a.stock_actual - a.stock_minimo - (b.stock_actual - b.stock_minimo),
                )
                .map((p) => this.productoJson(p)),
            recientes: this.db.movimientos
                .filter((m) => m.piso_id === piso.id)
                .sort((a, b) => this.recientesPrimero(a, b))
                .slice(0, 8)
                .map((m) => this.movimientoJson(m)),
        };
    }

    private inventario(piso: PisoR, query: URLSearchParams) {
        // Filtros invalidos se ignoran en silencio, como en la app real.
        const filtros: Record<string, string> = {};
        const buscar = query.get('buscar') ?? '';
        const categoria = query.get('categoria') ?? '';
        const estado = query.get('estado') ?? '';
        if (buscar && buscar.length <= 100) filtros.buscar = buscar;
        if (/^(sin|\d{1,10})$/.test(categoria)) filtros.categoria = categoria;
        if (['bien', 'bajo', 'agotado', 'alerta'].includes(estado)) filtros.estado = estado;

        const productos = this.productosDelPiso(piso)
            .filter((p) => !filtros.buscar || normalizar(p.nombre).includes(normalizar(filtros.buscar)))
            .filter(
                (p) => !filtros.categoria || (filtros.categoria === 'sin' ? p.categoria_id === null : p.categoria_id === Number(filtros.categoria)),
            )
            .filter((p) => !filtros.estado || (filtros.estado === 'alerta' ? this.enAlerta(p) : this.estado(p) === filtros.estado))
            .sort(porNombre)
            .map((p) => this.productoJson(p));

        return {
            productos,
            categorias: this.categoriasParaSelector(piso.id),
            filtros: Object.keys(filtros).length ? filtros : [],
            alertas: this.productosDelPiso(piso)
                .filter((p) => this.enAlerta(p))
                .sort((a, b) => Number(a.stock_actual > 0) - Number(b.stock_actual > 0) || porNombre(a, b))
                .map(({ id, nombre, unidad, stock_actual, stock_minimo }) => ({
                    id,
                    nombre,
                    unidad,
                    stock_actual,
                    stock_minimo,
                    estado: this.estado({ stock_actual, stock_minimo } as ProductoR),
                })),
            resumen: this.resumen(piso),
        };
    }

    private categoriasParaSelector(pisoId: number) {
        return this.db.categorias
            .filter((c) => c.piso_id === pisoId)
            .sort(porNombre)
            .map(({ id, nombre }) => ({ id, nombre }));
    }

    private categorias(piso: PisoR) {
        return this.db.categorias
            .filter((c) => c.piso_id === piso.id)
            .sort(porNombre)
            .map((c: CategoriaR) => ({ ...c, productos_count: this.db.productos.filter((p) => p.categoria_id === c.id).length }));
    }

    /** Historial paginado de a 30, con el mismo formato que el paginador de Laravel. */
    private historial(piso: PisoR, url: URL) {
        const filtros: Record<string, string> = {};
        const producto = url.searchParams.get('producto') ?? '';
        const tipo = url.searchParams.get('tipo') ?? '';
        if (/^\d+$/.test(producto) && Number(producto) >= 1) filtros.producto = producto;
        if (['entrada', 'salida', 'ajuste'].includes(tipo)) filtros.tipo = tipo;

        const todos = this.db.movimientos
            .filter((m) => m.piso_id === piso.id)
            .filter((m) => !filtros.producto || m.producto_id === Number(filtros.producto))
            .filter((m) => !filtros.tipo || m.tipo === filtros.tipo)
            .sort((a, b) => this.recientesPrimero(a, b));

        const total = todos.length;
        const ultima = Math.max(1, Math.ceil(total / POR_PAGINA));
        const pedida = Number(url.searchParams.get('page'));
        const actual = Number.isInteger(pedida) && pedida >= 1 ? pedida : 1;
        const desde = (actual - 1) * POR_PAGINA;
        const datos = todos.slice(desde, desde + POR_PAGINA).map((m) => this.movimientoJson(m));

        const base = `${window.location.origin}/movimientos`;
        const enlace = (n: number) => `${base}?${new URLSearchParams({ ...filtros, page: String(n) })}`;

        // Paginas a mostrar: primeras, ultimas y alrededor de la actual, con "..." entre medio.
        const numeros =
            ultima < 13
                ? Array.from({ length: ultima }, (_, i) => i + 1)
                : [1, 2, ultima - 1, ultima, ...Array.from({ length: 7 }, (_, i) => actual - 3 + i)];
        const visibles = [...new Set(numeros.filter((n) => n >= 1 && n <= ultima))].sort((a, b) => a - b);
        const links: { url: string | null; label: string; active: boolean }[] = [
            { url: actual > 1 ? enlace(actual - 1) : null, label: '&laquo; Anterior', active: false },
        ];
        visibles.forEach((n, i) => {
            if (i > 0 && n - visibles[i - 1] > 1) links.push({ url: null, label: '...', active: false });
            links.push({ url: enlace(n), label: String(n), active: n === actual });
        });
        links.push({ url: actual < ultima ? enlace(actual + 1) : null, label: 'Siguiente &raquo;', active: false });

        return {
            movimientos: {
                current_page: actual,
                data: datos,
                first_page_url: enlace(1),
                from: datos.length ? desde + 1 : null,
                last_page: ultima,
                last_page_url: enlace(ultima),
                links,
                next_page_url: actual < ultima ? enlace(actual + 1) : null,
                path: base,
                per_page: POR_PAGINA,
                prev_page_url: actual > 1 ? enlace(actual - 1) : null,
                to: datos.length ? desde + datos.length : null,
                total,
            },
            productos: this.productosDelPiso(piso)
                .sort(porNombre)
                .map(({ id, nombre }) => ({ id, nombre })),
            filtros: Object.keys(filtros).length ? filtros : [],
        };
    }

    /** Suma, resta o ajusta (conteo fisico) el stock de un producto. */
    private registrarMovimiento(pet: Peticion, u: UsuarioR, producto: ProductoR): never {
        // Solo en productos de sus pisos.
        if (!this.puedeUsarPiso(u, producto.piso_id)) throw new Redireccion('/dashboard');

        const unidades = CONVERSIONES[producto.unidad] ?? { [producto.unidad]: 1 };
        const tipo = texto(pet.cuerpo.tipo) as TipoMovimiento;
        const v = new Validador(pet.cuerpo);
        if (v.requerido('tipo')) v.en('tipo', ['entrada', 'salida', 'ajuste']);
        v.cantidad('cantidad', { mayorQueCero: tipo !== 'ajuste' });
        if (v.valor('unidad') && !(v.valor('unidad') in unidades))
            v.falla('unidad', 'El campo unidad de medida no está en la lista de valores permitidos.');
        if (v.valor('nota').length > 255) v.maximo('nota', 255);
        v.terminar();

        // Se convierte a la unidad del producto: 500 g -> 0,5 kg.
        const unidadIngreso = v.valor('unidad') || producto.unidad;
        const cantidad = redondear(Number(v.valor('cantidad')) * unidades[unidadIngreso]);
        if (cantidad <= 0 && tipo !== 'ajuste') {
            throw new Validacion({ cantidad: `La cantidad es demasiado pequeña: el mínimo es 0,001 ${producto.unidad}.` });
        }

        // El mismo envio repetido (doble clic, reintento) no se registra dos veces.
        const clave = v.valor('clave') || null;
        if (clave && this.db.movimientos.some((m) => m.clave_envio === clave)) {
            throw new Redireccion(pet.anterior, { success: `${producto.nombre}: ese movimiento ya estaba registrado.` });
        }

        const anterior = producto.stock_actual;
        const visto = pet.cuerpo.stock_visto;
        if (
            tipo === 'ajuste' &&
            visto !== undefined &&
            visto !== null &&
            !booleano(pet.cuerpo.confirmar) &&
            redondear(Number(visto)) !== redondear(anterior)
        ) {
            throw new Validacion({ conflicto: this.avisoDeCambio(producto, Number(visto)) });
        }

        let nuevo = tipo === 'entrada' ? anterior + cantidad : tipo === 'salida' ? anterior - cantidad : cantidad;
        if (nuevo < 0) {
            throw new Validacion({
                cantidad: `No puedes restar ${formato(cantidad)} ${producto.unidad}: solo hay ${formato(anterior)} ${producto.unidad}.`,
            });
        }
        nuevo = redondear(nuevo);

        if (nuevo === redondear(anterior)) {
            throw new Redireccion(pet.anterior, { success: `${producto.nombre}: sin cambios.` });
        }

        producto.stock_actual = nuevo;
        producto.updated_at = ahora();
        this.nuevoMovimiento(u, producto, {
            tipo,
            cantidad,
            stock_anterior: anterior,
            stock_nuevo: nuevo,
            nota: v.valor('nota') || null,
            clave_envio: clave,
        });

        throw new Redireccion(pet.anterior, { success: `${producto.nombre}: ${formato(anterior)} → ${formato(nuevo)} ${producto.unidad}.` });
    }

    private nuevoMovimiento(
        u: UsuarioR,
        producto: ProductoR,
        datos: Pick<MovimientoR, 'tipo' | 'cantidad' | 'stock_anterior' | 'stock_nuevo' | 'nota' | 'clave_envio'>,
    ) {
        this.db.movimientos.push({
            id: siguienteId(this.db, 'movimientos'),
            piso_id: producto.piso_id,
            producto_id: producto.id,
            producto_nombre: null,
            producto_unidad: null,
            user_id: u.id,
            usuario_nombre: null,
            ...datos,
            created_at: ahora(),
            updated_at: ahora(),
        });
    }

    /** "Mientras contabas, el stock cambió de 5 a 4 kg (Beto restó 1 kg)." */
    private avisoDeCambio(producto: ProductoR, visto: number): string {
        const ultimo = this.db.movimientos.filter((m) => m.producto_id === producto.id).sort((a, b) => b.id - a.id)[0];
        const quien = ultimo ? (this.db.usuarios.find((x) => x.id === ultimo.user_id)?.name ?? ultimo.usuario_nombre ?? 'Alguien') : null;
        const detalle =
            ultimo?.tipo === 'entrada'
                ? ` (${quien} sumó ${formato(ultimo.cantidad)} ${producto.unidad})`
                : ultimo?.tipo === 'salida'
                  ? ` (${quien} restó ${formato(ultimo.cantidad)} ${producto.unidad})`
                  : ultimo?.tipo === 'ajuste'
                    ? ` (${quien} hizo un conteo)`
                    : '';

        return `Mientras contabas, el stock cambió de ${formato(visto)} a ${formato(producto.stock_actual)} ${producto.unidad}${detalle}.`;
    }

    /** Reglas comunes al crear y editar: nombre unico en el piso y categoria del mismo piso. */
    private validarProducto(v: Validador, pisoId: number, ignorar?: number) {
        if (v.requerido('nombre')) v.maximo('nombre', 150);
        v.unico(
            'nombre',
            this.nombreOcupado(
                this.db.productos.filter((p) => p.piso_id === pisoId),
                v.valor('nombre'),
                ignorar,
            ),
        );
        const categoria = v.valor('categoria_id');
        if (categoria && !this.db.categorias.some((c) => c.id === Number(categoria) && c.piso_id === pisoId)) {
            v.falla('categoria_id', 'El campo categoría no existe.');
        }
        if (v.requerido('unidad')) v.en('unidad', UNIDADES);
        v.cantidad('stock_minimo');
    }

    private crearProducto(pet: Peticion, u: UsuarioR): never {
        const piso = this.pisoActualDe(u)!;
        const v = new Validador(pet.cuerpo);
        this.validarProducto(v, piso.id);
        v.cantidad('stock_inicial');
        v.terminar();

        const producto: ProductoR = {
            id: siguienteId(this.db, 'productos'),
            piso_id: piso.id,
            categoria_id: v.valor('categoria_id') ? Number(v.valor('categoria_id')) : null,
            nombre: v.valor('nombre'),
            unidad: v.valor('unidad'),
            stock_actual: redondear(Number(v.valor('stock_inicial'))),
            stock_minimo: redondear(Number(v.valor('stock_minimo'))),
            created_at: ahora(),
            updated_at: ahora(),
        };
        this.db.productos.push(producto);

        // El stock inicial queda registrado en el historial.
        if (producto.stock_actual > 0) {
            this.nuevoMovimiento(u, producto, {
                tipo: 'ajuste',
                cantidad: producto.stock_actual,
                stock_anterior: 0,
                stock_nuevo: producto.stock_actual,
                nota: 'Stock inicial',
                clave_envio: null,
            });
        }

        throw new Redireccion('/inventario', { success: `Producto "${producto.nombre}" creado en ${piso.nombre}.` });
    }

    private actualizarProducto(pet: Peticion, producto: ProductoR): never {
        const v = new Validador(pet.cuerpo);
        this.validarProducto(v, producto.piso_id, producto.id);
        v.terminar();

        Object.assign(producto, {
            nombre: v.valor('nombre'),
            categoria_id: v.valor('categoria_id') ? Number(v.valor('categoria_id')) : null,
            unidad: v.valor('unidad'),
            stock_minimo: redondear(Number(v.valor('stock_minimo'))),
            updated_at: ahora(),
        });

        throw new Redireccion('/inventario', { success: `Producto "${producto.nombre}" actualizado.` });
    }

    /** El historial del producto se conserva, con su nombre y unidad guardados. */
    private eliminarProducto(u: UsuarioR, producto: ProductoR): never {
        this.nuevoMovimiento(u, producto, {
            tipo: 'ajuste',
            cantidad: 0,
            stock_anterior: producto.stock_actual,
            stock_nuevo: 0,
            nota: 'Producto eliminado',
            clave_envio: null,
        });
        for (const m of this.db.movimientos.filter((m) => m.producto_id === producto.id)) {
            Object.assign(m, { producto_id: null, producto_nombre: producto.nombre, producto_unidad: producto.unidad });
        }
        this.db.productos = this.db.productos.filter((p) => p !== producto);

        throw new Redireccion('/inventario', { success: `Producto "${producto.nombre}" eliminado.` });
    }

    // -------------------------------------------- pisos

    private validarNombrePiso(cuerpo: Cuerpo, ignorar?: number): string {
        const v = new Validador(cuerpo);
        if (v.requerido('nombre')) v.maximo('nombre', 60);
        v.unico('nombre', this.nombreOcupado(this.db.pisos, v.valor('nombre'), ignorar));
        v.terminar();

        return v.valor('nombre');
    }

    /** Solo pisos vacios y sin historial. */
    private eliminarPiso(piso: PisoR): never {
        if (this.db.pisos.length <= 1) throw new Validacion({ piso: 'Debe quedar al menos un piso.' });
        if (this.db.productos.some((p) => p.piso_id === piso.id) || this.db.categorias.some((c) => c.piso_id === piso.id)) {
            throw new Validacion({ piso: `"${piso.nombre}" tiene productos o categorías. Muévelos o elimínalos antes de borrar el piso.` });
        }
        if (this.db.movimientos.some((m) => m.piso_id === piso.id)) {
            throw new Validacion({ piso: `"${piso.nombre}" tiene historial de movimientos y el historial no se borra. Puedes renombrarlo.` });
        }
        this.db.pisos = this.db.pisos.filter((p) => p !== piso);
        this.db.usuarios.forEach((u) => {
            u.pisos = u.pisos.filter((id) => id !== piso.id);
            if (u.piso_id === piso.id) u.piso_id = null;
        });

        throw new Redireccion('/pisos', { success: `Piso "${piso.nombre}" eliminado.` });
    }

    // -------------------------------------------- usuarios

    private usuarios() {
        return {
            usuarios: [...this.db.usuarios]
                .sort((a, b) => Number(b.activo) - Number(a.activo) || a.name.localeCompare(b.name, 'es'))
                .map((u) => ({
                    id: u.id,
                    name: u.name,
                    email: u.email,
                    es_admin: u.es_admin,
                    todos_los_pisos: u.todos_los_pisos,
                    activo: u.activo,
                    debe_cambiar_password: u.debe_cambiar_password,
                    ultimo_acceso_at: u.ultimo_acceso_at,
                    pisos: u.pisos,
                })),
            todosLosPisos: [...this.db.pisos].sort((a, b) => a.id - b.id).map(({ id, nombre }) => ({ id, nombre })),
        };
    }

    /** Datos comunes al crear y editar una cuenta. */
    private validarUsuario(cuerpo: Cuerpo, ignorar?: number) {
        const v = new Validador(cuerpo);
        if (v.requerido('name')) v.maximo('name', 255);
        v.correo('email');
        v.unico(
            'email',
            this.db.usuarios.some((x) => x.id !== ignorar && x.email === v.valor('email')),
        );

        const esAdmin = booleano(cuerpo.es_admin);
        const todos = booleano(cuerpo.todos_los_pisos, true);
        const pisos = Array.isArray(cuerpo.pisos) ? [...new Set(cuerpo.pisos.map(Number))] : [];
        if (!esAdmin && !todos && !pisos.length) v.falla('pisos', 'El campo pisos es obligatorio.');
        if (pisos.some((id) => !this.db.pisos.some((p) => p.id === id))) v.falla('pisos', 'El campo pisos no existe.');
        v.terminar();

        return { name: v.valor('name'), email: v.valor('email'), esAdmin, todos, pisos: esAdmin || todos ? [] : pisos };
    }

    private crearUsuario(pet: Peticion): never {
        const d = this.validarUsuario(pet.cuerpo);
        const clave = generarClaveTemporal();

        this.db.usuarios.push({
            id: siguienteId(this.db, 'usuarios'),
            name: d.name,
            email: d.email,
            password: clave,
            apariencia: 'system',
            es_admin: d.esAdmin,
            todos_los_pisos: d.todos,
            activo: true,
            debe_cambiar_password: true,
            ultimo_acceso_at: null,
            piso_id: null,
            pisos: d.pisos,
        });

        throw new Redireccion(pet.anterior, { clave_temporal: { nombre: d.name, email: d.email, clave } });
    }

    private adminsActivos() {
        return this.db.usuarios.filter((u) => u.es_admin && u.activo).length;
    }

    private actualizarUsuario(pet: Peticion, yo: UsuarioR, otro: UsuarioR): never {
        const d = this.validarUsuario(pet.cuerpo, otro.id);
        const activo = booleano(pet.cuerpo.activo);

        // Nadie se quita a si mismo el admin ni se desactiva; siempre queda un admin activo.
        if (otro.id === yo.id && (!d.esAdmin || !activo)) {
            throw new Validacion({ es_admin: 'No puedes quitarte el rol de administrador ni desactivar tu propia cuenta.' });
        }
        if (otro.es_admin && otro.activo && (!d.esAdmin || !activo) && this.adminsActivos() <= 1) {
            throw new Validacion({ es_admin: 'Debe quedar al menos un administrador activo.' });
        }

        Object.assign(otro, { name: d.name, email: d.email, es_admin: d.esAdmin, activo, todos_los_pisos: d.todos, pisos: d.pisos });

        throw new Redireccion(pet.anterior, { success: `Usuario "${otro.name}" actualizado.` });
    }

    /** Sus movimientos se conservan con su nombre guardado. */
    private eliminarUsuario(pet: Peticion, yo: UsuarioR, otro: UsuarioR): never {
        if (otro.id === yo.id) throw new Validacion({ usuario: 'No puedes eliminar tu propia cuenta.' });
        if (otro.es_admin && otro.activo && this.adminsActivos() <= 1)
            throw new Validacion({ usuario: 'Debe quedar al menos un administrador activo.' });

        this.db.movimientos.filter((m) => m.user_id === otro.id).forEach((m) => Object.assign(m, { user_id: null, usuario_nombre: otro.name }));
        this.db.usuarios = this.db.usuarios.filter((u) => u !== otro);

        throw new Redireccion(pet.anterior, { success: `Cuenta de "${otro.name}" eliminada.` });
    }

    // -------------------------------------------- planilla

    /**
     * Inventario del piso elegido en CSV (se abre en Excel). La app real genera un .xlsx
     * con el formato de la planilla de la cocina.
     */
    exportarCsv(): { nombre: string; contenido: string } | null {
        const u = this.usuario();
        const piso = u ? this.pisoActualDe(u) : null;
        if (!piso) return null;

        const celda = (valor: string | number) => {
            const t = String(valor);
            // Textos que Excel tomaria como formula se escriben como texto literal.
            const seguro = /^[=+\-@\t\r]/.test(t) ? `'${t}` : t;
            return `"${seguro.replace(/"/g, '""')}"`;
        };
        const numero = (n: number) => formato(n).replace(/\./g, '');
        const filas = this.productosDelPiso(piso)
            .sort(porNombre)
            .map((p) => {
                const categoria = this.db.categorias.find((c) => c.id === p.categoria_id)?.nombre ?? 'Sin categoría';
                const estado = { bien: 'Bien', bajo: 'Bajo', agotado: 'Agotado' }[this.estado(p)];
                return [categoria, p.nombre, p.unidad, numero(p.stock_actual), numero(p.stock_minimo), estado].map(celda).join(';');
            });
        const encabezado = ['Categoría', 'Producto', 'Unidad', 'Stock', 'Mínimo', 'Estado'].map(celda).join(';');
        const fecha = new Date().toLocaleDateString('sv');

        return {
            nombre: `Inventario Cocina - ${piso.nombre.replace(/[\\/:*?"<>|]+/g, '-')} - ${fecha}.csv`,
            // BOM: para que Excel lea bien las tildes.
            contenido: String.fromCharCode(0xfeff) + [encabezado, ...filas].join('\r\n'),
        };
    }
}
