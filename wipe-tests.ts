import 'dotenv/config';
import { pool } from './server/db.js';

async function wipeTestAccounts() {
    console.log('Starting DB cleanup for test accounts...');

    const testPhones = ['9999999999', '8888888888'];

    try {
        for (const phone of testPhones) {
            console.log(`Wiping data for ${phone}...`);

            // Clean up OTP sessions
            await pool.query('DELETE FROM verification_sessions WHERE phone = $1', [phone]);

            // Find the user
            const result = await pool.query('SELECT * FROM users WHERE phone = $1', [phone]);
            const user = result.rows[0];

            if (user) {
                // Delete related profiles if they exist
                if (user.transporter_id) {
                    console.log(`Deleting transporter profile ${user.transporter_id}`);
                    await pool.query('DELETE FROM transporters WHERE id = $1', [user.transporter_id]);
                }

                if (user.driver_id) {
                    console.log(`Deleting driver profile ${user.driver_id}`);
                    await pool.query('DELETE FROM "Drivers" WHERE id = $1', [user.driver_id]);
                    await pool.query('DELETE FROM drivers WHERE id = $1', [user.driver_id]).catch(() => { }); // Try both casing
                }

                // Finally delete the user
                await pool.query('DELETE FROM users WHERE phone = $1', [phone]);
                console.log(`Deleted user ${phone}`);
            } else {
                console.log(`No user found for ${phone}`);
            }
        }

        console.log('Cleanup completed successfully!');
    } catch (error) {
        console.error('Error wiping test accounts:', error);
    }
    process.exit(0);
}

wipeTestAccounts();
