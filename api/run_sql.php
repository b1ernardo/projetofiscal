<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

try {
    $db = (new Database())->getConnection();
    $sql = file_get_contents(__DIR__ . '/update_fiscal.sql');
    
    // Split SQL by semicolon (basic but works for this script)
    $queries = explode(';', $sql);
    
    foreach ($queries as $query) {
        $query = trim($query);
        if (!empty($query)) {
            $stmt = $db->prepare($query);
            $stmt->execute();
            echo "Executed: " . substr($query, 0, 50) . "...\n";
        }
    }
    
    echo "\nConcluído com sucesso!\n";
} catch (PDOException $e) {
    echo "Erro: " . $e->getMessage();
}
