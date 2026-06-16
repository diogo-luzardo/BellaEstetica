/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Validates a client's name to ensure it's not a generic placeholder
 * and has a realistic, valid name format.
 */
export function isValidClientName(name: string | undefined | null): boolean {
  if (!name) return false;
  const cleaned = name.trim();
  if (cleaned.length < 3) return false;

  const placeholders = [
    'cliente', 'novo', 'paciente', 'cadastrado', 'pergunte', 
    'selecionado', 'informado', 'visitante', 'não informado', 
    'fulano', 'sicrano', 'beltrano', 'maria da silva', 'teste', 'usuário'
  ];

  const lower = cleaned.toLowerCase();
  
  // If the string contains any blocklisted placeholder words, reject it
  return !placeholders.some(p => lower.includes(p));
}

/**
 * Validates a client's telephone list to ensure it's a realistic number
 * and not a simple run of numbers or dummy characters.
 */
export function isValidClientPhone(phone: string | undefined | null): boolean {
  if (!phone) return false;
  const cleaned = phone.trim();
  
  // Check if string contains placeholder labels
  const placeholders = [
    'telefone', 'informado', 'sem', 'não', 'null', 'undefined', 'vazio'
  ];
  
  const lower = cleaned.toLowerCase();
  if (placeholders.some(p => lower.includes(p))) return false;

  // Extract digits
  const digits = cleaned.replace(/\D/g, '');
  
  // Real Brazilian overlay phones have either 10 (fixed) or 11 (mobile) digits.
  // We allow a safe margin of 8 to 15 digits to hold international and raw inputs.
  if (digits.length < 8 || digits.length > 15) return false;

  // Reject simple sequences like 00000000, 12345678, etc.
  if (/^(\d)\1+$/.test(digits)) return false; // same repeated digit (e.g. 99999999)
  if ('123456789012345'.includes(digits)) return false; // sequential digits

  return true;
}

/**
 * Combines validations to produce a definitive booking decision
 */
export function validateBookingInput(
  clientName: string | undefined | null,
  clientPhone: string | undefined | null
): { isValid: boolean; errorType?: 'name' | 'phone' | 'both' | null } {
  const isNameVal = isValidClientName(clientName);
  const isPhoneVal = isValidClientPhone(clientPhone);

  if (isNameVal && isPhoneVal) {
    return { isValid: true, errorType: null };
  }

  if (!isNameVal && !isPhoneVal) {
    return { isValid: false, errorType: 'both' };
  }

  if (!isNameVal) {
    return { isValid: false, errorType: 'name' };
  }

  return { isValid: false, errorType: 'phone' };
}
