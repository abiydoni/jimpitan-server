"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addStartupLog = exports.startupLogs = void 0;
exports.startupLogs = [];
const addStartupLog = (message) => {
    const time = new Date().toISOString().split('T')[1].substring(0, 8);
    exports.startupLogs.push({ time, message });
    console.log(message); // Tetap cetak ke terminal asli
};
exports.addStartupLog = addStartupLog;
