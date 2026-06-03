<?php
require_once 'db.php';

try {
    $db = (new Database())->getConnection();
    
    // Senha padrão para o seu acesso principal
    $newPassword = '123456';
    $email = 'b1ernardo@gmail.com';
    $hash = password_hash($newPassword, PASSWORD_DEFAULT);

    // Garante que o usuário existe e atualiza a senha
    $stmt = $db->prepare("UPDATE users SET password_hash = ?, company_id = '1' WHERE email = ?");
    $stmt->execute([$hash, $email]);

    if ($stmt->rowCount() > 0) {
        echo "<h1>Sucesso!</h1>";
        echo "<p>Senha do usuário <strong>$email</strong> resetada para: <strong>$newPassword</strong></p>";
        echo "<p><strong>Tente logar agora no sistema.</strong></p>";
    } else {
        echo "<h1>Usuário não encontrado!</h1>";
        echo "<p>Verifique se o email '$email' está correto na sua tabela 'users'.</p>";
    }

} catch (Exception $e) {
    echo "<h1>Erro Crítico:</h1> " . $e->getMessage();
}
