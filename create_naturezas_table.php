<?php
$_SERVER['REQUEST_METHOD'] = 'CLI';

require_once __DIR__ . '/api/db.php';

try {
    $database = new Database();
    $db = $database->getConnection();
    
    $query = "CREATE TABLE IF NOT EXISTS naturezas_operacao (
                id VARCHAR(36) PRIMARY KEY,
                descricao VARCHAR(60) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              )";

    $db->exec($query);
    echo "Sucesso: Tabela naturezas_operacao criada ou já existente.\n";
    
    // Inserir um padrão
    $check = $db->query("SELECT count(*) FROM naturezas_operacao")->fetchColumn();
    if ($check == 0) {
        $db->exec("INSERT INTO naturezas_operacao (id, descricao) VALUES (UUID(), 'VENDA DE MERCADORIA')");
        echo "Sucesso: Natureza padrão inserida.\n";
    }

    echo "Processo concluído.";

} catch (Exception $e) {
    echo "Erro: " . $e->getMessage();
}
