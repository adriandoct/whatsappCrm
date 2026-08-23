import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendWhatsAppMessage, markWhatsAppMessageAsRead } from '@/lib/whatsapp';
import { generateBertaResponse } from '@/lib/openrouter';
import { evaluateAndQualifyLead } from '@/lib/lead-qualifier';

/**
 * Meta Webhook Verification (GET)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'mi-token-secreto-2024';

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('WhatsApp Webhook verified successfully!');
    return new Response(challenge, { status: 200 });
  }

  console.warn('WhatsApp Webhook verification failed. Token mismatch or invalid mode.');
  return new Response('Forbidden', { status: 403 });
}

/**
 * Meta Webhook Payload Processing (POST)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Check if this is a WhatsApp status update or incoming message
    const entry = body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    if (!value) {
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }

    // 1. Process Message Status Confirmations (sent -> delivered -> read -> failed)
    if (value.statuses && Array.isArray(value.statuses)) {
      for (const statusObj of value.statuses) {
        const wamid = statusObj.id;
        const status = statusObj.status; // 'sent' | 'delivered' | 'read' | 'failed'

        if (wamid && status) {
          await supabaseAdmin
            .from('messages')
            .update({ status })
            .eq('whatsapp_message_id', wamid);
        }
      }
      return NextResponse.json({ status: 'statuses_processed' }, { status: 200 });
    }

    // 2. Process Incoming Messages
    if (value.messages && Array.isArray(value.messages) && value.messages.length > 0) {
      const msg = value.messages[0];
      const fromPhone = msg.from; // e.g. "5491112345678"
      const wamid = msg.id;
      const profileName = value.contacts?.[0]?.profile?.name || null;
      const userText = msg.text?.body || msg.caption || '[Mensaje multimedia]';

      // Extract referral / ad data if user clicked a Click-to-WhatsApp ad
      const referral = msg.referral;
      const adSource = referral?.source_url || referral?.source_id || null;
      const ctwaClid = referral?.ctwa_clid || null;

      // Upsert contact in Supabase
      const { data: existingContact } = await supabaseAdmin
        .from('contacts')
        .select('*')
        .eq('phone', fromPhone)
        .maybeSingle();

      let contactId: string;
      let isBlocked = false;
      let isBotEnabled = true;

      if (existingContact) {
        contactId = existingContact.id;
        isBlocked = existingContact.blocked;
        isBotEnabled = existingContact.bot_enabled ?? true;

        // Update name or ad_source if missing
        if (!existingContact.name && profileName) {
          await supabaseAdmin
            .from('contacts')
            .update({ name: profileName })
            .eq('id', contactId);
        }
      } else {
        const { data: newContact, error: createContactErr } = await supabaseAdmin
          .from('contacts')
          .insert({
            phone: fromPhone,
            name: profileName,
            ad_source: adSource,
            ctwa_clid: ctwaClid,
            blocked: false,
            bot_enabled: true,
          })
          .select()
          .single();

        if (createContactErr || !newContact) {
          console.error('Failed to create contact:', createContactErr);
          return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }
        contactId = newContact.id;
      }

      // Save incoming user message in DB
      await supabaseAdmin.from('messages').insert({
        contact_id: contactId,
        role: 'user',
        content: userText,
        whatsapp_message_id: wamid,
        status: 'delivered',
      });

      // Mark message as read on Meta
      if (wamid) {
        await markWhatsAppMessageAsRead(wamid);
      }

      // If contact is blocked or bot is toggled OFF for this conversation, don't generate AI reply
      if (isBlocked || !isBotEnabled) {
        console.log(`Bot skipped for contact ${fromPhone} (Blocked: ${isBlocked}, BotEnabled: ${isBotEnabled})`);
        return NextResponse.json({ status: 'bot_disabled_or_blocked' }, { status: 200 });
      }

      // Fetch last 20 messages for Berta context
      const { data: historyMessages } = await supabaseAdmin
        .from('messages')
        .select('role, content')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: true })
        .limit(20);

      const conversationHistory = (historyMessages || []).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      // Fetch custom Berta system prompt & Calendly link from settings table
      const { data: settingsData } = await supabaseAdmin
        .from('settings')
        .select('key, value');

      const settingsMap = new Map((settingsData || []).map(s => [s.key, s.value]));
      const systemPrompt = settingsMap.get('system_prompt');
      const calendlyLink = settingsMap.get('calendly_link');

      // Generate response from Berta (DeepSeek)
      const bertaReply = await generateBertaResponse(
        conversationHistory,
        systemPrompt,
        calendlyLink
      );

      // Send response via Meta WhatsApp API
      const sendResult = await sendWhatsAppMessage(fromPhone, bertaReply);

      // Save assistant reply to Supabase
      await supabaseAdmin.from('messages').insert({
        contact_id: contactId,
        role: 'assistant',
        content: bertaReply,
        whatsapp_message_id: sendResult.wamid || null,
        status: sendResult.success ? 'sent' : 'failed',
      });

      // Asynchronously trigger Lead Qualification check
      evaluateAndQualifyLead(contactId).catch(err => {
        console.error('Lead evaluation error in background:', err);
      });

      return NextResponse.json({ status: 'message_processed' }, { status: 200 });
    }

    return NextResponse.json({ status: 'ignored' }, { status: 200 });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
