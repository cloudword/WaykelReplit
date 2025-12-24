// In development, relative API calls will proxy to the dev server
// In production, set VITE_API_BASE_URL to the API origin (e.g. https://api.waykel.com)
export const CUSTOMER_API_BASE = import.meta.env.VITE_API_BASE_URL || "";
