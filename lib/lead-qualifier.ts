import { supabaseAdmin } from './supabase';
import { sendHotLeadAlert } from './resend';

export interface LeadQualificationResult {
  score: 'hot' | 'warm' | 'cold';
  reason: string;
}

/**
 * Evaluates conversation history after 3+ user messages and qualifies the lead.
 */
export async function evaluateAndQualifyLead(contactId: string): Promise<LeadQualificationResult | null> {
  try {
    // 1. Fetch contact details
    const { data: contact, error: contactError } = await supabaseAdmin
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .single();

    if (contactError || !contact) {
      console.error('Contact not found for lead evaluation:', contactId);
      return null;
    }

    // 2. Fetch all messages for contact
    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: true });

    if (messagesError || !messages) {
      return null;
    }

    // Count user messages
    const userMessages = messages.filter((m) => m.role === 'user');
    if (userMessages.length < 3) {
      // Not enough user messages yet for qualification
      return null;
    }

    // 3. Format conversation transcript for evaluation
    const transcript = messages
      .map((m) => `${m.role === 'user' ? 'Cliente' : 'Berta'}: ${m.content}`)
      .join('\n');

    // 4. Call OpenRouter DeepSeek for qualification
    const evaluation = await callDeepSeekForLeadQualification(transcript);

    // 5. Upsert into Supabase `leads` table
    const { data: existingLead } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('contact_id', contactId)
      .maybeSingle();

    let leadRecord;

    if (existingLead) {
      const { data: updated } = await supabaseAdmin
        .from('leads')
        .update({
          score: evaluation.score,
          reason: evaluation.reason,
          qualified_at: new Date().toISOString(),
        })
        .eq('id', existingLead.id)
        .select()
        .single();
      leadRecord = updated;
    } else {
      const { data: inserted } = await supabaseAdmin
        .from('leads')
        .insert({
          contact_id: contactId,
          score: evaluation.score,
          reason: evaluation.reason,
          qualified_at: new Date().toISOString(),
          notified: false,
        })
        .select()
        .single();
      leadRecord = inserted;
    }

    // 6. If HOT lead and not yet notified, send instant email alert via Resend
    if (evaluation.score === 'hot' && leadRecord && !leadRecord.notified) {
      const emailSent = await sendHotLeadAlert(
        {
          id: contact.id,
          phone: contact.phone,
          name: contact.name,
          ad_source: contact.ad_source,
        },
        evaluation
      );

      if (emailSent) {
        await supabaseAdmin
          .from('leads')
          .update({ notified: true })
          .eq('id', leadRecord.id);
      }
    }

    return evaluation;
  } catch (error) {
    console.error('Error in evaluateAndQualifyLead:', error);
    return null;
  }
}

/**
 * Sends prompt to DeepSeek via OpenRouter to evaluate conversation into JSON { score, reason }.
 */
async function callDeepSeekForLeadQualification(transcript: string): Promise<LeadQualificationResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return heuristicQualification(transcript);
  }

  const prompt = `Sos un sistema experto de análisis de CRM comercial. Tu tarea es analizar la siguiente conversación de WhatsApp entre un Cliente y la asesora Berta, y clasificar la temperatura del lead.

REGLAS DE CLASIFICACIÓN:
- HOT: Interés real en contratar, preguntó por precios, modalidad de trabajo o aceptó/pidió agendar una reunión o llamada.
- WARM: Muestra interés o necesidad, pero aún realiza preguntas generales y no llegó a coordinar llamada ni preguntar concretamente por contratación.
- COLD: Sin interés claro, spam, buscando empleo, simple curiosidad o mostró molestia/rechazo.

TRANSCRIPCIÓN DE LA CONVERSACIÓN:
${transcript}

INSTRUCCIONES DE RESPUESTA:
Respondé ÚNICAMENTE con un objeto JSON válido con la siguiente estructura (sin formato markdown ni texto adicional):
{
  "score": "hot" | "warm" | "cold",
  "reason": "Explicación breve de 1 o 2 oraciones justificando la clasificación en español"
}`;

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat-v3-0324',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      return heuristicQualification(transcript);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || '';
    const cleanJson = content.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    const validScore = ['hot', 'warm', 'cold'].includes(parsed.score?.toLowerCase())
      ? (parsed.score.toLowerCase() as 'hot' | 'warm' | 'cold')
      : 'warm';

    return {
      score: validScore,
      reason: parsed.reason || 'Lead evaluado automáticamente según interacción conversacional.',
    };
  } catch (err) {
    console.error('Failed to parse lead qualification from DeepSeek:', err);
    return heuristicQualification(transcript);
  }
}

/**
 * Fallback rule-based heuristic qualification if API is missing or fails.
 */
function heuristicQualification(transcript: string): LeadQualificationResult {
  const lower = transcript.toLowerCase();

  if (
    lower.includes('calendly') ||
    lower.includes('reunión') ||
    lower.includes('reunion') ||
    lower.includes('llamada') ||
    lower.includes('precio') ||
    lower.includes('cuanto cuesta') ||
    lower.includes('contratar')
  ) {
    return {
      score: 'hot',
      reason: 'El cliente preguntó por precios, llamada o mostró intención clara de reunión.',
    };
  }

  if (lower.includes('interesa') || lower.includes('servicio') || lower.includes('servicio') || lower.includes('info')) {
    return {
      score: 'warm',
      reason: 'El cliente solicita información sobre servicios pero no agendó reunión.',
    };
  }

  return {
    score: 'cold',
    reason: 'Interacción inicial o consultas generales sin intención evidente de compra.',
  };
}
