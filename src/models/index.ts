import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

// ---------------------------
// 1. Model Village (Desa)
// ---------------------------
export class Village extends Model {}
Village.init({
  id: { type: DataTypes.STRING(128), primaryKey: true },
  name: { type: DataTypes.STRING(255), allowNull: false },
  address: { type: DataTypes.TEXT, allowNull: true },
  uniqueCode: { type: DataTypes.STRING(50), unique: true, allowNull: true },
  config: { type: DataTypes.JSON, allowNull: true },
}, { sequelize, modelName: 'village', tableName: 'villages', timestamps: true });

// ===========================
// Import Modul SaaS Baru
// ===========================
export * from './SaaS';
import { SubscriptionPlan, VillageSubscription, Invoice } from './SaaS';

// ---------------------------
// 2. Model User
// ---------------------------
export class User extends Model {
  public uid!: string;
  public name!: string;
  public email!: string;
  public photoUrl!: string | null;
  public foto!: string | null;
  public phoneNumber!: string | null;
  public agama!: string | null;
  public pekerjaan!: string | null;
  public status!: string;
  public villageId!: string | null;
  public familyId!: string | null;
  public nik!: string | null;
  public noKK!: string | null;
  public jenisKelamin!: string | null;
  public tempatLahir!: string | null;
  public tanggalLahir!: string | null;
  public statusHubungan!: string | null;
  public statusPerkawinan!: string | null;
  public statusHidup!: string | null;
  public alamat!: string | null;
  public uniqueCode!: string | null;
  public fcmToken!: string | null;
  public isOnline!: boolean;
  public lastSeen!: Date | null;
}
User.init({
  uid: { type: DataTypes.STRING(128), primaryKey: true },
  name: { type: DataTypes.STRING(255), allowNull: false },
  email: { type: DataTypes.STRING(255), unique: true, allowNull: false },
  photoUrl: { type: DataTypes.TEXT('long'), allowNull: true },
  foto: { type: DataTypes.TEXT('long'), allowNull: true },
  phoneNumber: { type: DataTypes.STRING(20), allowNull: true },
  agama: { type: DataTypes.STRING(50), allowNull: true },
  pekerjaan: { type: DataTypes.STRING(100), allowNull: true },
  status: { type: DataTypes.STRING(50), defaultValue: 'INCOMPLETE' },
  villageId: { type: DataTypes.STRING(128), allowNull: true },
  familyId: { type: DataTypes.STRING(128), allowNull: true },
  nik: { type: DataTypes.STRING(50), allowNull: true },
  noKK: { type: DataTypes.STRING(50), allowNull: true },
  jenisKelamin: { type: DataTypes.STRING(20), allowNull: true },
  tempatLahir: { type: DataTypes.STRING(100), allowNull: true },
  tanggalLahir: { type: DataTypes.STRING(20), allowNull: true },
  statusHubungan: { type: DataTypes.STRING(50), allowNull: true },
  statusPerkawinan: { type: DataTypes.STRING(50), allowNull: true },
  statusHidup: { type: DataTypes.STRING(50), allowNull: true },
  alamat: { type: DataTypes.TEXT, allowNull: true },
  uniqueCode: { type: DataTypes.STRING(50), allowNull: true },
  fcmToken: { type: DataTypes.TEXT, allowNull: true },
  isOnline: { type: DataTypes.BOOLEAN, defaultValue: false },
  lastSeen: { type: DataTypes.DATE, allowNull: true },
}, { sequelize, modelName: 'user', tableName: 'users', timestamps: true });

// ---------------------------
// 3. Model Role (Jabatan)
// userId langsung di tabel roles (One-to-Many: User hasMany Role)
// ---------------------------
export class Role extends Model {}
Role.init({
  id: { type: DataTypes.STRING(128), primaryKey: true },
  name: { type: DataTypes.STRING(50), allowNull: false },
  userId: { type: DataTypes.STRING(128), allowNull: true },
  villageId: { type: DataTypes.STRING(128), allowNull: true },
}, { sequelize, modelName: 'role', tableName: 'roles', timestamps: true, updatedAt: false });

// UserRole adalah alias ke Role untuk backward compatibility
export class UserRole extends Model {}
UserRole.init({
  id: { type: DataTypes.STRING(128), primaryKey: true },
  name: { type: DataTypes.STRING(50), allowNull: false },
  userId: { type: DataTypes.STRING(128), allowNull: true },
  villageId: { type: DataTypes.STRING(128), allowNull: true },
}, { sequelize, modelName: 'userRoleAlias', tableName: 'roles', timestamps: true, updatedAt: false });

// ---------------------------
// 3. Model Menu
// ---------------------------
export class Menu extends Model {}
Menu.init({
  id: { type: DataTypes.STRING(50), primaryKey: true },
  label: { type: DataTypes.STRING(255), allowNull: true },
  icon: { type: DataTypes.STRING(100), allowNull: true },
  order: { type: DataTypes.INTEGER, defaultValue: 99 },
  position: { type: DataTypes.STRING(50), defaultValue: 'grid' },
  isCore: { type: DataTypes.BOOLEAN, defaultValue: false },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  description: { type: DataTypes.TEXT, allowNull: true },
  villageId: { type: DataTypes.STRING(128), allowNull: true }, // [BARU] Menambahkan villageId
}, { sequelize, modelName: 'menu', tableName: 'menus', timestamps: true });

// ---------------------------
// 4. Model ChatMessage
// ---------------------------
export class ChatMessage extends Model {
  public id!: string;
  public roomId!: string | null;
  public senderUid!: string;
  public senderName!: string | null;
  public receiverUid!: string | null;
  public message!: string;
  public isRead!: boolean;
  public isDeleted!: boolean;
  public isEdited!: boolean;
  public villageId!: string;
  public replyToId!: string | null;
  public replyToMessage!: string | null;
  public replyToSenderName!: string | null;
  public isForwarded!: boolean;
}
ChatMessage.init({
  id: { type: DataTypes.STRING(128), primaryKey: true },
  roomId: { type: DataTypes.STRING(128), allowNull: true },
  senderUid: { type: DataTypes.STRING(128), allowNull: false },
  senderName: { type: DataTypes.STRING(255), allowNull: true },
  receiverUid: { type: DataTypes.STRING(128), allowNull: true },
  message: { type: DataTypes.TEXT, allowNull: false },
  isRead: { type: DataTypes.BOOLEAN, defaultValue: false },
  isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },
  isEdited: { type: DataTypes.BOOLEAN, defaultValue: false },
  villageId: { type: DataTypes.STRING(128), allowNull: true }, // Nullable agar Super Admin bisa kirim pesan lintas desa
  replyToId: { type: DataTypes.STRING(128), allowNull: true },
  replyToMessage: { type: DataTypes.TEXT, allowNull: true },
  replyToSenderName: { type: DataTypes.STRING(255), allowNull: true },
  isForwarded: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { sequelize, modelName: 'chatMessage', tableName: 'chat_messages', timestamps: true });

// ---------------------------
// 5. Model Slide (Banner)
// ---------------------------
export class Slide extends Model {}
Slide.init({
  id: { type: DataTypes.STRING(128), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  title: { type: DataTypes.STRING(255), allowNull: true },
  subtitle: { type: DataTypes.TEXT, allowNull: true },
  type: { type: DataTypes.STRING(50), defaultValue: 'INFO' },
  imageBase64: { type: DataTypes.TEXT('long'), allowNull: true },
  textColor: { type: DataTypes.STRING(20), defaultValue: '#FFFFFF' },
  value: { type: DataTypes.STRING(255), allowNull: true },
  status: { type: DataTypes.STRING(50), allowNull: true },
  villageId: { type: DataTypes.STRING(128), allowNull: true }, // [BARU] Banner spesifik per desa
}, { sequelize, modelName: 'slide', tableName: 'slides', timestamps: true });

// ---------------------------
// 6. Model Schedule (Jadwal)
// ---------------------------
export class Schedule extends Model {}
Schedule.init({
  nik: { type: DataTypes.STRING(50), primaryKey: true },
  namaLengkap: { type: DataTypes.STRING(255), allowNull: false },
  hari: { type: DataTypes.STRING(50), allowNull: false },
  villageId: { type: DataTypes.STRING(128), allowNull: false },
}, { sequelize, modelName: 'schedule', tableName: 'schedules', timestamps: true });

// ---------------------------
// 7. Model Tariff & Exemption
// ---------------------------
export class Tariff extends Model {}
Tariff.init({
  id: { type: DataTypes.STRING(128), primaryKey: true },
  name: { type: DataTypes.STRING(255), allowNull: false },
  amount: { type: DataTypes.INTEGER, allowNull: false },
  type: { type: DataTypes.STRING(50), allowNull: false },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  villageId: { type: DataTypes.STRING(128), allowNull: false },
  allowedRoles: { type: DataTypes.JSON, allowNull: true },
}, { sequelize, modelName: 'tariff', tableName: 'tariffs', timestamps: true });

export class Exemption extends Model {}
Exemption.init({
  id: { type: DataTypes.STRING(128), primaryKey: true },
  kkId: { type: DataTypes.STRING(128), allowNull: false },
  kkName: { type: DataTypes.STRING(255), allowNull: false },
  tariffId: { type: DataTypes.STRING(128), allowNull: false },
  tariffName: { type: DataTypes.STRING(255), allowNull: true },
  reason: { type: DataTypes.TEXT, allowNull: true },
  startDate: { type: DataTypes.DATEONLY, allowNull: true },
  endDate: { type: DataTypes.DATEONLY, allowNull: true },
  villageId: { type: DataTypes.STRING(128), allowNull: false },
}, { sequelize, modelName: 'exemption', tableName: 'exemptions', timestamps: true, updatedAt: false });

// ---------------------------
// 8. Model Inventory
// ---------------------------
export class InventoryItem extends Model {}
InventoryItem.init({
  id: { type: DataTypes.STRING(128), primaryKey: true },
  name: { type: DataTypes.STRING(255), allowNull: false },
  stock: { type: DataTypes.INTEGER, defaultValue: 0 },
  fee: { type: DataTypes.INTEGER, defaultValue: 0 },
  villageId: { type: DataTypes.STRING(128), allowNull: false },
}, { sequelize, modelName: 'inventoryItem', tableName: 'inventory_items', timestamps: true });

export class InventoryLoan extends Model {}
InventoryLoan.init({
  id: { type: DataTypes.STRING(128), primaryKey: true },
  itemId: { type: DataTypes.STRING(128), allowNull: false },
  itemName: { type: DataTypes.STRING(255), allowNull: true },
  borrowerName: { type: DataTypes.STRING(255), allowNull: false },
  quantity: { type: DataTypes.INTEGER, allowNull: false },
  days: { type: DataTypes.INTEGER, defaultValue: 1 },
  feeTotal: { type: DataTypes.INTEGER, defaultValue: 0 },
  status: { type: DataTypes.STRING(50), defaultValue: 'DIPINJAM' },
  villageId: { type: DataTypes.STRING(128), allowNull: false },
}, { sequelize, modelName: 'inventoryLoan', tableName: 'inventory_loans', timestamps: true });

// ---------------------------
// 9. Model Dues Journal (Jurnal Iuran)
// ---------------------------
export class DuesJournal extends Model {}
DuesJournal.init({
  id: { type: DataTypes.STRING(128), primaryKey: true },
  villageId: { type: DataTypes.STRING(128), allowNull: false },
  kkId: { type: DataTypes.STRING(128), allowNull: true },
  amount: { type: DataTypes.INTEGER, allowNull: false },
  journalType: { type: DataTypes.STRING(50), allowNull: true }, // IURAN, UMUM, SEWA_INVENTARIS
  type: { type: DataTypes.STRING(50), allowNull: true }, // Pemasukan, Pengeluaran
  description: { type: DataTypes.TEXT, allowNull: true },
  tariffId: { type: DataTypes.STRING(128), allowNull: true },
  recordedBy: { type: DataTypes.STRING(128), allowNull: true },
  date: { type: DataTypes.DATEONLY, allowNull: true },
  period: { type: DataTypes.STRING(50), allowNull: true },
  timestamp: { type: DataTypes.STRING(128), allowNull: true },
  paidDates: { type: DataTypes.JSON, allowNull: true },
}, { sequelize, modelName: 'duesJournal', tableName: 'dues_journals', timestamps: true, updatedAt: false });

// ---------------------------
// 10. Model Jimpitan History
// ---------------------------
export class JimpitanHistory extends Model {}
JimpitanHistory.init({
  id: { type: DataTypes.STRING(128), primaryKey: true },
  villageId: { type: DataTypes.STRING(128), allowNull: false },
  schedulesNik: { type: DataTypes.STRING(50), allowNull: true },
  amountCollected: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
  date: { type: DataTypes.DATEONLY, allowNull: true },
  kkId: { type: DataTypes.STRING(128), allowNull: true },
  name: { type: DataTypes.STRING(255), allowNull: true },
  amount: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
  scannedBy: { type: DataTypes.STRING(128), allowNull: true },
  scannedByName: { type: DataTypes.STRING(128), allowNull: true },
  timestamp: { type: DataTypes.STRING(128), allowNull: true },
  type: { type: DataTypes.STRING(50), allowNull: true },
}, { sequelize, modelName: 'jimpitanHistory', tableName: 'jimpitan_history', timestamps: true, updatedAt: false });


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
Village.hasMany(VillageSubscription, { foreignKey: 'villageId', as: 'subscriptions' });
VillageSubscription.belongsTo(Village, { foreignKey: 'villageId', as: 'village' });

// SubscriptionPlan - VillageSubscription
SubscriptionPlan.hasMany(VillageSubscription, { foreignKey: 'planId', as: 'villageSubscriptions' });
VillageSubscription.belongsTo(SubscriptionPlan, { foreignKey: 'planId', as: 'plan' });

// Village - Invoice
Village.hasMany(Invoice, { foreignKey: 'villageId', as: 'invoices' });
Invoice.belongsTo(Village, { foreignKey: 'villageId', as: 'village' });

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

export { sequelize };
