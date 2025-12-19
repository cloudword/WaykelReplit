export const PAYMENT_STATUSES = [
  "pending",
  "invoiced",
  "paid",
  "settled",
  "disputed",
  "refunded"
] as const;

export type PaymentStatus = typeof PAYMENT_STATUSES[number];

export const VALID_PAYMENT_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  pending: ["invoiced", "refunded"],
  invoiced: ["paid", "disputed", "refunded"],
  paid: ["settled", "disputed", "refunded"],
  settled: ["disputed"],
  disputed: ["paid", "refunded", "settled"],
  refunded: []
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Payment Pending",
  invoiced: "Invoice Sent",
  paid: "Paid",
  settled: "Settled with Transporter",
  disputed: "Payment Disputed",
  refunded: "Refunded"
};

export function isValidPaymentStatus(status: string): status is PaymentStatus {
  return PAYMENT_STATUSES.includes(status as PaymentStatus);
}

export function isValidPaymentTransition(from: PaymentStatus, to: PaymentStatus): boolean {
  const allowedTransitions = VALID_PAYMENT_TRANSITIONS[from];
  return allowedTransitions.includes(to);
}

export class PaymentTransitionError extends Error {
  public readonly from: PaymentStatus;
  public readonly to: PaymentStatus;
  public readonly rideId?: string;

  constructor(from: PaymentStatus, to: PaymentStatus, rideId?: string) {
    const message = rideId
      ? `Invalid payment transition for ride ${rideId}: ${from} → ${to}`
      : `Invalid payment transition: ${from} → ${to}`;
    super(message);
    this.name = "PaymentTransitionError";
    this.from = from;
    this.to = to;
    this.rideId = rideId;
  }
}

export function assertPaymentTransition(
  from: string,
  to: string,
  rideId?: string
): void {
  if (!isValidPaymentStatus(from)) {
    console.error(`[PaymentLifecycle] ILLEGAL: Unknown current status "${from}" for ride ${rideId || "unknown"}`);
    throw new PaymentTransitionError(from as PaymentStatus, to as PaymentStatus, rideId);
  }

  if (!isValidPaymentStatus(to)) {
    console.error(`[PaymentLifecycle] ILLEGAL: Unknown target status "${to}" for ride ${rideId || "unknown"}`);
    throw new PaymentTransitionError(from as PaymentStatus, to as PaymentStatus, rideId);
  }

  if (!isValidPaymentTransition(from, to)) {
    console.error(
      `[PaymentLifecycle] ILLEGAL TRANSITION: ride=${rideId || "unknown"} from=${from} to=${to}. ` +
      `Allowed from "${from}": [${VALID_PAYMENT_TRANSITIONS[from].join(", ")}]`
    );
    throw new PaymentTransitionError(from, to, rideId);
  }

  console.log(`[PaymentLifecycle] Valid transition: ride=${rideId || "unknown"} ${from} → ${to}`);
}

export function canTransitionPaymentTo(from: string, to: string): boolean {
  if (!isValidPaymentStatus(from) || !isValidPaymentStatus(to)) {
    return false;
  }
  return isValidPaymentTransition(from, to);
}
