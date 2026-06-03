<?php
require_once 'api/config.php';
require_once 'api/db.php';

$db = (new Database())->getConnection();

echo "--- Companies ---\n";
$stmt = $db->query("SELECT id, name FROM companies");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));

echo "\n--- Users and Profiles ---\n";
$stmt = $db->query("SELECT u.email, u.company_id as u_cid, p.company_id as p_cid FROM users u LEFT JOIN profiles p ON u.id = p.user_id");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
