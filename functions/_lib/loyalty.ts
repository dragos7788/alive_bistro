import type { Env } from "./types"

/** Records an internally verified settled RON payment. Not a payment verification API. */
export async function recordSettledPayment(env: Env, payment: {
  paymentId: string; orderId: string; customerId: string; amountBani: number; currency: "RON"
}): Promise<void> {
  if (!payment.paymentId || !payment.orderId || /^TEST-/i.test(payment.orderId) || !payment.customerId
    || payment.currency !== "RON" || !Number.isSafeInteger(payment.amountBani)
    || payment.amountBani <= 0 || payment.amountBani > 100000000) throw new Error("INVALID_LOYALTY_PAYMENT")
  const customer = await env.DB.prepare("SELECT referred_by FROM customers WHERE id=?")
    .bind(payment.customerId).first<{ referred_by: string | null }>()
  if (!customer) throw new Error("UNKNOWN_CUSTOMER")
  await env.DB.prepare(`INSERT INTO loyalty_payments
    (payment_id,order_id,customer_id,referrer_id,amount_bani,created_at) VALUES (?,?,?,?,?,?)
    ON CONFLICT(payment_id) DO NOTHING`).bind(payment.paymentId, payment.orderId, payment.customerId,
    customer.referred_by, payment.amountBani, Math.floor(Date.now() / 1000)).run()
  const saved = await env.DB.prepare("SELECT order_id,customer_id,amount_bani FROM loyalty_payments WHERE payment_id=?")
    .bind(payment.paymentId).first<{ order_id: string; customer_id: string; amount_bani: number }>()
  if (!saved || saved.order_id !== payment.orderId || saved.customer_id !== payment.customerId || saved.amount_bani !== payment.amountBani) {
    throw new Error("LOYALTY_PAYMENT_CONFLICT")
  }
}

/** Reconciles a verified cumulative refund, reversing buyer and direct-referrer points atomically. */
export async function recordCumulativeRefund(env: Env, paymentId: string, refundedBani: number): Promise<void> {
  if (!Number.isSafeInteger(refundedBani) || refundedBani < 0) throw new Error("INVALID_REFUND")
  const payment = await env.DB.prepare("SELECT amount_bani,refunded_bani FROM loyalty_payments WHERE payment_id=?")
    .bind(paymentId).first<{ amount_bani: number; refunded_bani: number }>()
  if (!payment || refundedBani > payment.amount_bani || refundedBani < payment.refunded_bani) throw new Error("INVALID_REFUND")
  await env.DB.prepare(`UPDATE loyalty_payments SET refunded_bani=?
    WHERE payment_id=? AND refunded_bani<=?`).bind(refundedBani, paymentId, refundedBani).run()
  const saved = await env.DB.prepare("SELECT refunded_bani FROM loyalty_payments WHERE payment_id=?")
    .bind(paymentId).first<{ refunded_bani: number }>()
  if (!saved || saved.refunded_bani !== refundedBani) throw new Error("REFUND_CONFLICT")
}
