<?php
require 'api/config.php';
require 'api/db.php';

$db = new Database();
$conn = $db->getConnection();

try {
    // Get the first user
    $stmt = $conn->query("SELECT id FROM users LIMIT 1");
    $user = $stmt->fetch();

    if ($user) {
        $id = bin2hex(random_bytes(16));
        $id = substr($id, 0, 8) . "-" . substr($id, 8, 4) . "-" . substr($id, 12, 4) . "-" . substr($id, 16, 4) . "-" . substr($id, 20, 12);

        $conn->prepare("INSERT INTO user_roles (id, user_id, role, company_id) VALUES (:id, :user_id, 'super_admin', 'default-company-uuid') ON DUPLICATE KEY UPDATE role='super_admin'")
             ->execute([':id' => $id, ':user_id' => $user['id']]);

        echo "User " . $user['id'] . " promoted to super_admin.\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
