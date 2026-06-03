<?php
require_once 'api/config.php';
require_once 'api/db.php';

$db = (new Database())->getConnection();

echo "--- Sale Company IDs ---\n";
$stmt = $db->query("SELECT company_id, COUNT(*) as count FROM sales GROUP BY company_id");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));

echo "\n--- Latest 10 Sales info ---\n";
$stmt = $db->query("SELECT sale_number, company_id, created_at FROM sales ORDER BY created_at DESC LIMIT 10");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
