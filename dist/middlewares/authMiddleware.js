"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireSelfOrSuperAdmin = exports.requireSelf = exports.requireSuperAdmin = exports.isSuperAdminUser = exports.optionalVerifyFirebaseToken = exports.verifyFirebaseToken = void 0;
const auth_1 = require("firebase-admin/auth");
const models_1 = require("../models");
const superAdminEmail = () => process.env.SUPERADMIN_EMAIL || 'appsbeem@gmail.com';
const verifyFirebaseToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ success: false, message: 'Token autentikasi diperlukan' });
        return;
    }
    const token = authHeader.slice(7).trim();
    if (!token || token === 'null' || token === 'undefined') {
        res.status(401).json({ success: false, message: 'Token tidak valid' });
        return;
    }
    try {
        const decoded = await (0, auth_1.getAuth)().verifyIdToken(token);
        req.firebaseUser = {
            uid: decoded.uid,
            email: decoded.email,
        };
        next();
    }
    catch {
        res.status(401).json({ success: false, message: 'Token tidak valid atau sudah kedaluwarsa' });
    }
};
exports.verifyFirebaseToken = verifyFirebaseToken;
const optionalVerifyFirebaseToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return next();
    }
    const token = authHeader.slice(7).trim();
    if (!token || token === 'null' || token === 'undefined') {
        return next();
    }
    try {
        const decoded = await (0, auth_1.getAuth)().verifyIdToken(token);
        req.firebaseUser = {
            uid: decoded.uid,
            email: decoded.email,
        };
    }
    catch {
        // Abaikan error, biarkan firebaseUser kosong
    }
    next();
};
exports.optionalVerifyFirebaseToken = optionalVerifyFirebaseToken;
const isSuperAdminUser = async (uid, email) => {
    if (email && email === superAdminEmail())
        return true;
    const role = await models_1.Role.findOne({ where: { userId: uid, name: 'SUPER_ADMIN' } });
    return !!role;
};
exports.isSuperAdminUser = isSuperAdminUser;
const requireSuperAdmin = async (req, res, next) => {
    const adminKey = req.headers['x-admin-key'];
    if (process.env.ADMIN_API_KEY && adminKey === process.env.ADMIN_API_KEY) {
        next();
        return;
    }
    const firebaseUser = req.firebaseUser;
    if (!firebaseUser) {
        res.status(401).json({ success: false, message: 'Token autentikasi diperlukan' });
        return;
    }
    if (await (0, exports.isSuperAdminUser)(firebaseUser.uid, firebaseUser.email)) {
        next();
        return;
    }
    res.status(403).json({ success: false, message: 'Akses khusus Super Admin' });
};
exports.requireSuperAdmin = requireSuperAdmin;
const requireSelf = (paramName = 'uid') => (req, res, next) => {
    const firebaseUser = req.firebaseUser;
    const targetUid = req.params[paramName] || req.body?.uid;
    if (!firebaseUser) {
        res.status(401).json({ success: false, message: 'Token autentikasi diperlukan' });
        return;
    }
    if (firebaseUser.uid === targetUid) {
        next();
        return;
    }
    res.status(403).json({ success: false, message: 'Tidak diizinkan mengakses data pengguna lain' });
};
exports.requireSelf = requireSelf;
const requireSelfOrSuperAdmin = (paramName = 'uid') => async (req, res, next) => {
    const firebaseUser = req.firebaseUser;
    const targetUid = req.params[paramName] || req.body?.uid;
    if (!firebaseUser) {
        res.status(401).json({ success: false, message: 'Token autentikasi diperlukan' });
        return;
    }
    if (firebaseUser.uid === targetUid) {
        next();
        return;
    }
    if (await (0, exports.isSuperAdminUser)(firebaseUser.uid, firebaseUser.email)) {
        next();
        return;
    }
    res.status(403).json({ success: false, message: 'Tidak diizinkan mengakses data pengguna lain' });
};
exports.requireSelfOrSuperAdmin = requireSelfOrSuperAdmin;
