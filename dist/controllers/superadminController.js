"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSystemStatus = exports.updateVillageConfig = exports.getVillages = exports.updateFcmToken = exports.getChatContacts = exports.getDashboardSummary = void 0;
const models_1 = require("../models");
const os_1 = __importDefault(require("os"));
const startupLogs_1 = require("../utils/startupLogs");
const getDashboardSummary = async (req, res) => {
    try {
        const totalVillages = await models_1.Village.count();
        const totalUsers = await models_1.User.count({ where: { status: 'ACTIVE' } });
        // Calculate total income across all villages (type IN)
        const incomeResult = await models_1.DuesJournal.sum('amount', { where: { type: 'IN' } });
        const totalIncome = incomeResult || 0;
        res.json({
            success: true,
            data: {
                totalVillages,
                totalUsers,
                totalIncome
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getDashboardSummary = getDashboardSummary;
const getChatContacts = async (req, res) => {
    try {
        const villages = await models_1.Village.findAll();
        const users = await models_1.User.findAll({ where: { status: 'ACTIVE' } });
        res.json({
            success: true,
            data: {
                villages,
                users
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getChatContacts = getChatContacts;
const updateFcmToken = async (req, res) => {
    try {
        const { token } = req.body;
        // Simpan token superadmin ke tabel User dengan uid khusus
        let superadmin = await models_1.User.findByPk('SUPERADMIN_WEB');
        if (!superadmin) {
            superadmin = await models_1.User.create({
                uid: 'SUPERADMIN_WEB',
                name: 'Super Admin Pusat',
                email: 'superadmin@jimpitan.local',
                status: 'ACTIVE'
            });
        }
        superadmin.fcmToken = token;
        await superadmin.save();
        res.json({ success: true, message: 'FCM Token updated' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateFcmToken = updateFcmToken;
const getVillages = async (req, res) => {
    try {
        const villages = await models_1.Village.findAll({
            include: [{
                    model: models_1.VillageSubscription,
                    as: 'subscriptions',
                    include: [{ model: models_1.SubscriptionPlan, as: 'plan' }]
                }],
            order: [['createdAt', 'DESC']]
        });
        res.json({ success: true, data: villages });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getVillages = getVillages;
const updateVillageConfig = async (req, res) => {
    try {
        const { id } = req.params;
        const { config } = req.body;
        const village = await models_1.Village.findByPk(id);
        if (!village) {
            res.status(404).json({ success: false, message: 'Village not found' });
            return;
        }
        // Merge existing config with new config
        const currentConfig = village.getDataValue('config') || {};
        const updatedConfig = { ...currentConfig, ...config };
        await village.update({ config: updatedConfig });
        res.json({ success: true, data: village });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateVillageConfig = updateVillageConfig;
const getSystemStatus = async (req, res) => {
    try {
        // Memeriksa koneksi database MySQL
        let dbStatus = 'Disconnected';
        try {
            await models_1.sequelize.authenticate();
            dbStatus = 'Connected';
        }
        catch (e) {
            dbStatus = 'Error';
        }
        const uptimeSeconds = process.uptime();
        const osUptime = os_1.default.uptime();
        const memoryUsage = process.memoryUsage();
        // Konversi byte ke MB
        const formatMB = (bytes) => (bytes / 1024 / 1024).toFixed(2) + ' MB';
        const totalMem = os_1.default.totalmem();
        const freeMem = os_1.default.freemem();
        const usedMem = totalMem - freeMem;
        const memPercentage = ((usedMem / totalMem) * 100).toFixed(1);
        // CPU Load Averages (1, 5, 15 minutes) - loadavg() selalu 0 di Windows
        const isWindows = os_1.default.platform() === 'win32';
        const loadAvg = isWindows ? ['N/A', 'N/A', 'N/A'] : os_1.default.loadavg().map(load => load.toFixed(2));
        res.json({
            success: true,
            data: {
                serverTime: new Date().toISOString(),
                nodeUptime: Math.floor(uptimeSeconds),
                osUptime: Math.floor(osUptime),
                databaseStatus: dbStatus,
                nodeInfo: {
                    version: process.version,
                    rss: formatMB(memoryUsage.rss),
                    heapTotal: formatMB(memoryUsage.heapTotal),
                    heapUsed: formatMB(memoryUsage.heapUsed),
                    external: formatMB(memoryUsage.external)
                },
                osInfo: {
                    platform: os_1.default.platform(),
                    type: os_1.default.type(),
                    release: os_1.default.release(),
                    arch: os_1.default.arch(),
                    cpus: os_1.default.cpus().length,
                    cpuModel: os_1.default.cpus()[0]?.model || 'Unknown',
                    loadAvg: loadAvg,
                    totalMemory: formatMB(totalMem),
                    freeMemory: formatMB(freeMem),
                    usedMemoryPercentage: memPercentage + '%'
                },
                startupLogs: startupLogs_1.startupLogs
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getSystemStatus = getSystemStatus;
