/**
 * Normalize phone numbers - strip +91, spaces, dashes for consistent lookup
 * @param phone The phone number string to normalize
 * @returns A 10-digit normalized phone number string
 * @throws Error if the phone number format is invalid
 */
export const normalizePhone = (phone: string): string => {
    if (!phone) return phone;
    // Remove all non-digits
    let normalized = phone.replace(/\D/g, '');
    // Remove leading 91 (India country code) if number is longer than 10 digits
    if (normalized.length === 12 && normalized.startsWith('91')) {
        normalized = normalized.slice(2);
    }
    // Remove leading 0 if number is 11 digits (trunk prefix)
    if (normalized.length === 11 && normalized.startsWith('0')) {
        normalized = normalized.slice(1);
    }
    // Validate final length
    if (normalized.length !== 10) {
        throw new Error('Invalid phone number format. Must be 10 digits.');
    }
    return normalized;
};
