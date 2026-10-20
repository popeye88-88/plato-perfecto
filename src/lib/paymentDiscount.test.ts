import { describe, it as test } from 'node:test';
import { deepStrictEqual, strictEqual } from 'node:assert';
import { calculatePaymentDiscount } from './paymentDiscount';

describe('Payment discounts', () => {
  test('percentage reduces the amount due', () => {
    deepStrictEqual(calculatePaymentDiscount(200, 'percentage', '25'), { valid: true, total: 150, discount: 50 });
  });
  test('final amount means the amount to charge, not the amount to subtract', () => {
    deepStrictEqual(calculatePaymentDiscount(200, 'final', '125'), { valid: true, total: 125, discount: 75 });
  });
  test('empty input leaves an existing discounted total unchanged', () => {
    deepStrictEqual(calculatePaymentDiscount(150, 'percentage', ''), { valid: true, total: 150, discount: 0 });
  });
  test('invalid discounts cannot increase the amount or make it negative', () => {
    for (const [mode, input] of [['percentage', '101'], ['percentage', '-1'], ['final', '201'], ['final', '-1'], ['final', '1.2.3']] as const) {
      strictEqual(calculatePaymentDiscount(200, mode, input).valid, false);
    }
  });
  test('accepts decimal commas and rounds money to cents', () => {
    deepStrictEqual(calculatePaymentDiscount(19.99, 'percentage', '12,5'), { valid: true, total: 17.49, discount: 2.5 });
  });
});