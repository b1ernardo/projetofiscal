<?php
$_SERVER['REQUEST_METHOD'] = 'POST'; // Mock for config.php

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/src/Services/FiscalService.php';

$db = (new Database())->getConnection();
$service = new \App\Services\FiscalService($db);

try {
    // Find the last generated note to cancel
    $stmt = $db->query("SELECT * FROM fiscal_notes WHERE status = 'generated' ORDER BY created_at DESC LIMIT 1");
    $note = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$note) {
        die("Nenhuma nota autorizada na base de dados para cancelar.\n");
    }

    echo "Tentando cancelar a nota ID: {$note['id']} referente a venda {$note['sale_id']}...\n";
    $modelCode = ($note['tipo'] === 'NFE') ? '55' : '65';
    
    $cancelamento = $service->cancelarNFe($note['xml_path'], 'Cancelamento de teste por erro de emissao na base de dados', $modelCode);
    
    print_r($cancelamento);

} catch (Exception $e) {
    echo "Erro Capiturado Catch: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString();
}
