import SelectorPiso from '@/components/selector-piso';
import { type ReactNode } from 'react';

interface Props {
    /** Etiqueta mono sobre el título, ej. "BODEGA Y CÁMARAS". */
    seccion?: string;
    titulo: string;
    descripcion?: ReactNode;
    acciones?: ReactNode;
    /** Muestra el selector de piso arriba del título (Panel, Inventario, Historial, Categorías). */
    selectorPiso?: boolean;
}

export default function PageHeader({ seccion, titulo, descripcion, acciones, selectorPiso = false }: Props) {
    return (
        <div className="flex flex-col gap-4">
            {selectorPiso && <SelectorPiso />}
            <header className="flex flex-wrap items-end justify-between gap-4">
                <div className="flex min-w-0 flex-col gap-1.5">
                    {seccion && <span className="etiqueta text-muted-foreground">{seccion}</span>}
                    <h1 className="titulo-pagina break-words">{titulo}</h1>
                    {descripcion && <div className="text-muted-foreground mt-1 text-sm">{descripcion}</div>}
                </div>
                {/* En celular los botones van apilados y a todo el ancho, para que el texto no se parta. */}
                {acciones && <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap [&>*]:justify-center">{acciones}</div>}
            </header>
        </div>
    );
}
