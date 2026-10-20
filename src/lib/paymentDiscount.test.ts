import { describe, expect, test } from 'bun:test';
import { calculatePaymentDiscount } from './paymentDiscount';

describe('Payment discounts', () => {
  test('percentage reduces the amount due', () => {
    expect(calculatePaymentDiscount(200, 'percentage', '25')).toEqual({ valid: true, total: 150, discount: 50 });
  });
  test('final amount means the amount to charge, not the amount to subtract', () => {
    expect(calculatePaymentDiscount(200, 'final', '125')).toEqual({ valid: true, total: 125, discount: 75 });
  });
  test('empty input leaves an existing discounted total unchanged', () => {
    expect(calculatePaymentDiscount(150, 'percentage', '')).toEqual({ valid: true, total: 150, discount: 0 });
  });
  test('invalid discounts cannot increase the amount or make it negative', () => {
    for (const [mode, input] of [['percentage', '101'], ['percentage', '-1'], ['final', '201'], ['final', '-1'], ['final', '1.2.3']] as const) {
      expect(calculatePaymentDiscount(200, mode, input).valid).toBe(false);
    }
  });
  test('accepts decimal commas and rounds money to cents', () => {
    expect(calculatePaymentDiscount(19.99, 'percentage', '12,5')).toEqual({ valid: true, total: 17.49, discount: 2.5 });
  });
});