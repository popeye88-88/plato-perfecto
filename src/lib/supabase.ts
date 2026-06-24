import { supabase } from '@/integrations/supabase/client';


// App Users - removed: now using Supabase Auth (supabase.auth.signInWithPassword)

// Businesses
export async function fetchBusinesses() {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) {
      console.error('fetchBusinessesDb error:', error);
      return [];
    }
    return (data || []).map((b: any) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      createdAt: new Date(b.created_at),
      enableEntregandoStage: b.enable_entregando_stage ?? true,
      language: b.language ?? 'es',
      currency: b.currency ?? 'MXN',
      menuItems: []
    }));

  } catch (error) {
    console.error('fetchBusinessesDb exception:', error);
    return [];
  }
}

export async function insertBusiness(business: { id: string; name: string; description?: string }) {
  const { error } = await supabase.from('businesses').insert({
    id: business.id,
    name: business.name,
    description: business.description || null
  });
  return error ? null : business;
}

export async function updateBusinessDb(id: string, updates: { name?: string; description?: string; enable_entregando_stage?: boolean; language?: string; currency?: string }) {
  const { error } = await supabase.from('businesses').update(updates).eq('id', id);
  if (error) console.error('updateBusinessDb error:', error);
  return !error;
}


export async function deleteBusinessDb(id: string) {
  const { error } = await supabase.from('businesses').delete().eq('id', id);
  return !error;
}

// Business User Access - removed: now using business_members table directly

// Orders - types for serialization
interface OrderRow {
  id: string;
  number: string;
  customer_name: string;
  total: number;
  status: string;
  created_at: string;
  business_id?: string;
  service_type?: string;
  diners?: number;
  edited?: boolean;
  discount_amount?: number;
  discount_reason?: string;
  payment_method?: string;
  initial_items?: unknown;
  individual_items_status?: unknown;
  edit_history?: unknown;
}

interface OrderItemRow {
  id: string;
  order_id: string;
  name: string;
  price: number;
  quantity: number;
  status: string;
  cancelled?: boolean;
  cancellation_reason?: string;
  original_quantity?: number;
  cancelled_at?: string;
  cancelled_in_stage?: string;
}

const toIndividualStatus = (status?: string): 'preparando' | 'entregando' | 'cobrando' => {
  if (status === 'cobrando' || status === 'pagado') return 'cobrando';
  if (status === 'entregando') return 'entregando';
  return 'preparando';
};

const toOrderStatus = (status?: string): 'preparando' | 'entregando' | 'cobrando' | 'pagado' => {
  if (status === 'entregando' || status === 'cobrando' || status === 'pagado') return status;
  return 'preparando';
};

const toServiceType = (serviceType?: string): 'puesto' | 'takeaway' | 'delivery' | undefined => {
  return serviceType === 'puesto' || serviceType === 'takeaway' || serviceType === 'delivery' ? serviceType : undefined;
};

const toPaymentMethod = (paymentMethod?: string): 'tarjeta' | 'efectivo' | 'transferencia' | undefined => {
  return paymentMethod === 'tarjeta' || paymentMethod === 'efectivo' || paymentMethod === 'transferencia' ? paymentMethod : undefined;
};

const toEditAction = (action?: string): 'added' | 'removed' | 'discount_applied' | 'payment_processed' => {
  if (action === 'removed' || action === 'discount_applied' || action === 'payment_processed') return action;
  return 'added';
};

const getPersistedOrderItemId = (orderId: string, itemId: string, index: number) => {
  return itemId?.startsWith(`${orderId}-item-`) ? itemId : `${orderId}-item-${index}`;
};

const toCancelledStage = (stage?: string): 'preparando' | 'entregando' | 'cobrando' | undefined => {
  return stage === 'preparando' || stage === 'entregando' || stage === 'cobrando' ? stage : undefined;
};

// ---- Shared mapping ----
type FetchOrdersOptions = {
  status?: string[];           // filter by order.status
  createdAfter?: string;       // ISO
  createdBefore?: string;      // ISO
  rangeFrom?: number;          // pagination start (inclusive)
  rangeTo?: number;            // pagination end (inclusive)
  withCount?: boolean;         // include total count
  paginateItems?: boolean;     // for big result sets (analytics)
};

type FetchOrdersResult = {
  orders: ReturnType<typeof mapOrderRow>[];
  total: number | null;
};

function mapOrderRow(o: OrderRow, items: OrderItemRow[]) {
  const initialItems = (o.initial_items as Array<{ id: string; name: string; price: number; quantity: number }> | undefined) || [];
  const sourceItems = items.length > 0
    ? items
    : initialItems.map((item, index) => ({
        id: getPersistedOrderItemId(o.id, item.id, index),
        order_id: o.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        status: 'preparando',
        cancelled: false
      } as OrderItemRow));
  const storedIndividualStatus = (o.individual_items_status || {}) as Record<string, 'preparando' | 'entregando' | 'cobrando'>;
  const normalizedIndividualStatus: Record<string, 'preparando' | 'entregando' | 'cobrando'> = {};

  const mappedItems = sourceItems.map((i: OrderItemRow, itemIndex: number) => {
    const initialItem = initialItems[itemIndex] || initialItems.find((item) => item.name === i.name && Number(item.price) === Number(i.price));
    for (let quantityIndex = 0; quantityIndex < Number(i.quantity || 0); quantityIndex++) {
      const persistedKey = `${i.id}-${quantityIndex}`;
      const legacyKey = initialItem?.id ? `${initialItem.id}-${quantityIndex}` : undefined;
      normalizedIndividualStatus[persistedKey] =
        storedIndividualStatus[persistedKey] ||
        (legacyKey ? storedIndividualStatus[legacyKey] : undefined) ||
        toIndividualStatus(i.status);
    }
    return {
      id: i.id,
      name: i.name,
      price: parseFloat(String(i.price)),
      quantity: i.quantity,
      originalQuantity: i.original_quantity,
      status: toOrderStatus(i.status),
      cancelled: i.cancelled,
      cancelledAt: i.cancelled_at ? new Date(i.cancelled_at) : undefined,
      cancelledInStage: toCancelledStage(i.cancelled_in_stage),
      cancellationReason: i.cancellation_reason
    };
  });

  return {
    id: o.id,
    number: o.number,
    customerName: o.customer_name,
    items: mappedItems,
    total: parseFloat(String(o.total)),
    status: toOrderStatus(o.status),
    createdAt: new Date(o.created_at),
    serviceType: toServiceType(o.service_type),
    diners: o.diners,
    edited: o.edited,
    discountAmount: o.discount_amount ? parseFloat(String(o.discount_amount)) : undefined,
    discountReason: o.discount_reason,
    paymentMethod: toPaymentMethod(o.payment_method),
    individualItemsStatus: Object.keys(normalizedIndividualStatus).length > 0 ? normalizedIndividualStatus : undefined,
    initialItems: initialItems.length > 0 ? initialItems : undefined,
    editHistory: (o.edit_history as Array<{ timestamp: string; action: string; stage: string; itemName?: string; quantity?: number; details?: string; userId?: string }> | undefined)?.map((e) => ({
      ...e,
      action: toEditAction(e.action),
      stage: toIndividualStatus(e.stage),
      timestamp: new Date(e.timestamp)
    }))
  };
}

async function fetchItemsForOrders(orderIds: string[], paginate: boolean): Promise<OrderItemRow[]> {
  if (orderIds.length === 0) return [];
  const all: OrderItemRow[] = [];
  const PAGE = 1000;
  const ID_CHUNK = 200;
  for (let i = 0; i < orderIds.length; i += ID_CHUNK) {
    const idsChunk = orderIds.slice(i, i + ID_CHUNK);
    if (!paginate) {
      const { data, error } = await supabase
        .from('order_items')
        .select('*')
        .in('order_id', idsChunk)
        .order('created_at');
      if (error) { console.error('fetchItemsForOrders error:', error); continue; }
      all.push(...((data || []) as OrderItemRow[]));
      continue;
    }
    let from = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { data: page, error: pageErr } = await supabase
        .from('order_items')
        .select('*')
        .in('order_id', idsChunk)
        .order('created_at')
        .range(from, from + PAGE - 1);
      if (pageErr || !page || page.length === 0) break;
      all.push(...(page as OrderItemRow[]));
      if (page.length < PAGE) break;
      from += PAGE;
    }
  }
  return all;
}

async function queryOrders(businessId: string, opts: FetchOrdersOptions): Promise<FetchOrdersResult> {
  let q = supabase
    .from('orders')
    .select('*', opts.withCount ? { count: 'exact' } : undefined)
    .eq('business_id', businessId);
  if (opts.status && opts.status.length > 0) q = q.in('status', opts.status);
  if (opts.createdAfter) q = q.gte('created_at', opts.createdAfter);
  if (opts.createdBefore) q = q.lte('created_at', opts.createdBefore);
  q = q.order('created_at', { ascending: false });
  if (typeof opts.rangeFrom === 'number' && typeof opts.rangeTo === 'number') {
    q = q.range(opts.rangeFrom, opts.rangeTo);
  }
  const { data, error, count } = await q;
  if (error || !data?.length) {
    if (error) console.error('queryOrders error:', error);
    return { orders: [], total: opts.withCount ? (count ?? 0) : null };
  }
  const orderIds = (data as OrderRow[]).map((o) => o.id);
  const items = await fetchItemsForOrders(orderIds, !!opts.paginateItems);
  const byOrder = new Map<string, OrderItemRow[]>();
  for (const it of items) {
    const arr = byOrder.get(it.order_id) || [];
    arr.push(it);
    byOrder.set(it.order_id, arr);
  }
  const orders = (data as OrderRow[]).map((o) => mapOrderRow(o, byOrder.get(o.id) || []));
  return { orders, total: opts.withCount ? (count ?? orders.length) : null };
}

/**
 * Active orders: ONLY today (local timezone) with status in preparando/entregando/cobrando.
 * Capped at 50. No pagination. Items loaded in a single query.
 */
export async function fetchActiveOrders(businessId: string) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const { orders } = await queryOrders(businessId, {
    status: ['preparando', 'entregando', 'cobrando'],
    createdAfter: start.toISOString(),
    rangeFrom: 0,
    rangeTo: 49,
    paginateItems: false,
  });
  return orders;
}

/**
 * Historical/analytics orders. Paginated.
 */
export async function fetchAnalyticsOrders(
  businessId: string,
  params: { startDate?: Date; endDate?: Date; status?: string[]; page?: number; pageSize?: number } = {}
) {
  const pageSize = params.pageSize ?? 100;
  const page = params.page ?? 0;
  return queryOrders(businessId, {
    status: params.status,
    createdAfter: params.startDate?.toISOString(),
    createdBefore: params.endDate?.toISOString(),
    rangeFrom: page * pageSize,
    rangeTo: page * pageSize + pageSize - 1,
    withCount: true,
    paginateItems: true,
  });
}

/** @deprecated Use fetchActiveOrders for live view and fetchAnalyticsOrders for history. */
export async function fetchOrders(businessId: string) {
  const { orders } = await queryOrders(businessId, { paginateItems: true });
  return orders;
}

export async function saveOrders(businessId: string, orders: Array<{
  id: string;
  number: string;
  customerName: string;
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    originalQuantity?: number;
    status: string;
    cancelled?: boolean;
    cancelledAt?: Date;
    cancelledInStage?: string;
    cancellationReason?: string;
  }>;
  total: number;
  status: string;
  createdAt: Date;
  serviceType?: string;
  diners?: number;
  edited?: boolean;
  discountAmount?: number;
  discountReason?: string;
  paymentMethod?: string;
  individualItemsStatus?: Record<string, string>;
  initialItems?: Array<{ id: string; name: string; price: number; quantity: number }>;
  editHistory?: Array<{ timestamp: Date; action: string; stage: string; itemName?: string; quantity?: number; details?: string; userId?: string }>;
}>) {
  for (const order of orders) {
    const itemRows = order.items.map((item, index) => ({
      id: getPersistedOrderItemId(order.id, item.id, index),
      order_id: order.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      status: item.status || 'preparando',
      cancelled: item.cancelled ?? false,
      cancellation_reason: item.cancellationReason || null,
      original_quantity: item.originalQuantity ?? null,
      cancelled_at: item.cancelledAt?.toISOString() || null,
      cancelled_in_stage: item.cancelledInStage || null
    }));
    const itemIdByClientId = new Map(order.items.map((item, index) => [item.id, itemRows[index].id]));

    // Guard: never overwrite individual_items_status with empty/null if the DB already has data.
    let individualItemsStatusToSave: Record<string, string> | null =
      order.individualItemsStatus && Object.keys(order.individualItemsStatus).length > 0
        ? order.individualItemsStatus
        : null;

    if (!individualItemsStatusToSave) {
      const { data: existing } = await supabase
        .from('orders')
        .select('individual_items_status')
        .eq('id', order.id)
        .maybeSingle();
      const existingStatus = (existing as { individual_items_status?: Record<string, string> | null } | null)?.individual_items_status;
      if (existingStatus && Object.keys(existingStatus).length > 0) {
        individualItemsStatusToSave = existingStatus;
      }
    }

    if (individualItemsStatusToSave) {
      const normalizedStatus: Record<string, string> = {};
      for (const item of order.items) {
        const persistedItemId = itemIdByClientId.get(item.id) || item.id;
        for (let quantityIndex = 0; quantityIndex < item.quantity; quantityIndex++) {
          const persistedKey = `${persistedItemId}-${quantityIndex}`;
          const clientKey = `${item.id}-${quantityIndex}`;
          normalizedStatus[persistedKey] =
            individualItemsStatusToSave[persistedKey] ||
            individualItemsStatusToSave[clientKey] ||
            toIndividualStatus(item.status);
        }
      }
      individualItemsStatusToSave = normalizedStatus;
    }

    const orderRow = {
      id: order.id,
      number: order.number,
      customer_name: order.customerName,
      total: order.total,
      status: order.status,
      created_at: order.createdAt.toISOString(),
      business_id: businessId,
      service_type: order.serviceType || null,
      diners: order.diners ?? null,
      edited: order.edited ?? false,
      discount_amount: order.discountAmount ?? null,
      discount_reason: order.discountReason || null,
      payment_method: order.paymentMethod || null,
      individual_items_status: individualItemsStatusToSave,
      initial_items: order.initialItems || null,
      edit_history: order.editHistory?.map((e) => ({
        ...e,
        timestamp: e.timestamp instanceof Date ? e.timestamp.toISOString() : e.timestamp
      })) || null
    };
    const { error: orderError } = await supabase.from('orders').upsert(orderRow, { onConflict: 'id' });
    if (orderError) {
      console.error('Order upsert error:', JSON.stringify(orderError, null, 2));
      return false;
    }

    await supabase.from('order_items').delete().eq('order_id', order.id);
    if (itemRows.length > 0) {
      const { error: itemsError } = await supabase.from('order_items').insert(itemRows);
      if (itemsError) {
        console.error('Order items insert error:', JSON.stringify(itemsError, null, 2));
        return false;
      }
    }
  }
  return true;
}

export function generateOrderId() {
  return crypto.randomUUID?.() || `order-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function deleteOrderById(orderId: string) {
  await supabase.from('order_items').delete().eq('order_id', orderId);
  await supabase.from('order_edit_history').delete().eq('order_id', orderId);
  const { error } = await supabase.from('orders').delete().eq('id', orderId);
  if (error) console.error('deleteOrderById error:', error);
  return !error;
}

// deleteBusinessAccess - removed: now using business_members table directly

// Menu Items
export async function fetchMenuItems(businessId: string) {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('business_id', businessId)
    .order('name');
  if (error) return [];
  return (data || []).map((m: any) => ({
    id: m.id,
    name: m.name,
    price: parseFloat(m.price),
    category: m.category,
    description: m.description,
    hasSizes: m.has_sizes ?? false,
    sizes: m.sizes ? (typeof m.sizes === 'string' ? JSON.parse(m.sizes) : m.sizes) : undefined,
    color: m.color ?? undefined,
    colorStyle: (m.color_style as 'fill' | 'border' | undefined) ?? 'fill'
  }));
}

type MenuItemPayload = {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
  hasSizes?: boolean;
  sizes?: { id: string; name: string; price: number }[];
  color?: string;
  colorStyle?: 'fill' | 'border';
};

function toMenuItemRow(businessId: string, item: MenuItemPayload) {
  return {
    id: item.id,
    business_id: businessId,
    name: item.name,
    price: item.price,
    category: item.category,
    description: item.description || null,
    has_sizes: item.hasSizes ?? false,
    sizes: item.sizes ? JSON.stringify(item.sizes) : null,
    color: item.color || null,
    color_style: item.colorStyle || 'fill',
  };
}

export async function insertMenuItem(businessId: string, item: MenuItemPayload) {
  const { error } = await supabase.from('menu_items').insert(toMenuItemRow(businessId, item));
  if (error) console.error('insertMenuItem error:', error);
  return !error;
}

export async function updateMenuItem(businessId: string, item: MenuItemPayload) {
  const { id, ...row } = toMenuItemRow(businessId, item);
  const { error } = await supabase
    .from('menu_items')
    .update(row)
    .eq('id', id)
    .eq('business_id', businessId);
  if (error) console.error('updateMenuItem error:', error);
  return !error;
}

export async function deleteMenuItem(businessId: string, id: string) {
  const { error } = await supabase
    .from('menu_items')
    .delete()
    .eq('id', id)
    .eq('business_id', businessId);
  if (error) console.error('deleteMenuItem error:', error);
  return !error;
}

// Categories
export async function fetchCategories(businessId: string) {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('business_id', businessId)
    .order('name');
  if (error) return [];
  return (data || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    productCount: 0,
  }));
}

export async function insertCategory(businessId: string, category: { id: string; name: string }) {
  const { error } = await supabase.from('categories').insert({
    id: category.id,
    business_id: businessId,
    name: category.name,
  });
  if (error) console.error('insertCategory error:', error);
  return !error;
}

export async function renameCategoryWithCascade(
  businessId: string,
  categoryId: string,
  oldName: string,
  newName: string
) {
  const { error: catErr } = await supabase
    .from('categories')
    .update({ name: newName })
    .eq('id', categoryId)
    .eq('business_id', businessId);
  if (catErr) {
    console.error('renameCategory error:', catErr);
    return false;
  }
  const { error: itemsErr } = await supabase
    .from('menu_items')
    .update({ category: newName })
    .eq('business_id', businessId)
    .eq('category', oldName);
  if (itemsErr) console.error('renameCategory cascade error:', itemsErr);
  return !itemsErr;
}

export async function deleteCategory(businessId: string, id: string) {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)
    .eq('business_id', businessId);
  if (error) console.error('deleteCategory error:', error);
  return !error;
}
