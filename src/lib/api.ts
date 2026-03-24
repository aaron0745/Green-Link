import { databases, DATABASE_ID, HOUSEHOLDS_COLLECTION_ID, ROUTES_COLLECTION_ID, TRANSACTIONS_COLLECTION_ID, COLLECTORS_COLLECTION_ID, teams, functions, FUNCTION_OTP_ID } from './appwrite';
import { Query, ID, ExecutionMethod } from 'appwrite';

const getISTDate = () => {
    return new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
};

const formatIST = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const isWithinLast30Days = (dateStr: string) => {
    if (!dateStr) return false;
    // Handle both YYYY-MM-DD and potentially other formats
    const lastDate = new Date(dateStr);
    const now = getISTDate();
    const diffTime = Math.abs(now.getTime() - lastDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30;
};

export const api = {
    async getHouseholds() {
        const response = await databases.listDocuments(
            DATABASE_ID,
            HOUSEHOLDS_COLLECTION_ID,
            [Query.limit(100)]
        );
        return response.documents.map((h: any) => {
            const isRecent = isWithinLast30Days(h.lastCollectionDate);
            return {
                ...h,
                collectionStatus: isRecent ? h.collectionStatus : 'pending',
                paymentStatus: isRecent ? h.paymentStatus : 'pending'
            };
        });
    },

    async getHousehold(id: string) {
        const h: any = await databases.getDocument(
            DATABASE_ID,
            HOUSEHOLDS_COLLECTION_ID,
            id
        );
        const isRecent = isWithinLast30Days(h.lastCollectionDate);

        return {
            ...h,
            collectionStatus: isRecent ? h.collectionStatus : 'pending',
            paymentStatus: isRecent ? h.paymentStatus : 'pending'
        };
    },

    async getHouseholdByEmail(email: string) {
        const response = await databases.listDocuments(
            DATABASE_ID,
            HOUSEHOLDS_COLLECTION_ID,
            [Query.equal('email', email)]
        );
        const h = response.documents[0];
        if (!h) return null;
        
        const isRecent = isWithinLast30Days(h.lastCollectionDate);

        return {
            ...h,
            collectionStatus: isRecent ? h.collectionStatus : 'pending',
            paymentStatus: isRecent ? h.paymentStatus : 'pending'
        };
    },

    async getHouseholdByPhone(phone: string) {
        const response = await databases.listDocuments(
            DATABASE_ID,
            HOUSEHOLDS_COLLECTION_ID,
            [Query.equal('phone', phone)]
        );
        const h = response.documents[0];
        if (!h) return null;
        
        const isRecent = isWithinLast30Days(h.lastCollectionDate);

        return {
            ...h,
            collectionStatus: isRecent ? h.collectionStatus : 'pending',
            paymentStatus: isRecent ? h.paymentStatus : 'pending'
        };
    },

    async createHousehold(data: any) {
        return await databases.createDocument(
            DATABASE_ID,
            HOUSEHOLDS_COLLECTION_ID,
            ID.unique(),
            data
        );
    },

    async updateHousehold(id: string, data: any) {
        return await databases.updateDocument(
            DATABASE_ID,
            HOUSEHOLDS_COLLECTION_ID,
            id,
            data
        );
    },

    async deleteHousehold(id: string) {
        return await databases.deleteDocument(
            DATABASE_ID,
            HOUSEHOLDS_COLLECTION_ID,
            id
        );
    },

    async getCollectors() {
        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTORS_COLLECTION_ID
        );
        return response.documents;
    },

    async getCollector(id: string) {
        return await databases.getDocument(
            DATABASE_ID,
            COLLECTORS_COLLECTION_ID,
            id
        );
    },

    async getCollectorByEmail(email: string) {
        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTORS_COLLECTION_ID,
            [Query.equal('email', email)]
        );
        return response.documents[0];
    },

    async requestOTP(email: string) {
        // 1. Find User in Households or Collectors
        let userDoc: any = await this.getHouseholdByEmail(email);
        let collectionId = HOUSEHOLDS_COLLECTION_ID;
        
        if (!userDoc) {
            userDoc = await this.getCollectorByEmail(email);
            collectionId = COLLECTORS_COLLECTION_ID;
        }

        if (!userDoc) throw new Error('Email not found in database.');

        // 2. Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 mins

        // 3. Update Database
        await databases.updateDocument(DATABASE_ID, collectionId, userDoc.$id, {
            otp,
            otpExpiry: expiry
        });

        // 4. Trigger Email Sending via Cloud Function
        try {
            await functions.createExecution(
                FUNCTION_OTP_ID, 
                JSON.stringify({
                    email,
                    otp,
                    name: userDoc.name || 'User'
                }),
                false, // async
                '/', // path
                ExecutionMethod.POST
            );
            console.log(`[AUTH] Cloud Function triggered to send OTP to ${email}`);
        } catch (funcError) {
            // Fallback for development if function is not yet deployed
            console.error('Failed to trigger Cloud Function (it may not be deployed yet):', funcError);
            console.log(`[DEV ONLY] OTP for ${email}: ${otp}`);
        }

        return true;
    },

    async resetPasswordWithOTP(email: string, otp: string, newPassword: string) {
        // 1. Find User
        let userDoc: any = await this.getHouseholdByEmail(email);
        let collectionId = HOUSEHOLDS_COLLECTION_ID;
        
        if (!userDoc) {
            userDoc = await this.getCollectorByEmail(email);
            collectionId = COLLECTORS_COLLECTION_ID;
        }

        if (!userDoc) throw new Error('User not found.');

        // 2. Verify OTP
        if (userDoc.otp !== otp) throw new Error('Invalid OTP.');
        if (new Date(userDoc.otpExpiry) < new Date()) throw new Error('OTP expired.');

        // 3. Update Password and Clear OTP
        await databases.updateDocument(DATABASE_ID, collectionId, userDoc.$id, {
            password: newPassword,
            otp: null,
            otpExpiry: null
        });

        return true;
    },

    async getCollectorByPhone(phone: string) {
        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTORS_COLLECTION_ID,
            [Query.equal('phone', phone)]
        );
        return response.documents[0];
    },

    async createCollector(data: any) {
        // 1. Create Team Membership (this also creates/invites the user)
        // Note: You must have a team with ID 'collectors' in your Appwrite console
        try {
            await teams.createMembership(
                'collectors',           // teamId
                ['member'],             // roles
                data.email,             // email
                undefined,              // userId
                undefined,              // phone
                window.location.origin, // url to accept invite
                data.name               // name
            );
        } catch (teamError) {
            console.error('Failed to add to collectors team:', teamError);
            // We continue anyway so the DB record is created, 
            // but the user might need manual auth setup if team creation fails.
        }

        // 2. Create the Database Document
        return await databases.createDocument(
            DATABASE_ID,
            COLLECTORS_COLLECTION_ID,
            ID.unique(),
            data
        );
    },

    async updateCollector(id: string, data: any) {
        return await databases.updateDocument(
            DATABASE_ID,
            COLLECTORS_COLLECTION_ID,
            id,
            data
        );
    },

    async deleteCollector(id: string) {
        return await databases.deleteDocument(
            DATABASE_ID,
            COLLECTORS_COLLECTION_ID,
            id
        );
    },

    async getRoutes() {
        const response = await databases.listDocuments(
            DATABASE_ID,
            ROUTES_COLLECTION_ID,
            [Query.orderDesc('startTime')]
        );
        return response.documents;
    },

    async getRoutesByDate(date: string) {
        const response = await databases.listDocuments(
            DATABASE_ID,
            ROUTES_COLLECTION_ID,
            [Query.equal('rawDate', date)]
        );
        return response.documents;
    },

    async getHouseholdsByWard(ward: number) {
        const response = await databases.listDocuments(
            DATABASE_ID,
            HOUSEHOLDS_COLLECTION_ID,
            [Query.equal('ward', ward), Query.limit(100)]
        );
        return response.documents.map((h: any) => {
            const isRecent = isWithinLast30Days(h.lastCollectionDate);
            return {
                ...h,
                collectionStatus: isRecent ? h.collectionStatus : 'pending',
                paymentStatus: isRecent ? h.paymentStatus : 'pending'
            };
        });
    },

    async assignRoute(collectorId: string, collectorName: string, ward: number, date: string) {
        console.log(`API: Assigning Ward ${ward} to ${collectorName} on ${date}`);
        const route = await databases.createDocument(
            DATABASE_ID,
            ROUTES_COLLECTION_ID,
            ID.unique(),
            {
                name: `Route - ${collectorName} - ${date}`,
                collectorId: collectorId,
                ward: ward,
                status: 'active',
                startTime: `${date} 08:00 AM`,
                rawDate: date,
                totalHouses: 0, 
                collectedHouses: 0
            }
        );

        const houses = await this.getHouseholdsByWard(ward);
        for (const h of houses) {
            await databases.updateDocument(
                DATABASE_ID,
                HOUSEHOLDS_COLLECTION_ID,
                h.$id,
                { assignedCollector: collectorId }
            );
        }
        return route;
    },

    async getDailyAssignment(collectorId: string, date: string) {
        console.log(`API: Checking assignment for collector ${collectorId} on date ${date}`);
        const response = await databases.listDocuments(
            DATABASE_ID,
            ROUTES_COLLECTION_ID,
            [
                Query.equal('collectorId', collectorId),
                Query.equal('rawDate', date)
            ]
        );
        console.log('API: Assignment response total:', response.total);
        return response.documents[0] || null;
    },

    async deleteRoute(routeId: string, ward: number) {
        await databases.deleteDocument(DATABASE_ID, ROUTES_COLLECTION_ID, routeId);
        const houses = await this.getHouseholdsByWard(ward);
        for (const h of houses) {
            await databases.updateDocument(
                DATABASE_ID,
                HOUSEHOLDS_COLLECTION_ID,
                h.$id,
                { assignedCollector: 'unassigned' }
            );
        }
    },

    async getCollectionLogs() {
        const response = await databases.listDocuments(
            DATABASE_ID,
            TRANSACTIONS_COLLECTION_ID,
            [Query.orderDesc('timestamp'), Query.limit(1000)]
        );
        return response.documents;
    },

    async getTodaysLogForHousehold(houseId: string) {
        const datePart = formatIST(getISTDate());
        const response = await databases.listDocuments(
            DATABASE_ID,
            TRANSACTIONS_COLLECTION_ID,
            [
                Query.equal('householdId', houseId),
                Query.startsWith('timestamp', datePart),
                Query.limit(1)
            ]
        );
        return response.documents[0] || null;
    },

    async updateHouseholdStatus(houseId: string, status: string, amount: number = 0, collectorId: string, collectorName: string, residentName: string, location: string, paymentMode?: string, paymentStatus?: string) {
        const now = getISTDate();
        const dateStr = formatIST(now);
        const timeStr = now.toLocaleTimeString("en-US", { hour12: false });

        const updateData: any = { 
            collectionStatus: status,
            lastCollectionDate: dateStr,
            paymentMode: paymentMode || 'none'
        };

        if (paymentStatus) {
            updateData.paymentStatus = paymentStatus;
        } else if (paymentMode === 'offline') {
            updateData.paymentStatus = 'paid';
        }

        await databases.updateDocument(
            DATABASE_ID,
            HOUSEHOLDS_COLLECTION_ID,
            houseId,
            updateData
        );

        const existingLog = await this.getTodaysLogForHousehold(houseId);

        if (existingLog) {
            // If already paid today, keep status as 'paid'
            const newStatus = existingLog.status === 'paid' ? 'paid' : status;
            
            await databases.updateDocument(
                DATABASE_ID,
                TRANSACTIONS_COLLECTION_ID,
                existingLog.$id,
                {
                    collectorId: collectorId !== 'SYSTEM' ? collectorId : existingLog.collectorId,
                    collectorName: collectorId !== 'SYSTEM' ? collectorName : existingLog.collectorName,
                    status: newStatus,
                    amountCollected: Math.max(amount, existingLog.amountCollected || 0),
                    paymentMode: (paymentMode && paymentMode !== 'none') ? paymentMode : existingLog.paymentMode
                }
            );
        } else {
            await databases.createDocument(
                DATABASE_ID,
                TRANSACTIONS_COLLECTION_ID,
                ID.unique(),
                {
                    collectorId,
                    collectorName,
                    householdId: houseId,
                    residentName,
                    timestamp: `${dateStr} ${timeStr}`,
                    location,
                    status,
                    amountCollected: amount,
                    paymentMode: paymentMode || 'none'
                }
            );
        }

        if (status === 'collected' && collectorId !== 'SYSTEM') {
            try {
                const collector: any = await databases.getDocument(DATABASE_ID, COLLECTORS_COLLECTION_ID, collectorId);
                await databases.updateDocument(
                    DATABASE_ID,
                    COLLECTORS_COLLECTION_ID,
                    collectorId,
                    { totalCollections: (collector.totalCollections || 0) + 1 }
                );
            } catch (e) {}
        }
    },

    async payOnline(houseId: string, residentName: string, amount: number) {
        const now = getISTDate();
        const dateStr = formatIST(now);
        const timeStr = now.toLocaleTimeString("en-US", { hour12: false });

        await databases.updateDocument(
            DATABASE_ID,
            HOUSEHOLDS_COLLECTION_ID,
            houseId,
            { 
                paymentStatus: 'paid',
                paymentMode: 'online',
                lastCollectionDate: dateStr
            }
        );

        const existingLog = await this.getTodaysLogForHousehold(houseId);

        if (existingLog) {
            return await databases.updateDocument(
                DATABASE_ID,
                TRANSACTIONS_COLLECTION_ID,
                existingLog.$id,
                {
                    status: 'paid',
                    amountCollected: amount,
                    paymentMode: 'online'
                }
            );
        } else {
            return await databases.createDocument(
                DATABASE_ID,
                TRANSACTIONS_COLLECTION_ID,
                ID.unique(),
                {
                    collectorId: 'SYSTEM',
                    collectorName: 'Resident Portal',
                    householdId: houseId,
                    residentName: residentName,
                    timestamp: `${dateStr} ${timeStr}`,
                    location: 'Online Gateway',
                    status: 'paid',
                    amountCollected: amount,
                    paymentMode: 'online'
                }
            );
        }
    },

    async updateCollectorLocation(collectorId: string, lat: number, lng: number) {
        return await databases.updateDocument(
            DATABASE_ID,
            COLLECTORS_COLLECTION_ID,
            collectorId,
            { 
                lat, 
                lng,
                lastSeen: new Date().toISOString()
            }
        );
    }
};
