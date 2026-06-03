<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: text/html; charset=UTF-8');

echo "<h1>Debug de Conexão e Erros - GestaoSystem</h1>";

echo "<h3>1. Verificando arquivos fundamentais:</h3>";
$files = ['config.php', 'db.php', 'controllers/AuthController.php', 'vendor/autoload.php'];
foreach($files as $f) {
    if(file_exists($f)) {
        echo "✅ Arquivo '$f' encontrado.<br>";
    } else {
        echo "<span style='color:red'>❌ Arquivo '$f' NÃO ENCONTRADO.</span><br>";
    }
}

echo "<h3>2. Testando inclusão do config.php:</h3>";
if(file_exists('config.php')) {
    include 'config.php';
    echo "✅ Config.php carregado.<br>";
    echo "Configurações atuais:<br>";
    echo "- DB_HOST: " . (defined('DB_HOST') ? DB_HOST : 'NÃO DEFINIDO') . "<br>";
    echo "- DB_USER: " . (defined('DB_USER') ? DB_USER : 'NÃO DEFINIDO') . "<br>";
    echo "- DB_NAME: " . (defined('DB_NAME') ? DB_NAME : 'NÃO DEFINIDO') . "<br>";
}

echo "<h3>3. Testando conexão com o Banco de Dados:</h3>";
if(file_exists('db.php')) {
    require_once 'db.php';
    try {
        $db = (new Database())->getConnection();
        echo "<span style='color:green'>✅ CONEXÃO COM O BANCO BEM SUCEDIDA!</span><br>";
        
        $stmt = $db->query("SELECT id, email FROM users LIMIT 1");
        $user = $stmt->fetch();
        if($user) {
            echo "✅ Tabela 'users' acessível. Usuário encontrado: " . $user['email'] . "<br>";
        } else {
            echo "⚠️ Tabela 'users' está vazia ou sem acesso.<br>";
        }

    } catch (Exception $e) {
        echo "<span style='color:red'>❌ ERRO DE CONEXÃO: " . $e->getMessage() . "</span><br>";
        echo "Dica: Verifique se as credenciais no api/config.php estão corretas para a Hostinger.<br>";
    }
}

echo "<h3>4. Testando AuthController:</h3>";
if(file_exists('controllers/AuthController.php')) {
    try {
        // Captura saída de erros de sintaxe ou warnings
        ob_start();
        require_once 'controllers/AuthController.php';
        $out = ob_get_clean();
        if(!empty($out)) echo "⚠️ Saída inesperada ao carregar AuthController: <pre>$out</pre>";
        
        if(class_exists('AuthController')) {
            echo "✅ Classe AuthController encontrada.<br>";
            $auth = new AuthController();
            echo "✅ Instância de AuthController criada.<br>";
        } else {
            echo "<span style='color:red'>❌ Classe AuthController NÃO encontrada no arquivo.</span><br>";
        }
    } catch (Throwable $e) {
        echo "<span style='color:red'>❌ ERRO AO CARREGAR AUTHCONTROLLER: " . $e->getMessage() . "</span><br>";
    }
}
