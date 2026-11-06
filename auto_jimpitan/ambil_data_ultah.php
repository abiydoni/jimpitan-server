<?php
// Pastikan tidak ada output sebelum header
ob_start();

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/get_konfigurasi.php';
date_default_timezone_set('Asia/Jakarta');

// Array bulan Indonesia
$bulanIndo = [
    '01' => 'Januari',
    '02' => 'Februari',
    '03' => 'Maret',
    '04' => 'April',
    '05' => 'Mei',
    '06' => 'Juni',
    '07' => 'Juli',
    '08' => 'Agustus',
    '09' => 'September',
    '10' => 'Oktober',
    '11' => 'November',
    '12' => 'Desember',
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

    // Ambil hari dan bulan hari ini
    $todayDay = date('d');
    $todayMonth = date('m');

    // Query warga yang ulang tahun hari ini, kecualikan yang sudah meninggal
    $stmt = $pdo->prepare("SELECT name AS nama, tanggalLahir AS tgl_lahir FROM users WHERE SUBSTRING(tanggalLahir, 1, 2) = :day AND SUBSTRING(tanggalLahir, 4, 2) = :month AND (statusHidup = 'Aktif' OR statusHidup IS NULL OR statusHidup = '') AND villageId = :villageId");
    $stmt->execute([
        ':day'       => $todayDay,
        ':month'     => $todayMonth,
        ':villageId' => $villageId,
    ]);
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Bangun pesan ucapan ultah
    $pesan = "🎉 *SELAMAT ULANG TAHUN!* 🎂\n";
    $pesan .= "━━━━━━━━━━━━━━━━━━━━\n\n";

    if ($data && count($data) > 0) {
        $pesan .= "📅 *Hari ini ada yang berulang tahun:*\n\n";
        $no = 1;
        foreach ($data as $warga) {
            // Format tanggal lahir ke Indonesia (tanpa tahun)
            $tglObj = date_create_from_format('d/m/Y', $warga['tgl_lahir']);
            if (!$tglObj) $tglObj = date_create($warga['tgl_lahir']);
            if ($tglObj) {
                $tgl = date_format($tglObj, 'd');
                $blnKey = date_format($tglObj, 'm');
                $bln = isset($bulanIndo[$blnKey]) ? $bulanIndo[$blnKey] : $blnKey;
                $nama = htmlspecialchars($warga['nama'] ?? '', ENT_QUOTES, 'UTF-8');
                $pesan .= $no . ". *" . escapeMarkdown($nama) . "*\n";
                $pesan .= "   🎂 Lahir: " . escapeMarkdown($tgl . " " . $bln) . "\n\n";
                $no++;
            }
        }
        if ($no > 1) {
            $pesan .= "━━━━━━━━━━━━━━━━━━━━\n";
            $pesan .= "🎈 *Semoga panjang umur, sehat selalu, dan bahagia!* ✨\n";
        } else {
            $pesan .= "Tidak ada warga yang berulang tahun hari ini.\n";
        }
    } else {
        $pesan .= "Tidak ada warga yang berulang tahun hari ini.\n";
    }

    $pesan .= "\n━━━━━━━━━━━━━━━━━━━━\n";
    $pesan .= "💐 *Salam hangat dari " . escapeMarkdown($villageTitle) . "!*\n";
    $pesan .= "\n_Pesan Otomatis dari System_";

} catch (PDOException $e) {
    // Error handling untuk database
    $pesan = "❌ *Error*\n\n";
    $pesan .= "Terjadi kesalahan saat mengambil data ulang tahun.\n";
    $pesan .= "Silakan coba lagi nanti.\n\n";
    $pesan .= "_- Pesan Otomatis dari System -_";
    error_log("Error in ambil_data_ultah.php: " . $e->getMessage());
} catch (Exception $e) {
    // Error handling umum
    $pesan = "❌ *Error*\n\n";
    $pesan .= "Terjadi kesalahan pada sistem.\n";
    $pesan .= "Silakan coba lagi nanti.\n\n";
    $pesan .= "_- Pesan Otomatis dari System -_";
    error_log("Error in ambil_data_ultah.php: " . $e->getMessage());
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
