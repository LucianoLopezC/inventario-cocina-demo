# Inventario de Cocina

**Sistema de inventario para cocinas de restaurante.** Muestra en tiempo real qué hay, qué falta y quién movió qué, desde el celular o el computador.

### [▶ Probar la demo](https://inventario-cocina-demo.vercel.app)

Entra con un clic como **Administrador** o como **Cocinero**. No hace falta registrarse.

---

## El problema

En muchas cocinas el inventario se lleva en una planilla o en un cuaderno: se actualiza tarde, nadie sabe quién sacó qué y los productos se agotan en pleno servicio. Esta app reemplaza esa planilla por algo que el equipo puede usar en el momento, desde el celular, sin dejar de cocinar.

## Qué hace

**Stock al día**

- Sumar o restar con un toque (+1 / −1), o escribir la cantidad exacta.
- Conversión automática de unidades: si el producto está en kilos, se pueden restar 250 g y se descuentan 0,25 kg.
- Conteo físico (ajuste) con aviso si otra persona movió el stock mientras se contaba.
- Protección contra envíos repetidos: un doble toque o una mala conexión no registran el movimiento dos veces.

**Alertas de reposición**

- Cada producto tiene un stock mínimo; el panel muestra lo que está **bajo** o **sin stock**, ordenado por urgencia.
- Filtros por estado, categoría y búsqueda (sin importar tildes: "limon" encuentra "Limón").

**Varios pisos o sectores**

- Cada piso (cocina, bar, pastelería…) tiene su propio inventario y sus categorías.
- Cada usuario trabaja en los pisos que tiene asignados.

**Historial que no se borra**

- Cada movimiento queda registrado con quién, cuándo, cuánto había antes y cuánto quedó.
- Aunque se elimine un producto o una cuenta, su historial se conserva.

**Equipo y permisos**

- **Administrador:** gestiona productos, categorías, pisos y cuentas.
- **Usuario de cocina:** solo mueve stock en sus pisos.
- No hay registro abierto: el administrador crea las cuentas y entrega una clave temporal que se cambia al primer ingreso.

**Exportar**

- Descarga del inventario en Excel con el formato de la planilla de la cocina.

## Seguridad

La versión real está pensada para uso diario en un negocio:

- Bloqueo tras varios intentos fallidos de contraseña, y claves seguras obligatorias.
- La sesión se cierra sola a las 12 horas; al desactivar una cuenta, la persona queda fuera al instante.
- Para administrar usuarios hay que volver a confirmar la contraseña.
- Protección contra los ataques web más comunes (inyección SQL, XSS, CSRF, clickjacking).
- Registro de auditoría: inicios de sesión, bloqueos y acciones del administrador.

## Tecnologías

| Producto real |                                                 |
| ------------- | ----------------------------------------------- |
| Backend       | Laravel 12 (PHP)                                |
| Frontend      | React 19 + TypeScript, Inertia.js, Tailwind CSS |
| Base de datos | PostgreSQL (Supabase)                           |
| Hosting       | Vercel                                          |

Diseño adaptado a celular y modo claro/oscuro. Se puede instalar en el celular como una app.

## Sobre esta demo

La demo usa **las mismas pantallas** que la app real, pero no tiene servidor ni base de datos: un servidor simulado corre dentro del navegador y responde como lo haría el sistema real, con las mismas reglas y validaciones.

- Cada visitante parte con los mismos datos de ejemplo: dos pisos, 27 productos y dos semanas de historial.
- Se puede cambiar todo; los cambios **solo existen en tu pestaña** y se borran al cerrarla.
- Nadie ve lo que hacen los demás visitantes.

Este repositorio contiene la demo. El código del producto real es privado.

<details>
<summary>Correr la demo en tu equipo</summary>

```bash
npm ci
npm run dev        # http://127.0.0.1:5173
```

Los archivos propios de la demo están en `resources/js/demo/`: `servidor.ts` (servidor simulado), `datos.ts` (datos de ejemplo) y `rutas.ts`.

</details>

---

## ¿Necesitas algo así para tu negocio?

Desarrollo sistemas a medida: inventarios, paneles de gestión, reservas y más.

- **Correo:** luciano.lopezce@gmail.com
- **LinkedIn:** [luciano-lopez](https://www.linkedin.com/in/luciano-lopez-4a7370403/)
- **GitHub:** [LucianoLopezC](https://github.com/LucianoLopezC)
