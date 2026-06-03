<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'db.php';

try {
    $db = (new Database())->getConnection();
    echo "<h1>Iniciando Reparação Automática do Banco...</h1>";
    
    // 1. Criar Tabela Companies
    $db->exec("CREATE TABLE IF NOT EXISTS companies (
        id CHAR(36) PRIMARY KEY, 
        name VARCHAR(255) NOT NULL, 
        modules TEXT, 
        active BOOLEAN DEFAULT TRUE
    )");
    echo "Tabela 'companies': OK<br>";

    // 2. Criar Empresa Padrão ID 1
    $db->exec("INSERT IGNORE INTO companies (id, name, modules, active) VALUES 
    ('1', 'GestaoSystem', '[\"pdv\", \"vendas\", \"produtos\", \"dashboard\", \"configuracoes\", \"fiscal\", \"delivery\"]', 1)");
    echo "Empresa padrão ID '1': OK<br>";

    // 3. Criar Coluna company_id na Users
    try {
        $db->exec("ALTER TABLE users ADD company_id CHAR(36) AFTER email");
    } catch(Exception $e) {
        // Ignora se a coluna já existir
    }
    $db->exec("UPDATE users SET company_id = '1' WHERE company_id IS NULL OR company_id = ''");
    echo "Atualização de usuários (vínculo com empresa): OK<br>";

    // 4. Criar Tabela User Roles
    $db->exec("DROP TABLE IF EXISTS user_roles");
    $db->exec("CREATE TABLE user_roles (
        id CHAR(36) PRIMARY KEY, 
        user_id CHAR(36) NOT NULL, 
        company_id CHAR(36) NOT NULL, 
        role VARCHAR(50) NOT NULL
    )");
    echo "Tabela 'user_roles': OK<br>";

    // 5. Criar Tabela Permissions
    $db->exec("CREATE TABLE IF NOT EXISTS user_module_permissions (
        id CHAR(36) PRIMARY KEY, 
        user_id CHAR(36) NOT NULL, 
        company_id CHAR(36) NOT NULL, 
        module_key VARCHAR(50) NOT NULL
    )");
    echo "Tabela 'user_module_permissions': OK<br>";

    // 6. Criar Tabela Profiles
    $db->exec("CREATE TABLE IF NOT EXISTS profiles (
        id CHAR(36) PRIMARY KEY, 
        user_id CHAR(36) NOT NULL, 
        company_id CHAR(36) NOT NULL, 
        full_name VARCHAR(255), 
        phone VARCHAR(50), 
        avatar_url TEXT
    )");
    echo "Tabela 'profiles': OK<br>";

    // 7. Dar Permissão Super Admin ao Usuário Logado
    $db->exec("INSERT IGNORE INTO user_roles (id, user_id, company_id, role) 
    SELECT REPLACE(UUID(), '-', ''), id, company_id, 'super_admin' 
    FROM users WHERE email = 'b1ernardo@gmail.com'");
    echo "Permissão 'super_admin' aplicada: OK<br>";

    echo "<h2 style='color:green'>Reparação Concluída com Sucesso! Volte ao sistema e faça login.</h2>";

} catch (Exception $e) {
    echo "<h1 style='color:red'>ERRO NA REPARAÇÃO:</h1>";
    echo "<pre>" . $e->getMessage() . "</pre>";
}
