/**
 * Utility untuk standarisasi tanggal dan waktu zona Asia/Jakarta (WIB = UTC+7)
 * Memastikan semua perhitungan batas waktu (dueDate, endDate) konsisten di jam 00:00:00 WIB
 */

export const getJakartaNow = (): Date => {
  return new Date();
};

/**
 * Menambahkan hari pada tanggal tertentu, dengan target jam 00:00:00 WIB (Asia/Jakarta)
 */
export const addJakartaDays = (baseDate: Date = new Date(), days: number = 0): Date => {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + days);

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  });
  const parts = formatter.formatToParts(d);
  const year = parseInt(parts.find(p => p.type === 'year')!.value);
  const month = parseInt(parts.find(p => p.type === 'month')!.value) - 1;
  const day = parseInt(parts.find(p => p.type === 'day')!.value);

  // 00:00:00 WIB di hari tersebut sama dengan 17:00:00 UTC hari sebelumnya
  return new Date(Date.UTC(year, month, day - 1, 17, 0, 0, 0));
};

/**
 * Menambahkan bulan pada tanggal tertentu untuk perpanjangan masa aktif (endDate)
 */
export const addJakartaMonths = (baseDate: Date = new Date(), months: number = 1): Date => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  });
  const parts = formatter.formatToParts(baseDate);
  const year = parseInt(parts.find(p => p.type === 'year')!.value);
  const month = parseInt(parts.find(p => p.type === 'month')!.value) - 1;
  const day = parseInt(parts.find(p => p.type === 'day')!.value);

  // 00:00:00 WIB di hari tersebut sama dengan 17:00:00 UTC hari sebelumnya
  return new Date(Date.UTC(year, month + months, day - 1, 17, 0, 0, 0));
};
