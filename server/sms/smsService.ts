import { SmsProvider, SmsTemplate, SmsSettings } from "./smsProvider";
import { Msg91Provider } from "./providers/msg91";
import { storage } from "../storage";

let cachedSettings: SmsSettings | null = null;
let settingsLastFetched = 0;
const SETTINGS_CACHE_TTL = 60000;

async function getSmsSettings(): Promise<SmsSettings> {
  const now = Date.now();
  if (cachedSettings && (now - settingsLastFetched) < SETTINGS_CACHE_TTL) {
    return cachedSettings;
  }

  const platformSettings = await storage.getPlatformSettings();
  cachedSettings = {
    smsEnabled: platformSettings.smsEnabled ?? false,
    smsMode: (platformSettings.smsMode as "shadow" | "live") ?? "shadow",
    smsProvider: (platformSettings.smsProvider as "msg91" | null) ?? null
  };
  settingsLastFetched = now;
  return cachedSettings;
}

function getSmsProvider(settings: SmsSettings): SmsProvider {
  switch (settings.smsProvider) {
    case "msg91":
      return new Msg91Provider(settings);
    default:
      return new Msg91Provider(settings);
  }
}

export async function sendOtpSms(phone: string, otp: string): Promise<void> {
  const settings = await getSmsSettings();
  const provider = getSmsProvider(settings);
  await provider.sendOtp(phone, otp);
}

export async function sendTransactionalSms(
  phone: string,
  template: SmsTemplate,
  variables: Record<string, string>
): Promise<void> {
  const settings = await getSmsSettings();
  const provider = getSmsProvider(settings);
  await provider.sendTransactional(phone, template, variables);
}

export function invalidateSmsSettingsCache(): void {
  cachedSettings = null;
  settingsLastFetched = 0;
}
