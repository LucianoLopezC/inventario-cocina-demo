import PageHeader from '@/components/page-header';
import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { Layers } from 'lucide-react';

/** Se muestra a quien todavía no tiene ningún piso asignado. */
export default function SinPiso() {
    return (
        <AppLayout>
            <Head title="Sin piso asignado" />

            <PageHeader seccion="Inventario" titulo="Sin piso asignado" />

            <section className="tarjeta flex max-w-xl flex-col items-center gap-3 px-[22px] py-10 text-center">
                <Layers className="text-muted-foreground size-10" strokeWidth={1.5} aria-hidden />
                <p className="text-[15px] font-semibold">Todavía no tienes ningún piso asignado.</p>
                <p className="text-muted-foreground text-sm">
                    Pídele a un administrador que te asigne el piso donde trabajas para ver su inventario.
                </p>
            </section>
        </AppLayout>
    );
}
