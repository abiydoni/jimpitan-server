"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Invoice = exports.VillageSubscription = exports.SubscriptionPlan = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
// ---------------------------
// Model SubscriptionPlan
// ---------------------------
class SubscriptionPlan extends sequelize_1.Model {
}
exports.SubscriptionPlan = SubscriptionPlan;
SubscriptionPlan.init({
    id: { type: sequelize_1.DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: sequelize_1.DataTypes.STRING(255), allowNull: false },
    basePrice: { type: sequelize_1.DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    pricePerKk: { type: sequelize_1.DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    maxKk: { type: sequelize_1.DataTypes.INTEGER, allowNull: true },
    features: { type: sequelize_1.DataTypes.JSON, allowNull: true },
    durationMonths: { type: sequelize_1.DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    durationUnit: { type: sequelize_1.DataTypes.STRING(50), allowNull: false, defaultValue: 'MONTHLY' },
}, { sequelize: database_1.sequelize, modelName: 'subscriptionPlan', tableName: 'subscription_plans', timestamps: true });
// ---------------------------
// Model VillageSubscription
// ---------------------------
class VillageSubscription extends sequelize_1.Model {
}
exports.VillageSubscription = VillageSubscription;
VillageSubscription.init({
    id: { type: sequelize_1.DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    villageId: { type: sequelize_1.DataTypes.STRING(128), allowNull: false },
    planId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    status: { type: sequelize_1.DataTypes.ENUM('ACTIVE', 'GRACE_PERIOD', 'SUSPENDED', 'CANCELED'), defaultValue: 'ACTIVE' },
    startDate: { type: sequelize_1.DataTypes.DATE, allowNull: false },
    endDate: { type: sequelize_1.DataTypes.DATE, allowNull: false },
    autoRenew: { type: sequelize_1.DataTypes.BOOLEAN, defaultValue: true },
}, { sequelize: database_1.sequelize, modelName: 'villageSubscription', tableName: 'village_subscriptions', timestamps: true });
// ---------------------------
// Model Invoice
// ---------------------------
class Invoice extends sequelize_1.Model {
}
exports.Invoice = Invoice;
Invoice.init({
    id: { type: sequelize_1.DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    villageId: { type: sequelize_1.DataTypes.STRING(128), allowNull: false },
    planName: { type: sequelize_1.DataTypes.STRING(255), allowNull: true },
    durationMonths: { type: sequelize_1.DataTypes.INTEGER, allowNull: true, defaultValue: 1 },
    durationUnit: { type: sequelize_1.DataTypes.STRING(50), allowNull: true, defaultValue: 'MONTHLY' },
    baseAmount: { type: sequelize_1.DataTypes.DECIMAL(10, 2), allowNull: false },
    kkAmount: { type: sequelize_1.DataTypes.DECIMAL(10, 2), allowNull: false },
    totalAmount: { type: sequelize_1.DataTypes.DECIMAL(10, 2), allowNull: false },
    taxAmount: { type: sequelize_1.DataTypes.DECIMAL(10, 2), allowNull: true, defaultValue: 0 },
    taxPercentage: { type: sequelize_1.DataTypes.DECIMAL(5, 2), allowNull: true, defaultValue: 10 },
    kkCount: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    status: { type: sequelize_1.DataTypes.ENUM('UNPAID', 'PENDING_VERIFICATION', 'PAID', 'EXPIRED'), defaultValue: 'UNPAID' },
    dueDate: { type: sequelize_1.DataTypes.DATE, allowNull: false },
    paymentProof: { type: sequelize_1.DataTypes.TEXT('long'), allowNull: true },
}, { sequelize: database_1.sequelize, modelName: 'invoice', tableName: 'invoices', timestamps: true });
