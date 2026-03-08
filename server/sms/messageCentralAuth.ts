// Uses native fetch (Node 18+)

// The base REST API URL
const MESSAGE_CENTRAL_BASE_URL = "https://cpaas.messagecentral.com";

let cachedAuthToken: string | null = null;
let tokenExpiresAt: number | null = null;

/**
 * Gets the Message Central auth token.
 * It uses the CUSTOMER ID and KEY from the environment variables.
 * Caches the token to avoid hitting the auth endpoint continuously.
 */
export async function getMessageCentralToken(): Promise<string> {
    // If we have a cached token that isn't expired (leave a 10 min buffer), use it.
    if (cachedAuthToken && tokenExpiresAt && Date.now() < tokenExpiresAt - 10 * 60 * 1000) {
        return cachedAuthToken;
    }

    const customerId = process.env.MESSAGE_CENTRAL_CUSTOMER_ID || "C-B5A348A6682248A";
    const key = process.env.MESSAGE_CENTRAL_KEY;

    if (!key) {
        console.warn("MESSAGE_CENTRAL_KEY is missing from environment. OTP services may fail.");
    }

    // Build the auth url
    const url = `${MESSAGE_CENTRAL_BASE_URL}/auth/v1/authentication/token?customerId=${encodeURIComponent(customerId)}&key=${encodeURIComponent(key || "")}&scope=NEW`;

    const response = await fetch(url, {
        method: "GET",
        headers: {
            "accept": "*/*"
        }
    });

    if (!response.ok) {
        const text = await response.text();
        console.error(`[Message Central] Token fetch failed with status ${response.status}: ${text}`);
        throw new Error(`Failed to authenticate with Message Central: ${response.status}`);
    }

    const data = await response.json();
    if (data.responseCode !== 200) {
        console.error(`[Message Central] Token fetch failed:`, data);
        throw new Error(`Message Central gave non-200 response: ${data.message || "Unknown error"}`);
    }

    cachedAuthToken = data.token || data.data?.authToken || data.authToken || data.token; // Fallbacks based on usual payload patterns if undocumented

    // The documentation says it returns an authToken. Let's dig it securely:
    if (data.token) {
        cachedAuthToken = data.token;
    } else if (data.data?.authToken) {
        cachedAuthToken = data.data.authToken;
    } else if (data.authToken) {
        cachedAuthToken = data.authToken;
    } else if (typeof data === 'string') {
        // fallback if it just returns the string
        cachedAuthToken = data;
    } else {
        throw new Error("Could not extract authToken from Message Central response");
    }

    // Typically tokens have exp time, assume 24 hours if not strictly provided
    tokenExpiresAt = Date.now() + 24 * 60 * 60 * 1000;

    return cachedAuthToken!;
}

/**
 * Sends a single OTP SMS using Message Central.
 * Returns the `verificationId` required for validation.
 */
export async function sendVerificationOtp(phone: string): Promise<string> {
    // Ensure dialcode. The API example uses 91 directly in the query, but we'll extract it or default to 91
    // Waykel phones are 10 digits internally in India usually.
    let cleanPhone = phone.replace(/[^0-9]/g, "");
    let countryCode = "91";

    if (cleanPhone.length > 10 && cleanPhone.startsWith("91")) {
        countryCode = "91";
        cleanPhone = cleanPhone.substring(2);
    }

    const token = await getMessageCentralToken();
    const url = `${MESSAGE_CENTRAL_BASE_URL}/verification/v3/send?countryCode=${countryCode}&flowType=SMS&mobileNumber=${cleanPhone}`;

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "authToken": token,
            "accept": "*/*"
        }
    });

    if (!response.ok) {
        const text = await response.text();
        console.error(`[Message Central] Send OTP failed with status ${response.status}: ${text}`);
        throw new Error(`Failed to send OTP via Message Central: ${response.status}`);
    }

    const data = await response.json();
    if (data.responseCode !== 200) {
        console.error(`[Message Central] Send OTP API failed:`, data);
        throw new Error(`Message Central failed to send OTP: ${data.errorMessage || data.message}`);
    }

    return data.data.verificationId;
}

/**
 * Validates the OTP with Message Central.
 * Returns true if VERIFICATION_COMPLETED.
 */
export async function validateVerificationOtp(verificationId: string, code: string): Promise<boolean> {
    const token = await getMessageCentralToken();
    const url = `${MESSAGE_CENTRAL_BASE_URL}/verification/v3/validateOtp?verificationId=${encodeURIComponent(verificationId)}&code=${encodeURIComponent(code)}`;

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "authToken": token,
            "accept": "*/*"
        }
    });

    const text = await response.text();
    if (!response.ok) {
        console.error(`[Message Central] Validate OTP failed with status ${response.status}: ${text}`);
        return false; // Typically bad request or 400 for wrong OTP
    }

    try {
        const data = JSON.parse(text);

        if (data.responseCode === 200 && data.data?.verificationStatus === "VERIFICATION_COMPLETED") {
            return true;
        }

        if (data.responseCode === 702 || data.responseCode === 700 || data.responseCode === 705) {
            // 702 = WRONG_OTP_PROVIDED, 700 = VERIFICATION_FAILED, 705 = VERIFICATION_EXPIRED
            console.warn(`[Message Central] Validation failed: Code ${data.responseCode}`);
            return false;
        }

        console.error(`[Message Central] Validate OTP API returned non-success code:`, data);
        return false;
    } catch (err) {
        console.error(`[Message Central] Failed to parse validate OTP response`, err);
        return false;
    }
}
