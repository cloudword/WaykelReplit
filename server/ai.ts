import { GoogleGenerativeAI } from "@google/generative-ai";
import { VEHICLE_TYPES } from "@shared/vehicleData";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

export async function parseBookingPrompt(prompt: string) {
    if (!genAI) {
        throw new Error("AI parsing is not configured. GEMINI_API_KEY is missing.");
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const vehicleTypeCodeList = VEHICLE_TYPES.map(v => `${v.code} (${v.name})`).join(", ");

    const systemPrompt = `
    You are a logistics assistant for Waykel, a commercial vehicle booking platform in India.
    Your task is to extract trip details from a user's natural language request into a valid JSON object.

    The JSON object must have the following keys:
    - pickupLocation: string (City, Area, or specific address)
    - dropLocation: string (City, Area, or specific address)
    - cargoType: string (Type of goods being moved)
    - weightValue: string (Numeric value of weight)
    - weightUnit: "kg" | "tons" (Unit of weight)
    - requiredVehicleType: string (The code of the vehicle type from the list below)
    - date: string (YYYY-MM-DD format. If "tomorrow", use tomorrow's date. Today is ${new Date().toISOString().split('T')[0]})
    - pickupTime: string (HH:mm format)
    - budgetPrice: string (Numeric value of the budget if mentioned)

    AVAILABLE VEHICLE CODES:
    ${vehicleTypeCodeList}

    If a field is not mentioned, return an empty string or null.
    Important: Only return the JSON object, nothing else. No markdown blocks.

    User Request: "${prompt}"
  `;

    try {
        const result = await model.generateContent(systemPrompt);
        const response = await result.response;
        const text = response.text();

        // Clean up potential markdown formatting
        const cleanedText = text.replace(/```json|```/g, "").trim();
        return JSON.parse(cleanedText);
    } catch (error) {
        console.error("Gemini Parsing Error:", error);
        throw new Error("Failed to parse booking request with AI.");
    }
}
