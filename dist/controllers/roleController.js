"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveRoles = exports.getRoles = void 0;
const models_1 = require("../models");
const uuid_1 = require("uuid");
const sequelize_1 = require("sequelize");
const getRoles = async (req, res) => {
    try {
        const { villageId } = req.params;
        // Ambil daftar peran (role) unik untuk desa ini atau yang bersifat global
        const roles = await models_1.Role.findAll({
            attributes: ['name'],
            where: {
                [sequelize_1.Op.or]: [
                    { villageId: villageId },
                    { villageId: null }
                ]
            },
            group: ['name'], // Hanya ambil yang unik
        });
        const roleNames = roles.map(r => r.getDataValue('name'));
        res.json({ success: true, data: roleNames });
    }
    catch (error) {
        console.error('Error in getRoles:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getRoles = getRoles;
const saveRoles = async (req, res) => {
    try {
        const { villageId } = req.params;
        const { roles } = req.body; // Array of string
        if (!Array.isArray(roles)) {
            res.status(400).json({ success: false, message: 'roles harus berupa array string' });
            return;
        }
        // Untuk memastikan peran-peran ini ada di database, kita simpan sebagai master (userId = null)
        // agar muncul saat `getRoles` dipanggil meskipun belum di-assign ke user manapun.
        for (const roleName of roles) {
            const existing = await models_1.Role.findOne({
                where: {
                    name: roleName,
                    villageId: villageId,
                    userId: null
                }
            });
            if (!existing) {
                await models_1.Role.create({
                    id: `role_master_${villageId}_${roleName}_${(0, uuid_1.v4)().substring(0, 8)}`,
                    name: roleName,
                    villageId: villageId,
                    userId: null
                });
            }
        }
        res.json({ success: true, message: 'Jabatan berhasil disimpan' });
    }
    catch (error) {
        console.error('Error in saveRoles:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.saveRoles = saveRoles;
