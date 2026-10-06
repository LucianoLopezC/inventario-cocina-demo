import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { CheckCircle2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

/** Muestra el mensaje "success" que manda Laravel con ->with('success', ...). */
export default function FlashMessage() {
    const { flash } = usePage<SharedData>().props;
    const [visible, setVisible] = useState<string | null>(null);

    useEffect(() => {
        if (!flash.success) return;

        setVisible(flash.success);
        const timer = setTimeout(() => setVisible(null), 3500);

        return () => clearTimeout(timer);
    }, [flash]);

    if (!visible) return null;

    return (
        <div
            role="status"
            className="animate-in fade-in slide-in-from-bottom-2 bg-tinta fixed right-4 bottom-4 left-4 z-50 flex items-center gap-3 rounded-[14px] py-2 pr-2 pl-4 text-sm text-[#E7EAE8] shadow-xl sm:left-auto sm:max-w-sm"
        >
            <CheckCircle2 className="text-brasa size-5 shrink-0" />
            <span className="flex-1 py-1.5">{visible}</span>
            <button
                type="button"
                onClick={() => setVisible(null)}
                className="flex size-11 shrink-0 items-center justify-center rounded-lg opacity-60 hover:bg-white/10 hover:opacity-100"
                aria-label="Cerrar"
            >
                <X className="size-4" />
            </button>
        </div>
    );
}
