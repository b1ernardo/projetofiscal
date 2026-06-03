<?php
require_once 'api/config.php';
require_once 'api/db.php';

$db = (new Database())->getConnection();

echo "--- Table Counts ---\n";
echo "Users: " . $db->query("SELECT COUNT(*) FROM users")->fetchColumn() . "\n";
echo "Companies: " . $db->query("SELECT COUNT(*) FROM companies")->fetchColumn() . "\n";
echo "Sales: " . $db->query("SELECT COUNT(*) FROM sales")->fetchColumn() . "\n";
echo "Fiscal Notes: " . $db->query("SELECT COUNT(*) FROM fiscal_notes")->fetchColumn() . "\n";

echo "\n--- Latest 5 Notes ---\n";
$stmt = $db->query("SELECT id, sale_id, numero, created_at FROM fiscal_notes ORDER BY created_at DESC LIMIT 5");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
