<?php
require_once 'api/config.php';
require_once 'api/db.php';

$db = (new Database())->getConnection();
echo "--- Tables ---\n";
print_r($db->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN));

echo "\n--- Sales Table ---\n";
print_r($db->query("SHOW CREATE TABLE sales")->fetch(PDO::FETCH_ASSOC));

echo "\n--- Sale Items Table ---\n";
// Let's assume the name of the table for sale items
$tables = $db->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
if (in_array('sale_items', $tables)) {
    print_r($db->query("SHOW CREATE TABLE sale_items")->fetch(PDO::FETCH_ASSOC));
} else {
    echo "sale_items table not found. Checking for similar names...\n";
    foreach ($tables as $t) {
        if (strpos($t, 'sale') !== false) echo "Found: $t\n";
    }
}
