<?php
require_once __DIR__ . '/../api/db.php';
require_once __DIR__ . '/../api/config.php';

$db = new Database();
$conn = $db->getConnection();

$stmt = $conn->query("SELECT id, name, module_key FROM system_modules ORDER BY name");
$modules = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo json_encode($modules, JSON_PRETTY_PRINT);
