export type PaymentDiscountMode = 'percentage' | 'final';

export function calculatePaymentDiscount(total: number, mode: PaymentDiscountMode, input: string) {
  const base = Math.round(total * 100);
  if (!input.trim()) return { valid: true, total: base / 100, discount: 0 };
  const normalized = input.trim().replace(',', '.');
  const value = Number(normalized);
  const valid = /^\d+(\.\d{0,2})?$/.test(normalized) && Number.isFinite(value) &&
    value >= 0 && value <= (mode === 'percentage' ? 100 : base / 100);
  if (!valid) return { valid: false, total: base / 100, discount: 0 };
  const final = mode === 'percentage' ? Math.round(base * (1 - value / 100)) : Math.round(value * 100);
  return { valid: true, total: final / 100, discount: (base - final) / 100 };
}