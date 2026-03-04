<?php
require_once 'config.php';
require_once 'Database.php';

$db = (new Database())->getConnection();
$limit = 5;
$stmt = $db->prepare("
    SELECT s.*, c.name as customer_name,
           (SELECT COUNT(id) FROM fiscal_notes fn WHERE fn.sale_id = s.id AND fn.status = 'generated') > 0 as has_fiscal_note,
           (SELECT id FROM fiscal_notes fn WHERE fn.sale_id = s.id AND fn.status = 'generated' LIMIT 1) as fiscal_note_id
    FROM sales s 
    LEFT JOIN customers c ON s.customer_id = c.id 
    ORDER BY s.created_at DESC 
    LIMIT :limit
");
$stmt->bindParam(':limit', $limit, PDO::PARAM_INT);
$stmt->execute();
echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
