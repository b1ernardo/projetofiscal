<?php
require_once 'c:/xampp/htdocs/projetofiscal/api/db.php';
$db = new Database();
$conn = $db->getConnection();
$stmt = $conn->query("DESCRIBE accounts_payable");
$cols = $stmt->fetchAll();
print_r($cols);
