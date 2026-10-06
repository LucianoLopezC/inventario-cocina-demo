import InputError from '@/components/input-error';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Transition } from '@headlessui/react';
import { Head, useForm } from '@inertiajs/react';
import { Check, Circle } from 'lucide-react';
import { FormEventHandler, useRef } from 'react';

import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/** Los mismos requisitos que exige el servidor (Password::defaults). */
const REQUISITOS: { texto: string; cumple: (clave: string) => boolean }[] = [
    { texto: 'Al menos 10 caracteres', cumple: (c) => c.length >= 10 },
    { texto: 'Una letra mayúscula', cumple: (c) => /\p{Lu}/u.test(c) },
    { texto: 'Una letra minúscula', cumple: (c) => /\p{Ll}/u.test(c) },
    { texto: 'Un número', cumple: (c) => /\d/.test(c) },
];

function Requisitos({ clave }: { clave: string }) {
    return (
        <ul aria-label="Requisitos de la contraseña" className="grid gap-1 text-sm sm:grid-cols-2">
            {REQUISITOS.map((r) => {
                const ok = r.cumple(clave);

                return (
                    <li key={r.texto} className={cn('flex items-center gap-2', ok ? 'text-estado-bien' : 'text-muted-foreground')}>
                        {ok ? <Check className="size-4 shrink-0" aria-hidden /> : <Circle className="size-4 shrink-0" aria-hidden />}
                        {r.texto}
                        <span className="sr-only">{ok ? '(cumple)' : '(falta)'}</span>
                    </li>
                );
            })}
        </ul>
    );
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Contraseña',
        href: '/settings/password',
    },
];

export default function Password({ debeCambiar }: { debeCambiar: boolean }) {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    const { data, setData, errors, put, reset, processing, recentlySuccessful } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const updatePassword: FormEventHandler = (e) => {
        e.preventDefault();

        put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => reset(),
            onError: (errors) => {
                if (errors.password) {
                    reset('password', 'password_confirmation');
                    passwordInput.current?.focus();
                }

                if (errors.current_password) {
                    reset('current_password');
                    currentPasswordInput.current?.focus();
                }
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Contraseña" />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall
                        title="Cambiar contraseña"
                        description="Debe tener al menos 10 caracteres, una mayúscula, una minúscula y un número. Al cambiarla se cierra tu sesión en otros dispositivos."
                    />

                    {debeCambiar && (
                        <div role="alert" className="bg-panel border-acento rounded-[14px] border-[1.5px] px-4 py-3 text-sm">
                            <p className="font-semibold">Tienes una contraseña temporal.</p>
                            <p className="text-muted-foreground">
                                Elige una contraseña propia para seguir usando la aplicación. Al guardarla entrarás directo al panel.
                            </p>
                        </div>
                    )}

                    <form onSubmit={updatePassword} className="space-y-6">
                        {/* Con clave temporal no se pide: la acaba de usar para entrar. */}
                        {!debeCambiar && (
                            <div className="grid gap-2">
                                <Label htmlFor="current_password">Contraseña actual</Label>

                                <Input
                                    id="current_password"
                                    ref={currentPasswordInput}
                                    value={data.current_password}
                                    onChange={(e) => setData('current_password', e.target.value)}
                                    type="password"
                                    className="mt-1 block w-full"
                                    autoComplete="current-password"
                                    placeholder="Contraseña actual"
                                />

                                <InputError message={errors.current_password} />
                            </div>
                        )}

                        <div className="grid gap-2">
                            <Label htmlFor="password">Nueva contraseña</Label>

                            <Input
                                id="password"
                                ref={passwordInput}
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                type="password"
                                className="mt-1 block w-full"
                                autoComplete="new-password"
                                placeholder="Nueva contraseña"
                            />

                            <Requisitos clave={data.password} />

                            <InputError message={errors.password} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="password_confirmation">Confirmar contraseña</Label>

                            <Input
                                id="password_confirmation"
                                value={data.password_confirmation}
                                onChange={(e) => setData('password_confirmation', e.target.value)}
                                type="password"
                                className="mt-1 block w-full"
                                autoComplete="new-password"
                                placeholder="Repite la nueva contraseña"
                            />

                            <InputError message={errors.password_confirmation} />
                        </div>

                        <div className="flex items-center gap-4">
                            <Button disabled={processing}>Guardar contraseña</Button>

                            <Transition
                                show={recentlySuccessful}
                                enter="transition ease-in-out"
                                enterFrom="opacity-0"
                                leave="transition ease-in-out"
                                leaveTo="opacity-0"
                            >
                                <p className="text-muted-foreground text-sm">Guardado</p>
                            </Transition>
                        </div>
                    </form>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
