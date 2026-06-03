<?php
/**
 * Script de emergência para corrigir as colunas 'company_id' que estão faltando
 * após a restauração do banco de dados.
 */

require_once 'api/config.php';
require_once 'api/db.php';

try {
    $db = (new Database())->getConnection();
    echo "<h1>Iniciando Correção do Schema...</h1>";

    $tables = [
        'categories', 'products', 'product_box_configs', 'customers', 
        'suppliers', 'sales', 'sale_items', 'sale_payments', 
        'comandas', 'comanda_items', 'purchases', 'purchase_items', 
        'cash_registers', 'cash_movements', 'stock_movements', 
        'profiles', 'user_roles', 'user_module_permissions'
    ];

    foreach ($tables as $table) {
        // Verificar se a coluna já existe
        $check = $db->query("SHOW COLUMNS FROM `$table` LIKE 'company_id'")->fetch();
        
        if (!$check) {
            echo "Adicionando column 'company_id' na tabela: <b>$table</b>... ";
            $db->exec("ALTER TABLE `$table` ADD COLUMN `company_id` CHAR(36) NULL AFTER `id` ");
            echo "<span style='color:green'>Sucesso!</span><br>";
        } else {
            echo "A tabela <b>$table</b> já possui a coluna 'company_id'.<br>";
        }
    }

    // Identificar a empresa padrão (ou criar uma)
    $companyId = 'default-company-uuid';
    $db->exec("INSERT IGNORE INTO companies (id, name, active) VALUES ('$companyId', 'Empresa Padrão', 1)");
    
    // Preencher registros orfãos com a empresa padrão
    foreach ($tables as $table) {
        $db->exec("UPDATE `$table` SET company_id = '$companyId' WHERE company_id IS NULL OR company_id = ''");
    }

    echo "<h2>Schema corrigido com sucesso!</h2>";
    echo "<p>Agora os filtros de busca devem voltar a funcionar.</p>";

} catch (Exception $e) {
    echo "<h1 style='color:red'>Erro na correção:</h1>";
    echo "<pre>" . $e->getMessage() . "</pre>";
}
