import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contactId } = await params;
    const body = await req.json();
    const { bot_enabled } = body;

    const { data: updatedContact, error } = await supabaseAdmin
      .from('contacts')
      .update({ bot_enabled: Boolean(bot_enabled) })
      .eq('id', contactId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to update bot state' }, { status: 500 });
    }

    return NextResponse.json({ success: true, contact: updatedContact }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}
