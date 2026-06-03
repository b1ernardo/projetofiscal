<?php
require_once __DIR__ . '/api/config/database.php';
$db = new Database();
$conn = $db->getConnection();
$stmt = $conn->prepare("DELETE FROM products WHERE name LIKE '%xl/workbook.xml%' OR name LIKE '%_rels/%' OR name LIKE 'PK%' OR name LIKE '%[Content_Types].xml%'");
$stmt->execute();
echo "Deleted " . $stmt->rowCount() . " garbage products.";
?>
