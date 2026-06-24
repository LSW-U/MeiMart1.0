import { isValidPhone, isValidPassword, isSmsCode, isValidEmail } from '../validate';

describe('isValidPhone', () => {
  it('validates Timor-Leste phone numbers', () => {
    expect(isValidPhone('77001234', 'TL')).toBe(true);
    expect(isValidPhone('+670 77001234', 'TL')).toBe(true);
    expect(isValidPhone('123', 'TL')).toBe(false);
  });
  it('validates CN phone numbers', () => {
    expect(isValidPhone('13800138000', 'CN')).toBe(true);
    expect(isValidPhone('12345', 'CN')).toBe(false);
  });
  it('validates generic international', () => {
    expect(isValidPhone('+1 555-123-4567')).toBe(true);
    expect(isValidPhone('')).toBe(false);
  });
});

describe('isValidPassword', () => {
  it('accepts 8+ chars with letters and digits', () => {
    expect(isValidPassword('abc12345')).toBe(true);
    expect(isValidPassword('Pass1word')).toBe(true);
  });
  it('rejects short passwords (< 8 chars)', () => {
    expect(isValidPassword('12345')).toBe(false);
    expect(isValidPassword('abc1234')).toBe(false);
    expect(isValidPassword('')).toBe(false);
  });
  it('rejects password without letters or without digits', () => {
    expect(isValidPassword('12345678')).toBe(false); // digits only
    expect(isValidPassword('abcdefgh')).toBe(false); // letters only
  });
});

describe('isSmsCode', () => {
  it('accepts 4-6 digits', () => {
    expect(isSmsCode('1234')).toBe(true);
    expect(isSmsCode('123456')).toBe(true);
  });
  it('rejects invalid codes', () => {
    expect(isSmsCode('123')).toBe(false);
    expect(isSmsCode('1234567')).toBe(false);
    expect(isSmsCode('abcd')).toBe(false);
  });
});

describe('isValidEmail', () => {
  it('accepts valid emails', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('a.b@c.tl')).toBe(true);
  });
  it('rejects invalid emails', () => {
    expect(isValidEmail('user@')).toBe(false);
    expect(isValidEmail('user@example')).toBe(false);
    expect(isValidEmail('@example.com')).toBe(false);
  });
});
