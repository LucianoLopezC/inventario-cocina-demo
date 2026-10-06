import { type SharedData } from '@/types';
import { router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

export type Appearance = 'light' | 'dark' | 'system';

const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

// Preferencia aplicada ahora; la usa el listener cuando cambia el tema del dispositivo.
let actual: Appearance = 'system';

const applyTheme = (appearance: Appearance) => {
    actual = appearance;
    const isDark = appearance === 'dark' || (appearance === 'system' && mediaQuery.matches);

    document.documentElement.classList.toggle('dark', isDark);
};

// localStorage puede fallar (modo privado, almacenamiento bloqueado): no debe romper la app.
function leerLocal(): Appearance | null {
    try {
        return localStorage.getItem('appearance') as Appearance | null;
    } catch {
        return null;
    }
}

function guardarLocal(appearance: Appearance) {
    try {
        localStorage.setItem('appearance', appearance);
    } catch {
        // Sin almacenamiento local: la preferencia queda solo en la cuenta.
    }
}

export function initializeTheme() {
    // Primero la preferencia de la cuenta (la pone el servidor en <html>), luego la del navegador.
    const deLaCuenta = document.documentElement.dataset.apariencia as Appearance | undefined;

    applyTheme(deLaCuenta || leerLocal() || 'system');

    mediaQuery.addEventListener('change', () => applyTheme(actual));
}

/**
 * Mantiene el tema en sintonía con la cuenta del usuario conectado
 * (por ejemplo, al iniciar sesión con otra cuenta sin recargar la página).
 */
export function useSincronizarApariencia() {
    const { auth } = usePage<SharedData>().props;
    const deLaCuenta = auth.user?.apariencia;

    useEffect(() => {
        if (!deLaCuenta) return;

        applyTheme(deLaCuenta);
        guardarLocal(deLaCuenta);
    }, [deLaCuenta]);
}

export function useAppearance() {
    const { auth } = usePage<SharedData>().props;
    const [local, setLocal] = useState<Appearance>(() => leerLocal() || 'system');
    // Elección recién hecha, mientras el servidor confirma.
    const [elegida, setElegida] = useState<Appearance | null>(null);

    const appearance = elegida ?? auth.user?.apariencia ?? local;

    const updateAppearance = (mode: Appearance) => {
        applyTheme(mode);
        guardarLocal(mode);
        setLocal(mode);

        if (!auth.user) return;

        setElegida(mode);
        router.patch(
            route('appearance.update'),
            { apariencia: mode },
            { preserveScroll: true, preserveState: true, onFinish: () => setElegida(null) },
        );
    };

    return { appearance, updateAppearance };
}
