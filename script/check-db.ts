import { db } from '../server/db.js';
import { transporters, documents } from '../shared/schema.js';

async function checkDb() {
    try {
        const allTransporters = await db.select().from(transporters);
        console.log('Transporters:', allTransporters.map(t => ({ id: t.id, name: t.companyName, status: t.status, vStatus: t.verificationStatus, type: t.transporterType })));

        if (allTransporters.length > 0) {
            const tId = allTransporters[0].id;
            const docs = await db.select().from(documents);
            console.log('Docs:', docs.filter(d => Boolean(allTransporters.find(t => t.id === d.transporterId || t.id === d.entityId))).map(d => ({ id: d.id, type: d.type, entityType: d.entityType, status: d.status, tId: d.transporterId, eId: d.entityId })));

            const { computeTransporterEligibility } = await import('../server/routes.js');
            try {
                const eligibility = await computeTransporterEligibility(tId);
                console.log('Eligibility for first transporter:', eligibility);
            } catch (e) {
                console.log('Could not run computeTransporterEligibility');
            }
        }
    } catch (e) {
        console.error(e);
    }
}
checkDb().finally(() => process.exit(0));
