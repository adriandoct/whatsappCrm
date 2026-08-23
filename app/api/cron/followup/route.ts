import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateBertaResponse } from '@/lib/openrouter';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

export async function GET(req: NextRequest) {
  return handleCronFollowup(req);
}

export async function POST(req: NextRequest) {
  return handleCronFollowup(req);
}

async function handleCronFollowup(req: NextRequest) {
  try {
    // 1. Verify cron secret if present
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get('authorization');
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check current time in Argentina (America/Argentina/Buenos_Aires)
    const argentinaTimeStr = new Date().toLocaleString('en-US', {
      timeZone: 'America/Argentina/Buenos_Aires',
      hour12: false,
      hour: 'numeric',
    });
    const argentinaHour = parseInt(argentinaTimeStr, 10);

    // Only allow execution between 10:00 and 20:00 ART
    if (isNaN(argentinaHour) || argentinaHour < 10 || argentinaHour >= 20) {
      console.log(`Follow-up cron skipped: Current Argentina hour is ${argentinaHour} (Allowed: 10:00 to 20:00 ART)`);
      return NextResponse.json({
        status: 'skipped',
        reason: 'Outside Argentina allowed time window (10:00 - 20:00 ART)',
        currentArgentinaHour: argentinaHour,
      }, { status: 200 });
    }

    // 3. Define time range bounds:
    // - Must be at least 5 hours ago
    // - Must be within 23 hours (Meta 24h messaging policy compliance)
    const now = Date.now();
    const fiveHoursAgo = new Date(now - 5 * 60 * 60 * 1000).toISOString();
    const twentyThreeHoursAgo = new Date(now - 23 * 60 * 60 * 1000).toISOString();

    // Fetch active non-blocked contacts with bot enabled
    const { data: contacts, error: contactsErr } = await supabaseAdmin
      .from('contacts')
      .select('id, phone, name')
      .eq('blocked', false)
      .eq('bot_enabled', true);

    if (contactsErr || !contacts) {
      return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
    }

    let followupsSent = 0;

    for (const contact of contacts) {
      // Get latest message for contact
      const { data: latestMsgs } = await supabaseAdmin
        .from('messages')
        .select('*')
        .eq('contact_id', contact.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!latestMsgs || latestMsgs.length === 0) continue;

      const lastMsg = latestMsgs[0];

      // Condition: Last message was sent by assistant (Berta), between 5h and 23h ago
      if (
        lastMsg.role === 'assistant' &&
        lastMsg.created_at <= fiveHoursAgo &&
        lastMsg.created_at >= twentyThreeHoursAgo
      ) {
        // Fetch last 10 messages for context
        const { data: history } = await supabaseAdmin
          .from('messages')
          .select('role, content')
          .eq('contact_id', contact.id)
          .order('created_at', { ascending: true })
          .limit(10);

        const formattedHistory = (history || []).map(h => ({
          role: h.role as 'user' | 'assistant',
          content: h.content,
        }));

        // Prompt Berta for follow-up message
        const followUpSystemPrompt = `Sos Berta. Estás haciendo un seguimiento amable a un contacto que no respondió tu último mensaje hace unas horas.

REGLAS DE FOLLOW-UP:
- Escribí en español argentino (voseo: vos, querés, avisame, etc.).
- Mensaje muy corto (< 20 palabras), 1 solo emoji, sin markdown.
- No seas pesado ni insistente. Simplemente preguntá si pudo ver el mensaje o si le quedó alguna duda.`;

        const followupMsg = await generateBertaResponse(
          formattedHistory,
          followUpSystemPrompt
        );

        // Send via WhatsApp API
        const sendResult = await sendWhatsAppMessage(contact.phone, followupMsg);

        // Record follow-up message in DB
        await supabaseAdmin.from('messages').insert({
          contact_id: contact.id,
          role: 'assistant',
          content: followupMsg,
          whatsapp_message_id: sendResult.wamid || null,
          status: sendResult.success ? 'sent' : 'failed',
        });

        followupsSent++;
      }
    }

    return NextResponse.json({
      status: 'success',
      followupsSent,
      argentinaHour,
    }, { status: 200 });
  } catch (err: any) {
    console.error('Follow-up cron error:', err);
    return NextResponse.json({ error: err?.message || 'Cron error' }, { status: 500 });
  }
}
