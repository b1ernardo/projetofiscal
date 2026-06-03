<?php
require 'config.php';
require 'db.php';
$db = new Database();
$conn = $db->getConnection();
$stmt = $conn->query('SELECT id, name, company_id FROM products LIMIT 5');
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
$stmt = $conn->query('SELECT id, name, company_id FROM customers LIMIT 5');
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
