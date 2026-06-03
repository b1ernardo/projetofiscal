<?php
require_once 'api/config.php';
require_once 'api/db.php';
require_once 'api/utils.php';

$db = (new Database())->getConnection();

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

echo "--- Seeding System Modules ---\n";

foreach ($modules as $m) {
    // Check if key exists
    $stmt = $db->prepare("SELECT id FROM system_modules WHERE module_key = ?");
    $stmt->execute([$m['key']]);
    if (!$stmt->fetch()) {
        $id = generateUUID();
        $db->prepare("INSERT INTO system_modules (id, name, module_key) VALUES (?, ?, ?)")
           ->execute([$id, $m['name'], $m['key']]);
        echo "Added: {$m['name']}\n";
    } else {
        // Update name just in case
        $db->prepare("UPDATE system_modules SET name = ? WHERE module_key = ?")
           ->execute([$m['name'], $m['key']]);
        echo "Updated: {$m['name']}\n";
    }
}

echo "Done.\n";
