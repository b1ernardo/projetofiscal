<?php
require_once 'api/config.php';
require_once 'api/db.php';

echo "<div style='font-family: sans-serif; padding: 20px;'>";
echo "<h2>🔍 Diagnóstico de Banco de Dados (Orçamentos)</h2>";

try {
    $db = (new Database())->getConnection();
    
    // Verificar se a tabela existe
    $tables = $db->query("SHOW TABLES LIKE 'quotes'")->fetchAll();
    if (empty($tables)) {
        echo "<p style='color: red;'>❌ Erro: A tabela <strong>quotes</strong> não existe no banco de dados!</p>";
    } else {
        echo "<p style='color: green;'>✅ Tabela <strong>quotes</strong> encontrada.</p>";
        
        // Listar colunas
        $cols = $db->query("DESCRIBE quotes")->fetchAll(PDO::FETCH_ASSOC);
        echo "<h3>Colunas encontradas:</h3><ul>";
        foreach ($cols as $col) {
            echo "<li><strong>" . $col['Field'] . "</strong> (" . $col['Type'] . ")</li>";
        }
        echo "</ul>";
        
        // Verificar itens
        $items_table = $db->query("SHOW TABLES LIKE 'quote_items'")->fetchAll();
        if (empty($items_table)) {
             echo "<p style='color: red;'>❌ Erro: A tabela <strong>quote_items</strong> não existe!</p>";
        } else {
             echo "<p style='color: green;'>✅ Tabela <strong>quote_items</strong> encontrada.</p>";
        }
    }

} catch (Exception $e) {
    echo "<p style='color: red;'>❌ Erro de Conexão: " . $e->getMessage() . "</p>";
}

echo "<p style='margin-top: 20px; color: #666;'>⚠️ Apague este arquivo após o teste.</p>";
echo "</div>";
