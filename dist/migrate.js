"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = require("./config/database");
const firebaseService_1 = require("./services/firebaseService");
const models_1 = require("./models");
dotenv_1.default.config();
const parseDate = (timestamp) => {
    if (!timestamp)
        return null;
    if (typeof timestamp.toDate === 'function')
        return timestamp.toDate();
    if (timestamp instanceof Date)
        return timestamp;
    if (typeof timestamp === 'string' || typeof timestamp === 'number')
        return new Date(timestamp);
    return null;
};
const migrateData = async () => {
    try {
        console.log('🔄 Memulai proses migrasi data dari Firestore ke MySQL...');
        await (0, database_1.connectDB)();
        // 1. Villages
        console.log('\n📦 Migrasi Villages...');
        const villagesSnap = await firebaseService_1.db.collection('villages').get();
        for (const doc of villagesSnap.docs) {
            const data = doc.data();
            const cleanId = doc.id.trim();
            await models_1.Village.findOrCreate({
                where: { id: cleanId },
                defaults: {
                    id: cleanId,
                    name: data.name || 'Desa Tanpa Nama',
                    address: data.address || '',
                    uniqueCode: data.uniqueCode || null,
                    config: data.config || null,
                }
            });
        }
        console.log(`✅ Berhasil migrasi ${villagesSnap.docs.length} Villages.`);
        // 2. Roles (dari config villages)
        // Walaupun user punya roles, kita kumpulkan semua kemungkinan roles dari semua village.
        // Atau bisa juga biarkan roles otomatis dibuat saat iterasi user jika belum ada.
        // 3. Users
        console.log('\n📦 Migrasi Users...');
        const usersSnap = await firebaseService_1.db.collection('users').get();
        let userRolesCount = 0;
        for (const doc of usersSnap.docs) {
            const data = doc.data();
            let villageId = data.villageId ? String(data.villageId).trim() : null;
            await models_1.User.findOrCreate({
                where: { uid: doc.id.trim() },
                defaults: {
                    uid: doc.id.trim(),
                    name: data.name || data.namaLengkap || 'Unknown User',
                    email: data.email || `${doc.id}@unknown.com`,
                    photoUrl: data.photoUrl || null,
                    foto: data.foto || null,
                    status: data.status || 'INCOMPLETE',
                    villageId: villageId
                }
            });
            // Proses Roles — simpan userId langsung di tabel roles
            const rolesArr = data.roles && Array.isArray(data.roles) ? data.roles : [];
            const roleVillageId = villageId || null;
            for (const roleName of rolesArr) {
                const roleId = `role_${roleVillageId || 'global'}_${roleName}_${doc.id.substring(0, 8)}`;
                await models_1.Role.findOrCreate({
                    where: { id: roleId },
                    defaults: { id: roleId, name: roleName, userId: doc.id.trim(), villageId: roleVillageId }
                });
                userRolesCount++;
            }
        }
        console.log(`✅ Berhasil migrasi ${usersSnap.docs.length} Users dan ${userRolesCount} relasi Roles.`);
        // 4. Menus
        console.log('\n📦 Migrasi Menus...');
        const menusSnap = await firebaseService_1.db.collection('menus').get();
        for (const doc of menusSnap.docs) {
            const data = doc.data();
            await models_1.Menu.findOrCreate({
                where: { id: doc.id.trim() },
                defaults: {
                    id: doc.id.trim(),
                    isActive: data.isActive !== false,
                    description: data.description || '',
                    villageId: data.villageId ? String(data.villageId).trim() : null
                }
            });
        }
        console.log(`✅ Berhasil migrasi ${menusSnap.docs.length} Menus.`);
        // 5. Chat Messages
        console.log('\n📦 Migrasi Chat Messages...');
        const chatsSnap = await firebaseService_1.db.collection('chat_messages').get();
        let chatCount = 0;
        for (const doc of chatsSnap.docs) {
            const data = doc.data();
            // Validasi FK: Pastikan senderUid dan receiverUid ada di tabel users
            if (data.senderUid && data.receiverUid && data.villageId) {
                const senderExists = await models_1.User.findByPk(data.senderUid);
                const receiverExists = await models_1.User.findByPk(data.receiverUid);
                const villageExists = await models_1.Village.findByPk(data.villageId);
                if (senderExists && receiverExists && villageExists) {
                    await models_1.ChatMessage.findOrCreate({
                        where: { id: doc.id.trim() },
                        defaults: {
                            id: doc.id.trim(),
                            senderUid: String(data.senderUid).trim(),
                            receiverUid: String(data.receiverUid).trim(),
                            message: data.message || '',
                            isRead: data.isRead || false,
                            villageId: String(data.villageId).trim(),
                            createdAt: parseDate(data.timestamp) || new Date()
                        }
                    });
                    chatCount++;
                }
            }
        }
        console.log(`✅ Berhasil migrasi ${chatCount} Chat Messages (dari total ${chatsSnap.docs.length}).`);
        // 6. Slides
        console.log('\n📦 Migrasi Slides...');
        const slidesSnap = await firebaseService_1.db.collection('slides').get();
        for (const doc of slidesSnap.docs) {
            const data = doc.data();
            await models_1.Slide.findOrCreate({
                where: { id: doc.id },
                defaults: {
                    id: doc.id,
                    imageUrl: data.imageUrl || '',
                    title: data.title || '',
                    description: data.description || '',
                    isActive: data.isActive !== false,
                    villageId: data.villageId || null
                }
            });
        }
        console.log(`✅ Berhasil migrasi ${slidesSnap.docs.length} Slides.`);
        // 7. Schedules
        console.log('\n📦 Migrasi Schedules...');
        const schedsSnap = await firebaseService_1.db.collection('schedules').get();
        let schedCount = 0;
        for (const doc of schedsSnap.docs) {
            const data = doc.data();
            if (data.nik && data.villageId) {
                await models_1.Schedule.findOrCreate({
                    where: { nik: data.nik },
                    defaults: {
                        nik: data.nik,
                        namaLengkap: data.namaLengkap || data.name || '',
                        hari: data.hari || data.day || '',
                        villageId: data.villageId
                    }
                });
                schedCount++;
            }
        }
        console.log(`✅ Berhasil migrasi ${schedCount} Schedules.`);
        // 8. Tariffs
        console.log('\n📦 Migrasi Tariffs...');
        const tariffsSnap = await firebaseService_1.db.collection('tariffs').get();
        let tariffCount = 0;
        for (const doc of tariffsSnap.docs) {
            const data = doc.data();
            if (data.villageId) {
                await models_1.Tariff.findOrCreate({
                    where: { id: doc.id },
                    defaults: {
                        id: doc.id,
                        name: data.name || '',
                        amount: data.amount || 0,
                        type: data.type || 'BULANAN',
                        isActive: data.isActive !== false,
                        villageId: data.villageId
                    }
                });
                tariffCount++;
            }
        }
        console.log(`✅ Berhasil migrasi ${tariffCount} Tariffs.`);
        // 9. Exemptions
        console.log('\n📦 Migrasi Exemptions...');
        const exemptionsSnap = await firebaseService_1.db.collection('exemptions').get();
        let exempCount = 0;
        for (const doc of exemptionsSnap.docs) {
            const data = doc.data();
            if (data.tariffId && data.villageId && data.kkId) {
                const tariffExists = await models_1.Tariff.findByPk(data.tariffId);
                if (tariffExists) {
                    await models_1.Exemption.findOrCreate({
                        where: { id: doc.id },
                        defaults: {
                            id: doc.id,
                            kkId: data.kkId,
                            kkName: data.kkName || '',
                            tariffId: data.tariffId,
                            tariffName: data.tariffName || '',
                            reason: data.reason || '',
                            startDate: parseDate(data.startDate),
                            endDate: parseDate(data.endDate),
                            villageId: data.villageId
                        }
                    });
                    exempCount++;
                }
            }
        }
        console.log(`✅ Berhasil migrasi ${exempCount} Exemptions.`);
        // 10. Inventory Items
        console.log('\n📦 Migrasi Inventory Items...');
        const itemsSnap = await firebaseService_1.db.collection('inventory_items').get();
        let itemCount = 0;
        for (const doc of itemsSnap.docs) {
            const data = doc.data();
            if (data.villageId) {
                await models_1.InventoryItem.findOrCreate({
                    where: { id: doc.id },
                    defaults: {
                        id: doc.id,
                        name: data.name || '',
                        stock: data.stock || 0,
                        fee: data.fee || 0,
                        villageId: data.villageId
                    }
                });
                itemCount++;
            }
        }
        console.log(`✅ Berhasil migrasi ${itemCount} Inventory Items.`);
        // 11. Inventory Loans
        console.log('\n📦 Migrasi Inventory Loans...');
        const loansSnap = await firebaseService_1.db.collection('inventory_loans').get();
        let loanCount = 0;
        for (const doc of loansSnap.docs) {
            const data = doc.data();
            if (data.itemId && data.villageId) {
                const itemExists = await models_1.InventoryItem.findByPk(data.itemId);
                if (itemExists) {
                    await models_1.InventoryLoan.findOrCreate({
                        where: { id: doc.id },
                        defaults: {
                            id: doc.id,
                            itemId: data.itemId,
                            itemName: data.itemName || '',
                            borrowerName: data.borrowerName || '',
                            quantity: data.quantity || 1,
                            days: data.days || 1,
                            feeTotal: data.feeTotal || 0,
                            status: data.status || 'DIPINJAM',
                            villageId: data.villageId,
                            timestamp: parseDate(data.timestamp) || new Date()
                        }
                    });
                    loanCount++;
                }
            }
        }
        console.log(`✅ Berhasil migrasi ${loanCount} Inventory Loans.`);
        // 12. Dues Journals
        console.log('\n📦 Migrasi Dues Journals...');
        const journalsSnap = await firebaseService_1.db.collection('dues_journals').get();
        let journalCount = 0;
        for (const doc of journalsSnap.docs) {
            const data = doc.data();
            if (data.villageId) {
                await models_1.DuesJournal.findOrCreate({
                    where: { id: doc.id },
                    defaults: {
                        id: doc.id,
                        villageId: data.villageId,
                        kkId: data.kkId || null,
                        amount: data.amount || 0,
                        journalType: data.journalType || 'UMUM',
                        type: data.type || 'Pemasukan',
                        description: data.description || '',
                        tariffId: data.tariffId || null,
                        recordedBy: data.recordedBy || null,
                        date: parseDate(data.date) || parseDate(data.timestamp) || new Date()
                    }
                });
                journalCount++;
            }
        }
        console.log(`✅ Berhasil migrasi ${journalCount} Dues Journals.`);
        // 13. Jimpitan History
        console.log('\n📦 Migrasi Jimpitan History...');
        const jimpitanSnap = await firebaseService_1.db.collection('jimpitan_history').get();
        let jimpitanCount = 0;
        for (const doc of jimpitanSnap.docs) {
            const data = doc.data();
            if (data.villageId) {
                await models_1.JimpitanHistory.findOrCreate({
                    where: { id: doc.id },
                    defaults: {
                        id: doc.id,
                        villageId: data.villageId,
                        schedulesNik: data.schedulesNik || data.nik || null,
                        amountCollected: data.amountCollected || data.amount || 0,
                        date: parseDate(data.date) || parseDate(data.timestamp) || new Date()
                    }
                });
                jimpitanCount++;
            }
        }
        console.log(`✅ Berhasil migrasi ${jimpitanCount} Jimpitan History.`);
        console.log('\n🎉 PROSES MIGRASI SELESAI 🎉');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Terjadi kesalahan saat migrasi:', error);
        process.exit(1);
    }
};
migrateData();
