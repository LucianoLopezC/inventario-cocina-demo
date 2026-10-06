import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { FormEventHandler } from 'react';

import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';

type LoginForm = {
    email: string;
    password: string;
};

/** Cuenta publica de la demo (config/demo.php). */
interface CuentaDemo {
    rol: string;
    descripcion: string;
    email: string;
    password: string;
}

export default function Login({ status, cuentasDemo }: { status?: string; cuentasDemo: CuentaDemo[] }) {
    const { data, setData, post, processing, errors, reset, transform } = useForm<LoginForm>({
        email: '',
        password: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        transform((datos) => datos);
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    // Entrar con un clic: se envia la cuenta elegida sin tener que escribirla.
    const entrarComo = (cuenta: CuentaDemo) => {
        setData({ email: cuenta.email, password: '' });
        transform(() => ({ email: cuenta.email, password: cuenta.password }));
        post(route('login'));
    };

    return (
        <AuthLayout
            title="Prueba la demo"
            description="Elige una cuenta para entrar. Los datos son de ejemplo y puedes cambiar lo que quieras: nada se guarda al cerrar la pestaña."
        >
            <Head title="Iniciar sesión" />

            {status && (
                <div role="status" className="bg-etiqueta-bajo text-etiqueta-bajo-texto mb-5 rounded-lg px-4 py-3 text-sm font-medium">
                    {status}
                </div>
            )}

            <div className="mb-6 grid gap-3">
                {cuentasDemo.map((cuenta) => (
                    <button
                        key={cuenta.email}
                        type="button"
                        disabled={processing}
                        onClick={() => entrarComo(cuenta)}
                        className="hover:border-foreground/40 hover:bg-muted/50 flex min-h-11 flex-col items-start gap-0.5 rounded-lg border px-4 py-3 text-left transition-colors disabled:opacity-60"
                    >
                        <span className="text-sm font-semibold">Entrar como {cuenta.rol}</span>
                        <span className="text-muted-foreground text-xs">{cuenta.descripcion}</span>
                        <span className="text-muted-foreground font-mono text-xs">
                            {cuenta.email} · {cuenta.password}
                        </span>
                    </button>
                ))}
            </div>

            <div className="text-muted-foreground mb-6 flex items-center gap-3 text-xs uppercase">
                <span className="bg-border h-px flex-1" />o escribe los datos
                <span className="bg-border h-px flex-1" />
            </div>

            <form className="flex flex-col gap-6" onSubmit={submit}>
                <div className="grid gap-6">
                    <div className="grid gap-2">
                        <Label htmlFor="email">Correo electrónico</Label>
                        <Input
                            id="email"
                            type="email"
                            required
                            autoComplete="username"
                            maxLength={255}
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            placeholder="correo@ejemplo.com"
                        />
                        <InputError message={errors.email} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="password">Contraseña</Label>
                        <Input
                            id="password"
                            type="password"
                            required
                            autoComplete="current-password"
                            maxLength={255}
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            placeholder="Contraseña"
                        />
                        <InputError message={errors.password} />
                    </div>

                    <Button type="submit" className="mt-2 w-full" disabled={processing}>
                        {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                        Entrar
                    </Button>
                </div>
            </form>
        </AuthLayout>
    );
}
