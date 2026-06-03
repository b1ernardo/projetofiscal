<?php
require_once 'c:/xampp/htdocs/projetofiscal/api/db.php';
$db = new Database();
$conn = $db->getConnection();

// Check if table exists
try {
    $stmt = $conn->query("SHOW TABLES LIKE 'service_orders'");
    $exists = $stmt->fetch();
    echo "service_orders exists: " . ($exists ? "YES" : "NO") . "\n";
    
    if ($exists) {
        $stmt = $conn->query("SHOW COLUMNS FROM service_orders");
        $cols = $stmt->fetchAll(PDO::FETCH_COLUMN);
        echo "COLUMNS: " . implode(", ", $cols) . "\n";
    }
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}

echo "\n";
try {
    $stmt = $conn->query("SHOW TABLES LIKE 'service_order_items'");
    $exists = $stmt->fetch();
    echo "service_order_items exists: " . ($exists ? "YES" : "NO") . "\n";
    
    if ($exists) {
        $stmt = $conn->query("SHOW COLUMNS FROM service_order_items");
        $cols = $stmt->fetchAll(PDO::FETCH_COLUMN);
        echo "COLUMNS: " . implode(", ", $cols) . "\n";
    }
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}

echo "\n";
try {
    $stmt = $conn->query("SHOW TABLES LIKE 'service_order_services'");
    $exists = $stmt->fetch();
    echo "service_order_services exists: " . ($exists ? "YES" : "NO") . "\n";
    
    if ($exists) {
        $stmt = $conn->query("SHOW COLUMNS FROM service_order_services");
        $cols = $stmt->fetchAll(PDO::FETCH_COLUMN);
        echo "COLUMNS: " . implode(", ", $cols) . "\n";
    }
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
