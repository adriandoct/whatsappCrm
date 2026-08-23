export interface WhatsAppSendResult {
  success: boolean;
  wamid?: string;
  error?: string;
}

/**
 * Sends a text message to a WhatsApp number using Meta Graph API.
 */
export async function sendWhatsAppMessage(
  toPhone: string,
  text: string
): Promise<WhatsAppSendResult> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    console.warn('WhatsApp API credentials missing (WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN)');
    // Simulation fallback if keys are missing in local dev
    return {
      success: true,
      wamid: `sim_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    };
  }

  // Ensure clean E.164 phone format without leading plus or spaces
  const cleanPhone = toPhone.replace(/\D/g, '');

  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanPhone,
          type: 'text',
          text: {
            preview_url: false,
            body: text,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Meta WhatsApp API error:', data);
      return {
        success: false,
        error: data?.error?.message || 'Meta API returned an error',
      };
    }

    const wamid = data?.messages?.[0]?.id;
    return {
      success: true,
      wamid,
    };
  } catch (error: any) {
    console.error('Error sending WhatsApp message:', error);
    return {
      success: false,
      error: error?.message || 'Network error sending WhatsApp message',
    };
  }
}

/**
 * Marks an incoming WhatsApp message as read.
 */
export async function markWhatsAppMessageAsRead(messageId: string): Promise<boolean> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken || !messageId) {
    return false;
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId,
        }),
      }
    );
    return response.ok;
  } catch (err) {
    console.error('Error marking WhatsApp message as read:', err);
    return false;
  }
}
