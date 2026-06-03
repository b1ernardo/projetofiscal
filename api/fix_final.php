<?php
// /api/fix_final.php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'config.php';
require_once 'db.php';

header('Content-Type: text/html; charset=UTF-8');

echo "<h1>Restaurando Acesso Total - GestaoSystem</h1>";

try {
    $db = (new Database())->getConnection();
    echo "✅ Conexão com o banco estabelecida.<br>";
    
    // 1. Garante que a tabela 'companies' existe e tem a empresa 1
    $db->exec("CREATE TABLE IF NOT EXISTS companies (
        id CHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        modules TEXT,
        active TINYINT(1) DEFAULT 1
    )");
    
    $db->exec("INSERT IGNORE INTO companies (id, name, modules, active) VALUES 
    ('1', 'Sua Empresa', '[\"pdv\", \"vendas\", \"produtos\", \"dashboard\", \"configuracoes\", \"fiscal\", \"delivery\"]', 1)");
    echo "✅ Tabela e registro de empresa verificados.<br>";

    // 2. Garante que existe a coluna company_id na tabela users
    try {
        $db->exec("ALTER TABLE users ADD COLUMN company_id CHAR(36) AFTER email");
        echo "✅ Coluna 'company_id' adicionada à tabela 'users'.<br>";
    } catch (Exception $e) {
        echo "ℹ️ Coluna 'company_id' já existe ou não pôde ser adicionada.<br>";
    }

    // 3. Atualiza ou cria usuários e permissões
    $usersToFix = [
        'b1ernardo@gmail.com' => 'admin1235',
        'admin@admin.com' => '123456'
    ];

    foreach ($usersToFix as $email => $password) {
        $hash = password_hash($password, PASSWORD_DEFAULT);
        
        $stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        
        if ($user) {
            $userId = $user['id'];
            $db->prepare("UPDATE users SET password_hash = ?, company_id = '1' WHERE id = ?")->execute([$hash, $userId]);
            echo "✅ Usuário <b>$email</b> atualizado.<br>";
        } else {
            $userId = substr(md5(uniqid()), 0, 36);
            $db->prepare("INSERT INTO users (id, email, password_hash, company_id) VALUES (?, ?, ?, '1')")->execute([$userId, $email, $hash]);
            echo "✅ Usuário <b>$email</b> criado.<br>";
        }

        // Garante o cargo de super_admin para o seu email
        if ($email === 'b1ernardo@gmail.com') {
            $db->prepare("DELETE FROM user_roles WHERE user_id = ?")->execute([$userId]);
            $db->prepare("INSERT INTO user_roles (id, user_id, role, company_id) VALUES (?, ?, 'super_admin', '1')")->execute([substr(md5(uniqid()), 0, 36), $userId]);
            echo "⭐️ Cargo <b>Super Admin</b> atribuído a $email.<br>";
        }
    }

    echo "<h3>🚀 Agora tente logar!</h3>";
    echo "<ul>
            <li><b>User:</b> b1ernardo@gmail.com | <b>Senha:</b> admin1235</li>
            <li><b>User:</b> admin@admin.com | <b>Senha:</b> 123456</li>
          </ul>";

} catch (Throwable $e) {
    echo "<span style='color:red'>❌ Erro: " . $e->getMessage() . "</span><br>";
}
