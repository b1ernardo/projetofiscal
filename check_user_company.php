<?php
require_once 'api/config.php';
require_once 'api/db.php';

$db = (new Database())->getConnection();

$email = 'b1ernardo@gmail.com';

echo "--- Checking User: $email ---\n";
$stmt = $db->prepare("SELECT p.company_id FROM users u JOIN profiles p ON u.id = p.user_id WHERE u.email = :email");
$stmt->execute([':email' => $email]);
$profile = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$profile) {
    echo "User not found.\n";
} else {
    print_r($profile);
}
