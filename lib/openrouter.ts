export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export const DEFAULT_BERTA_PROMPT = `Sos Berta, una asesora comercial experta y cercana de nuestra agencia. Tu objetivo es calificar al lead y agendar una llamada si hay interés real.

REGLAS IRROMPIBLES DEL AGENTE:
1. Responder SIEMPRE en español argentino con voseo (usá vos, querés, tenés, podés, contame, avisame, etc.). NUNCA uses español neutro o de otro país.
2. Tu primera respuesta debe ser genérica: preguntale al cliente qué quiere lograr o qué proyecto tiene en mente. NUNCA listes servicios de entrada.
3. Tus mensajes deben ser muy cortos (MENOS DE 30 PALABRAS), en un solo párrafo continuo. Usá como máximo 2 emojis por mensaje. Sin markdown (sin negritas, sin listas, sin asteriscos).
4. NUNCA inventes precios de servicios ni datos falsos. Si te preguntan por precios concretos, explicá que depende de la necesidad de cada proyecto y que en una breve llamada lo pueden definir.
5. Si el usuario expresa molestia, enojo o frustración: pedí disculpas amablemente y decile que un miembro humano del equipo se va a comunicar a la brevedad.
6. Solo enviá el link de Calendly cuando detectes un interés REAL en coordinar una reunión.
7. NUNCA pidas correo electrónico ni email (ya estamos conversando por WhatsApp).`;

/**
 * Generates an AI response from Berta using DeepSeek via OpenRouter API.
 */
export async function generateBertaResponse(
  conversationHistory: { role: 'user' | 'assistant'; content: string }[],
  customSystemPrompt?: string,
  calendlyLink?: string
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  let basePrompt = customSystemPrompt || DEFAULT_BERTA_PROMPT;
  if (calendlyLink) {
    basePrompt += `\n\nEl enlace de Calendly para agendar cuando haya interés real es: ${calendlyLink}`;
  }

  const messages: OpenRouterMessage[] = [
    { role: 'system', content: basePrompt },
    ...conversationHistory.map((msg) => ({
      role: msg.role,
      content: msg.content,
    })),
  ];

  if (!apiKey) {
    console.warn('OPENROUTER_API_KEY is missing. Using fallback rule-based response.');
    return getFallbackResponse(conversationHistory);
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://whatsapp-crm-berta.vercel.app',
        'X-Title': 'WhatsApp CRM Berta',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat-v3-0324',
        messages,
        temperature: 0.5,
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', response.status, errorText);
      // Fallback model retry if model specific ID fails
      return await tryFallbackModel(messages, apiKey) || getFallbackResponse(conversationHistory);
    }

    const data = await response.json();
    let reply = data?.choices?.[0]?.message?.content || '';

    // Post-process response to ensure strict agent format constraints
    reply = cleanAndFormatResponse(reply);

    return reply || getFallbackResponse(conversationHistory);
  } catch (error) {
    console.error('Error generating Berta response via OpenRouter:', error);
    return getFallbackResponse(conversationHistory);
  }
}

/**
 * Fallback to standard deepseek model if deepseek-chat-v3-0324 is not available on OpenRouter
 */
async function tryFallbackModel(messages: OpenRouterMessage[], apiKey: string): Promise<string | null> {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat',
        messages,
        temperature: 0.5,
        max_tokens: 150,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      return cleanAndFormatResponse(data?.choices?.[0]?.message?.content || '');
    }
  } catch (e) {
    console.error('Fallback model failed:', e);
  }
  return null;
}

/**
 * Ensures strict compliance with formatting: single line, no markdown, word count limits.
 */
function cleanAndFormatResponse(text: string): string {
  let cleaned = text
    .replace(/\*+/g, '') // remove markdown bold/italics
    .replace(/#/g, '')   // remove headers
    .replace(/`/g, '')   // remove code blocks
    .replace(/\n+/g, ' ') // convert multiple lines to single paragraph
    .trim();

  // Enforce max 30 words rule soft truncation if AI over-explains
  const words = cleaned.split(/\s+/);
  if (words.length > 35) {
    cleaned = words.slice(0, 32).join(' ') + '... ¿Te gustaría que lo conversemos por llamada?';
  }

  return cleaned;
}

/**
 * Basic fallback response generator if OpenRouter API is unavailable or unconfigured.
 */
function getFallbackResponse(history: { role: 'user' | 'assistant'; content: string }[]): string {
  const userMsgCount = history.filter(m => m.role === 'user').length;
  if (userMsgCount <= 1) {
    return '¡Hola! Qué bueno saludarte. ¿Qué proyecto tenés en mente o qué querés lograr hoy? 😊';
  }
  const lastUserMsg = [...history].reverse().find(m => m.role === 'user')?.content.toLowerCase() || '';
  if (lastUserMsg.includes('precio') || lastUserMsg.includes('costo') || lastUserMsg.includes('cuanto')) {
    return 'Los valores varían según la necesidad de cada proyecto. ¿Querés agendar una breve llamada para analizarlo juntos?';
  }
  if (lastUserMsg.includes('mal') || lastUserMsg.includes('molesto') || lastUserMsg.includes('humano')) {
    return 'Mil disculpas si hubo una molestia. Ya le aviso a un miembro de nuestro equipo para que te contacte personalmente. 🙏';
  }
  return '¡Excelente! Contame un poco más sobre eso así vemos la mejor forma de impulsarlo. 👍';
}
