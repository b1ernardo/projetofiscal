<?php
require_once 'c:/xampp/htdocs/projetofiscal/api/db.php';
$db = new Database();
$conn = $db->getConnection();

echo "=== accounts_payable ===\n";
$stmt = $conn->query("DESCRIBE accounts_payable");
foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $col) {
    echo "  " . $col['Field'] . " (" . $col['Type'] . ")\n";
}

echo "\n=== accounts_receivable ===\n";
$stmt = $conn->query("DESCRIBE accounts_receivable");
foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $col) {
    echo "  " . $col['Field'] . " (" . $col['Type'] . ")\n";
}
