<?php
/**
 * REPARO COMPLETO DO BANCO DE DADOS
 * Este script verifica todas as tabelas e adiciona colunas que podem ter sumido
 * após a restauração do banco de dados.
 */

require_once 'api/config.php';
require_once 'api/db.php';

try {
    $db = (new Database())->getConnection();
    echo "<div style='font-family: sans-serif; padding: 20px;'>";
    echo "<h1>🛠️ Reparo Completo de Banco de Dados</h1>";

    // 1. Criar tabelas base se não existirem
    echo "<h3>1. Verificando tabelas base...</h3>";
    $db->exec("CREATE TABLE IF NOT EXISTS `companies` (
        `id` CHAR(36) PRIMARY KEY,
        `name` VARCHAR(255) NOT NULL,
        `active` BOOLEAN NOT NULL DEFAULT TRUE
    )");
    $db->exec("INSERT IGNORE INTO companies (id, name, active) VALUES ('default-company-uuid', 'Empresa Padrão', 1)");
    echo "✅ Tabelas base verificadas.<br>";

    // 2. Corrigir Tabela CUSTOMERS (Clientes)
    echo "<h3>2. Corrigindo estrutura de Clientes...</h3>";
    $cols_customers = [
        'company_id' => 'CHAR(36) NOT NULL',
        'ie' => 'VARCHAR(50) NULL',
        'cep' => 'VARCHAR(20) NULL',
        'logradouro' => 'VARCHAR(255) NULL',
        'numero' => 'VARCHAR(20) NULL',
        'bairro' => 'VARCHAR(100) NULL',
        'municipio' => 'VARCHAR(100) NULL',
        'codigo_municipio' => 'VARCHAR(20) NULL',
        'uf' => 'CHAR(2) NULL',
        'status' => "VARCHAR(20) DEFAULT 'active'"
    ];

    $existing = [];
    $stmt = $db->query("DESCRIBE customers");
    while($row = $stmt->fetch()) { $existing[] = $row['Field']; }

    foreach ($cols_customers as $name => $def) {
        if (!in_array($name, $existing)) {
            $db->exec("ALTER TABLE customers ADD COLUMN `$name` $def");
            echo "➕ Coluna <b>$name</b> adicionada.<br>";
        }
    }
    echo "✅ Estrutura de clientes ok.<br>";

    // 3. Garantir 'company_id' em todas as outras tabelas
    echo "<h3>3. Garantindo compatibilidade multi-empresa...</h3>";
    $tables = [
        'products', 'sales', 'sale_items', 'comandas', 
        'purchases', 'cash_registers', 'cash_movements', 'stock_movements'
    ];

    foreach ($tables as $t) {
        $existing_t = [];
        $stmt_t = $db->query("DESCRIBE $t");
        while($r = $stmt_t->fetch()) { $existing_t[] = $r['Field']; }

        if (!in_array('company_id', $existing_t)) {
            $db->exec("ALTER TABLE `$t` ADD COLUMN `company_id` CHAR(36) NULL AFTER `id` ");
            echo "➕ 'company_id' adicionado em <b>$t</b>.<br>";
        }
        $db->exec("UPDATE `$t` SET company_id = 'default-company-uuid' WHERE company_id IS NULL OR company_id = ''");
    }
    echo "✅ Compatibilidade verificada em todas as tabelas.<br>";

    echo "<h2 style='color:green'>✨ Reparo concluído com sucesso!</h2>";
    echo "<p>Tente salvar o cliente novamente agora.</p>";
    echo "</div>";

} catch (Exception $e) {
    echo "<h1 style='color:red'>Erro no reparo:</h1>";
    echo "<pre>" . $e->getMessage() . "</pre>";
}
