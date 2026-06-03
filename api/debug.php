<?php
require 'config.php';
require 'db.php';
$db = new Database();
$conn = $db->getConnection();
$stmt = $conn->query('SELECT id, email, company_id FROM users');
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
$stmt = $conn->query('SELECT id, name FROM companies');
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
