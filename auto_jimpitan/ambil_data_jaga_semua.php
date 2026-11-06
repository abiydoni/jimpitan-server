<?php
// Pastikan tidak ada output sebelum header
ob_start();

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/get_konfigurasi.php';
date_default_timezone_set('Asia/Jakarta');

// Terjemahan hari dan bulan ke Bahasa Indonesia
$hariIndo = [
    'Sunday'    => 'Minggu',
    'Monday'    => 'Senin',
    'Tuesday'   => 'Selasa',
    'Wednesday' => 'Rabu',
    'Thursday'  => 'Kamis',
    'Friday'    => 'Jumat',
    'Saturday'  => 'Sabtu',
];
$bulanIndo = [
    'January'   => 'Januari',
    'February'  => 'Februari',
    'March'     => 'Maret',
    'April'     => 'April',
    'May'       => 'Mei',
    'June'      => 'Juni',
    'July'      => 'Juli',
    'August'    => 'Agustus',
    'September' => 'September',
    'October'   => 'Oktober',
    'November'  => 'November',
    'December'  => 'Desember'
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

    // Ambil parameter hari dari URL atau parameter
    $hari = isset($_GET['hari']) ? $_GET['hari'] : date('l'); // default: hari ini
    
    // Validasi hari yang diinput
    if (!isset($hariIndo[$hari])) {
        $hari = date('l'); // fallback ke hari ini jika tidak valid
    }
    
    $hariInd = $hariIndo[$hari] ?? $hari;
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

    // Ambil data jaga dari DB berdasarkan shift
    $stmt = $pdo->prepare("SELECT namaLengkap AS name FROM schedules WHERE hari = :hari AND villageId = :villageId ORDER BY namaLengkap ASC");
    $stmt->execute([
        ':hari'      => $hariInd,
        ':villageId' => $villageId
    ]);
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Susun pesan
    $text = "⏰ *JADWAL JAGA*\n";
    $text .= "━━━━━━━━━━━━━━━━━━━━\n";
    $text .= "📅 *Hari: " . escapeMarkdown($hariInd) . "*\n\n";
    
    if ($users && count($users) > 0) {
        $text .= "👥 *Daftar Petugas Jaga:*\n\n";
        $no = 1;
        foreach ($users as $user) {
            $nama = htmlspecialchars($user['name'] ?? '', ENT_QUOTES, 'UTF-8');
            $text .= $no . ". " . escapeMarkdown($nama) . "\n";
            $no++;
        }
    } else {
        $text .= "❌ Tidak ada data jadwal untuk hari " . escapeMarkdown($hariInd) . ".\n";
    }

    $text .= "\n━━━━━━━━━━━━━━━━━━━━\n";
    if (!empty($villageTitle)) {
        $text .= "🏡 *" . escapeMarkdown($villageTitle) . "*\n\n";
    }
    $text .= "📲 *Link Download (Play Store):*\n";
    $text .= "https://play.google.com/store/apps/details?id=jimpitan.appsbee.my.id\n\n";
    $text .= "🌟 *Tetap semangat menjaga keamanan lingkungan!*\n";
    $text .= "\n_Pesan Otomatis dari System_";

    $pesan = $text;

} catch (PDOException $e) {
    // Error handling untuk database
    $text = "❌ *Error*\n\n";
    $text .= "Terjadi kesalahan saat mengambil data jadwal.\n";
    $text .= "Silakan coba lagi nanti.\n\n";
    $text .= "_- Pesan Otomatis dari System -_";
    error_log("Error in ambil_data_jaga_semua.php: " . $e->getMessage());
    $pesan = $text;
} catch (Exception $e) {
    // Error handling umum
    $text = "❌ *Error*\n\n";
    $text .= "Terjadi kesalahan pada sistem.\n";
    $text .= "Silakan coba lagi nanti.\n\n";
    $text .= "_- Pesan Otomatis dari System -_";
    error_log("Error in ambil_data_jaga_semua.php: " . $e->getMessage());
    $pesan = $text;
}

// Cek apakah di-include atau diakses langsung
$included_files = get_included_files();
$isIncluded = (realpath($included_files[0]) !== realpath(__FILE__));

if ($isIncluded) {
    // Jika di-include, jangan output, biarkan variabel $text / $pesan tersedia
    ob_end_clean();
} else {
    // Jika diakses langsung via HTTP, output seperti biasa
    ob_end_clean();
    header('Content-Type: text/plain; charset=utf-8');
    header('Cache-Control: no-cache, must-revalidate');
    echo $text;
    exit;
}
