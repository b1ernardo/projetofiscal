<?php
require 'api/config.php';
require 'api/db.php';
$db = new Database();
$conn = $db->getConnection();
echo "Promoting all users to super_admin for testing...\n";
$stmt = $conn->query("SELECT id FROM users");
$users = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach ($users as $user) {
    $id = bin2hex(random_bytes(16));
    $id = substr($id, 0, 8) . "-" . substr($id, 8, 4) . "-" . substr($id, 12, 4) . "-" . substr($id, 16, 4) . "-" . substr($id, 20, 12);
    $conn->prepare("INSERT INTO user_roles (id, user_id, role, company_id) VALUES (:id, :user_id, 'super_admin', 'default-company-uuid') ON DUPLICATE KEY UPDATE role='super_admin'")
         ->execute([':id' => $id, ':user_id' => $user['id']]);
    echo "ID: " . $user['id'] . " is now super_admin.\n";
}
echo "Done.\n";
