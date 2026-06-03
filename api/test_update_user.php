<?php
require_once 'config.php';
require_once 'db.php';

$db = (new Database())->getConnection();

// List users to see their IDs
$stmt = $db->query("SELECT u.id, u.email, u.company_id, p.full_name FROM users u LEFT JOIN profiles p ON u.id = p.user_id LIMIT 10");
$users = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "<pre>";
foreach ($users as $u) {
    echo "ID: " . $u['id'] . "\n";
    echo "Email: " . $u['email'] . "\n";
    echo "Company: " . $u['company_id'] . "\n";
    echo "Name: " . $u['full_name'] . "\n";
    echo "---\n";
}
echo "</pre>";
