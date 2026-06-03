<?php
require 'api/config.php';
require 'api/db.php';
$db = new Database();
$conn = $db->getConnection();
echo "--- USERS & ROLES ---\n";
$stmt = $conn->query("SELECT u.email, u.id, ur.role FROM users u JOIN user_roles ur ON u.id = ur.user_id");
print_r($stmt->fetchAll());
