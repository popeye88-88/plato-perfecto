## Blocker importante antes de empezar

Tu app usa estados en español: `preparando`, `entregando`, `cobrando`, `pagado`. Tu pedido habla de `pending`, `preparing`, `served`. **No voy a renombrar los estados** — rompería todo el código existente (OrderManager, PaymentDialog, EditOrderDialog, historial, RLS, datos ya guardados).

Mapeo que voy a usar:
- **Activas (hoy):** `status IN ('preparando','entregando','cobrando')` — todo lo que NO está pagado ni cancelado
- **Histórico (Reportes):** todas las órdenes, filtrables por fecha/estado/método de pago

Si quieres que además renombre los estados a inglés, dímelo y lo hago en una migración aparte después.

## 1. Migración: índices

```text
CREATE INDEX orders_business_created_idx ON orders(business_id, created_at DESC);
CREATE INDEX orders_business_status_idx  ON orders(business_id, status);
CREATE INDEX orders_business_status_created_idx ON orders(business_id, status, created_at DESC);
CREATE INDEX order_items_order_idx ON order_items(order_id);
```

## 2. `src/lib/supabase.ts` — dos funciones separadas

- `fetchActiveOrders(businessId)` — solo órdenes con `created_at >= hoy 00:00 local` Y `status in ('preparando','entregando','cobrando')`. Sin paginación de items (volumen pequeño, máx ~50 órdenes ≈ pocos cientos de items). Una sola query de items con `.in('order_id', ids)`.
- `fetchAnalyticsOrders(businessId, { startDate, endDate, status, page, pageSize=100 })` — paginado con `.range()`, devuelve `{ orders, total }`. Items cargados con la lógica paginada actual (1000/página).
- Mantengo `fetchOrders` antigua marcada `@deprecated` solo el tiempo del refactor; al final la elimino.

## 3. `BusinessContext.tsx`

- Estado separado: `activeOrders` y un setter. `analyticsOrders` vive **dentro** del componente Reportes, no en el contexto global (no contamina memoria).
- `refreshActiveOrders()` reemplaza al `refreshOrders` actual y se auto-ejecuta cada 30s vía `setInterval` mientras el usuario está en la pestaña de comandas.
- Eliminamos la carga inicial de TODAS las órdenes; al login solo cargamos las activas de hoy.

## 4. `OrderManager.tsx` (Home / Comandas activas)

- Solo opera sobre `activeOrders`.
- Quito las pestañas "Pagado" e historial de aquí — se mueven a Reportes.
- Mantengo pestañas Preparando / Entregando / Cobrando (estados activos).
- Al cobrar (pasar a `pagado`), la orden desaparece de la vista activa al siguiente refresh.
- Polling 30s + refresh tras cualquier mutación local.

## 5. Nueva pestaña Reportes — `src/components/Reports.tsx`

- Filtros: fecha desde / hasta (default: últimos 7 días), estado (todas / pagado / cancelado-implícito), método de pago, búsqueda por número.
- Paginación: 100 por página, controles prev/next + contador.
- Métricas calculadas **en servidor** vía una RPC nueva `orders_analytics(business_id, start, end)` que devuelve: total órdenes, ingresos totales, promedio, ingresos por día. Calcular en cliente sobre solo la página visible daría números falsos.
- Botón **Exportar CSV**: descarga el rango filtrado completo (sin paginar) usando una query streaming con `.range()` en bloques de 1000, generando el CSV en el navegador.
- Tabla con: número, fecha/hora, comensales, items (resumen), total, método de pago, estado.
- Click en fila → abre el `OrderEditHistoryDialog` existente en modo solo-lectura.

## 6. Navegación — `Layout.tsx`

Tabs principales pasan a ser:
1. **Comandas** (Home, default) — `OrderManager` con solo activas
2. **Menú**
3. **Reportes** (nuevo)
4. **Ajustes**

## 7. Lo que NO cambio (para acotar el riesgo)

- Nombres de estados en BD
- Estructura de `order_items`, `individual_items_status`, `edit_history`
- Flujo de creación/edición/pago de órdenes
- RLS, triggers, `next_order_number`

## Orden de implementación

1. Migración índices
2. `supabase.ts`: añadir `fetchActiveOrders` + `fetchAnalyticsOrders`, dejar `fetchOrders` viva
3. `BusinessContext`: switch a `activeOrders` + polling 30s
4. `OrderManager`: quitar tabs de histórico
5. Crear `Reports.tsx` + RPC analytics + export CSV
6. `Layout`: añadir tab Reportes
7. Eliminar `fetchOrders` antigua

¿Confirmas el mapeo de estados (mantener español) y procedo?