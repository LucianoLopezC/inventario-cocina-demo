import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { type Appearance, useAppearance } from '@/hooks/use-appearance';
import { cn } from '@/lib/utils';
import { type LucideIcon, Monitor, Moon, Sun } from 'lucide-react';

const OPCIONES: { valor: Appearance; etiqueta: string; icono: LucideIcon }[] = [
    { valor: 'light', etiqueta: 'Claro', icono: Sun },
    { valor: 'dark', etiqueta: 'Oscuro', icono: Moon },
    { valor: 'system', etiqueta: 'Como el dispositivo', icono: Monitor },
];

/** Selector rápido de tema para la barra superior. Se guarda en la cuenta del usuario. */
export default function AppearanceToggleDropdown({ className }: { className?: string }) {
    const { appearance, updateAppearance } = useAppearance();
    const actual = OPCIONES.find((o) => o.valor === appearance) ?? OPCIONES[2];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                className={cn('flex size-11 items-center justify-center rounded-full text-[#B9C2BD] hover:bg-white/10 hover:text-white', className)}
                aria-label={`Tema: ${actual.etiqueta}. Cambiar tema`}
                title="Cambiar tema"
            >
                <actual.icono className="size-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-52 rounded-xl">
                <DropdownMenuLabel className="etiqueta text-muted-foreground text-[11px] font-normal">Tema</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={appearance} onValueChange={(v) => updateAppearance(v as Appearance)}>
                    {OPCIONES.map(({ valor, etiqueta, icono: Icono }) => (
                        <DropdownMenuRadioItem key={valor} value={valor} className="min-h-10 gap-2">
                            <Icono className="size-4" />
                            {etiqueta}
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
