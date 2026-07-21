"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sequelize = exports.JimpitanHistory = exports.DuesJournal = exports.InventoryLoan = exports.InventoryItem = exports.Exemption = exports.Tariff = exports.Schedule = exports.Slide = exports.ChatMessage = exports.Menu = exports.UserRole = exports.Role = exports.User = exports.Village = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
Object.defineProperty(exports, "sequelize", { enumerable: true, get: function () { return database_1.sequelize; } });
// ---------------------------
// 1. Model Village (Desa)
// ---------------------------
class Village extends sequelize_1.Model {
}
exports.Village = Village;
Village.init({
    id: { type: sequelize_1.DataTypes.STRING(128), primaryKey: true },
    name: { type: sequelize_1.DataTypes.STRING(255), allowNull: false },
    address: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
    uniqueCode: { type: sequelize_1.DataTypes.STRING(50), unique: true, allowNull: true },
    config: { type: sequelize_1.DataTypes.JSON, allowNull: true },
}, { sequelize: database_1.sequelize, modelName: 'village', tableName: 'villages', timestamps: true });
// ===========================
// Import Modul SaaS Baru
// ===========================
__exportStar(require("./SaaS"), exports);
const SaaS_1 = require("./SaaS");
// ---------------------------
// 2. Model User
// ---------------------------
class User extends sequelize_1.Model {
    uid;
    name;
    email;
    photoUrl;
    foto;
    phoneNumber;
    agama;
    pekerjaan;
    status;
    villageId;
    familyId;
    nik;
    noKK;
    jenisKelamin;
    tempatLahir;
    tanggalLahir;
    statusHubungan;
    statusPerkawinan;
    statusHidup;
    alamat;
    uniqueCode;
    fcmToken;
    isOnline;
    lastSeen;
}
exports.User = User;
User.init({
    uid: { type: sequelize_1.DataTypes.STRING(128), primaryKey: true },
    name: { type: sequelize_1.DataTypes.STRING(255), allowNull: false },
    email: { type: sequelize_1.DataTypes.STRING(255), unique: true, allowNull: false },
    photoUrl: { type: sequelize_1.DataTypes.TEXT('long'), allowNull: true },
    foto: { type: sequelize_1.DataTypes.TEXT('long'), allowNull: true },
    phoneNumber: { type: sequelize_1.DataTypes.STRING(20), allowNull: true },
    agama: { type: sequelize_1.DataTypes.STRING(50), allowNull: true },
    pekerjaan: { type: sequelize_1.DataTypes.STRING(100), allowNull: true },
    status: { type: sequelize_1.DataTypes.STRING(50), defaultValue: 'INCOMPLETE' },
    villageId: { type: sequelize_1.DataTypes.STRING(128), allowNull: true },
    familyId: { type: sequelize_1.DataTypes.STRING(128), allowNull: true },
    nik: { type: sequelize_1.DataTypes.STRING(50), allowNull: true },
    noKK: { type: sequelize_1.DataTypes.STRING(50), allowNull: true },
    jenisKelamin: { type: sequelize_1.DataTypes.STRING(20), allowNull: true },
    tempatLahir: { type: sequelize_1.DataTypes.STRING(100), allowNull: true },
    tanggalLahir: { type: sequelize_1.DataTypes.STRING(20), allowNull: true },
    statusHubungan: { type: sequelize_1.DataTypes.STRING(50), allowNull: true },
    statusPerkawinan: { type: sequelize_1.DataTypes.STRING(50), allowNull: true },
    statusHidup: { type: sequelize_1.DataTypes.STRING(50), allowNull: true },
    alamat: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
    uniqueCode: { type: sequelize_1.DataTypes.STRING(50), allowNull: true },
    fcmToken: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
    isOnline: { type: sequelize_1.DataTypes.BOOLEAN, defaultValue: false },
    lastSeen: { type: sequelize_1.DataTypes.DATE, allowNull: true },
}, { sequelize: database_1.sequelize, modelName: 'user', tableName: 'users', timestamps: true });
// ---------------------------
// 3. Model Role (Jabatan)
// userId langsung di tabel roles (One-to-Many: User hasMany Role)
// ---------------------------
class Role extends sequelize_1.Model {
}
exports.Role = Role;
Role.init({
    id: { type: sequelize_1.DataTypes.STRING(128), primaryKey: true },
    name: { type: sequelize_1.DataTypes.STRING(50), allowNull: false },
    userId: { type: sequelize_1.DataTypes.STRING(128), allowNull: true },
    villageId: { type: sequelize_1.DataTypes.STRING(128), allowNull: true },
}, { sequelize: database_1.sequelize, modelName: 'role', tableName: 'roles', timestamps: true, updatedAt: false });
// UserRole adalah alias ke Role untuk backward compatibility
class UserRole extends sequelize_1.Model {
}
exports.UserRole = UserRole;
UserRole.init({
    id: { type: sequelize_1.DataTypes.STRING(128), primaryKey: true },
    name: { type: sequelize_1.DataTypes.STRING(50), allowNull: false },
    userId: { type: sequelize_1.DataTypes.STRING(128), allowNull: true },
    villageId: { type: sequelize_1.DataTypes.STRING(128), allowNull: true },
}, { sequelize: database_1.sequelize, modelName: 'userRoleAlias', tableName: 'roles', timestamps: true, updatedAt: false });
// ---------------------------
// 3. Model Menu
// ---------------------------
class Menu extends sequelize_1.Model {
}
exports.Menu = Menu;
Menu.init({
    id: { type: sequelize_1.DataTypes.STRING(50), primaryKey: true },
    label: { type: sequelize_1.DataTypes.STRING(255), allowNull: true },
    icon: { type: sequelize_1.DataTypes.STRING(100), allowNull: true },
    order: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 99 },
    position: { type: sequelize_1.DataTypes.STRING(50), defaultValue: 'grid' },
    isCore: { type: sequelize_1.DataTypes.BOOLEAN, defaultValue: false },
    isActive: { type: sequelize_1.DataTypes.BOOLEAN, defaultValue: true },
    description: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
    villageId: { type: sequelize_1.DataTypes.STRING(128), allowNull: true }, // [BARU] Menambahkan villageId
}, { sequelize: database_1.sequelize, modelName: 'menu', tableName: 'menus', timestamps: true });
// ---------------------------
// 4. Model ChatMessage
// ---------------------------
class ChatMessage extends sequelize_1.Model {
    id;
    roomId;
    senderUid;
    senderName;
    receiverUid;
    message;
    isRead;
    isDeleted;
    isEdited;
    villageId;
}
exports.ChatMessage = ChatMessage;
ChatMessage.init({
    id: { type: sequelize_1.DataTypes.STRING(128), primaryKey: true },
    roomId: { type: sequelize_1.DataTypes.STRING(128), allowNull: true },
    senderUid: { type: sequelize_1.DataTypes.STRING(128), allowNull: false },
    senderName: { type: sequelize_1.DataTypes.STRING(255), allowNull: true },
    receiverUid: { type: sequelize_1.DataTypes.STRING(128), allowNull: true },
    message: { type: sequelize_1.DataTypes.TEXT, allowNull: false },
    isRead: { type: sequelize_1.DataTypes.BOOLEAN, defaultValue: false },
    isDeleted: { type: sequelize_1.DataTypes.BOOLEAN, defaultValue: false },
    isEdited: { type: sequelize_1.DataTypes.BOOLEAN, defaultValue: false },
    villageId: { type: sequelize_1.DataTypes.STRING(128), allowNull: true }, // Nullable agar Super Admin bisa kirim pesan lintas desa
}, { sequelize: database_1.sequelize, modelName: 'chatMessage', tableName: 'chat_messages', timestamps: true });
// ---------------------------
// 5. Model Slide (Banner)
// ---------------------------
class Slide extends sequelize_1.Model {
}
exports.Slide = Slide;
Slide.init({
    id: { type: sequelize_1.DataTypes.STRING(128), primaryKey: true, defaultValue: sequelize_1.DataTypes.UUIDV4 },
    title: { type: sequelize_1.DataTypes.STRING(255), allowNull: true },
    subtitle: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
    type: { type: sequelize_1.DataTypes.STRING(50), defaultValue: 'INFO' },
    imageBase64: { type: sequelize_1.DataTypes.TEXT('long'), allowNull: true },
    textColor: { type: sequelize_1.DataTypes.STRING(20), defaultValue: '#FFFFFF' },
    value: { type: sequelize_1.DataTypes.STRING(255), allowNull: true },
    status: { type: sequelize_1.DataTypes.STRING(50), allowNull: true },
    villageId: { type: sequelize_1.DataTypes.STRING(128), allowNull: true }, // [BARU] Banner spesifik per desa
}, { sequelize: database_1.sequelize, modelName: 'slide', tableName: 'slides', timestamps: true });
// ---------------------------
// 6. Model Schedule (Jadwal)
// ---------------------------
class Schedule extends sequelize_1.Model {
}
exports.Schedule = Schedule;
Schedule.init({
    nik: { type: sequelize_1.DataTypes.STRING(50), primaryKey: true },
    namaLengkap: { type: sequelize_1.DataTypes.STRING(255), allowNull: false },
    hari: { type: sequelize_1.DataTypes.STRING(50), allowNull: false },
    villageId: { type: sequelize_1.DataTypes.STRING(128), allowNull: false },
}, { sequelize: database_1.sequelize, modelName: 'schedule', tableName: 'schedules', timestamps: true });
// ---------------------------
// 7. Model Tariff & Exemption
// ---------------------------
class Tariff extends sequelize_1.Model {
}
exports.Tariff = Tariff;
Tariff.init({
    id: { type: sequelize_1.DataTypes.STRING(128), primaryKey: true },
    name: { type: sequelize_1.DataTypes.STRING(255), allowNull: false },
    amount: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    type: { type: sequelize_1.DataTypes.STRING(50), allowNull: false },
    isActive: { type: sequelize_1.DataTypes.BOOLEAN, defaultValue: true },
    villageId: { type: sequelize_1.DataTypes.STRING(128), allowNull: false },
    allowedRoles: { type: sequelize_1.DataTypes.JSON, allowNull: true },
}, { sequelize: database_1.sequelize, modelName: 'tariff', tableName: 'tariffs', timestamps: true });
class Exemption extends sequelize_1.Model {
}
exports.Exemption = Exemption;
Exemption.init({
    id: { type: sequelize_1.DataTypes.STRING(128), primaryKey: true },
    kkId: { type: sequelize_1.DataTypes.STRING(128), allowNull: false },
    kkName: { type: sequelize_1.DataTypes.STRING(255), allowNull: false },
    tariffId: { type: sequelize_1.DataTypes.STRING(128), allowNull: false },
    tariffName: { type: sequelize_1.DataTypes.STRING(255), allowNull: true },
    reason: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
    startDate: { type: sequelize_1.DataTypes.DATEONLY, allowNull: true },
    endDate: { type: sequelize_1.DataTypes.DATEONLY, allowNull: true },
    villageId: { type: sequelize_1.DataTypes.STRING(128), allowNull: false },
}, { sequelize: database_1.sequelize, modelName: 'exemption', tableName: 'exemptions', timestamps: true, updatedAt: false });
// ---------------------------
// 8. Model Inventory
// ---------------------------
class InventoryItem extends sequelize_1.Model {
}
exports.InventoryItem = InventoryItem;
InventoryItem.init({
    id: { type: sequelize_1.DataTypes.STRING(128), primaryKey: true },
    name: { type: sequelize_1.DataTypes.STRING(255), allowNull: false },
    stock: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0 },
    fee: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0 },
    villageId: { type: sequelize_1.DataTypes.STRING(128), allowNull: false },
}, { sequelize: database_1.sequelize, modelName: 'inventoryItem', tableName: 'inventory_items', timestamps: true });
class InventoryLoan extends sequelize_1.Model {
}
exports.InventoryLoan = InventoryLoan;
InventoryLoan.init({
    id: { type: sequelize_1.DataTypes.STRING(128), primaryKey: true },
    itemId: { type: sequelize_1.DataTypes.STRING(128), allowNull: false },
    itemName: { type: sequelize_1.DataTypes.STRING(255), allowNull: true },
    borrowerName: { type: sequelize_1.DataTypes.STRING(255), allowNull: false },
    quantity: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    days: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 1 },
    feeTotal: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0 },
    status: { type: sequelize_1.DataTypes.STRING(50), defaultValue: 'DIPINJAM' },
    villageId: { type: sequelize_1.DataTypes.STRING(128), allowNull: false },
}, { sequelize: database_1.sequelize, modelName: 'inventoryLoan', tableName: 'inventory_loans', timestamps: true });
// ---------------------------
// 9. Model Dues Journal (Jurnal Iuran)
// ---------------------------
class DuesJournal extends sequelize_1.Model {
}
exports.DuesJournal = DuesJournal;
DuesJournal.init({
    id: { type: sequelize_1.DataTypes.STRING(128), primaryKey: true },
    villageId: { type: sequelize_1.DataTypes.STRING(128), allowNull: false },
    kkId: { type: sequelize_1.DataTypes.STRING(128), allowNull: true },
    amount: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    journalType: { type: sequelize_1.DataTypes.STRING(50), allowNull: true }, // IURAN, UMUM, SEWA_INVENTARIS
    type: { type: sequelize_1.DataTypes.STRING(50), allowNull: true }, // Pemasukan, Pengeluaran
    description: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
    tariffId: { type: sequelize_1.DataTypes.STRING(128), allowNull: true },
    recordedBy: { type: sequelize_1.DataTypes.STRING(128), allowNull: true },
    date: { type: sequelize_1.DataTypes.DATEONLY, allowNull: true },
    period: { type: sequelize_1.DataTypes.STRING(50), allowNull: true },
    timestamp: { type: sequelize_1.DataTypes.STRING(128), allowNull: true },
    paidDates: { type: sequelize_1.DataTypes.JSON, allowNull: true },
}, { sequelize: database_1.sequelize, modelName: 'duesJournal', tableName: 'dues_journals', timestamps: true, updatedAt: false });
// ---------------------------
// 10. Model Jimpitan History
// ---------------------------
class JimpitanHistory extends sequelize_1.Model {
}
exports.JimpitanHistory = JimpitanHistory;
JimpitanHistory.init({
    id: { type: sequelize_1.DataTypes.STRING(128), primaryKey: true },
    villageId: { type: sequelize_1.DataTypes.STRING(128), allowNull: false },
    schedulesNik: { type: sequelize_1.DataTypes.STRING(50), allowNull: true },
    amountCollected: { type: sequelize_1.DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    date: { type: sequelize_1.DataTypes.DATEONLY, allowNull: true },
    kkId: { type: sequelize_1.DataTypes.STRING(128), allowNull: true },
    name: { type: sequelize_1.DataTypes.STRING(255), allowNull: true },
    amount: { type: sequelize_1.DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    scannedBy: { type: sequelize_1.DataTypes.STRING(128), allowNull: true },
    scannedByName: { type: sequelize_1.DataTypes.STRING(128), allowNull: true },
    timestamp: { type: sequelize_1.DataTypes.STRING(128), allowNull: true },
    type: { type: sequelize_1.DataTypes.STRING(50), allowNull: true },
}, { sequelize: database_1.sequelize, modelName: 'jimpitanHistory', tableName: 'jimpitan_history', timestamps: true, updatedAt: false });
// ==========================================
// PENGATURAN RELASI (FOREIGN KEYS)
// ==========================================
// User milik Village
Village.hasMany(User, { foreignKey: 'villageId' });
User.belongsTo(Village, { foreignKey: 'villageId' });
// Role milik Village
Village.hasMany(Role, { foreignKey: 'villageId' });
Role.belongsTo(Village, { foreignKey: 'villageId' });
// ===========================
// Relasi Tabel SaaS
// ===========================
// Village - VillageSubscription
Village.hasMany(SaaS_1.VillageSubscription, { foreignKey: 'villageId', as: 'subscriptions' });
SaaS_1.VillageSubscription.belongsTo(Village, { foreignKey: 'villageId', as: 'village' });
// SubscriptionPlan - VillageSubscription
SaaS_1.SubscriptionPlan.hasMany(SaaS_1.VillageSubscription, { foreignKey: 'planId', as: 'villageSubscriptions' });
SaaS_1.VillageSubscription.belongsTo(SaaS_1.SubscriptionPlan, { foreignKey: 'planId', as: 'plan' });
// Village - Invoice
Village.hasMany(SaaS_1.Invoice, { foreignKey: 'villageId', as: 'invoices' });
SaaS_1.Invoice.belongsTo(Village, { foreignKey: 'villageId', as: 'village' });
// (Opsional) Sinkronisasi database
// Jika Anda ingin tabel otomatis dibuat jika belum ada, gunakan .sync()
// Jangan gunakan { force: true } di produksi!
// User hasMany Role (One-to-Many langsung, userId ada di tabel roles)
User.hasMany(Role, { foreignKey: 'userId', as: 'roles' });
Role.belongsTo(User, { foreignKey: 'userId' });
// Menu milik Village
Village.hasMany(Menu, { foreignKey: 'villageId' });
Menu.belongsTo(Village, { foreignKey: 'villageId' });
// ChatMessage terkait dengan Sender, Receiver, dan Village
// constraints: false agar SUPER_ADMIN (tidak ada di tabel users) bisa mengirim pesan
User.hasMany(ChatMessage, { as: 'SentMessages', foreignKey: 'senderUid', constraints: false });
User.hasMany(ChatMessage, { as: 'ReceivedMessages', foreignKey: 'receiverUid', constraints: false });
ChatMessage.belongsTo(User, { as: 'Sender', foreignKey: 'senderUid', constraints: false });
ChatMessage.belongsTo(User, { as: 'Receiver', foreignKey: 'receiverUid', constraints: false });
Village.hasMany(ChatMessage, { foreignKey: 'villageId', constraints: false });
ChatMessage.belongsTo(Village, { foreignKey: 'villageId', constraints: false }); // constraints: false agar tidak ada FK ke villages (Super Admin bisa kirim lintas desa)
// Slide milik Village
Village.hasMany(Slide, { foreignKey: 'villageId' });
Slide.belongsTo(Village, { foreignKey: 'villageId' });
// Schedule milik Village
Village.hasMany(Schedule, { foreignKey: 'villageId' });
Schedule.belongsTo(Village, { foreignKey: 'villageId' });
// Tariff milik Village
Village.hasMany(Tariff, { foreignKey: 'villageId' });
Tariff.belongsTo(Village, { foreignKey: 'villageId' });
// Exemption milik Tariff dan Village
Tariff.hasMany(Exemption, { foreignKey: 'tariffId' });
Exemption.belongsTo(Tariff, { foreignKey: 'tariffId' });
Village.hasMany(Exemption, { foreignKey: 'villageId' });
Exemption.belongsTo(Village, { foreignKey: 'villageId' });
// InventoryItem milik Village
Village.hasMany(InventoryItem, { foreignKey: 'villageId' });
InventoryItem.belongsTo(Village, { foreignKey: 'villageId' });
// InventoryLoan milik Village dan InventoryItem
Village.hasMany(InventoryLoan, { foreignKey: 'villageId' });
InventoryLoan.belongsTo(Village, { foreignKey: 'villageId' });
InventoryItem.hasMany(InventoryLoan, { foreignKey: 'itemId' });
InventoryLoan.belongsTo(InventoryItem, { foreignKey: 'itemId' });
// DuesJournal milik Village
Village.hasMany(DuesJournal, { foreignKey: 'villageId' });
DuesJournal.belongsTo(Village, { foreignKey: 'villageId' });
// JimpitanHistory milik Village
Village.hasMany(JimpitanHistory, { foreignKey: 'villageId' });
JimpitanHistory.belongsTo(Village, { foreignKey: 'villageId' });
