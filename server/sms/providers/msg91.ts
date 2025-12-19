import { SmsProvider, SmsTemplate, SmsSettings } from "../smsProvider";

export class Msg91Provider implements SmsProvider {
  private settings: SmsSettings;
  private authKey: string | undefined;
  private senderId: string;
  private otpTemplateId: string | undefined;

  constructor(settings: SmsSettings) {
    this.settings = settings;
    this.authKey = process.env.MSG91_AUTH_KEY;
    this.senderId = process.env.MSG91_SENDER_ID || "WAYKEL";
    this.otpTemplateId = process.env.MSG91_OTP_TEMPLATE_ID;
  }

  async sendOtp(phone: string, otp: string): Promise<void> {
    const normalizedPhone = this.normalizePhone(phone);

    if (!this.settings.smsEnabled) {
      console.log(`[SMS:DISABLED][OTP] Would send to ${normalizedPhone}: ${otp}`);
      return;
    }

    if (this.settings.smsMode === "shadow") {
      console.log(`[SMS:SHADOW][OTP] Would send to ${normalizedPhone}: ${otp}`);
      return;
    }

    if (!this.authKey) {
      console.error("[SMS:ERROR] MSG91_AUTH_KEY not configured");
      throw new Error("SMS provider not configured");
    }

    try {
      const response = await fetch("https://api.msg91.com/api/v5/otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "authkey": this.authKey
        },
        body: JSON.stringify({
          template_id: this.otpTemplateId,
          mobile: `91${normalizedPhone}`,
          otp: otp
        })
      });

      const result = await response.json();
      
      if (result.type !== "success") {
        console.error("[SMS:ERROR] MSG91 OTP send failed:", result);
        throw new Error(result.message || "Failed to send OTP");
      }

      console.log(`[SMS:LIVE][OTP] Sent to ${normalizedPhone}`);
    } catch (error) {
      console.error("[SMS:ERROR] MSG91 API error:", error);
      throw error;
    }
  }

  async sendTransactional(
    phone: string,
    template: SmsTemplate,
    variables: Record<string, string>
  ): Promise<void> {
    const normalizedPhone = this.normalizePhone(phone);

    if (!this.settings.smsEnabled) {
      console.log(`[SMS:DISABLED][${template}] Would send to ${normalizedPhone}:`, variables);
      return;
    }

    if (this.settings.smsMode === "shadow") {
      console.log(`[SMS:SHADOW][${template}] Would send to ${normalizedPhone}:`, variables);
      return;
    }

    if (!this.authKey) {
      console.error("[SMS:ERROR] MSG91_AUTH_KEY not configured");
      throw new Error("SMS provider not configured");
    }

    const templateId = this.getTemplateId(template);
    if (!templateId) {
      console.warn(`[SMS:WARN] No template ID configured for ${template}, skipping`);
      return;
    }

    try {
      const response = await fetch("https://api.msg91.com/api/v5/flow/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "authkey": this.authKey
        },
        body: JSON.stringify({
          flow_id: templateId,
          sender: this.senderId,
          mobiles: `91${normalizedPhone}`,
          ...variables
        })
      });

      const result = await response.json();
      
      if (result.type !== "success") {
        console.error(`[SMS:ERROR] MSG91 ${template} send failed:`, result);
        throw new Error(result.message || "Failed to send SMS");
      }

      console.log(`[SMS:LIVE][${template}] Sent to ${normalizedPhone}`);
    } catch (error) {
      console.error(`[SMS:ERROR] MSG91 API error for ${template}:`, error);
      throw error;
    }
  }

  private normalizePhone(phone: string): string {
    let normalized = phone.replace(/\D/g, "");
    if (normalized.startsWith("91") && normalized.length === 12) {
      normalized = normalized.slice(2);
    }
    if (normalized.startsWith("0") && normalized.length === 11) {
      normalized = normalized.slice(1);
    }
    return normalized;
  }

  private getTemplateId(template: SmsTemplate): string | undefined {
    const templateMap: Record<SmsTemplate, string | undefined> = {
      otp_login: process.env.MSG91_OTP_TEMPLATE_ID,
      otp_forgot_password: process.env.MSG91_OTP_TEMPLATE_ID,
      trip_created: process.env.MSG91_TRIP_CREATED_TEMPLATE_ID,
      bid_accepted: process.env.MSG91_BID_ACCEPTED_TEMPLATE_ID,
      trip_assigned: process.env.MSG91_TRIP_ASSIGNED_TEMPLATE_ID,
      trip_completed: process.env.MSG91_TRIP_COMPLETED_TEMPLATE_ID,
      transporter_approved: process.env.MSG91_TRANSPORTER_APPROVED_TEMPLATE_ID,
      transporter_rejected: process.env.MSG91_TRANSPORTER_REJECTED_TEMPLATE_ID
    };
    return templateMap[template];
  }
}
