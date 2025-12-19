export type SmsTemplate = 
  | "otp_login"
  | "otp_forgot_password"
  | "trip_created"
  | "bid_accepted"
  | "trip_assigned"
  | "trip_completed"
  | "transporter_approved"
  | "transporter_rejected";

export interface SmsProvider {
  sendOtp(phone: string, otp: string): Promise<void>;
  sendTransactional(
    phone: string,
    template: SmsTemplate,
    variables: Record<string, string>
  ): Promise<void>;
}

export interface SmsSettings {
  smsEnabled: boolean;
  smsMode: "shadow" | "live";
  smsProvider: "msg91" | null;
}
