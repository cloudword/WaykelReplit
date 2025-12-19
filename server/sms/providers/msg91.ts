import { SmsProvider, SmsEvent, SMS_TEMPLATE_KEYS, SmsSettings } from "../smsProvider";

export class Msg91Provider implements SmsProvider {
  private settings: SmsSettings;
  private authKey: string | undefined;
  private senderId: string;

  constructor(settings: SmsSettings) {
    this.settings = settings;
    this.authKey = process.env.MSG91_AUTH_KEY;
    this.senderId = process.env.MSG91_SENDER_ID || "WAYKEL";
  }

  async sendOtp(phone: string, otp: string): Promise<void> {
    const normalizedPhone = this.normalizePhone(phone);

    if (!this.settings.smsEnabled) {
      console.log(`[SMS:DISABLED][OTP] Would send to ${normalizedPhone}: ${otp}`);
      return;
    }

    if (this.settings.smsMode === "shadow") {
      console.log(`[SMS:SHADOW][OTP] Would send to +91${normalizedPhone}: ${otp}`);
      return;
    }

    if (!this.authKey) {
      console.error("[SMS:ERROR] MSG91_AUTH_KEY not configured");
      throw new Error("SMS provider not configured");
    }

    const templateKey = SMS_TEMPLATE_KEYS[SmsEvent.OTP];
    const templateId = this.settings.smsTemplates[templateKey];
    
    if (!templateId) {
      console.error(`[SMS:ERROR] Template ID not configured for ${templateKey}`);
      throw new Error(`Template ID not configured for ${templateKey}`);
    }

    try {
      const params = new URLSearchParams({
        template_id: templateId,
        mobile: `91${normalizedPhone}`,
        authkey: this.authKey,
        otp: otp,
        otp_expiry: "10",
        realTimeResponse: "1"
      });

      const response = await fetch(`https://control.msg91.com/api/v5/otp?${params.toString()}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });

      const result = await response.json();
      
      if (result.type !== "success") {
        console.error("[SMS:ERROR] MSG91 OTP send failed:", result);
        throw new Error(result.message || "Failed to send OTP");
      }

      console.log(`[SMS:LIVE][OTP] Sent to +91${normalizedPhone}`);
    } catch (error) {
      console.error("[SMS:ERROR] MSG91 API error:", error);
      throw error;
    }
  }

  async sendTransactional(
    phone: string,
    event: SmsEvent,
    variables: Record<string, string>
  ): Promise<void> {
    const normalizedPhone = this.normalizePhone(phone);
    const templateKey = SMS_TEMPLATE_KEYS[event];

    if (!this.settings.smsEnabled) {
      console.log(`[SMS:DISABLED][${event}] Would send to +91${normalizedPhone}:`, variables);
      return;
    }

    if (this.settings.smsMode === "shadow") {
      console.log(`[SMS:SHADOW][${event}] Would send to +91${normalizedPhone}:`, variables);
      return;
    }

    if (!this.authKey) {
      console.error("[SMS:ERROR] MSG91_AUTH_KEY not configured");
      throw new Error("SMS provider not configured");
    }

    const templateId = this.settings.smsTemplates[templateKey];
    if (!templateId) {
      console.warn(`[SMS:WARN] No template ID configured for ${templateKey}, skipping`);
      return;
    }

    try {
      const response = await fetch("https://control.msg91.com/api/v5/flow/", {
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
        console.error(`[SMS:ERROR] MSG91 ${event} send failed:`, result);
        throw new Error(result.message || "Failed to send SMS");
      }

      console.log(`[SMS:LIVE][${event}] Sent to +91${normalizedPhone}`);
    } catch (error) {
      console.error(`[SMS:ERROR] MSG91 API error for ${event}:`, error);
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
}
