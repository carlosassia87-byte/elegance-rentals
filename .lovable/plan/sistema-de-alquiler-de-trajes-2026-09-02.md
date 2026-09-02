# Sistema de Alquiler de Trajes

## Objetivo
Catálogo público de trajes para alquiler, con disponibilidad por fechas y un panel administrativo para gestionar inventario y reservas. Estilo visual: blanco y verde suave, limpio y elegante.

## Alcance de esta versión
- Catálogo público de trajes con imágenes, categorías y tallas.
- Vista de detalle con calendario de disponibilidad.
- Formulario de solicitud de reserva (cliente elige fechas y traje).
- Panel de administración protegido por login.
- CRUD de trajes, categorías, tallas y reservas desde el admin.
- No incluye pagos online ni envíos en esta primera entrega.

## Tecnología
- Lovable Cloud para base de datos, autenticación y almacenamiento de imágenes.
- TanStack Start + React + Tailwind CSS v4 + shadcn/ui.

## Estructura de datos
- `categories`: categorías de trajes (novio, quinceañero, smoking, etc.).
- `suits`: trajes con nombre, descripción, categoría, tallas, colores, precio, fotos.
- `suit_sizes`: relación traje-talla con stock por talla.
- `sizes`: tabla de tallas.
- `rentals`: reservas con traje, talla, fechas, cliente, estado.

## Rutas
- `/`: catálogo público.
- `/suits/$id`: detalle del traje y disponibilidad.
- `/suits/$id/rent`: solicitud de reserva.
- `/auth`: inicio de sesión.
- `/admin`: panel administrativo (protegido).
- `/admin/suits`: gestión de trajes.
- `/admin/rentals`: gestión de reservas.

## Seguridad
- RLS en todas las tablas.
- Políticas públicas de solo lectura para catálogo.
- Solo usuarios autenticados con rol `admin` pueden crear/editar/eliminar trajes y reservas.
- Roles separados en tabla `user_roles` con función `has_role` de seguridad.

## Diseño
- Paleta blanco + verde suave (menta/sage).
- Tipografía limpia y espacios generosos.
- Tarjetas de trajes con sombra sutil y hover elegante.
- Panel admin funcional y ordenado con tablas y formularios.

## Migraciones incluidas
- Esquema completo con GRANTs.
- Tablas, RLS, policies y función `has_role`.
- Sin datos de ejemplo: se cargarán trajes desde el panel admin.
