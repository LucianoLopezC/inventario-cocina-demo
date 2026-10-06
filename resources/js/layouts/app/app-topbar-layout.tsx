import { AppTopbar } from '@/components/app-topbar';
import AvisoDemo from '@/components/aviso-demo';
import FlashMessage from '@/components/flash-message';
import { useSincronizarApariencia } from '@/hooks/use-appearance';

export default function AppTopbarLayout({ children }: { children: React.ReactNode }) {
    useSincronizarApariencia();

    return (
        <div className="min-h-svh">
            <AvisoDemo />
            <AppTopbar />
            <main className="mx-auto flex max-w-[1180px] flex-col gap-6 px-4 pt-6 pb-14 md:px-8 md:pt-8">{children}</main>
            <FlashMessage />
        </div>
    );
}
