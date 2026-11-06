<?php
// Pastikan tidak ada output sebelum header
ob_start();

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/get_konfigurasi.php';
date_default_timezone_set('Asia/Jakarta');

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

    $stmt = $pdo->prepare("SELECT uniqueCode AS code_id, name AS kk_name FROM users WHERE statusHubungan = 'Kepala Keluarga' AND villageId = :villageId ORDER BY name ASC");
    $stmt->execute([':villageId' => $villageId]);
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $text = "📋 *DATA KEPALA KELUARGA*\n";
    $text .= "━━━━━━━━━━━━━━━━━━━━\n";
    if (!empty($villageTitle)) {
        $text .= "🏡 *" . escapeMarkdown($villageTitle) . "*\n\n";
    }
    
    if ($data && count($data) > 0) {
        $text .= "👥 *Daftar Kepala Keluarga:*\n\n";
        $no = 1;
        foreach ($data as $row) {
            $code_id = htmlspecialchars($row['code_id'] ?? '', ENT_QUOTES, 'UTF-8');
            $kk_name = htmlspecialchars($row['kk_name'] ?? '', ENT_QUOTES, 'UTF-8');
            $text .= $no . ". *" . escapeMarkdown($code_id) . "* - " . escapeMarkdown($kk_name) . "\n";
            $no++;
        }
        $text .= "\n━━━━━━━━━━━━━━━━━━━━\n";
        $text .= "📊 Total: " . count($data) . " KK\n";
    } else {
        $text .= "❌ Tidak ada data tersedia.\n";
    }
    
    $text .= "\n_Pesan Otomatis dari System_";
    $pesan = $text;

} catch (PDOException $e) {
    // Error handling untuk database
    $text = "❌ *Error*\n\n";
    $text .= "Terjadi kesalahan saat mengambil data KK.\n";
    $text .= "Silakan coba lagi nanti.\n\n";
    $text .= "_- Pesan Otomatis dari System -_";
    error_log("Error in ambil_data_kk.php: " . $e->getMessage());
    $pesan = $text;
} catch (Exception $e) {
    // Error handling umum
    $text = "❌ *Error*\n\n";
    $text .= "Terjadi kesalahan pada sistem.\n";
    $text .= "Silakan coba lagi nanti.\n\n";
    $text .= "_- Pesan Otomatis dari System -_";
    error_log("Error in ambil_data_kk.php: " . $e->getMessage());
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
