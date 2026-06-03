<?php
require_once 'config.php';
require_once 'db.php';

$db = (new Database())->getConnection();

$company_id = 'fc1cc936-17d0-fd22-be3b-c067b13f4013';

$stmt = $db->prepare("
    SELECT u.id, u.email, p.full_name, p.phone, 
    (SELECT GROUP_CONCAT(role SEPARATOR ', ') FROM user_roles WHERE user_id = u.id) as roles
    FROM users u
    LEFT JOIN profiles p ON u.id = p.user_id
    WHERE u.company_id = :cid
    ORDER BY u.created_at DESC
");
$stmt->execute([':cid' => $company_id]);
$result = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Company ID: $company_id\n";
echo "Users found: " . count($result) . "\n\n";
echo json_encode($result, JSON_PRETTY_PRINT);
