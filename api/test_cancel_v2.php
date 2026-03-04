<?php
$_SERVER['REQUEST_METHOD'] = 'POST'; // Mock for config.php

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/controllers/FiscalController.php';

$db = (new Database())->getConnection();
$controller = new FiscalController($db);

// Simulate the input for canceling
$input = json_encode([
    'saleId' => '0c22804d-ca4a-4304-afc7-04bc8f4089a9', // Existing sale from previous test
    'justificativa' => 'Cancelamento de teste por erro de emissao na base de dados'
]);

// Since we can't easily mock php://input here, let's just hope the logic in controller handles it or we mock the class directly
// Actually, let's just test the FiscalService directly again to see if it emitted any warnings previously.

$service = new \App\Services\FiscalService($db);

try {
    $stmt = $db->query("SELECT * FROM fiscal_notes WHERE status = 'generated' ORDER BY created_at DESC LIMIT 1");
    $note = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$note) {
        die("Nenhuma nota autorizada na base de dados para cancelar.\n");
    }

    $modelCode = ($note['tipo'] === 'NFE') ? '55' : '65';
    
    // REDIRECT OUTPUT TO CAPTURE WARNINGS
    ob_start();
    $cancelamento = $service->cancelarNFe($note['xml_path'], 'Cancelamento de teste por erro de emissao na base de dados', $modelCode);
    $output = ob_get_clean();

    if ($output) {
        echo "WARNINGS DETECTED:\n";
        echo $output;
        echo "\n------------------\n";
    }

    echo "RESULT:\n";
    echo json_encode($cancelamento);

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
