<?php
require_once 'api/db.php';
$db = (new Database())->getConnection();
$tables = ['service_orders', 'service_order_items', 'service_order_services'];
foreach ($tables as $table) {
    try {
        $stmt = $db->query("DESCRIBE $table");
        echo "Table: $table\n";
        print_r($stmt->fetchAll());
    } catch (Exception $e) {
        echo "Error on $table: " . $e->getMessage() . "\n";
    }
}
