<?php
require_once 'api/config.php';
require_once 'api/db.php';

$db = (new Database())->getConnection();

function checkTable($db, $tableName) {
    echo "--- Table: $tableName ---\n";
    try {
        $stmt = $db->query("DESCRIBE $tableName");
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            echo "Field: {$row['Field']} | Type: {$row['Type']} | Null: {$row['Null']}\n";
        }
    } catch (Exception $e) {
        echo "Error: " . $e->getMessage() . "\n";
    }
    echo "\n";
}

checkTable($db, 'sales');
checkTable($db, 'fiscal_notes');
