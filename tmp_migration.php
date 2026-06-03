<?php
require_once 'api/config.php';
require_once 'api/db.php';

try {
    $db = (new Database())->getConnection();
    
    // Add observations column
    $db->exec("ALTER TABLE quotes ADD COLUMN IF NOT EXISTS observations TEXT AFTER total_amount");
    echo "Column 'observations' added.\n";
    
    // Check if created_by exists, add if not
    $db->exec("ALTER TABLE quotes ADD COLUMN IF NOT EXISTS created_by VARCHAR(255) AFTER seller_id");
    echo "Column 'created_by' added.\n";
    
} catch (Exception $e) {
    // If IF NOT EXISTS is not supported, it might fail if already exists.
    // Try without IF NOT EXISTS if it fails.
    try {
        $db->exec("ALTER TABLE quotes ADD COLUMN observations TEXT AFTER total_amount");
        echo "Column 'observations' added (manual).\n";
    } catch (Exception $e2) {
        echo "Error adding 'observations': " . $e2->getMessage() . "\n";
    }
    
    try {
        $db->exec("ALTER TABLE quotes ADD COLUMN created_by VARCHAR(255) AFTER seller_id");
        echo "Column 'created_by' added (manual).\n";
    } catch (Exception $e2) {
        echo "Error adding 'created_by': " . $e2->getMessage() . "\n";
    }
}
