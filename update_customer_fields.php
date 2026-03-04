<?php
$_SERVER['REQUEST_METHOD'] = 'CLI';

require_once __DIR__ . '/api/db.php';

try {
    $database = new Database();
    $db = $database->getConnection();
    
    $queries = [
        "ALTER TABLE customers ADD COLUMN ie VARCHAR(50) DEFAULT NULL",
        "ALTER TABLE customers ADD COLUMN cep VARCHAR(20) DEFAULT NULL",
        "ALTER TABLE customers ADD COLUMN logradouro VARCHAR(255) DEFAULT NULL",
        "ALTER TABLE customers ADD COLUMN numero VARCHAR(50) DEFAULT NULL",
        "ALTER TABLE customers ADD COLUMN bairro VARCHAR(100) DEFAULT NULL",
        "ALTER TABLE customers ADD COLUMN municipio VARCHAR(100) DEFAULT NULL",
        "ALTER TABLE customers ADD COLUMN codigo_municipio VARCHAR(20) DEFAULT NULL",
        "ALTER TABLE customers ADD COLUMN uf VARCHAR(2) DEFAULT NULL"
    ];

    foreach ($queries as $query) {
        try {
            $db->exec($query);
            echo "Sucesso: $query\n";
        } catch (PDOException $e) {
            echo "Aviso (pode já existir): " . $e->getMessage() . "\n";
        }
    }
    
    echo "Processo concluído.";

} catch (Exception $e) {
    echo "Erro: " . $e->getMessage();
}
