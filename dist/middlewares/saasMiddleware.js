"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkSubscription = void 0;
const models_1 = require("../models");
const checkSubscription = async (req, res, next) => {
    try {
        // Village ID usually comes from req.user (if auth middleware sets it) or req.body/req.params depending on the route.
        // As a generic approach, we can look for villageId in body, query, or params.
        let villageId = req.body?.villageId || req.query?.villageId || req.params?.villageId;
        // If you have a decoded user object from authMiddleware:
        if (req.user && req.user.villageId) {
            villageId = req.user.villageId;
        }
        // Jika rute ini tidak berhubungan dengan villageId tertentu, kita boleh lewatkan.
        if (!villageId) {
            next();
            return;
        }
        const sub = await models_1.VillageSubscription.findOne({ where: { villageId } });
        if (sub) {
            const status = sub.getDataValue('status');
            if (status === 'SUSPENDED') {
                res.status(403).json({
                    success: false,
                    code: 'SUBSCRIPTION_SUSPENDED',
                    error: 'FORBIDDEN_SUSPENDED',
                    message: 'Layanan ditangguhkan. Silakan hubungi Pengurus Desa untuk menyelesaikan pembayaran langganan SaaS.'
                });
                return;
            }
        }
        next();
    }
    catch (error) {
        console.error('Error in SaaS middleware:', error);
        res.status(500).json({ success: false, message: 'Gagal memeriksa status langganan' });
    }
};
exports.checkSubscription = checkSubscription;
