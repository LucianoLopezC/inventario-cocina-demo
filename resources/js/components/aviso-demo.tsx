import { borrar } from '@/demo/datos';
import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { FlaskConical } from 'lucide-react';

/** Franja fija que recuerda que es una demo: lo que se cambia no se guarda en ningún lado. */
export default function AvisoDemo() {
    const { demo } = usePage<SharedData>().props;
    // Solo enlaces web o de correo (nunca "javascript:" desde una variable de entorno).
    const contacto = demo.contacto && /^(https?:|mailto:)/i.test(demo.contacto) ? demo.contacto : null;

    const empezarDeCero = () => {
        borrar();
        window.location.href = '/login';
    };

    return (
        <div role="note" className="bg-etiqueta-bajo text-etiqueta-bajo-texto px-4 py-2 text-center text-sm font-medium">
            <FlaskConical className="mr-1.5 inline size-4 -translate-y-px" />
            Versión de demostración: tus cambios solo existen en esta pestaña y se borran al cerrarla.{' '}
            <button type="button" onClick={empezarDeCero} className="font-semibold underline underline-offset-2">
                Empezar de cero
            </button>
            {contacto && (
                <>
                    {' · '}
                    <a href={contacto} className="font-semibold underline underline-offset-2" target="_blank" rel="noopener noreferrer">
                        ¿Te interesa? Escríbeme
                    </a>
                </>
            )}
        </div>
    );
}
