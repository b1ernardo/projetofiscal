<?php
require_once 'c:/xampp/htdocs/projetofiscal/api/db.php';
$db = new Database();
$conn = $db->getConnection();

$stmt = $conn->query("SHOW COLUMNS FROM accounts_payable");
$cols = $stmt->fetchAll(PDO::FETCH_COLUMN);
echo "PAYABLE: " . implode(", ", $cols) . "\n";

$stmt2 = $conn->query("SHOW COLUMNS FROM accounts_receivable");
$cols2 = $stmt2->fetchAll(PDO::FETCH_COLUMN);
echo "RECEIVABLE: " . implode(", ", $cols2) . "\n";
