import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { DEFAULT_BERTA_PROMPT } from '@/lib/openrouter';

export async function GET() {
  try {
    const { data: settingsList, error } = await supabaseAdmin
      .from('settings')
      .select('*');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const settingsMap: Record<string, string> = {};
    (settingsList || []).forEach(item => {
      settingsMap[item.key] = item.value;
    });

    if (!settingsMap.system_prompt) {
      settingsMap.system_prompt = DEFAULT_BERTA_PROMPT;
    }
    if (!settingsMap.calendly_link) {
      settingsMap.calendly_link = 'https://calendly.com/nuestra-agencia/reunion-30min';
    }

    return NextResponse.json({ settings: settingsMap }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { system_prompt, calendly_link } = body;

    const updates = [];

    if (system_prompt !== undefined) {
      updates.push(
        supabaseAdmin.from('settings').upsert({ key: 'system_prompt', value: system_prompt })
      );
    }
    if (calendly_link !== undefined) {
      updates.push(
        supabaseAdmin.from('settings').upsert({ key: 'calendly_link', value: calendly_link })
      );
    }

    await Promise.all(updates);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
