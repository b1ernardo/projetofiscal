<?php
// /api/migrate_os.php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

try {
    $db = (new Database())->getConnection();
    $sql = file_get_contents(__DIR__ . '/service_orders.sql');
    
    // Split SQL by semicolon
    $queries = explode(';', $sql);
    
    foreach ($queries as $query) {
        $query = trim($query);
        if (!empty($query)) {
            $stmt = $db->prepare($query);
            $stmt->execute();
            echo "Executed query successfully.\n";
        }
    }
    
    echo "\nTabelas de Ordem de Serviço criadas com sucesso!\n";
} catch (PDOException $e) {
    echo "Erro: " . $e->getMessage();
}
