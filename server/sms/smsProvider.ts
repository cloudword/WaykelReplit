export enum SmsEvent {
  OTP = "OTP",
  TRIP_ASSIGNED = "TRIP_ASSIGNED",
  BID_ACCEPTED = "BID_ACCEPTED",
  DELIVERY_COMPLETED = "DELIVERY_COMPLETED",
  TRANSPORTER_APPROVED = "TRANSPORTER_APPROVED",
  TRANSPORTER_REJECTED = "TRANSPORTER_REJECTED"
}

export const SMS_TEMPLATE_KEYS: Record<SmsEvent, string> = {
  [SmsEvent.OTP]: "WAYKEL_OTP",
  [SmsEvent.TRIP_ASSIGNED]: "WAYKEL_TRIP_ASSIGN",
  [SmsEvent.BID_ACCEPTED]: "WAYKEL_BID_ACCEPTED",
  [SmsEvent.DELIVERY_COMPLETED]: "WAYKEL_DELIVERY_DONE",
  [SmsEvent.TRANSPORTER_APPROVED]: "WAYKEL_TRANSPORTER_APPROVED",
  [SmsEvent.TRANSPORTER_REJECTED]: "WAYKEL_TRANSPORTER_REJECTED"
};

export interface SmsProvider {
  sendOtp(phone: string, otp: string): Promise<void>;
  sendTransactional(
    phone: string,
    event: SmsEvent,
    variables: Record<string, string>
  ): Promise<void>;
}

export interface SmsSettings {
  smsEnabled: boolean;
  smsMode: "shadow" | "live";
  smsProvider: "msg91" | null;
  smsTemplates: Record<string, string>;
}
