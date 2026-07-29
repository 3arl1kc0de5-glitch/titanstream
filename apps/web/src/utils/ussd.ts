/**
 * Utility for Mobile Money USSD payment push prompts
 * Format: *165*1*1*(admin phone number)*(amount)#
 */

export function buildUSSDString(phone: string, amount: string | number): string {
  const sanitizedPhone = phone.replace(/[^\d+]/g, '');
  const sanitizedAmount = Math.round(Number(amount) || 0);
  return `*165*1*1*${sanitizedPhone}*${sanitizedAmount}#`;
}

export function buildUSSDTelUri(phone: string, amount: string | number): string {
  const sanitizedPhone = phone.replace(/[^\d+]/g, '');
  const sanitizedAmount = Math.round(Number(amount) || 0);
  // Encodes '#' as '%23' for standard tel: URIs so native mobile dialers open correctly
  return `tel:*165*1*1*${sanitizedPhone}*${sanitizedAmount}%23`;
}

export function invokeUSSDPushPrompt(phone: string, amount: string | number): void {
  const uri = buildUSSDTelUri(phone, amount);
  try {
    window.location.href = uri;
  } catch (err) {
    console.error('Failed to trigger phone dialer URI:', err);
  }
}
