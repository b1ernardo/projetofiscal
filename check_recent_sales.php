<?php
require_once 'api/config.php';
require_once 'api/db.php';

$db = (new Database())->getConnection();

echo "--- Checking Sales created in the last 2 hours ---\n";
$stmt = $db->query("SELECT id, sale_number, created_at, total_amount FROM sales WHERE created_at >= NOW() - INTERVAL 2 HOUR ORDER BY created_at DESC");
$sales = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (!$sales) {
    echo "No recent sales found.\n";
} else {
    print_r($sales);
}
