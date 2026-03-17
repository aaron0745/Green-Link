const { Client, Databases, ID } = require('node-appwrite');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Map VITE_ variables back to what node-appwrite might expect if needed, 
// but we'll just use the VITE_ ones directly.
const endpoint = process.env.VITE_APPWRITE_ENDPOINT;
const projectId = process.env.VITE_APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY; // This one should be in greenlink/.env
const databaseId = process.env.VITE_APPWRITE_DATABASE_ID;

if (!apiKey) {
    console.error("❌ APPWRITE_API_KEY is missing. Please provide it in the .env file.");
    process.exit(1);
}

async function setup() {
    const client = new Client()
        .setEndpoint(endpoint)
        .setProject(projectId)
        .setKey(apiKey);

    const databases = new Databases(client);

    console.log("🚀 Starting Green-link Appwrite Setup...");

    async function getOrCreateCollection(dbId, name) {
        try {
            const collections = await databases.listCollections(dbId);
            const existing = collections.collections.find(c => c.name === name);
            if (existing) {
                console.log(`ℹ️ Collection "${name}" already exists: ${existing.$id}`);
                return existing.$id;
            }
            const collection = await databases.createCollection(dbId, ID.unique(), name);
            console.log(`✅ Collection "${name}" created: ${collection.$id}`);
            return collection.$id;
        } catch (e) {
            console.error(`❌ Error creating collection "${name}":`, e.message);
            return null;
        }
    }

    async function createAttributeIfNotExists(dbId, collId, key, type, size, required, isArray = false) {
        try {
            if (type === 'string') {
                await databases.createStringAttribute(dbId, collId, key, size, required, null, isArray);
            } else if (type === 'integer') {
                await databases.createIntegerAttribute(dbId, collId, key, required, null, null, null, isArray);
            } else if (type === 'float') {
                await databases.createFloatAttribute(dbId, collId, key, required, null, null, null, isArray);
            } else if (type === 'boolean') {
                await databases.createBooleanAttribute(dbId, collId, key, required, null, isArray);
            }
            console.log(`  └─ Attribute "${key}" created.`);
        } catch (e) {
            if (e.message.includes('already exists')) {
                // Skip silently or log info
            } else {
                console.log(`  └─ ⚠️ Attribute "${key}" failed: ${e.message}`);
            }
        }
    }

    async function deleteAttributeIfExists(dbId, collId, key) {
        try {
            await databases.deleteAttribute(dbId, collId, key);
            console.log(`  └─ Attribute "${key}" deleted (deprecated).`);
        } catch (e) {}
    }

    try {
        // 1. Households
        const hId = await getOrCreateCollection(databaseId, 'Households');
        if (hId) {
            await deleteAttributeIfExists(databaseId, hId, 'segregationCompliance');
            await createAttributeIfNotExists(databaseId, hId, 'residentName', 'string', 100, true);
            await createAttributeIfNotExists(databaseId, hId, 'email', 'string', 100, true);
            await createAttributeIfNotExists(databaseId, hId, 'password', 'string', 100, true);
            await createAttributeIfNotExists(databaseId, hId, 'address', 'string', 255, true);
            await createAttributeIfNotExists(databaseId, hId, 'ward', 'integer', null, true);
            await createAttributeIfNotExists(databaseId, hId, 'phone', 'string', 20, true);
            await createAttributeIfNotExists(databaseId, hId, 'otp', 'string', 6, false);
            await createAttributeIfNotExists(databaseId, hId, 'otpExpiry', 'string', 50, false);
            await createAttributeIfNotExists(databaseId, hId, 'paymentStatus', 'string', 20, true);
            await createAttributeIfNotExists(databaseId, hId, 'monthlyFee', 'float', null, true);
            await createAttributeIfNotExists(databaseId, hId, 'lastCollectionDate', 'string', 50, false);
            await createAttributeIfNotExists(databaseId, hId, 'wetWaste', 'float', null, false);
            await createAttributeIfNotExists(databaseId, hId, 'dryWaste', 'float', null, false);
            await createAttributeIfNotExists(databaseId, hId, 'rejectWaste', 'float', null, false);
            await createAttributeIfNotExists(databaseId, hId, 'collectionStatus', 'string', 20, true);
            await createAttributeIfNotExists(databaseId, hId, 'assignedCollector', 'string', 50, false);
            await createAttributeIfNotExists(databaseId, hId, 'paymentMode', 'string', 20, false); // offline, online, none
        }

        // 2. Collectors
        const cId = await getOrCreateCollection(databaseId, 'Collectors');
        if (cId) {
            await createAttributeIfNotExists(databaseId, cId, 'name', 'string', 100, true);
            await createAttributeIfNotExists(databaseId, cId, 'email', 'string', 100, true);
            await createAttributeIfNotExists(databaseId, cId, 'phone', 'string', 20, true);
            await createAttributeIfNotExists(databaseId, cId, 'password', 'string', 100, false);
            await createAttributeIfNotExists(databaseId, cId, 'otp', 'string', 6, false);
            await createAttributeIfNotExists(databaseId, cId, 'otpExpiry', 'string', 50, false);
            await createAttributeIfNotExists(databaseId, cId, 'ward', 'integer', null, true, true); // Array
            await createAttributeIfNotExists(databaseId, cId, 'status', 'string', 20, true);
            await createAttributeIfNotExists(databaseId, cId, 'totalCollections', 'integer', null, true);
            await createAttributeIfNotExists(databaseId, cId, 'avatar', 'string', 10, false);
            await createAttributeIfNotExists(databaseId, cId, 'lat', 'float', null, false);
            await createAttributeIfNotExists(databaseId, cId, 'lng', 'float', null, false);
            await createAttributeIfNotExists(databaseId, cId, 'lastSeen', 'string', 50, false);
        }

        // 3. Collection Logs
        const lId = await getOrCreateCollection(databaseId, 'CollectionLogs');
        if (lId) {
            await createAttributeIfNotExists(databaseId, lId, 'collectorId', 'string', 50, true);
            await createAttributeIfNotExists(databaseId, lId, 'collectorName', 'string', 100, true);
            await createAttributeIfNotExists(databaseId, lId, 'householdId', 'string', 50, true);
            await createAttributeIfNotExists(databaseId, lId, 'residentName', 'string', 100, true);
            await createAttributeIfNotExists(databaseId, lId, 'timestamp', 'string', 50, true);
            await createAttributeIfNotExists(databaseId, lId, 'location', 'string', 255, true);
            await createAttributeIfNotExists(databaseId, lId, 'status', 'string', 20, true);
            await createAttributeIfNotExists(databaseId, lId, 'amountCollected', 'float', null, true);
            await createAttributeIfNotExists(databaseId, lId, 'paymentMode', 'string', 20, false); // offline, online
        }

        // 4. Routes
        const rId = await getOrCreateCollection(databaseId, 'Routes');
        if (rId) {
            await createAttributeIfNotExists(databaseId, rId, 'name', 'string', 100, true);
            await createAttributeIfNotExists(databaseId, rId, 'collectorId', 'string', 50, true);
            await createAttributeIfNotExists(databaseId, rId, 'ward', 'integer', null, true);
            await createAttributeIfNotExists(databaseId, rId, 'status', 'string', 20, true); // active, completed
            await createAttributeIfNotExists(databaseId, rId, 'startTime', 'string', 50, false);
            await createAttributeIfNotExists(databaseId, rId, 'endTime', 'string', 50, false);
            await createAttributeIfNotExists(databaseId, rId, 'totalHouses', 'integer', null, true);
            await createAttributeIfNotExists(databaseId, rId, 'collectedHouses', 'integer', null, true);
            await createAttributeIfNotExists(databaseId, rId, 'rawDate', 'string', 20, false);
        }

        console.log(`
--- SETUP COMPLETE ---`);
        console.log("Update your .env file with these IDs if they changed:");
        console.log(`VITE_APPWRITE_COLLECTION_HOUSEHOLDS=${hId}`);
        console.log(`VITE_APPWRITE_COLLECTION_COLLECTORS=${cId}`);
        console.log(`VITE_APPWRITE_COLLECTION_TRANSACTIONS=${lId}`);
        console.log(`VITE_APPWRITE_COLLECTION_ROUTES=${rId}`);
        
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

setup();