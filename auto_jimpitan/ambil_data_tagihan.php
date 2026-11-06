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

$lastMonth = new DateTime('first day of last month');
$prevMonth = $lastMonth->format('Y-m');
$namaBulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
$bulanTeks = $namaBulan[(int)$lastMonth->format('n') - 1] . ' ' . $lastMonth->format('Y');
$daysInMonth = (int) $lastMonth->format('t');

$message = '';
try {
    global $pdo;
    
    if (!$pdo) {
        throw new Exception("Koneksi database tidak tersedia.");
    }

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
    
    // 1. Dapatkan tarif jimpitan harian
    $stmt = $pdo->prepare("SELECT amount FROM tariffs WHERE (name = 'Jimpitan' OR type = 'Harian') AND villageId = :villageId ORDER BY id ASC LIMIT 1");
    $stmt->execute([':villageId' => $villageId]);
    $tarifRow = $stmt->fetch();
    $tarif = $tarifRow ? (int)$tarifRow['amount'] : 500;
    
    // Total tagihan seharusnya selama sebulan
    $totalTagihanSeharusnya = $tarif * $daysInMonth;

    // 2. Ambil semua data users Kepala Keluarga
    $stmtKK = $pdo->prepare("SELECT uniqueCode AS code_id, name AS kk_name, familyId AS family_id FROM users WHERE statusHubungan = 'Kepala Keluarga' AND villageId = :villageId ORDER BY name ASC");
    $stmtKK->execute([':villageId' => $villageId]);
    $wargaList = $stmtKK->fetchAll();

    $semuaWarga = [];
    $adaTunggakan = false;

    foreach ($wargaList as $warga) {
        $codeId = $warga['code_id'];
        $familyId = $warga['family_id'] ?? $codeId;
        $namaWarga = $warga['kk_name'];

        // 3. Hitung jumlah yang sudah discan / dibayar bulan kemarin
        $stmtScan = $pdo->prepare("
            SELECT SUM(amount) as total_scanned, COUNT(id) as scan_count 
            FROM jimpitan_history 
            WHERE (kkId = :code_id OR kkId = :family_id) 
              AND date LIKE :prev_month 
              AND villageId = :villageId
        ");
        $stmtScan->execute([
            ':code_id'    => $codeId,
            ':family_id'  => $familyId,
            ':prev_month' => $prevMonth . '-%',
            ':villageId'  => $villageId,
        ]);
        $scanRow = $stmtScan->fetch();
        $totalScanned = $scanRow['total_scanned'] ? (int)$scanRow['total_scanned'] : 0;
        $scanCount = $scanRow['scan_count'] ? (int)$scanRow['scan_count'] : 0;

        // 4. Hitung sisa tagihan
        $sisaTagihan = $totalTagihanSeharusnya - $totalScanned;

        $semuaWarga[] = [
            'nama'         => $namaWarga,
            'sisa_tagihan' => $sisaTagihan,
            'scan_count'   => $scanCount
        ];

        if ($sisaTagihan > 0) {
            $adaTunggakan = true;
        }
    }

    if (count($semuaWarga) > 0) {
        $message = "📢 *INFORMASI TAGIHAN JIMPITAN*\n";
        $message .= "━━━━━━━━━━━━━━━━━━━━\n";
        if (!empty($villageTitle)) {
            $message .= "🏡 *" . escapeMarkdown($villageTitle) . "*\n\n";
        }
        $message .= "🗓 Bulan: *$bulanTeks*\n";
        $message .= "ℹ️ Info Tagihan: $daysInMonth hari x Rp " . number_format($tarif, 0, ',', '.') . " = Rp " . number_format($totalTagihanSeharusnya, 0, ',', '.') . "\n\n";
        $message .= "📋 Berikut adalah rekapitulasi tagihan jimpitan warga:\n\n";
        
        $message .= "```\n";
        $no = 1;
        foreach ($semuaWarga as $w) {
            // Nomor (3 karakter)
            $colNo = str_pad($no . ".", 3, " ", STR_PAD_RIGHT);
            
            // Nama dibatasi 18 karakter
            $namaPendek = mb_substr($w['nama'], 0, 18);
            $colNama = $namaPendek . str_repeat(" ", 18 - mb_strlen($namaPendek));
            
            if ($w['sisa_tagihan'] > 0) {
                $nominalStr = number_format($w['sisa_tagihan'], 0, ',', '.');
                $colNominal = str_pad($nominalStr, 6, " ", STR_PAD_LEFT);
                $message .= $colNo . " " . $colNama . " Rp" . $colNominal . "\n";
            } else {
                $message .= $colNo . " " . $colNama . "   LUNAS\n";
            }
            $no++;
        }
        $message .= "```\n";
        
        $message .= "\n━━━━━━━━━━━━━━━━━━━━\n";
        if ($adaTunggakan) {
            $message .= "💡 _Mohon untuk segera melunasi sisa tagihan tersebut. Abaikan pesan ini jika merasa sudah membayar lunas. Terima kasih._\n\n";
        } else {
            $message .= "✨ _Alhamdulillah, seluruh tagihan warga bulan $bulanTeks telah lunas. Terima kasih atas partisipasi aktif seluruh warga " . escapeMarkdown($villageTitle) . "!_ ✨\n\n";
        }
        $message .= "🙏🏻 *- Pengurus " . escapeMarkdown($villageTitle) . " -*";
    } else {
        $message = "🎉 *INFORMASI JIMPITAN*\n";
        $message .= "━━━━━━━━━━━━━━━━━━━━\n\n";
        $message .= "🗓 Bulan: *$bulanTeks*\n\n";
        $message .= "Belum ada data warga di sistem.\n\n";
        $message .= "━━━━━━━━━━━━━━━━━━━━\n";
        $message .= "🙏🏻 *- Pengurus " . escapeMarkdown($villageTitle) . " -*";
    }

} catch (Exception $e) {
    $message = "❌ *Error*\n\n";
    $message .= "Terjadi kesalahan database: " . $e->getMessage() . "\n\n";
    $message .= "_- Pesan Otomatis dari System -_";
    error_log("Error in ambil_data_tagihan.php: " . $e->getMessage());
}

$pesan = $message;

// Cek apakah di-include atau diakses langsung
$included_files = get_included_files();
$isIncluded = (realpath($included_files[0]) !== realpath(__FILE__));

if ($isIncluded) {
    // Jika di-include, jangan output, biarkan variabel $message / $pesan tersedia
    ob_end_clean();
} else {
    // Jika diakses langsung via HTTP / CLI, output pesan
    ob_end_clean();
    header('Content-Type: text/plain; charset=utf-8');
    header('Cache-Control: no-cache, must-revalidate');
    echo $message;
    exit;
}
