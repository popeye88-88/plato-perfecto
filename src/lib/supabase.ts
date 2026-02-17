import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = () =>
  !!SUPABASE_URL && !!SUPABASE_KEY && SUPABASE_URL !== 'https://your-project.supabase.co';

// Businesses
export async function fetchBusinesses() {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase.from('businesses').select('*').order('created_at', { ascending: true });
  if (error) return [];
  return (data || []).map((b: any) => ({
    id: b.id,
    name: b.name,
    description: b.description,
    createdAt: new Date(b.created_at),
    menuItems: []
  }));
}

export async function insertBusiness(business: { id: string; name: string; description?: string }) {
  if (!isSupabaseConfigured()) return null;
  const { error } = await supabase.from('businesses').insert({
    id: business.id,
    name: business.name,
    description: business.description || null
  });
  return error ? null : business;
}

export async function updateBusinessDb(id: string, updates: { name?: string; description?: string }) {
  if (!isSupabaseConfigured()) return false;
  const { error } = await supabase.from('businesses').update(updates).eq('id', id);
  return !error;
}

export async function deleteBusinessDb(id: string) {
  if (!isSupabaseConfigured()) return false;
  const { error } = await supabase.from('businesses').delete().eq('id', id);
  return !error;
}

// Business User Access
export async function fetchBusinessAccess() {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase.from('business_user_access').select('*');
  if (error) return [];
  return (data || []).map((a: any) => ({
    businessId: a.business_id,
    userId: a.user_id,
    role: a.role as 'owner' | 'staff'
  }));
}

export async function upsertBusinessAccess(businessId: string, userId: string, role: 'owner' | 'staff') {
  if (!isSupabaseConfigured()) return false;
  const { error } = await supabase.from('business_user_access').upsert(
    { business_id: businessId, user_id: userId, role },
    { onConflict: 'business_id,user_id' }
  );
  return !error;
}

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
  if (!isSupabaseConfigured()) return [];
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
  if (!isSupabaseConfigured()) return false;
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
    if (orderError) return false;

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
      if (itemsError) return false;
    }
  }
  return true;
}

export function generateOrderId() {
  return crypto.randomUUID?.() || `order-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function deleteBusinessAccess(businessId: string) {
  if (!isSupabaseConfigured()) return false;
  const { error } = await supabase.from('business_user_access').delete().eq('business_id', businessId);
  return !error;
}

// Menu Items
export async function fetchMenuItems(businessId: string) {
  if (!isSupabaseConfigured()) return [];
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
    description: m.description
  }));
}

export async function upsertMenuItems(businessId: string, items: Array<{ id: string; name: string; price: number; category: string; description?: string }>) {
  if (!isSupabaseConfigured()) return false;
  await supabase.from('menu_items').delete().eq('business_id', businessId);
  if (items.length === 0) return true;
  const rows = items.map((item) => ({
    id: item.id,
    business_id: businessId,
    name: item.name,
    price: item.price,
    category: item.category,
    description: item.description || null
  }));
  const { error } = await supabase.from('menu_items').insert(rows);
  return !error;
}

// Categories
export async function fetchCategories(businessId: string) {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('business_id', businessId)
    .order('name');
  if (error) return [];
  return (data || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    productCount: 0
  }));
}

export async function upsertCategories(businessId: string, categories: Array<{ id: string; name: string }>) {
  if (!isSupabaseConfigured()) return false;
  await supabase.from('categories').delete().eq('business_id', businessId);
  if (categories.length === 0) return true;
  const rows = categories.map((c) => ({
    id: c.id,
    business_id: businessId,
    name: c.name
  }));
  const { error } = await supabase.from('categories').insert(rows);
  return !error;
}
