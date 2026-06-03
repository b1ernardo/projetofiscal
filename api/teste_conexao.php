<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<h1>Diagnóstico de Conexão</h1>";

try {
    require_once 'config.php';
    echo "<p>✅ Arquivo config.php carregado.</p>";
    
    echo "<p>Tentando conectar ao banco: " . DB_NAME . " no host " . DB_HOST . "...</p>";
    
    $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];
    
    $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
    echo "<p>✅ CONEXÃO REALIZADA COM SUCESSO!</p>";
    
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM users");
    $row = $stmt->fetch();
    echo "<p>✅ Tabela 'users' acessada. Total de usuários: " . $row['total'] . "</p>";

} catch (Exception $e) {
    echo "<p>❌ ERRO DETECTADO:</p>";
    echo "<pre>" . $e->getMessage() . "</pre>";
}

echo "<h2>Variáveis de Ambiente</h2>";
echo "<pre>";
print_r($_SERVER);
echo "</pre>";
