import { storage } from "./storage";
import type { 
  NotificationType, 
  ActionType, 
  NotificationEntityType,
  InsertNotification 
} from "@shared/schema";

type UserRole = "customer" | "transporter" | "driver" | "admin";

interface NotificationParams {
  recipientId: string;
  recipientTransporterId?: string;
  notificationType: NotificationType;
  actionType: ActionType;
  entityType?: NotificationEntityType;
  entityId?: string;
  deepLink?: string;
  rideId?: string;
  bidId?: string;
  matchScore?: number;
  matchReason?: string;
}

interface RoleAwareMessageParams extends NotificationParams {
  recipientRole: UserRole;
  eventType: NotificationEventType;
  context?: Record<string, any>;
}

type NotificationEventType = 
  | "trip_created"
  | "bid_created"
  | "bid_placed"
  | "bid_accepted"
  | "bid_rejected"
  | "driver_assigned"
  | "trip_started"
  | "trip_completed"
  | "document_approved"
  | "document_rejected"
  | "transporter_approved"
  | "transporter_rejected"
  | "account_update"
  | "system";

interface NotificationContent {
  title: string;
  message: string;
  legacyType: InsertNotification["type"];
}

const getNotificationContent = (
  eventType: NotificationEventType,
  recipientRole: UserRole,
  context: Record<string, any> = {}
): NotificationContent => {
  const { 
    pickupLocation = "", 
    dropLocation = "", 
    cargoType = "General",
    weight = "N/A",
    price = "0",
    transporterName = "",
    driverName = "",
    bidAmount = "0",
    documentType = "",
    reason = ""
  } = context;

  switch (eventType) {
    case "trip_created":
      if (recipientRole === "customer") {
        return {
          title: "Trip Request Created",
          message: `Your trip from ${pickupLocation} to ${dropLocation} has been posted.`,
          legacyType: "new_booking"
        };
      }
      if (recipientRole === "transporter" || recipientRole === "driver") {
        return {
          title: "New Trip Request Available",
          message: `New trip from ${pickupLocation} to ${dropLocation} - ${cargoType} (${weight}). Budget: ₹${price}`,
          legacyType: "new_booking"
        };
      }
      return {
        title: "New Trip Created",
        message: `New trip from ${pickupLocation} to ${dropLocation} - ₹${price}`,
        legacyType: "new_booking"
      };

    case "bid_created":
    case "bid_placed":
      if (recipientRole === "customer") {
        return {
          title: "New Bid Received",
          message: `${transporterName} has placed a bid of ₹${bidAmount} for your trip.`,
          legacyType: "bid_placed"
        };
      }
      if (recipientRole === "transporter") {
        return {
          title: "Bid Submitted",
          message: `Your bid of ₹${bidAmount} has been submitted for the trip.`,
          legacyType: "bid_placed"
        };
      }
      return {
        title: "Bid Placed",
        message: `A bid of ₹${bidAmount} has been placed.`,
        legacyType: "bid_placed"
      };

    case "bid_accepted":
      if (recipientRole === "customer") {
        return {
          title: "Driver Assigned",
          message: `${transporterName} has been assigned to your trip from ${pickupLocation} to ${dropLocation}.`,
          legacyType: "bid_accepted"
        };
      }
      if (recipientRole === "transporter") {
        return {
          title: "Bid Accepted!",
          message: `Your bid of ₹${bidAmount} for the trip from ${pickupLocation} to ${dropLocation} has been accepted.`,
          legacyType: "bid_accepted"
        };
      }
      if (recipientRole === "driver") {
        return {
          title: "New Trip Assigned",
          message: `You have been assigned a trip from ${pickupLocation} to ${dropLocation}. Accept to confirm.`,
          legacyType: "ride_assigned"
        };
      }
      return {
        title: "Bid Accepted",
        message: `Bid accepted for trip from ${pickupLocation} to ${dropLocation}.`,
        legacyType: "bid_accepted"
      };

    case "bid_rejected":
      if (recipientRole === "transporter") {
        return {
          title: "Bid Not Selected",
          message: `Your bid for the trip from ${pickupLocation} to ${dropLocation} was not selected.`,
          legacyType: "bid_rejected"
        };
      }
      return {
        title: "Bid Rejected",
        message: `A bid for the trip has been rejected.`,
        legacyType: "bid_rejected"
      };

    case "driver_assigned":
      if (recipientRole === "customer") {
        return {
          title: "Driver on the Way",
          message: `${driverName} has been assigned and will pick up your shipment soon.`,
          legacyType: "ride_assigned"
        };
      }
      if (recipientRole === "transporter") {
        return {
          title: "Driver Assigned",
          message: `${driverName} has been assigned to the trip from ${pickupLocation} to ${dropLocation}.`,
          legacyType: "ride_assigned"
        };
      }
      if (recipientRole === "driver") {
        return {
          title: "New Trip Assigned",
          message: `You've been assigned a trip from ${pickupLocation} to ${dropLocation}. Please accept to confirm.`,
          legacyType: "ride_assigned"
        };
      }
      return {
        title: "Driver Assigned",
        message: `Driver assigned to trip.`,
        legacyType: "ride_assigned"
      };

    case "trip_started":
      if (recipientRole === "customer") {
        return {
          title: "Trip Started",
          message: `Your shipment is now on the way from ${pickupLocation}.`,
          legacyType: "system"
        };
      }
      return {
        title: "Trip Started",
        message: `Trip from ${pickupLocation} to ${dropLocation} has started.`,
        legacyType: "system"
      };

    case "trip_completed":
      if (recipientRole === "customer") {
        return {
          title: "Delivery Complete",
          message: `Your shipment has been delivered to ${dropLocation}.`,
          legacyType: "ride_completed"
        };
      }
      if (recipientRole === "transporter") {
        return {
          title: "Trip Completed",
          message: `Trip from ${pickupLocation} to ${dropLocation} has been completed successfully.`,
          legacyType: "ride_completed"
        };
      }
      if (recipientRole === "driver") {
        return {
          title: "Trip Completed",
          message: `You've completed the trip to ${dropLocation}. Great job!`,
          legacyType: "ride_completed"
        };
      }
      return {
        title: "Trip Completed",
        message: `Trip completed.`,
        legacyType: "ride_completed"
      };

    case "document_approved":
      return {
        title: "Document Approved",
        message: `Your ${documentType} document has been verified and approved.`,
        legacyType: "system"
      };

    case "document_rejected":
      return {
        title: "Document Rejected",
        message: `Your ${documentType} document was rejected. ${reason ? `Reason: ${reason}` : "Please upload a new document."}`,
        legacyType: "system"
      };

    case "transporter_approved":
      return {
        title: "Account Approved",
        message: "Your transporter account has been approved. You can now bid on trips.",
        legacyType: "system"
      };

    case "transporter_rejected":
      return {
        title: "Account Application Rejected",
        message: `Your transporter application was rejected. ${reason ? `Reason: ${reason}` : "Please contact support for more information."}`,
        legacyType: "system"
      };

    case "account_update":
      return {
        title: "Account Update",
        message: context.message || "Your account has been updated.",
        legacyType: "system"
      };

    case "system":
    default:
      return {
        title: context.title || "Notification",
        message: context.message || "You have a new notification.",
        legacyType: "system"
      };
  }
};

const getDeepLink = (
  eventType: NotificationEventType,
  recipientRole: UserRole,
  entityType?: NotificationEntityType,
  entityId?: string
): string | undefined => {
  if (!entityId) return undefined;

  switch (entityType) {
    case "trip":
      if (recipientRole === "driver") {
        return `/driver/trip/${entityId}`;
      }
      if (recipientRole === "transporter") {
        return `/transporter/trips/${entityId}`;
      }
      if (recipientRole === "customer") {
        return `/customer/rides/${entityId}`;
      }
      return `/admin/rides/${entityId}`;

    case "bid":
      if (recipientRole === "customer") {
        return `/customer/rides`; 
      }
      if (recipientRole === "transporter") {
        return `/transporter/bids`;
      }
      return undefined;

    case "document":
      if (recipientRole === "driver") {
        return `/driver/documents`;
      }
      if (recipientRole === "transporter") {
        return `/transporter/documents`;
      }
      return `/admin/documents/${entityId}`;

    default:
      return undefined;
  }
};

export const createRoleAwareNotification = async (
  params: RoleAwareMessageParams
): Promise<void> => {
  const {
    recipientId,
    recipientTransporterId,
    recipientRole,
    eventType,
    notificationType,
    actionType,
    entityType,
    entityId,
    rideId,
    bidId,
    matchScore,
    matchReason,
    context = {}
  } = params;

  const content = getNotificationContent(eventType, recipientRole, context);
  const deepLink = params.deepLink || getDeepLink(eventType, recipientRole, entityType, entityId);

  try {
    await storage.createNotification({
      recipientId,
      recipientTransporterId,
      type: content.legacyType,
      title: content.title,
      message: content.message,
      rideId,
      bidId,
      matchScore,
      matchReason,
      notificationType,
      actionType,
      entityType,
      entityId,
      deepLink
    });
  } catch (error: any) {
    if (error?.message?.includes("column") || error?.code === "42703") {
      console.warn("New notification columns not available, falling back to legacy insert");
      await storage.createNotification({
        recipientId,
        recipientTransporterId,
        type: content.legacyType,
        title: content.title,
        message: content.message,
        rideId,
        bidId,
        matchScore,
        matchReason
      });
    } else {
      throw error;
    }
  }
};

export const createSimpleNotification = async (
  params: NotificationParams & { title: string; message: string; legacyType: InsertNotification["type"] }
): Promise<void> => {
  const {
    recipientId,
    recipientTransporterId,
    title,
    message,
    legacyType,
    notificationType,
    actionType,
    entityType,
    entityId,
    deepLink,
    rideId,
    bidId,
    matchScore,
    matchReason
  } = params;

  try {
    await storage.createNotification({
      recipientId,
      recipientTransporterId,
      type: legacyType,
      title,
      message,
      rideId,
      bidId,
      matchScore,
      matchReason,
      notificationType,
      actionType,
      entityType,
      entityId,
      deepLink
    });
  } catch (error: any) {
    if (error?.message?.includes("column") || error?.code === "42703") {
      console.warn("New notification columns not available, falling back to legacy insert");
      await storage.createNotification({
        recipientId,
        recipientTransporterId,
        type: legacyType,
        title,
        message,
        rideId,
        bidId,
        matchScore,
        matchReason
      });
    } else {
      throw error;
    }
  }
};

export { 
  NotificationEventType, 
  NotificationParams, 
  RoleAwareMessageParams,
  getNotificationContent,
  getDeepLink
};
