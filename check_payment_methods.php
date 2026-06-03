<?php
require_once 'api/config.php';
require_once 'api/db.php';

$db = (new Database())->getConnection();

echo "--- Latest 5 Sales Payment Methods ---\n";
$stmt = $db->query("SELECT sale_number, payment_method, total_amount, created_at FROM sales ORDER BY created_at DESC LIMIT 5");
$sales = $stmt->fetchAll(PDO::FETCH_ASSOC);

print_r($sales);
