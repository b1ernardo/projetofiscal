<?php
header('Content-Type: text/html; charset=UTF-8');
require_once 'config.php';
require_once 'db.php';

try {
    $db = (new Database())->getConnection();
    echo "<h1>Iniciando Reparação de Dados...</h1>";

    // 1. Identificar Empresa Principal
    $companyId = $db->query("SELECT id FROM companies WHERE id = 'default-company-uuid' OR name LIKE '%Padrão%' OR name LIKE '%Gestao%' LIMIT 1")->fetchColumn();
    if (!$companyId) {
        $companyId = 'default-company-uuid';
        $db->exec("INSERT IGNORE INTO companies (id, name, modules, active) VALUES ('$companyId', 'Empresa Padrão', '[]', 1)");
    }
    echo "Empresa alvo: <b>$companyId</b><br>";

    // 2. Harmonizar Vínculos (Users, Profiles, Sales, Fiscal Notes)
    $db->prepare("UPDATE users SET company_id = ? WHERE company_id IS NULL OR company_id = '' OR company_id = '1'")->execute([$companyId]);
    $db->prepare("UPDATE profiles SET company_id = ? WHERE company_id IS NULL OR company_id = '' OR company_id = '1'")->execute([$companyId]);
    $db->prepare("UPDATE sales SET company_id = ? WHERE company_id IS NULL OR company_id = '' OR company_id = '1'")->execute([$companyId]);
    $db->prepare("UPDATE fiscal_notes SET company_id = ? WHERE company_id IS NULL OR company_id = '' OR company_id = '1'")->execute([$companyId]);
    echo "Vínculos de empresa harmonizados.<br>";

    // 3. Vincular Notas sem Company_ID (Join com Sales)
    $db->exec("UPDATE fiscal_notes fn JOIN sales s ON fn.sale_id = s.id SET fn.company_id = s.company_id WHERE fn.company_id IS NULL OR fn.company_id = ''");
    echo "Notas fiscais sem empresa foram vinculadas via venda.<br>";

    // 4. Garantir Perfil do Usuário Bernardo
    $userId = $db->query("SELECT id FROM users WHERE email = 'b1ernardo@gmail.com'")->fetchColumn();
    if ($userId) {
        $stmt = $db->prepare("SELECT id FROM profiles WHERE user_id = ?");
        $stmt->execute([$userId]);
        if (!$stmt->fetch()) {
            require_once 'utils.php';
            $db->prepare("INSERT INTO profiles (id, user_id, company_id, full_name) VALUES (?, ?, ?, ?)")
               ->execute([generateUUID(), $userId, $companyId, 'Bernardo']);
            echo "Perfil criado para o usuário Bernardo.<br>";
        } else {
            $db->prepare("UPDATE profiles SET company_id = ? WHERE user_id = ?")->execute([$companyId, $userId]);
            echo "Perfil atualizado para o usuário Bernardo.<br>";
        }
    }

    // 5. Semear Módulos do Sistema
    $modules = [
        ['name' => 'Dashboard / Painel', 'key' => 'dashboard'],
        ['name' => 'PDV / Vendas Rápidas', 'key' => 'pdv'],
        ['name' => 'Gestão de Vendas', 'key' => 'vendas'],
        ['name' => 'Produtos / Estoque', 'key' => 'produtos'],
        ['name' => 'Estoque / Compras', 'key' => 'stock'],
        ['name' => 'Clientes / CRM', 'key' => 'clientes'],
        ['name' => 'Financeiro / Contas', 'key' => 'finances'],
        ['name' => 'Fiscal (NF-e/NFC-e)', 'key' => 'fiscal'],
        ['name' => 'Comandas / Mesas', 'key' => 'comandas'],
        ['name' => 'Delivery / Cardápio Digital', 'key' => 'delivery'],
        ['name' => 'Configurações', 'key' => 'configuracoes']
    ];

    require_once 'utils.php';
    foreach ($modules as $m) {
        $stmt = $db->prepare("SELECT id FROM system_modules WHERE module_key = ?");
        $stmt->execute([$m['key']]);
        if (!$stmt->fetch()) {
            $db->prepare("INSERT INTO system_modules (id, name, module_key) VALUES (?, ?, ?)")
               ->execute([generateUUID(), $m['name'], $m['key']]);
            echo "Módulo adicionado: {$m['name']}<br>";
        } else {
            $db->prepare("UPDATE system_modules SET name = ? WHERE module_key = ?")
               ->execute([$m['name'], $m['key']]);
        }
    }
    echo "Módulos do sistema verificados e atualizados.<br>";

    echo "<h2 style='color:green'>Sucesso! Os dados foram corrigidos.</h2>";
    echo "<p>Agora você pode subir os novos arquivos do sistema (Controllers e Front-end) para ver as notas corretamente.</p>";

} catch (Exception $e) {
    echo "<h1 style='color:red'>Erro no reparo:</h1>";
    echo "<pre>" . $e->getMessage() . "</pre>";
}
