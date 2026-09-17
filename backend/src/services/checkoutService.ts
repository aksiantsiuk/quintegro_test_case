import { CheckoutRequest, CheckoutResponse } from '../types/entities';
import { OrderService } from './orderService';

export type CheckoutResult =
  | { ok: true; data: CheckoutResponse }
  | { ok: false; reason: 'invalid' | 'not_found'; error: string };

const CONTACT_FIELDS = ['id', 'firstName', 'lastName', 'emailAddress', 'deliveryAddress', 'paymentMethod'] as const;
const PAYMENT_FIELDS = ['cardNumber', 'cardHolder', 'expiryDate', 'cvv'] as const;

const CARD_NUMBER_PATTERN = /^\d{16}$/;
const EXPIRY_DATE_PATTERN = /^(0[1-9]|1[0-2])\/\d{2}$/;
const CVV_PATTERN = /^\d{3}$/;
const TOTAL_TOLERANCE = 0.01;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim() !== '';

// Expiry is MM/YY; the card stays valid until the end of that month
const isExpired = (expiryDate: string, now: Date = new Date()): boolean => {
  const [month, year] = expiryDate.split('/').map(Number);
  const firstDayAfterExpiry = new Date(2000 + year, month, 1);
  return now >= firstDayAfterExpiry;
};

export class CheckoutService {
  constructor(private orderService: OrderService) {}

  validate(request: unknown): string | null {
    if (!isRecord(request)) {
      return 'Request body is required';
    }

    for (const field of CONTACT_FIELDS) {
      if (!isNonEmptyString(request[field])) {
        return `${field} is required`;
      }
    }

    const payment = request.payment;
    if (!isRecord(payment)) {
      return 'payment is required';
    }
    for (const field of PAYMENT_FIELDS) {
      if (!isNonEmptyString(payment[field])) {
        return `payment.${field} is required`;
      }
    }
    if (!CARD_NUMBER_PATTERN.test(payment.cardNumber as string)) {
      return 'payment.cardNumber must be 16 digits';
    }
    if (!EXPIRY_DATE_PATTERN.test(payment.expiryDate as string)) {
      return 'payment.expiryDate must be in MM/YY format';
    }
    if (isExpired(payment.expiryDate as string)) {
      return 'payment.expiryDate is in the past';
    }
    if (!CVV_PATTERN.test(payment.cvv as string)) {
      return 'payment.cvv must be 3 digits';
    }

    const order = request.order;
    if (!isRecord(order)) {
      return 'order is required';
    }
    if (!Array.isArray(order.products) || order.products.length === 0) {
      return 'order.products must be a non-empty array';
    }
    for (const product of order.products) {
      if (!isRecord(product) || !isNonEmptyString(product.id)) {
        return 'order.products[].id is required';
      }
      if (!Number.isInteger(product.amount) || (product.amount as number) < 1 || (product.amount as number) > 10) {
        return 'order.products[].amount must be an integer between 1 and 10';
      }
      if (typeof product.price !== 'number' || !Number.isFinite(product.price) || product.price < 0) {
        return 'order.products[].price must be a non-negative number';
      }
    }
    if (typeof order.total !== 'number' || !Number.isFinite(order.total)) {
      return 'order.total must be a number';
    }

    const products = order.products as CheckoutRequest['order']['products'];
    const expectedTotal = this.orderService.calculateOrderSum(products);
    if (Math.abs(expectedTotal - order.total) > TOTAL_TOLERANCE) {
      return 'Order total mismatch';
    }

    return null;
  }

  async checkout(request: CheckoutRequest, userId: string): Promise<CheckoutResult> {
    const validationError = this.validate(request);
    if (validationError) {
      return { ok: false, reason: 'invalid', error: validationError };
    }

    const submitted = await this.orderService.submitOrder(request.id, userId);
    if (!submitted) {
      return { ok: false, reason: 'not_found', error: 'Order not found, access denied or already submitted' };
    }

    return { ok: true, data: { id: request.id, status: 'success' } };
  }
}
