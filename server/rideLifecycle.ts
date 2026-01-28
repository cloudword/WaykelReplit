export const RIDE_STATUSES = [
  "pending",
  "bidding",
  "accepted",
  "assigned",
  "active",
  "pickup_done",
  "delivery_done",
  "completed",
  "cancelled",
  "scheduled"
] as const;

export type RideStatus = typeof RIDE_STATUSES[number];

export const VALID_TRANSITIONS: Record<RideStatus, RideStatus[]> = {
  pending: ["bidding", "assigned", "cancelled", "scheduled"],
  scheduled: ["pending", "bidding", "assigned", "cancelled"],
  bidding: ["accepted", "pending", "cancelled"],
  accepted: ["assigned", "cancelled"],
  assigned: ["active", "cancelled"],
  active: ["pickup_done", "cancelled"],
  pickup_done: ["delivery_done", "cancelled"],
  delivery_done: ["completed", "cancelled"],
  completed: [],
  cancelled: []
};

export const STATUS_LABELS: Record<RideStatus, string> = {
  pending: "Open for Bidding",
  bidding: "Bidding",
  accepted: "Accepted",
  assigned: "Assigned",
  active: "Trip Started",
  pickup_done: "Pickup Complete",
  delivery_done: "Delivery Complete",
  completed: "Completed",
  cancelled: "Cancelled",
  scheduled: "Scheduled"
};

export function isValidStatus(status: string): status is RideStatus {
  return RIDE_STATUSES.includes(status as RideStatus);
}

export function isValidTransition(from: RideStatus, to: RideStatus): boolean {
  const allowedTransitions = VALID_TRANSITIONS[from];
  return allowedTransitions.includes(to);
}

export class RideTransitionError extends Error {
  public readonly from: RideStatus;
  public readonly to: RideStatus;
  public readonly rideId?: string;

  constructor(from: RideStatus, to: RideStatus, rideId?: string) {
    const message = rideId
      ? `Invalid ride transition for ride ${rideId}: ${from} → ${to}`
      : `Invalid ride transition: ${from} → ${to}`;
    super(message);
    this.name = "RideTransitionError";
    this.from = from;
    this.to = to;
    this.rideId = rideId;
  }
}

export function assertRideTransition(
  from: string,
  to: string,
  rideId?: string
): void {
  if (!isValidStatus(from)) {
    console.error(`[RideLifecycle] ILLEGAL: Unknown current status "${from}" for ride ${rideId || "unknown"}`);
    throw new RideTransitionError(from as RideStatus, to as RideStatus, rideId);
  }

  if (!isValidStatus(to)) {
    console.error(`[RideLifecycle] ILLEGAL: Unknown target status "${to}" for ride ${rideId || "unknown"}`);
    throw new RideTransitionError(from as RideStatus, to as RideStatus, rideId);
  }

  if (!isValidTransition(from, to)) {
    console.error(
      `[RideLifecycle] ILLEGAL TRANSITION: ride=${rideId || "unknown"} from=${from} to=${to}. ` +
      `Allowed from "${from}": [${VALID_TRANSITIONS[from].join(", ")}]`
    );
    throw new RideTransitionError(from, to, rideId);
  }

  console.log(`[RideLifecycle] Valid transition: ride=${rideId || "unknown"} ${from} → ${to}`);
}

export function canTransitionTo(from: string, to: string): boolean {
  if (!isValidStatus(from) || !isValidStatus(to)) {
    return false;
  }
  return isValidTransition(from, to);
}

export function getNextStatuses(current: string): RideStatus[] {
  if (!isValidStatus(current)) {
    return [];
  }
  return VALID_TRANSITIONS[current];
}
