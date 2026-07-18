"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSchedule = exports.getSchedules = void 0;
const models_1 = require("../models");
const getSchedules = async (req, res) => {
    try {
        const { villageId } = req.params;
        const schedules = await models_1.Schedule.findAll({ where: { villageId } });
        res.json({ success: true, data: schedules });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getSchedules = getSchedules;
const updateSchedule = async (req, res) => {
    try {
        const { villageId, nik } = req.params;
        const { namaLengkap, hari } = req.body;
        if (!hari || hari === '') {
            await models_1.Schedule.destroy({ where: { nik, villageId } });
        }
        else {
            const schedule = await models_1.Schedule.findOne({ where: { nik, villageId } });
            if (schedule) {
                await schedule.update({ namaLengkap, hari });
            }
            else {
                await models_1.Schedule.create({ nik, villageId, namaLengkap, hari });
            }
        }
        res.json({ success: true, message: 'Schedule updated' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateSchedule = updateSchedule;
