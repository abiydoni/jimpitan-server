"use strict";
/**
 * Utility untuk standarisasi tanggal dan waktu zona Asia/Jakarta (WIB = UTC+7)
 * Memastikan semua perhitungan batas waktu (dueDate, endDate) konsisten di jam 00:00:00 WIB
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.addJakartaMonths = exports.addJakartaDays = exports.getJakartaNow = void 0;
const getJakartaNow = () => {
    return new Date();
};
exports.getJakartaNow = getJakartaNow;
/**
 * Menambahkan hari pada tanggal tertentu, dengan target jam 00:00:00 WIB (Asia/Jakarta)
 */
const addJakartaDays = (baseDate = new Date(), days = 0) => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + days);
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
    });
    const parts = formatter.formatToParts(d);
    const year = parseInt(parts.find(p => p.type === 'year').value);
    const month = parseInt(parts.find(p => p.type === 'month').value) - 1;
    const day = parseInt(parts.find(p => p.type === 'day').value);
    // 00:00:00 WIB di hari tersebut sama dengan 17:00:00 UTC hari sebelumnya
    return new Date(Date.UTC(year, month, day - 1, 17, 0, 0, 0));
};
exports.addJakartaDays = addJakartaDays;
/**
 * Menambahkan bulan pada tanggal tertentu untuk perpanjangan masa aktif (endDate)
 */
const addJakartaMonths = (baseDate = new Date(), months = 1) => {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
    });
    const parts = formatter.formatToParts(baseDate);
    const year = parseInt(parts.find(p => p.type === 'year').value);
    const month = parseInt(parts.find(p => p.type === 'month').value) - 1;
    const day = parseInt(parts.find(p => p.type === 'day').value);
    // 00:00:00 WIB di hari tersebut sama dengan 17:00:00 UTC hari sebelumnya
    return new Date(Date.UTC(year, month + months, day - 1, 17, 0, 0, 0));
};
exports.addJakartaMonths = addJakartaMonths;
