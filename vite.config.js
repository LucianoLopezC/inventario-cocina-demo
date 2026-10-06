import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// Demo sin servidor: un sitio estatico (index.html + JS) que se publica tal cual en "dist".
export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: { '@': fileURLToPath(new URL('./resources/js', import.meta.url)) },
    },
    // Iconos, manifest y robots.txt. (public/ es de la version con Laravel.)
    publicDir: 'estatico',
    build: {
        outDir: 'dist',
        emptyOutDir: true,
    },
    esbuild: {
        jsx: 'automatic',
    },
    server: {
        host: '127.0.0.1',
    },
});
