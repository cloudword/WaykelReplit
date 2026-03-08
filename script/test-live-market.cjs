const fs = require('fs');

async function testApi() {
    const API_URL = "https://api.waykel.com/api";

    console.log("Logging in as transporter 2233445566...");
    const loginRes = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: "2233445566", password: "Chamu@123" })
    });

    if (!loginRes.ok) {
        console.error("Login failed:", loginRes.status, await loginRes.text());
        return;
    }

    // Properly extract cookies for node-fetch
    const setCookies = loginRes.headers.getSetCookie();
    const cookies = setCookies.map(c => c.split(';')[0]).join('; ');

    const user = await loginRes.json();
    const role = user.user?.role || user.role;
    console.log("Logged in successfully!", user.user?.name || user.name, role);

    if (role !== 'transporter') {
        console.error("Not a transporter!");
        return;
    }

    console.log("Fetching marketplace rides...");
    const marketRes = await fetch(`${API_URL}/transporter/marketplace`, {
        method: 'GET',
        headers: { 'Cookie': cookies }
    });

    if (!marketRes.ok) {
        console.error("Marketplace fetch failed:", marketRes.status, await marketRes.text());
        return;
    }

    const rides = await marketRes.json();
    console.log(`Found ${rides.length} rides in marketplace.`);

    if (rides.length > 0) {
        console.log("\nTop Rides:");
        rides.slice(0, 10).forEach((r, i) => {
            console.log(`${i + 1}. Ride ${r.id}: ${r.pickupLocation} to ${r.dropLocation}`);
            console.log(`    Score: ${r.matchScore} | Reason: ${r.matchReason}`);
            console.log(`    Date: ${r.date}, Cargo: ${r.cargoType}, Weight: ${r.weight}`);
        });
    }
}

testApi();
