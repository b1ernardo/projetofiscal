<?php
$db = new PDO('mysql:host=localhost;dbname=distbebidas_db', 'root', '');
echo "--- LATEST 10 REGISTERS ---\n";
$stmt = $db->query("SELECT id, opened_at, closed_at, opening_balance, closing_balance FROM cash_registers ORDER BY opened_at DESC LIMIT 10");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
