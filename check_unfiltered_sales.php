<?php
require_once 'api/config.php';
require_once 'api/db.php';

$db = (new Database())->getConnection();

echo "--- Recent Sales (Last 24h) No Filter ---\n";
$stmt = $db->query("SELECT sale_number, payment_method, company_id, created_at FROM sales ORDER BY created_at DESC LIMIT 10");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
