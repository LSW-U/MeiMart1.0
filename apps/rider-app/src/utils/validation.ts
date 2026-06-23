export function isRequired(value: string) {
  return value.trim().length > 0;
}

export function isPhoneNumber(value: string) {
  return /^\+?[0-9\s-]{6,20}$/.test(value.trim());
}

export function isPositiveAmount(value: string) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0;
}
