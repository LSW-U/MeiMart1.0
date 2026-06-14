export function isValidPhone(phone: string, region: 'TL' | 'CN' | 'generic' = 'generic'): boolean {
  if (!phone) return false;
  if (region === 'TL') {
    return /^(\+670|670)?\s?7\d{6,8}$/.test(phone.replace(/\s/g, ''));
  }
  if (region === 'CN') {
    return /^1[3-9]\d{9}$/.test(phone);
  }
  return /^\+?[\d\s-]{7,15}$/.test(phone);
}

export function isValidPassword(password: string): boolean {
  return typeof password === 'string' && password.length >= 6;
}

export function isSmsCode(code: string): boolean {
  return /^\d{4,6}$/.test(code);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
