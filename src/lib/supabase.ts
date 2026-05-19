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

export async function updateBusinessDb(id: string, updates: { name?: string; description?: string; enable_entregando_stage?: boolean }) {
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

export async function fetchOrders(businessId: string) {
  const { data: ordersData, error: ordersError } = await supabase
    .from('orders')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });
  if (ordersError || !ordersData?.length) return [];

  const orders = [];
  for (const o of ordersData as OrderRow[]) {
    const { data: itemsData } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', o.id)
      .order('created_at');
    const items = (itemsData || []).map((i: OrderItemRow) => ({
      id: i.id,
      name: i.name,
      price: parseFloat(String(i.price)),
      quantity: i.quantity,
      originalQuantity: i.original_quantity,
      status: i.status,
      cancelled: i.cancelled,
      cancelledAt: i.cancelled_at ? new Date(i.cancelled_at) : undefined,
      cancelledInStage: i.cancelled_in_stage,
      cancellationReason: i.cancellation_reason
    }));
    orders.push({
      id: o.id,
      number: o.number,
      customerName: o.customer_name,
      items,
      total: parseFloat(String(o.total)),
      status: o.status,
      createdAt: new Date(o.created_at),
      serviceType: o.service_type,
      diners: o.diners,
      edited: o.edited,
      discountAmount: o.discount_amount ? parseFloat(String(o.discount_amount)) : undefined,
      discountReason: o.discount_reason,
      paymentMethod: o.payment_method,
      individualItemsStatus: o.individual_items_status as Record<string, string> | undefined,
      initialItems: o.initial_items as Array<{ id: string; name: string; price: number; quantity: number }> | undefined,
      editHistory: (o.edit_history as Array<{ timestamp: string; action: string; stage: string; itemName?: string; quantity?: number; details?: string; userId?: string }> | undefined)?.map((e) => ({
        ...e,
        timestamp: new Date(e.timestamp)
      }))
    });
  }
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
      individual_items_status: order.individualItemsStatus || null,
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
    if (order.items.length > 0) {
      const itemRows = order.items.map((item, idx) => ({
        id: `${order.id}-item-${idx}`,
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
