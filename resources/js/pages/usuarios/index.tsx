import InputError from '@/components/input-error';
import PageHeader from '@/components/page-header';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { claseCampo, formatoFecha } from '@/lib/inventario';
import { cn } from '@/lib/utils';
import { type Piso, type SharedData } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { Check, Copy, KeyRound, Pencil, Trash2 } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

interface Usuario {
    id: number;
    name: string;
    email: string;
    es_admin: boolean;
    todos_los_pisos: boolean;
    pisos: number[];
    activo: boolean;
    debe_cambiar_password: boolean;
    ultimo_acceso_at: string | null;
}

interface ClaveTemporal {
    nombre: string;
    email: string;
    clave: string;
}

const botonIcono = 'text-muted-foreground hover:bg-campo hover:text-foreground flex size-11 items-center justify-center rounded-lg';

/** Texto con los pisos que puede usar una cuenta. */
function describirPisos(u: Usuario, todosLosPisos: Piso[]): string {
    if (u.es_admin || u.todos_los_pisos) return 'todos los pisos';
    const nombres = todosLosPisos.filter((p) => u.pisos.includes(p.id)).map((p) => p.nombre);

    return nombres.length ? nombres.join(', ') : 'ningún piso';
}

export default function Usuarios({ usuarios, todosLosPisos }: { usuarios: Usuario[]; todosLosPisos: Piso[] }) {
    const { auth, flash } = usePage<SharedData & { flash: { clave_temporal: ClaveTemporal | null } }>().props;
    const [editando, setEditando] = useState<Usuario | null>(null);
    const [restableciendo, setRestableciendo] = useState<Usuario | null>(null);
    const [eliminando, setEliminando] = useState<Usuario | null>(null);
    const [errorEliminar, setErrorEliminar] = useState<string | null>(null);
    const [errorRestablecer, setErrorRestablecer] = useState<string | null>(null);

    const nuevo = useForm({ name: '', email: '', es_admin: false as boolean, todos_los_pisos: true as boolean, pisos: [] as number[] });

    const crear: FormEventHandler = (e) => {
        e.preventDefault();
        nuevo.post(route('usuarios.store'), { preserveScroll: true, onSuccess: () => nuevo.reset() });
    };

    return (
        <AppLayout>
            <Head title="Usuarios" />

            <PageHeader
                seccion="Administración"
                titulo="Usuarios"
                descripcion="Solo quien tenga una cuenta puede entrar. Crea las cuentas aquí y entrega la contraseña temporal en persona."
            />

            {flash.clave_temporal && <AvisoClave datos={flash.clave_temporal} />}

            <form onSubmit={crear} className="bg-panel flex max-w-4xl flex-col gap-3.5 rounded-[14px] border px-[22px] py-5">
                <h2 className="titulo-seccion">Nueva cuenta</h2>
                <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                    <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
                        Nombre
                        <input
                            value={nuevo.data.name}
                            onChange={(e) => nuevo.setData('name', e.target.value)}
                            required
                            maxLength={255}
                            className={cn(claseCampo, 'font-normal')}
                        />
                    </label>
                    <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
                        Correo
                        <input
                            type="email"
                            value={nuevo.data.email}
                            onChange={(e) => nuevo.setData('email', e.target.value)}
                            required
                            maxLength={255}
                            autoComplete="off"
                            className={cn(claseCampo, 'font-normal')}
                        />
                    </label>
                    <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
                        <input
                            type="checkbox"
                            checked={nuevo.data.es_admin}
                            onChange={(e) => nuevo.setData('es_admin', e.target.checked)}
                            className="accent-acento size-5"
                        />
                        Administrador
                    </label>
                </div>
                <AccesoPisos
                    esAdmin={nuevo.data.es_admin}
                    todos={nuevo.data.todos_los_pisos}
                    elegidos={nuevo.data.pisos}
                    todosLosPisos={todosLosPisos}
                    onTodos={(v) => nuevo.setData('todos_los_pisos', v)}
                    onElegidos={(v) => nuevo.setData('pisos', v)}
                    error={nuevo.errors.pisos}
                />
                <InputError message={nuevo.errors.name || nuevo.errors.email} />
                <button
                    type="submit"
                    disabled={nuevo.processing}
                    className="bg-secondary text-secondary-foreground min-h-11 self-start rounded-lg px-5 text-sm font-semibold disabled:opacity-50"
                >
                    Crear cuenta
                </button>
            </form>

            <section aria-labelledby="usuarios-titulo" className="tarjeta overflow-hidden">
                <div className="border-linea border-b px-[22px] py-[18px]">
                    <h2 id="usuarios-titulo" className="titulo-seccion">
                        Cuentas <span className="text-muted-foreground ml-2 font-mono text-sm font-normal">{usuarios.length}</span>
                    </h2>
                </div>
                <ul>
                    {usuarios.map((u) => (
                        <li
                            key={u.id}
                            className={cn(
                                'border-linea flex flex-wrap items-center gap-x-4 gap-y-2 border-t px-[22px] py-3 first:border-t-0',
                                !u.activo && 'opacity-60',
                            )}
                        >
                            <div className="min-w-0 flex-1">
                                <p className="flex flex-wrap items-center gap-2 text-[15px] font-semibold">
                                    {u.name}
                                    {u.id === auth.user.id && <span className="text-muted-foreground text-xs font-normal">(tú)</span>}
                                    {u.es_admin && <Etiqueta clase="bg-secondary text-secondary-foreground">Admin</Etiqueta>}
                                    {!u.activo && <Etiqueta clase="bg-etiqueta-agotado text-etiqueta-agotado-texto">Desactivada</Etiqueta>}
                                    {u.activo && u.debe_cambiar_password && (
                                        <Etiqueta clase="bg-etiqueta-bajo text-etiqueta-bajo-texto">Clave temporal</Etiqueta>
                                    )}
                                </p>
                                <p className="text-muted-foreground font-mono text-xs">
                                    {u.email} · último acceso: {u.ultimo_acceso_at ? formatoFecha(u.ultimo_acceso_at) : 'nunca'}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                    {u.es_admin ? 'Administra todo' : 'Solo mueve stock'} en{' '}
                                    <span className="text-foreground font-semibold">{describirPisos(u, todosLosPisos)}</span>
                                </p>
                            </div>
                            <div className="flex items-center">
                                <button
                                    type="button"
                                    className={botonIcono}
                                    onClick={() => {
                                        setErrorRestablecer(null);
                                        setRestableciendo(u);
                                    }}
                                    aria-label={`Dar clave temporal a ${u.name}`}
                                    title="Clave temporal"
                                >
                                    <KeyRound className="size-[18px]" strokeWidth={1.8} />
                                </button>
                                <button
                                    type="button"
                                    className={botonIcono}
                                    onClick={() => setEditando(u)}
                                    aria-label={`Editar ${u.name}`}
                                    title="Editar"
                                >
                                    <Pencil className="size-[18px]" strokeWidth={1.8} />
                                </button>
                                {u.id !== auth.user.id && (
                                    <button
                                        type="button"
                                        className={cn(botonIcono, 'hover:text-destructive')}
                                        onClick={() => {
                                            setErrorEliminar(null);
                                            setEliminando(u);
                                        }}
                                        aria-label={`Eliminar la cuenta de ${u.name}`}
                                        title="Eliminar cuenta"
                                    >
                                        <Trash2 className="size-[18px]" strokeWidth={1.8} />
                                    </button>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            </section>

            {editando && (
                <EditarUsuario
                    usuario={editando}
                    esYo={editando.id === auth.user.id}
                    todosLosPisos={todosLosPisos}
                    onClose={() => setEditando(null)}
                />
            )}

            <Dialog open={restableciendo !== null} onOpenChange={(abierto) => !abierto && setRestableciendo(null)}>
                <DialogContent className="rounded-[14px]">
                    <DialogTitle className="titulo-seccion">¿Dar una clave temporal a {restableciendo?.name}?</DialogTitle>
                    <DialogDescription>
                        Su contraseña actual dejará de funcionar y se cerrarán sus sesiones abiertas. Al entrar, tendrá que elegir una nueva.
                    </DialogDescription>
                    <InputError message={errorRestablecer ?? undefined} />
                    <DialogFooter className="gap-2">
                        <DialogClose asChild>
                            <button type="button" className="min-h-11 rounded-lg border px-5 text-sm font-semibold">
                                Cancelar
                            </button>
                        </DialogClose>
                        <button
                            type="button"
                            className="bg-acento hover:bg-acento-oscuro min-h-11 rounded-lg px-5 text-sm font-semibold text-white"
                            onClick={() =>
                                restableciendo &&
                                router.post(
                                    route('usuarios.restablecer', restableciendo.id),
                                    {},
                                    {
                                        preserveScroll: true,
                                        onSuccess: () => setRestableciendo(null),
                                        onError: (e) => setErrorRestablecer(e.usuario ?? 'No se pudo generar la clave.'),
                                    },
                                )
                            }
                        >
                            Generar clave
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={eliminando !== null} onOpenChange={(abierto) => !abierto && setEliminando(null)}>
                <DialogContent className="rounded-[14px]">
                    <DialogTitle className="titulo-seccion">¿Eliminar la cuenta de {eliminando?.name}?</DialogTitle>
                    <DialogDescription>
                        No podrá volver a entrar y se cerrarán sus sesiones abiertas. Esto no se puede deshacer. Su historial de movimientos se
                        conserva con su nombre. Si solo quieres bloquearla por un tiempo, mejor desactívala desde Editar.
                    </DialogDescription>
                    <InputError message={errorEliminar ?? undefined} />
                    <DialogFooter className="gap-2">
                        <DialogClose asChild>
                            <button type="button" className="min-h-11 rounded-lg border px-5 text-sm font-semibold">
                                Cancelar
                            </button>
                        </DialogClose>
                        <button
                            type="button"
                            className="bg-destructive min-h-11 rounded-lg px-5 text-sm font-semibold text-white"
                            onClick={() =>
                                eliminando &&
                                router.delete(route('usuarios.destroy', eliminando.id), {
                                    preserveScroll: true,
                                    onSuccess: () => setEliminando(null),
                                    onError: (e) => setErrorEliminar(e.usuario ?? 'No se pudo eliminar la cuenta.'),
                                })
                            }
                        >
                            Eliminar cuenta
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

function Etiqueta({ clase, children }: { clase: string; children: React.ReactNode }) {
    return <span className={cn('rounded-md px-2 py-0.5 font-mono text-xs font-bold tracking-[0.08em] uppercase', clase)}>{children}</span>;
}

/** La clave temporal solo existe en esta respuesta: no se guarda en ningún lado en texto plano. */
function AvisoClave({ datos }: { datos: ClaveTemporal }) {
    const [copiada, setCopiada] = useState(false);

    const copiar = async () => {
        try {
            await navigator.clipboard.writeText(datos.clave);
            setCopiada(true);
        } catch {
            // Sin acceso al portapapeles: se puede copiar a mano.
        }
    };

    return (
        <section role="status" className="bg-panel border-acento flex max-w-4xl flex-col gap-3 rounded-[14px] border-[1.5px] px-5 py-4">
            <div>
                <p className="font-semibold">Contraseña temporal para {datos.nombre}</p>
                <p className="text-muted-foreground text-sm">
                    Entrégasela en persona. <strong>No se volverá a mostrar.</strong> Al entrar con <span className="font-mono">{datos.email}</span>{' '}
                    tendrá que cambiarla.
                </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <code className="bg-card rounded-lg border px-4 py-2.5 font-mono text-lg font-bold tracking-wider select-all">{datos.clave}</code>
                <button
                    type="button"
                    onClick={copiar}
                    className="hover:bg-campo flex min-h-11 items-center gap-2 rounded-lg border px-4 text-sm font-semibold"
                >
                    {copiada ? <Check className="size-4" /> : <Copy className="size-4" />}
                    {copiada ? 'Copiada' : 'Copiar'}
                </button>
            </div>
        </section>
    );
}

/**
 * Qué pisos puede usar una cuenta normal. Los administradores siempre tienen todos.
 * "Todos los pisos" incluye también los que se creen más adelante.
 */
function AccesoPisos({
    esAdmin,
    todos,
    elegidos,
    todosLosPisos,
    onTodos,
    onElegidos,
    error,
}: {
    esAdmin: boolean;
    todos: boolean;
    elegidos: number[];
    todosLosPisos: Piso[];
    onTodos: (v: boolean) => void;
    onElegidos: (v: number[]) => void;
    error?: string;
}) {
    const alternar = (id: number, marcado: boolean) => onElegidos(marcado ? [...elegidos, id] : elegidos.filter((p) => p !== id));

    return (
        <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-[13px] font-semibold">Pisos</legend>
            {esAdmin ? (
                <p className="text-muted-foreground text-sm">Los administradores ven y modifican todos los pisos.</p>
            ) : (
                <>
                    <p className="text-muted-foreground text-xs">
                        Puede sumar, restar y contar stock, pero no crear, renombrar ni eliminar productos o categorías.
                    </p>
                    <div className="flex flex-wrap gap-x-5">
                        <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
                            <input type="checkbox" checked={todos} onChange={(e) => onTodos(e.target.checked)} className="accent-acento size-5" />
                            Todos los pisos
                        </label>
                        {!todos &&
                            todosLosPisos.map((p) => (
                                <label key={p.id} className="flex min-h-11 items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={elegidos.includes(p.id)}
                                        onChange={(e) => alternar(p.id, e.target.checked)}
                                        className="accent-acento size-5"
                                    />
                                    {p.nombre}
                                </label>
                            ))}
                    </div>
                    <InputError message={error} />
                </>
            )}
        </fieldset>
    );
}

function EditarUsuario({ usuario, esYo, todosLosPisos, onClose }: { usuario: Usuario; esYo: boolean; todosLosPisos: Piso[]; onClose: () => void }) {
    const { data, setData, put, processing, errors } = useForm({
        name: usuario.name,
        email: usuario.email,
        es_admin: usuario.es_admin,
        activo: usuario.activo,
        todos_los_pisos: usuario.todos_los_pisos,
        pisos: usuario.pisos,
    });

    const guardar: FormEventHandler = (e) => {
        e.preventDefault();
        put(route('usuarios.update', usuario.id), { preserveScroll: true, onSuccess: onClose });
    };

    return (
        <Dialog open onOpenChange={(abierto) => !abierto && onClose()}>
            <DialogContent className="rounded-[14px]">
                <DialogTitle className="titulo-seccion">Editar cuenta</DialogTitle>
                <DialogDescription>Si desactivas la cuenta, se cierran sus sesiones al instante.</DialogDescription>
                <form onSubmit={guardar} className="flex flex-col gap-4">
                    <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
                        Nombre
                        <input
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            required
                            maxLength={255}
                            className={cn(claseCampo, 'font-normal')}
                        />
                        <InputError message={errors.name} className="font-normal" />
                    </label>
                    <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
                        Correo
                        <input
                            type="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            required
                            maxLength={255}
                            className={cn(claseCampo, 'font-normal')}
                        />
                        <InputError message={errors.email} className="font-normal" />
                    </label>
                    <label className={cn('flex min-h-11 items-center gap-2 text-sm font-semibold', esYo && 'opacity-50')}>
                        <input
                            type="checkbox"
                            checked={data.es_admin}
                            disabled={esYo}
                            onChange={(e) => setData('es_admin', e.target.checked)}
                            className="accent-acento size-5"
                        />
                        Administrador
                    </label>
                    <label className={cn('flex min-h-11 items-center gap-2 text-sm font-semibold', esYo && 'opacity-50')}>
                        <input
                            type="checkbox"
                            checked={data.activo}
                            disabled={esYo}
                            onChange={(e) => setData('activo', e.target.checked)}
                            className="accent-acento size-5"
                        />
                        Cuenta activa
                    </label>
                    <AccesoPisos
                        esAdmin={data.es_admin}
                        todos={data.todos_los_pisos}
                        elegidos={data.pisos}
                        todosLosPisos={todosLosPisos}
                        onTodos={(v) => setData('todos_los_pisos', v)}
                        onElegidos={(v) => setData('pisos', v)}
                        error={errors.pisos}
                    />
                    {esYo && (
                        <p className="text-muted-foreground text-xs">No puedes quitarte el rol de administrador ni desactivar tu propia cuenta.</p>
                    )}
                    <InputError message={errors.es_admin} />
                    <DialogFooter className="gap-2">
                        <button type="button" onClick={onClose} className="min-h-11 rounded-lg border px-5 text-sm font-semibold">
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="bg-secondary text-secondary-foreground min-h-11 rounded-lg px-5 text-sm font-semibold disabled:opacity-50"
                        >
                            Guardar
                        </button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
