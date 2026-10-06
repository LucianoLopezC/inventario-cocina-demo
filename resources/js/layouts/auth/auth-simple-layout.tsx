import { NombreApp } from '@/components/app-topbar';

interface AuthLayoutProps {
    children: React.ReactNode;
    name?: string;
    title?: string;
    description?: string;
}

/** Login y pantallas de cuenta: una sola columna centrada, sin marca. */
export default function AuthSimpleLayout({ children, title, description }: AuthLayoutProps) {
    return (
        <div className="bg-background flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
            <main className="flex w-full max-w-sm flex-col gap-6">
                <div className="flex flex-col items-center gap-4 text-center">
                    <NombreApp className="text-muted-foreground text-base" />
                    <div className="flex flex-col gap-1.5">
                        <h1 className="titulo-pagina text-[32px]">{title}</h1>
                        <p className="text-muted-foreground text-sm">{description}</p>
                    </div>
                </div>

                <div className="tarjeta p-6 [&_button[type=submit]]:min-h-11 [&_input]:h-11">{children}</div>
            </main>
        </div>
    );
}
