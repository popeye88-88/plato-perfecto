# Guía de migración a Supabase

## 1. Configurar Supabase

### Crear proyecto
1. Ve a [supabase.com](https://supabase.com) e inicia sesión
2. Crea un nuevo proyecto
3. Anota la **URL** y la **anon key** del proyecto

### Variables de entorno
Crea o edita `.env` en la raíz del proyecto:

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

## 2. Ejecutar migraciones

### Opción A: Supabase CLI (recomendado)

```bash
# Instalar Supabase CLI si no lo tienes
npm install -g supabase

# Vincular al proyecto
supabase link --project-ref TU_PROJECT_REF

# Aplicar migraciones
supabase db push
```

### Opción B: SQL Editor en el Dashboard

1. Entra al Dashboard de Supabase → **SQL Editor**
2. Ejecuta en orden los archivos de `supabase/migrations/`:
   - `20250924024519_*.sql` (si no lo has ejecutado antes)
   - `20251003005003_*.sql`
   - `20250216000000_migrate_all_tables.sql`
   - `20250216000001_seed_default_data.sql`
   - `20250216000002_orders_text_ids.sql` (permite IDs de texto en orders/order_items)

## 3. Tablas creadas

| Tabla | Descripción |
|-------|-------------|
| `app_users` | Usuarios (username, password) |
| `businesses` | Negocios |
| `business_user_access` | Permisos (owner/staff) por negocio |
| `menu_items` | Productos del menú por negocio |
| `categories` | Categorías por negocio |
| `orders` | Órdenes (con `business_id` añadido) |
| `order_items` | Líneas de cada orden |
| `order_edit_history` | Historial de ediciones |

## 4. Uso de Supabase en el código

El código ya está adaptado para usar Supabase cuando las variables de entorno están configuradas:

- **AuthContext** → tabla `app_users` (login, getUsers)
- **BusinessContext** → tablas `businesses`, `business_user_access`, `menu_items`
- **MenuManager** → tablas `menu_items`, `categories`
- **OrderManager** → tablas `orders`, `order_items`

Si `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` no están configurados (o la URL es `https://your-project.supabase.co`), la app usa **localStorage** como fallback.

## 5. Seguridad

- **Contraseñas**: Actualmente se guardan en texto plano. En producción usa Supabase Auth o hashea con bcrypt.
- **RLS**: Las políticas actuales permiten todo. Ajusta según tu modelo de autenticación.
