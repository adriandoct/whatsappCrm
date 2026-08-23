import { NextRequest, NextResponse } from 'next/server';
import { generateBertaResponse } from '@/lib/openrouter';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { history, system_prompt, calendly_link } = body;

    if (!Array.isArray(history)) {
      return NextResponse.json({ error: 'History must be an array' }, { status: 400 });
    }

    // Generate Berta response
    const reply = await generateBertaResponse(
      history,
      system_prompt,
      calendly_link
    );

    // Calculate lead qualification preview if >= 3 user messages
    const userMessages = history.filter(m => m.role === 'user');
    let leadEvaluation = null;

    if (userMessages.length >= 3) {
      const fullTranscript = [...history, { role: 'assistant', content: reply }]
        .map(m => `${m.role === 'user' ? 'Cliente' : 'Berta'}: ${m.content}`)
        .join('\n');

      const lower = fullTranscript.toLowerCase();
      if (lower.includes('calendly') || lower.includes('reunión') || lower.includes('reunion') || lower.includes('llamada') || lower.includes('precio') || lower.includes('contratar')) {
        leadEvaluation = { score: 'hot', reason: 'Interés real detectado (preguntó por reunión, llamada o precio)' };
      } else if (lower.includes('interesa') || lower.includes('servicio') || lower.includes('info')) {
        leadEvaluation = { score: 'warm', reason: 'Interés moderado en servicios pero sin agendar aún' };
      } else {
        leadEvaluation = { score: 'cold', reason: 'Consultas generales o sin interés explícito' };
      }
    }

    return NextResponse.json({
      reply,
      leadEvaluation,
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}
