<?php
require_once 'api/db.php';
$db = (new Database())->getConnection();

$tables = ['sales', 'products', 'comandas', 'customers'];
$result = [];

foreach ($tables as $table) {
    try {
        $stmt = $db->query("DESCRIBE $table");
        $result[$table] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (Exception $e) {
        $result[$table] = "Error: " . $e->getMessage();
    }
}

echo json_encode($result, JSON_PRETTY_PRINT);
