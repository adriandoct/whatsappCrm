import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contactId } = await params;
    const body = await req.json();
    const { content } = body;

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // 1. Fetch contact
    const { data: contact, error: contactErr } = await supabaseAdmin
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .single();

    if (contactErr || !contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // 2. Send via WhatsApp API
    const sendResult = await sendWhatsAppMessage(contact.phone, content);

    // 3. Save message in Supabase
    const { data: savedMsg, error: saveErr } = await supabaseAdmin
      .from('messages')
      .insert({
        contact_id: contactId,
        role: 'assistant',
        content,
        whatsapp_message_id: sendResult.wamid || null,
        status: sendResult.success ? 'sent' : 'failed',
      })
      .select()
      .single();

    if (saveErr) {
      return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: savedMsg }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}
