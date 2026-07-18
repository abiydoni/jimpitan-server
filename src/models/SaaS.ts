import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

// ---------------------------
// Model SubscriptionPlan
// ---------------------------
export class SubscriptionPlan extends Model {}
SubscriptionPlan.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(255), allowNull: false },
  basePrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  pricePerKk: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  maxKk: { type: DataTypes.INTEGER, allowNull: true },
  features: { type: DataTypes.JSON, allowNull: true },
}, { sequelize, modelName: 'subscriptionPlan', tableName: 'subscription_plans', timestamps: true });

// ---------------------------
// Model VillageSubscription
// ---------------------------
export class VillageSubscription extends Model {}
VillageSubscription.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  villageId: { type: DataTypes.STRING(128), allowNull: false },
  planId: { type: DataTypes.INTEGER, allowNull: false },
  status: { type: DataTypes.ENUM('ACTIVE', 'GRACE_PERIOD', 'SUSPENDED', 'CANCELED'), defaultValue: 'ACTIVE' },
  startDate: { type: DataTypes.DATE, allowNull: false },
  endDate: { type: DataTypes.DATE, allowNull: false },
  autoRenew: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { sequelize, modelName: 'villageSubscription', tableName: 'village_subscriptions', timestamps: true });

// ---------------------------
// Model Invoice
// ---------------------------
export class Invoice extends Model {}
Invoice.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  villageId: { type: DataTypes.STRING(128), allowNull: false },
  baseAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  kkAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  totalAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  kkCount: { type: DataTypes.INTEGER, allowNull: false },
  status: { type: DataTypes.ENUM('UNPAID', 'PAID', 'EXPIRED'), defaultValue: 'UNPAID' },
  dueDate: { type: DataTypes.DATE, allowNull: false },
}, { sequelize, modelName: 'invoice', tableName: 'invoices', timestamps: true });
