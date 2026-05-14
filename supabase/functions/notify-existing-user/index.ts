import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

    // Authorize caller
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
      return new Response(JSON.stringify({ error: 'Managers can only assign staff' }), { status: 403, headers: corsHeaders });
    }

    // Find the existing user
    const { data: targetUserId, error: lookupErr } = await admin.rpc('find_user_id_by_email', { _email: email });
    if (lookupErr || !targetUserId) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404, headers: corsHeaders });
    }

    // Check if already a member
    const { data: existing } = await admin
      .from('business_members')
      .select('id')
      .eq('business_id', businessId)
      .eq('user_id', targetUserId)
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ status: 'already_member' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // MANDATORY: grant access
    const { error: insErr } = await admin.from('business_members').insert({
      business_id: businessId,
      user_id: targetUserId,
      role,
    });
    if (insErr) {
      return new Response(JSON.stringify({ error: insErr.message }), { status: 500, headers: corsHeaders });
    }

    // OPTIONAL: send notification email if RESEND_API_KEY exists
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (resendKey) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'RestauranteOS <onboarding@resend.dev>',
            to: [email],
            subject: `Tienes acceso a ${businessName}`,
            html: `<p>Has recibido acceso al negocio <strong>${businessName}</strong> con el rol de <strong>${role}</strong>.</p>`,
          }),
        });
      } catch (_e) {
        // ignore email failures, access already granted
      }
    }

    return new Response(JSON.stringify({ status: 'access_granted' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: corsHeaders });
  }
});
