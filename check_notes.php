<?php
require_once 'api/config.php';
require_once 'api/db.php';

$db = (new Database())->getConnection();

echo "--- Checking Latest Fiscal Notes ---\n";
$stmt = $db->query("SELECT id, sale_id, tipo, numero, status, created_at FROM fiscal_notes ORDER BY created_at DESC LIMIT 10");
$notes = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (!$notes) {
    echo "No fiscal notes found in the database.\n";
} else {
    print_r($notes);
}
