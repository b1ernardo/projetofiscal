<?php
require_once 'c:/xampp/htdocs/projetofiscal/api/db.php';
$db = new Database();
$conn = $db->getConnection();
$stmt = $conn->query("SELECT id, email, password_hash FROM users");
$users = $stmt->fetchAll();
print_r($users);
