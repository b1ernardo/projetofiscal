<?php
require_once __DIR__ . '/../api/db.php';
require_once __DIR__ . '/../api/config.php';

$db = new Database();
$conn = $db->getConnection();

// Verificar se já existe
$stmt = $conn->query("SELECT id FROM system_modules WHERE module_key = 'dados_empresa'");
if ($stmt->fetch()) {
    echo "Módulo 'dados_empresa' já existe!\n";
} else {
    $id = bin2hex(random_bytes(16));
    $id = substr($id, 0, 8) . "-" . substr($id, 8, 4) . "-" . substr($id, 12, 4) . "-" . substr($id, 16, 4) . "-" . substr($id, 20, 12);
    $conn->prepare("INSERT INTO system_modules (id, name, module_key) VALUES (:id, :name, :key)")
         ->execute([':id' => $id, ':name' => 'Dados da Empresa', ':key' => 'dados_empresa']);
    echo "Módulo 'dados_empresa' inserido com sucesso! ID: $id\n";
}
