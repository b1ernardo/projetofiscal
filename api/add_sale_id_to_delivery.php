<?php
require_once 'config.php';
require_once 'db.php';
$db = (new Database())->getConnection();

try {
    $db->exec("ALTER TABLE delivery_orders ADD COLUMN sale_id CHAR(36) NULL REFERENCES sales(id) ON DELETE SET NULL");
    echo "Column sale_id added successfully to delivery_orders table.";
} catch (Exception $e) {
    if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
        echo "Column sale_id already exists.";
    } else {
        echo "Error: " . $e->getMessage();
    }
}
