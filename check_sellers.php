<?php
require_once 'api/db.php';
$db = (new Database())->getConnection();

try {
    $stmt = $db->query("DESCRIBE sellers");
    echo "Sellers Table:\n";
    print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
} catch (Exception $e) {
    echo "Error describing sellers: " . $e->getMessage() . "\n";
}

try {
    $stmt = $db->query("DESCRIBE sales");
    echo "\nSales Table:\n";
    $fields = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $found = false;
    foreach ($fields as $f) {
        if ($f['Field'] == 'seller_id') {
            $found = true;
            break;
        }
    }
    echo "seller_id exists in sales: " . ($found ? "YES" : "NO") . "\n";
} catch (Exception $e) {
    echo "Error describing sales: " . $e->getMessage() . "\n";
}
