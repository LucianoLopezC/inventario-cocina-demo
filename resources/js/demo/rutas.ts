/**
 * Nombres de ruta -> direcciones, como los de Laravel (routes/*.php de la app real).
 * Reemplaza a Ziggy: la demo no tiene servidor que genere esta lista.
 */
const RUTAS: Record<string, string> = {
    home: '/',
    login: '/login',
    logout: '/logout',
    'password.confirm': '/confirm-password',
    dashboard: '/dashboard',
    inventario: '/inventario',
    'inventario.excel': '/inventario/excel',
    'movimientos.store': '/productos/{producto}/movimientos',
    'movimientos.index': '/movimientos',
    'categorias.index': '/categorias',
    'categorias.store': '/categorias',
    'categorias.update': '/categorias/{categoria}',
    'categorias.destroy': '/categorias/{categoria}',
    'pisos.seleccionar': '/piso-actual',
    'pisos.index': '/pisos',
    'pisos.store': '/pisos',
    'pisos.update': '/pisos/{piso}',
    'pisos.destroy': '/pisos/{piso}',
    'productos.create': '/productos/create',
    'productos.store': '/productos',
    'productos.edit': '/productos/{producto}/edit',
    'productos.update': '/productos/{producto}',
    'productos.destroy': '/productos/{producto}',
    'usuarios.index': '/usuarios',
    'usuarios.store': '/usuarios',
    'usuarios.update': '/usuarios/{usuario}',
    'usuarios.destroy': '/usuarios/{usuario}',
    'usuarios.restablecer': '/usuarios/{usuario}/restablecer',
    'profile.edit': '/settings/profile',
    'profile.update': '/settings/profile',
    'password.edit': '/settings/password',
    'password.update': '/settings/password',
    appearance: '/settings/appearance',
    'appearance.update': '/settings/appearance',
};

type Parametros = string | number | Record<string, string | number | null | undefined>;

/**
 * Igual que route() de Ziggy: route('productos.edit', 5) o route('inventario', { estado: 'bajo' }).
 * Lo que no es parte de la ruta va a la query.
 */
export function route(nombre: string, parametros?: Parametros): string {
    const plantilla = RUTAS[nombre];
    if (!plantilla) throw new Error(`Ruta desconocida: ${nombre}`);

    const resto: Record<string, string> = {};
    let ruta = plantilla;

    if (typeof parametros === 'string' || typeof parametros === 'number') {
        ruta = ruta.replace(/\{[^}]+\}/, encodeURIComponent(String(parametros)));
    } else if (parametros) {
        for (const [clave, valor] of Object.entries(parametros)) {
            if (valor === null || valor === undefined) continue;
            if (ruta.includes(`{${clave}}`)) {
                ruta = ruta.replace(`{${clave}}`, encodeURIComponent(String(valor)));
            } else {
                resto[clave] = String(valor);
            }
        }
    }

    const query = new URLSearchParams(resto).toString();

    return `${window.location.origin}${ruta}${query ? `?${query}` : ''}`;
}
