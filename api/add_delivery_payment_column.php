<?php
require_once 'config.php';
require_once 'db.php';
$db = (new Database())->getConnection();

try {
    $db->exec("ALTER TABLE payment_methods ADD COLUMN show_in_delivery TINYINT(1) DEFAULT 1");
    echo "Column show_in_delivery added successfully to payment_methods table.";
} catch (Exception $e) {
    if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
        echo "Column show_in_delivery already exists.";
    } else {
        echo "Error: " . $e->getMessage();
    }
}
