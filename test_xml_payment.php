<?php
require_once 'api/config.php';
require_once 'api/db.php';
require_once 'api/vendor/autoload.php';
require_once 'api/src/Services/FiscalService.php';

$db = (new Database())->getConnection();

// Mock a sale
$sale = [
    'id' => 'test-id',
    'total_amount' => 100.00,
    'discount' => 0.00,
    'payment_method' => 'PIX',
    'customer_id' => null,
    'customer_doc' => '99999999999',
    'customer_name' => 'Consumidor Teste',
    'customer_email' => ''
];

$items = [
    [
        'product_id' => 'prod-id',
        'quantity' => 1,
        'unit_price' => 100.00,
        'name' => 'Produto Teste',
        'code' => '001',
        'ncm' => '61091000',
        'cest' => '',
        'cfop_padrao' => '5102',
        'unit' => 'UN',
        'cst' => '00',
        'csosn' => '102',
        'origem' => 0
    ]
];

try {
    $service = new \App\Services\FiscalService($db);
    $res = $service->generateNFe($sale, $items, '65'); // Test NFC-e
    echo "--- Generated XML Payment Section ---\n";
    $xml = $res['xml'];
    if (preg_match('/<pag>.*<\/pag>/s', $xml, $matches)) {
        echo $matches[0] . "\n";
    } else {
        echo "Payment section not found.\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
