<?php
require_once 'api/config.php';
require_once 'api/db.php';

$db = (new Database())->getConnection();

echo "--- All User Profiles ---\n";
$stmt = $db->query("SELECT u.email, p.company_id FROM users u LEFT JOIN profiles p ON u.id = p.user_id");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
