<?php
// debug_quotes.php
require_once 'api/config.php';
require_once 'api/db.php';

echo "<div style='font-family: sans-serif; padding: 20px;'>";
echo "<h2>🔍 Depuração de Orçamentos</h2>";

try {
    $db = (new Database())->getConnection();
    
    // 1. Listar todas as empresas
    echo "<h3>1. Empresas no Sistema:</h3>";
    $companies = $db->query("SELECT id, name FROM companies")->fetchAll();
    echo "<ul>";
    foreach ($companies as $c) {
        echo "<li>ID: <code>" . $c['id'] . "</code> | Nome: " . $c['name'] . "</li>";
    }
    echo "</ul>";

    // 2. Listar Orçamentos e seus Company IDs
    echo "<h3>2. Orçamentos na Tabela 'quotes':</h3>";
    $quotes = $db->query("SELECT id, company_id, total_amount, created_at FROM quotes")->fetchAll();
    
    if (empty($quotes)) {
        echo "<p style='color: orange;'>Nenhum orçamento encontrado na tabela.</p>";
    } else {
        echo "<table border='1' cellpadding='5' style='border-collapse: collapse;'>";
        echo "<tr><th>ID</th><th>Company ID</th><th>Valor</th><th>Data</th></tr>";
        foreach ($quotes as $q) {
            echo "<tr>";
            echo "<td>" . substr($q['id'], 0, 8) . "...</td>";
            echo "<td><code>" . $q['company_id'] . "</code></td>";
            echo "<td>" . $q['total_amount'] . "</td>";
            echo "<td>" . $q['created_at'] . "</td>";
            echo "</tr>";
        }
        echo "</table>";
    }

    // 3. Verificar o Contexto do Usuário Logado
    echo "<h3>3. Contexto do seu Usuário Atual:</h3>";
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!$authHeader && function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }

    if ($authHeader) {
        $token = str_replace('Bearer ', '', $authHeader);
        $payload = json_decode(base64_decode($token), true);
        if ($payload) {
            echo "<p>Seu <b>company_id</b> logado agora é: <code style='background: #ffffcc; padding: 2px 5px; border: 1px solid #ccc;'>" . ($payload['company_id'] ?? 'NÃO ENCONTRADO') . "</code></p>";
            echo "<p>Se esse código acima não for IGUAL ao da coluna 'Company ID' na tabela acima, a lista aparecerá vazia.</p>";
        } else {
            echo "<p style='color: orange;'>⚠️ Logado, mas não foi possível decodificar o token.</p>";
        }
    } else {
        echo "<p style='color: orange;'>⚠️ Você não enviou o Token. Para este teste funcionar, você precisa estar logado no sistema na mesma aba ou enviar o token via URL (?token=...).</p>";
        echo "<p><i>Dica: Se você abrir essa página logo após usar o sistema no mesmo navegador, o PHP pode capturar o header se o servidor estiver configurado para isso.</i></p>";
    }

} catch (Exception $e) {
    echo "<p style='color: red;'>Erro: " . $e->getMessage() . "</p>";
}

echo "</div>";
