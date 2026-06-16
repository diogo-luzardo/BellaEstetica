/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { 
  isValidClientName, 
  isValidClientPhone, 
  validateBookingInput 
} from './bookingValidation';

describe('isValidClientName', () => {
  it('should reject empty or undefined values', () => {
    expect(isValidClientName(undefined)).toBe(false);
    expect(isValidClientName(null)).toBe(false);
    expect(isValidClientName('')).toBe(false);
    expect(isValidClientName('   ')).toBe(false);
  });

  it('should reject short names under 3 chars', () => {
    expect(isValidClientName('Ab')).toBe(false);
    expect(isValidClientName('a')).toBe(false);
  });

  it('should reject typical placeholders', () => {
    expect(isValidClientName('Cliente Novo')).toBe(false);
    expect(isValidClientName('Paciente Selecionado')).toBe(false);
    expect(isValidClientName('Não cadastrado')).toBe(false);
    expect(isValidClientName('Usuário Teste')).toBe(false);
    expect(isValidClientName('Fulano de tal')).toBe(false);
  });

  it('should approve valid human names', () => {
    expect(isValidClientName('Diogo de Oliveira')).toBe(true);
    expect(isValidClientName('Dra. Ana Maria')).toBe(true);
    expect(isValidClientName('Karla Mendes')).toBe(true);
  });
});

describe('isValidClientPhone', () => {
  it('should reject empty or undefined values', () => {
    expect(isValidClientPhone(undefined)).toBe(false);
    expect(isValidClientPhone(null)).toBe(false);
    expect(isValidClientPhone('')).toBe(false);
  });

  it('should reject system placeholders', () => {
    expect(isValidClientPhone('Telefone não informado')).toBe(false);
    expect(isValidClientPhone('Sem telefone')).toBe(false);
    expect(isValidClientPhone('null')).toBe(false);
    expect(isValidClientPhone('vazio')).toBe(false);
  });

  it('should reject repeated digit sequences', () => {
    expect(isValidClientPhone('00000000')).toBe(false);
    expect(isValidClientPhone('111111111')).toBe(false);
    expect(isValidClientPhone('99999999999')).toBe(false);
  });

  it('should reject simple consecutive sequences', () => {
    expect(isValidClientPhone('12345678')).toBe(false);
    expect(isValidClientPhone('1234567890')).toBe(false);
  });

  it('should approve valid representative phone numbers', () => {
    expect(isValidClientPhone('11987654321')).toBe(true);
    expect(isValidClientPhone('21912345678')).toBe(true);
    expect(isValidClientPhone('+55 (11) 98765-4321')).toBe(true);
  });
});

describe('validateBookingInput', () => {
  it('should report both invalid when both are bad', () => {
    const res = validateBookingInput('Cliente Novo', 'Sem telefone');
    expect(res.isValid).toBe(false);
    expect(res.errorType).toBe('both');
  });

  it('should report name invalid when phone is valid but name is placeholder', () => {
    const res = validateBookingInput('Cliente Novo', '11987654321');
    expect(res.isValid).toBe(false);
    expect(res.errorType).toBe('name');
  });

  it('should report phone invalid when name is valid but phone is dummy', () => {
    const res = validateBookingInput('Diogo Mendes', '00000000');
    expect(res.isValid).toBe(false);
    expect(res.errorType).toBe('phone');
  });

  it('should validate correctly when both conditions are met', () => {
    const res = validateBookingInput('Amanda Silva', '11977778888');
    expect(res.isValid).toBe(true);
    expect(res.errorType).toBeNull();
  });
});
