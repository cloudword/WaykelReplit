import type { Ride, User, Transporter } from "@shared/schema";

export type RideAction =
  | "ACCEPT_BID"
  | "ASSIGN_DRIVER"
  | "ACCEPT_TRIP"
  | "START_TRIP"
  | "MARK_PICKUP"
  | "MARK_DELIVERY"
  | "COMPLETE_TRIP"
  | "CANCEL_PRE_ACCEPT"
  | "CANCEL_POST_ACCEPT"
  | "VIEW_TRIP"
  | "PLACE_BID";

export class RideActorError extends Error {
  public readonly action: RideAction;
  public readonly userId: string;
  public readonly rideId: string;
  public readonly reason: string;

  constructor(action: RideAction, userId: string, rideId: string, reason: string) {
    super(`Actor violation: ${reason} (action=${action}, user=${userId}, ride=${rideId})`);
    this.name = "RideActorError";
    this.action = action;
    this.userId = userId;
    this.rideId = rideId;
    this.reason = reason;
  }
}

interface ActorContext {
  user: {
    id: string;
    role: string;
    isSuperAdmin?: boolean;
    isSelfDriver?: boolean;
    transporterId?: string | null;
  };
  ride: {
    id: string;
    status: string;
    createdById?: string | null;
    transporterId?: string | null;
    assignedDriverId?: string | null;
    acceptedByUserId?: string | null;
    biddingStatus?: string | null;
  };
  transporter?: {
    id: string;
    userId?: string | null;
  } | null;
  action: RideAction;
}

export function assertRideActor(context: ActorContext): void {
  const { user, ride, transporter, action } = context;
  const isAdmin = user.isSuperAdmin === true;
  const isCustomer = user.role === "customer";
  const isTransporter = user.role === "transporter";
  const isDriver = user.role === "driver";
  const isSelfDriver = user.isSelfDriver === true;
  const isRideOwner = ride.createdById === user.id;
  const isAssignedDriver = ride.assignedDriverId === user.id;
  const isRideTransporter = ride.transporterId === user.transporterId;
  const ownsTransporter = transporter?.userId === user.id;

  switch (action) {
    case "ACCEPT_BID":
      if (isAdmin) return;
      if (isCustomer && isRideOwner) return;
      throw new RideActorError(action, user.id, ride.id, "Only ride owner or admin can accept bids");

    case "ASSIGN_DRIVER":
      if (isAdmin) return;
      if (isTransporter && (isRideTransporter || ownsTransporter)) return;
      throw new RideActorError(action, user.id, ride.id, "Only transporter or admin can assign driver");

    case "ACCEPT_TRIP":
      if (isAdmin) return;
      if (isAssignedDriver) return;
      if (isSelfDriver && isTransporter && isRideTransporter) return;
      throw new RideActorError(action, user.id, ride.id, "Only assigned driver or self-driver can accept trip");

    case "START_TRIP":
      if (isAdmin) return;
      if (isAssignedDriver) return;
      if (isSelfDriver && isTransporter && isRideTransporter) return;
      throw new RideActorError(action, user.id, ride.id, "Only assigned driver can start trip");

    case "MARK_PICKUP":
    case "MARK_DELIVERY":
    case "COMPLETE_TRIP":
      if (isAdmin) return;
      if (isAssignedDriver) return;
      if (isSelfDriver && isTransporter && isRideTransporter) return;
      throw new RideActorError(action, user.id, ride.id, "Only assigned driver can update trip status");

    case "CANCEL_PRE_ACCEPT":
      if (isAdmin) return;
      if (isCustomer && isRideOwner) return;
      throw new RideActorError(action, user.id, ride.id, "Only customer or admin can cancel before acceptance");

    case "CANCEL_POST_ACCEPT":
      if (isAdmin) return;
      throw new RideActorError(action, user.id, ride.id, "Only admin can cancel after acceptance");

    case "VIEW_TRIP":
      if (isAdmin) return;
      if (isRideOwner) return;
      if (isAssignedDriver) return;
      if (isTransporter && isRideTransporter) return;
      if (ride.status === "pending" && (isTransporter || isDriver)) return;
      throw new RideActorError(action, user.id, ride.id, "Not authorized to view this trip");

    case "PLACE_BID":
      if (isAdmin) return;
      const biddableStatuses = ["pending", "bidding"];
      if ((isTransporter || isDriver) && biddableStatuses.includes(ride.status) && ride.biddingStatus === "open") return;
      throw new RideActorError(action, user.id, ride.id, "Cannot place bid on this trip");

    default:
      throw new RideActorError(action, user.id, ride.id, `Unknown action: ${action}`);
  }
}

export function canPerformRideAction(context: ActorContext): boolean {
  try {
    assertRideActor(context);
    return true;
  } catch (e) {
    if (e instanceof RideActorError) {
      return false;
    }
    throw e;
  }
}

export function getRideActorReason(context: ActorContext): string | null {
  try {
    assertRideActor(context);
    return null;
  } catch (e) {
    if (e instanceof RideActorError) {
      console.warn(`[RidePermissions] Actor blocked: ${e.message}`);
      return e.reason;
    }
    throw e;
  }
}
