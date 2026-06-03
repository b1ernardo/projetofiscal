<?php
require_once 'api/config.php';
require_once 'api/db.php';

$db = (new Database())->getConnection();

$today = date('Y-m-d');
echo "--- Sales Created Today ($today) ---\n";
$stmt = $db->prepare("SELECT sale_number, payment_method, total_amount, created_at, id FROM sales WHERE DATE(created_at) = :today ORDER BY created_at DESC");
$stmt->execute([':today' => $today]);
$sales = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (!$sales) {
    echo "No sales found TODAY.\n";
    echo "--- Latest 5 Sales Overall ---\n";
    $stmt = $db->query("SELECT sale_number, payment_method, total_amount, created_at, id FROM sales ORDER BY created_at DESC LIMIT 5");
    print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
} else {
    print_r($sales);
}
