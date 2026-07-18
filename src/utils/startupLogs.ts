export const startupLogs: { time: string, message: string }[] = [];

export const addStartupLog = (message: string) => {
    const time = new Date().toISOString().split('T')[1].substring(0, 8);
    startupLogs.push({ time, message });
    console.log(message); // Tetap cetak ke terminal asli
};
