"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logActivity = void 0;
const uuid_1 = require("uuid");
const models_1 = require("../models");
/**
 * Mencatat log aktivitas audit ke tabel database activity_logs.
 * Dijalankan secara async dan aman (tidak akan pernah melempar exception ke pemanggil).
 */
const logActivity = async (params) => {
    try {
        const { villageId, userId, userName, userEmail, userRole, action, targetId, targetName, description, details, req, } = params;
        let ip = null;
        let userAgent = null;
        if (req) {
            const forwarded = req.headers['x-forwarded-for'];
            if (typeof forwarded === 'string') {
                ip = forwarded.split(',')[0].trim();
            }
            else if (Array.isArray(forwarded) && forwarded.length > 0) {
                ip = forwarded[0].trim();
            }
            else {
                ip = req.socket?.remoteAddress || null;
            }
            userAgent = (req.headers['user-agent'] || '').substring(0, 255) || null;
        }
        const logEntry = await models_1.ActivityLog.create({
            id: `act_${(0, uuid_1.v4)()}`,
            villageId: villageId || null,
            userId: userId || null,
            userName: userName || null,
            userEmail: userEmail || null,
            userRole: userRole || null,
            action: action.toUpperCase(),
            targetId: targetId || null,
            targetName: targetName || null,
            description,
            details: details ? details : null,
            ip,
            userAgent,
        });
        console.log(`[ACTIVITY_LOG] [${action}] ${description} (user: ${userName || userEmail || userId || 'SYSTEM'})`);
    }
    catch (err) {
        console.error('⚠️ [ACTIVITY_LOG_ERROR] Gagal menulis activity log:', err?.message || err);
    }
};
exports.logActivity = logActivity;
