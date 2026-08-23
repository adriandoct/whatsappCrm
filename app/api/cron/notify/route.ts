import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendDailyDigestEmail } from '@/lib/resend';

export async function GET(req: NextRequest) {
  return handleCronNotify(req);
}

export async function POST(req: NextRequest) {
  return handleCronNotify(req);
}

async function handleCronNotify(req: NextRequest) {
  try {
    // Validate secret if configured
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get('authorization');
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.warn('Unauthorized cron invocation on /api/cron/notify');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get today's start ISO string
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const { data: leads, error } = await supabaseAdmin
      .from('leads')
      .select('score, reason, qualified_at, contact:contacts(id, phone, name, ad_source)')
      .gte('qualified_at', startOfDay.toISOString());

    if (error) {
      console.error('Error fetching today leads for daily digest:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formattedLeads = (leads || []).map((l: any) => ({
      score: l.score,
      reason: l.reason,
      qualified_at: l.qualified_at,
      contact: {
        id: l.contact?.id || '',
        phone: l.contact?.phone || 'Desconocido',
        name: l.contact?.name || null,
        ad_source: l.contact?.ad_source || null,
      },
    }));

    const emailSuccess = await sendDailyDigestEmail(formattedLeads);

    return NextResponse.json({
      success: emailSuccess,
      leadsCount: formattedLeads.length,
    }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Cron execution failed' }, { status: 500 });
  }
}
