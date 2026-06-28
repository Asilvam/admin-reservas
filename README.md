# Admin Reservas

Front administrativo separado para consultar reservas por horario, revisar guardianes, acompanantes y check-in, y exportar Excel.

## Funcionalidad

- Login local con clave simple.
- Selector de evento: `selva` o `patines`.
- Vista por fecha, con fecha del dia por defecto.
- Si la fecha del dia no tiene horarios, salta a la proxima fecha con reservas vigentes.
- Panel izquierdo con horarios disponibles.
- Panel derecho con reservas del horario seleccionado.
- Filtros por busqueda, estado y check-in.
- Busqueda en vivo dentro del horario seleccionado, sin importar mayusculas, acentos, puntos o guiones.
- Auto-refresh de check-ins configurable por `.env`.
- Exportacion Excel de reservas por fecha con columnas originales y query base.

## Desarrollo

```bash
cd admin-reservas
npm install
npm run dev
```

## Variables

Copia `.env.example` a `.env` y ajusta:

```env
VITE_API_URL=http://localhost:3500
VITE_ADMIN_EVENT_TYPE=selva
VITE_DEMO_ADMIN_PASSWORD=selva-admin
VITE_AUTO_REFRESH_SECONDS=60
```

`VITE_DEMO_ADMIN_PASSWORD` valida el acceso local del front. No llama a login de backend.

`VITE_ADMIN_EVENT_TYPE` solo define el evento inicial. Luego el usuario puede cambiar entre `selva` y `patines` desde la interfaz.

`VITE_AUTO_REFRESH_SECONDS` define cada cuantos segundos se refrescan automaticamente los horarios y el estado de check-in en pantalla.

## Endpoints esperados

- `GET /admin/schedule-reservations?eventType=selva`
- `GET /admin/schedule-reservations?eventType=patines`
- `GET /admin/reservations?eventType=selva`
- `GET /admin/reservations?eventType=patines`

La pantalla principal del admin depende de `GET /admin/schedule-reservations`.

## Descarga Excel

El boton `Descargar fecha` refresca primero los datos desde backend y luego descarga el archivo de reservas filtrado solo por:

- evento seleccionado
- fecha seleccionada

No filtra por horario seleccionado, busqueda, estado ni check-in.

El archivo mantiene el orden de columnas del export original en la hoja `Result 1` y agrega la hoja `Query` con el `eventType` activo (`selva` o `patines`).
