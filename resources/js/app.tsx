import '../css/app.css';

import { createInertiaApp } from '@inertiajs/react';
import axios, { type AxiosAdapter } from 'axios';
import { createRoot } from 'react-dom/client';
import { route as rutaDemo } from './demo/rutas';
import { Servidor } from './demo/servidor';
import { initializeTheme } from './hooks/use-appearance';

declare global {
    const route: typeof rutaDemo;
}

/*
| Demo sin servidor: las paginas son las mismas de la app real, pero las peticiones de
| Inertia (que van por axios) las responde un servidor simulado dentro del navegador.
*/
const servidor = new Servidor();
Object.assign(globalThis, { route: rutaDemo });

const adaptador: AxiosAdapter = async (config) => {
    const url = new URL(config.url ?? '/', window.location.origin);
    for (const [clave, valor] of Object.entries(config.params ?? {})) {
        url.searchParams.set(clave, String(valor));
    }

    let cuerpo = config.data ?? {};
    if (typeof cuerpo === 'string') cuerpo = cuerpo ? JSON.parse(cuerpo) : {};
    if (cuerpo instanceof FormData) cuerpo = Object.fromEntries(cuerpo);

    // Una pausa minima, como la de una red rapida: la interfaz alcanza a mostrar "cargando".
    await new Promise((listo) => setTimeout(listo, 60));

    const pagina = servidor.atender(config.method ?? 'get', url.href, cuerpo);

    return { data: pagina, status: 200, statusText: 'OK', headers: { 'x-inertia': 'true' }, config, request: {} };
};
axios.defaults.adapter = adaptador;

// Descargar Excel: en la demo se arma un CSV en el navegador.
document.addEventListener('click', (evento) => {
    const enlace = (evento.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (!enlace || new URL(enlace.href).pathname !== '/inventario/excel') return;

    evento.preventDefault();
    const archivo = servidor.exportarCsv();
    if (!archivo) return;

    const blob = new Blob([archivo.contenido], { type: 'text/csv;charset=utf-8' });
    const descarga = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: archivo.nombre });
    descarga.click();
    URL.revokeObjectURL(descarga.href);
});

// Primera pagina: la que pide la barra de direcciones (o adonde redirija, ej. al login).
const inicial = servidor.atender('GET', window.location.pathname + window.location.search);
window.history.replaceState(window.history.state, '', inicial.url);
const raiz = document.getElementById('app')!;
raiz.dataset.page = JSON.stringify(inicial);

createInertiaApp({
    // Pestaña del navegador: "Inventario Cocina (Demo) - Perfil".
    title: (title) => (title ? `${inicial.props.name} - ${title}` : String(inicial.props.name)),
    resolve: (name) => {
        const paginas = import.meta.glob('./pages/**/*.tsx');
        const pagina = paginas[`./pages/${name}.tsx`];
        if (!pagina) throw new Error(`Página no encontrada: ${name}`);

        return pagina() as Promise<never>;
    },
    setup({ el, App, props }) {
        createRoot(el).render(<App {...props} />);
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();
