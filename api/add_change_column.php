<?php
require_once 'db.php';

try {
    $database = new Database();
    $db = $database->getConnection();
    
    // Check if column exists
    $stmt = $db->query("SHOW COLUMNS FROM delivery_orders LIKE 'change_for'");
    $exists = $stmt->fetch();
    
    if (!$exists) {
        $db->exec("ALTER TABLE delivery_orders ADD COLUMN change_for DECIMAL(10,2) DEFAULT NULL AFTER payment_method");
        echo "Coluna 'change_for' adicionada com sucesso!\n";
    } else {
        echo "Coluna 'change_for' já existe.\n";
    }
} catch (Exception $e) {
    echo "Erro: " . $e->getMessage() . "\n";
}
