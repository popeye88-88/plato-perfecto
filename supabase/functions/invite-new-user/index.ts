import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ROLE_LABELS: Record<string, string> = {
  admin: 'Propietario',
  manager: 'Manager',
  staff: 'Staff',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }
    const callerId = claimsData.claims.sub as string;

    const { email, businessId, businessName, role } = await req.json();
    if (!email || !businessId || !role) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400, headers: corsHeaders });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Authorize: caller must be admin or manager of this business
    const { data: callerMembership } = await admin
      .from('business_members')
      .select('role')
      .eq('business_id', businessId)
      .eq('user_id', callerId)
      .maybeSingle();
    if (!callerMembership || !['admin', 'manager'].includes(callerMembership.role)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders });
    }
    if (callerMembership.role === 'manager' && role !== 'staff') {
      return new Response(JSON.stringify({ error: 'Managers can only invite staff' }), { status: 403, headers: corsHeaders });
    }

    // Create pending invitation row (upsert by email+business)
    await admin
      .from('pending_invitations')
      .upsert(
        { email, business_id: businessId, role, invited_by: callerId, accepted_at: null },
        { onConflict: 'email,business_id' }
      );

    // Send invite email via Supabase Auth (creates user if not exists)
    const redirectTo = req.headers.get('origin') || supabaseUrl;
    const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: {
        business_name: businessName,
        role_label: ROLE_LABELS[role] ?? role,
      },
    });

    if (inviteErr) {
      // If user already exists, that's fine — fall through
      const msg = inviteErr.message?.toLowerCase() ?? '';
      if (!msg.includes('already') && !msg.includes('registered')) {
        return new Response(JSON.stringify({ error: inviteErr.message }), { status: 400, headers: corsHeaders });
      }
    }

    return new Response(JSON.stringify({ status: 'invitation_sent' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: corsHeaders });
  }
});
