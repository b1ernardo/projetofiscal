<?php
require_once 'api/config.php';
require_once 'api/db.php';

$db = (new Database())->getConnection();

$saleNumber = 41;

echo "--- Checking Sale #$saleNumber ---\n";
$stmt = $db->prepare("SELECT * FROM sales WHERE sale_number = :num");
$stmt->execute([':num' => $saleNumber]);
$sale = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$sale) {
    echo "Sale not found.\n";
    exit;
}

print_r($sale);

echo "\n--- Checking Fiscal Notes for Sale ID: {$sale['id']} ---\n";
$stmt = $db->prepare("SELECT * FROM fiscal_notes WHERE sale_id = :sid");
$stmt->execute([':sid' => $sale['id']]);
$notes = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (!$notes) {
    echo "No fiscal notes found for this sale.\n";
} else {
    foreach ($notes as $note) {
        unset($note['xml_path']); // Don't print huge XML
        print_r($note);
    }
}
