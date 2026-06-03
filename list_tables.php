<?php
require 'api/config.php';
require 'api/db.php';
$db = new Database();
$conn = $db->getConnection();
$stmt = $conn->query('SHOW TABLES');
print_r($stmt->fetchAll(PDO::FETCH_COLUMN));
