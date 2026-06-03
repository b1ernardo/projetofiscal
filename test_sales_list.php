<?php
require_once 'api/config.php';
require_once 'api/db.php';

$db = (new Database())->getConnection();

// Mock ApiController to use authentication or just fetch specifically
$email = 'b1ernardo@gmail.com';
$stmt = $db->prepare("SELECT company_id FROM profiles WHERE user_id = (SELECT id FROM users WHERE email = ?)");
$stmt->execute([$email]);
$companyId = $stmt->fetchColumn();

echo "User Company: $companyId\n";

$limit = 10;
$sql = "SELECT s.*, c.name as customer_name, fn.status as fiscal_status 
        FROM sales s 
        LEFT JOIN customers c ON s.customer_id = c.id 
        LEFT JOIN fiscal_notes fn ON (fn.sale_id = s.id AND fn.id = (SELECT f.id FROM fiscal_notes f WHERE f.sale_id = s.id ORDER BY f.created_at DESC LIMIT 1))
        WHERE s.company_id = :company_id ORDER BY s.created_at DESC LIMIT $limit";

$stmt = $db->prepare($sql);
$stmt->execute([':company_id' => $companyId]);
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
