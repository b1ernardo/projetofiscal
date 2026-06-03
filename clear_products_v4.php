<?php
require_once __DIR__ . '/api/db.php';
$db = new Database();
$conn = $db->getConnection();
$stmt = $conn->prepare("DELETE FROM products WHERE cost_price = 0 AND sale_price = 0 AND (name LIKE '%xl/%' OR name LIKE '%_rels/%' OR name LIKE '%PK%' OR length(name) > 80)");
$stmt->execute();
echo "Deleted " . $stmt->rowCount() . " garbage products.";
?>
