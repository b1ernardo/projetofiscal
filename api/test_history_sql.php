<?php
$db = new PDO('mysql:host=localhost;dbname=distbebidas_db', 'root', '');
echo "--- SQL TEST ---\n";
// The SQL in CashierController.php line 159 is:
// "SELECT * FROM cash_registers ORDER BY opened_at DESC LIMIT 50"
$stmt = $db->query("SELECT * FROM cash_registers ORDER BY opened_at DESC LIMIT 50");
$results = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "Count: " . count($results) . "\n";
print_r($results);
