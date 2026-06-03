<?php
require_once 'api/db.php';
$db = (new Database())->getConnection();

try {
    $db->exec("ALTER TABLE sellers ADD COLUMN commission_percentage DECIMAL(5,2) DEFAULT 0.00 AFTER phone");
    echo "commission_percentage added to sellers table.\n";
} catch (Exception $e) {
    if (strpos($e->getMessage(), "Duplicate column name") !== false) {
        echo "Column already exists.\n";
    } else {
        echo "Error: " . $e->getMessage() . "\n";
    }
}
