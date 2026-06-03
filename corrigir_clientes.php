<?php
/**
 * Script para verificar se a tabela de clientes tem todas as colunas necessárias.
 */

require_once 'api/config.php';
require_once 'api/db.php';

try {
    $db = (new Database())->getConnection();
    echo "<h1>Verificando Estrutura da Tabela: customers</h1>";

    $required_columns = [
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

    $existing_columns = [];
    $cols = $db->query("DESCRIBE customers")->fetchAll(PDO::FETCH_ASSOC);
    foreach ($cols as $col) {
        $existing_columns[] = $col['Field'];
    }

    foreach ($required_columns as $col_name => $col_def) {
        if (!in_array($col_name, $existing_columns)) {
            echo "Adicionando coluna: <b>$col_name</b>... ";
            $db->exec("ALTER TABLE customers ADD COLUMN `$col_name` $col_def");
            echo "<span style='color:green'>Sucesso!</span><br>";
        } else {
            echo "Coluna <b>$col_name</b> já existe.<br>";
        }
    }

    echo "<h2>Estrutura verificada com sucesso!</h2>";
    echo "<p>Agora tente salvar o cliente novamente.</p>";

} catch (Exception $e) {
    echo "<h1 style='color:red'>Erro na verificação:</h1>";
    echo "<pre>" . $e->getMessage() . "</pre>";
}
