import { supabase } from '@/integrations/supabase/client';
import type { BusinessRole } from '@/contexts/BusinessContext';

export type InviteStatus = 'already_member' | 'access_granted' | 'invitation_sent' | 'error';
export interface InviteResult {
  status: InviteStatus;
  message?: string;
}

const APP_TO_DB: Record<BusinessRole, 'admin' | 'manager' | 'staff'> = {
  owner: 'admin',
  manager: 'manager',
  staff: 'staff',
};

export async function inviteUserToBusiness(
  email: string,
  role: BusinessRole,
  businessId: string,
  businessName: string
): Promise<InviteResult> {
  const dbRole = APP_TO_DB[role];

  // Look up existing user
  const { data: lookup, error: lookupErr } = await supabase.functions.invoke('lookup-user-by-email', {
    body: { email },
  });
  if (lookupErr) {
    return { status: 'error', message: lookupErr.message };
  }

  const userId: string | null = lookup?.userId ?? null;

  if (userId) {
    // Existing user — grant access via notify edge function
    const { data, error } = await supabase.functions.invoke('notify-existing-user', {
      body: { email, businessId, businessName, role: dbRole },
    });
    if (error) return { status: 'error', message: error.message };
    return { status: data?.status ?? 'access_granted' };
  }

  // New user — send invite
  const { data, error } = await supabase.functions.invoke('invite-new-user', {
    body: { email, businessId, businessName, role: dbRole },
  });
  if (error) return { status: 'error', message: error.message };
  return { status: data?.status ?? 'invitation_sent' };
}
