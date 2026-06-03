<?php
require 'api/config.php';
require 'api/db.php';
$db = new Database();
$conn = $db->getConnection();
echo "--- ALL USERS ROLES ---\n";
$stmt = $conn->query("SELECT u.email, GROUP_CONCAT(ur.role) as roles FROM users u LEFT JOIN user_roles ur ON u.id = ur.user_id GROUP BY u.id");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
