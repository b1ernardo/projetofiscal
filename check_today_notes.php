<?php
require_once 'api/config.php';
require_once 'api/db.php';

$db = (new Database())->getConnection();

echo "--- Checking Notes created today ---\n";
$stmt = $db->query("SELECT * FROM fiscal_notes WHERE DATE(created_at) >= '2026-03-07' ORDER BY created_at DESC");
$notes = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (!$notes) {
    echo "No notes found created today or yesterday.\n";
} else {
    foreach ($notes as $n) {
        unset($n['xml_path']);
        print_r($n);
    }
}
