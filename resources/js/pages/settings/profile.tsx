import { type SharedData } from '@/types';
import { Head, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler } from 'react';

import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';

export default function Profile() {
    const { auth } = usePage<SharedData>().props;

    const { data, setData, patch, errors, processing, reset } = useForm({
        name: auth.user.name,
        email: auth.user.email,
        current_password: '',
    });

    // El correo es el usuario para entrar: cambiarlo pide la clave actual.
    const cambiaCorreo = data.email.trim().toLowerCase() !== auth.user.email;

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        patch(route('profile.update'), { preserveScroll: true, onFinish: () => reset('current_password') });
    };

    return (
        <AppLayout>
            <Head title="Perfil" />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall title="Datos del perfil" description="Actualiza tu nombre y correo electrónico" />

                    <form onSubmit={submit} className="space-y-6">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nombre</Label>
                            <Input
                                id="name"
                                className="mt-1 block w-full"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                required
                                maxLength={255}
                                autoComplete="name"
                                placeholder="Nombre y apellido"
                            />
                            <InputError className="mt-2" message={errors.name} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="email">Correo electrónico</Label>
                            <Input
                                id="email"
                                type="email"
                                className="mt-1 block w-full"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                required
                                maxLength={255}
                                autoComplete="username"
                                placeholder="Correo electrónico"
                            />
                            <InputError className="mt-2" message={errors.email} />
                        </div>

                        {cambiaCorreo && (
                            <div className="grid gap-2">
                                <Label htmlFor="current_password">Contraseña actual</Label>
                                <Input
                                    id="current_password"
                                    type="password"
                                    className="mt-1 block w-full"
                                    value={data.current_password}
                                    onChange={(e) => setData('current_password', e.target.value)}
                                    required
                                    autoComplete="current-password"
                                    placeholder="Para confirmar el cambio de correo"
                                />
                                <p className="text-muted-foreground text-xs">Con este correo inicias sesión, por eso pedimos tu contraseña.</p>
                                <InputError className="mt-2" message={errors.current_password} />
                            </div>
                        )}

                        <Button disabled={processing}>Guardar</Button>
                    </form>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
