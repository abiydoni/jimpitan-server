<?php
// Pastikan tidak ada output sebelum header
ob_start();

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/get_konfigurasi.php';
date_default_timezone_set('Asia/Jakarta');

// Terjemahan hari dan bulan ke Bahasa Indonesia
$hariIndo = [
    'Sunday' => 'Minggu',
    'Monday' => 'Senin',
    'Tuesday' => 'Selasa',
    'Wednesday' => 'Rabu',
    'Thursday' => 'Kamis',
    'Friday' => 'Jumat',
    'Saturday' => 'Sabtu',
];

$bulanIndo = [
    'January' => 'Januari',
    'February' => 'Februari',
    'March' => 'Maret',
    'April' => 'April',
    'May' => 'Mei',
    'June' => 'Juni',
    'July' => 'Juli',
    'August' => 'Agustus',
    'September' => 'September',
    'October' => 'Oktober',
    'November' => 'November',
    'December' => 'Desember',
];

// Helper escape untuk pesan WhatsApp (hindari backslash karena di WhatsApp karakter \* atau \- dicetak literal)
if (!function_exists('escapeMarkdown')) {
    function escapeMarkdown($text) {
        return trim((string)$text);
    }
}

try {
    // Village ID dinamis dari konfigurasi sistem
    $villageId = isset($villageId) && !empty($villageId)
        ? $villageId
        : (function_exists('get_konfigurasi') ? get_konfigurasi('WA_GROUP_VILLAGE_ID', 'village_001') : 'village_001');

    // Ambil hari dan tanggal hari ini
    $hariEng = date('l'); // Monday
    $hariInd = isset($hariIndo[$hariEng]) ? $hariIndo[$hariEng] : $hariEng; // Senin
    $tanggal = date('j');
    $bulanEng = date('F');
    $bulanInd = isset($bulanIndo[$bulanEng]) ? $bulanIndo[$bulanEng] : $bulanEng;
    $tahun = date('Y');

    // Ambil nama Desa/RT jika tersedia
    $villageTitle = 'RT 07 RW 01';
    try {
        $stmtV = $pdo->prepare("SELECT name FROM villages WHERE id = :villageId LIMIT 1");
        $stmtV->execute([':villageId' => $villageId]);
        $vRow = $stmtV->fetch(PDO::FETCH_ASSOC);
        if ($vRow && !empty($vRow['name'])) {
            $villageTitle = $vRow['name'];
        }
    } catch (Throwable $e) {}

    // Ambil data dari tabel schedules
    $stmt = $pdo->prepare("SELECT namaLengkap AS name FROM schedules WHERE hari = :shift AND villageId = :villageId ORDER BY namaLengkap ASC");
    $stmt->execute([
        ':shift'     => $hariInd,
        ':villageId' => $villageId
    ]);
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $pesan = "⏰ *JADWAL JAGA HARI INI*\n";
    $pesan .= "━━━━━━━━━━━━━━━━━━━━\n";
    $pesan .= "📅 *" . escapeMarkdown($hariInd . ", " . $tanggal . " " . $bulanInd . " " . $tahun) . "*\n\n";

    if ($users && count($users) > 0) {
        $pesan .= "👥 *Daftar Petugas Jaga:*\n";
        $no = 1;
        foreach ($users as $user) {
            $nama = htmlspecialchars($user['name'] ?? '', ENT_QUOTES, 'UTF-8');
            $pesan .= $no . ". " . escapeMarkdown($nama) . "\n";
            $no++;
        }
    } else {
        $pesan .= "❌ Tidak ada petugas jaga hari ini.\n";
    }

    // Tambahkan penutup
    $pesan .= "\n━━━━━━━━━━━━━━━━━━━━\n";
    $pesan .= "🌟 *Selamat melaksanakan tugas*\n";
    if (!empty($villageTitle)) {
        $pesan .= "🏡 *" . escapeMarkdown($villageTitle) . "*\n\n";
    }
    $pesan .= "📲 *Link Download (Play Store):*\n";
    $pesan .= "https://play.google.com/store/apps/details?id=jimpitan.appsbee.my.id\n\n";
    $pesan .= "⚠️ *PENTING - WAJIB SCAN QR*\n";
    $pesan .= "Dihimbau kepada petugas jimpitan:\n";
    $pesan .= "• *WAJIB SCAN QR CODE*\n";
    $pesan .= "• Jumlah uang yang disetor *HARUS SAMA* dengan jumlah yang di *SCAN*\n";
    $pesan .= "• _Tidak boleh lebih dan tidak boleh kurang_\n";
    $pesan .= "\n━━━━━━━━━━━━━━━━━━━━\n";
    $pesan .= "_Pesan Otomatis dari System_";

} catch (PDOException $e) {
    // Error handling untuk database
    $pesan = "❌ *Error*\n\n";
    $pesan .= "Terjadi kesalahan saat mengambil data jadwal jaga.\n";
    $pesan .= "Silakan coba lagi nanti.\n\n";
    $pesan .= "_- Pesan Otomatis dari System -_";
    error_log("Error in ambil_data_jaga.php: " . $e->getMessage());
} catch (Exception $e) {
    // Error handling umum
    $pesan = "❌ *Error*\n\n";
    $pesan .= "Terjadi kesalahan pada sistem.\n";
    $pesan .= "Silakan coba lagi nanti.\n\n";
    $pesan .= "_- Pesan Otomatis dari System -_";
    error_log("Error in ambil_data_jaga.php: " . $e->getMessage());
}

// Cek apakah di-include atau diakses langsung
$included_files = get_included_files();
$isIncluded = (realpath($included_files[0]) !== realpath(__FILE__));

if ($isIncluded) {
    // Jika di-include, jangan output, biarkan variabel $pesan tersedia
    ob_end_clean();
} else {
    // Jika diakses langsung via HTTP, output seperti biasa
    ob_end_clean();
    header('Content-Type: text/plain; charset=utf-8');
    header('Cache-Control: no-cache, must-revalidate');
    echo $pesan;
    exit;
}
