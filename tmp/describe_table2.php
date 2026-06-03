<?php
require_once 'c:/xampp/htdocs/projetofiscal/api/db.php';
$db = new Database();
$conn = $db->getConnection();

echo "=== COLUMNS IN accounts_payable ===\n";
$stmt = $conn->query("DESCRIBE accounts_payable");
$cols = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach ($cols as $col) {
    echo $col['Field'] . " | " . $col['Type'] . " | " . ($col['Null'] === 'YES' ? 'NULL' : 'NOT NULL') . "\n";
}

echo "\n=== NOW TESTING INSERT ===\n";
try {
    $id = bin2hex(random_bytes(18));
    $query = "INSERT INTO accounts_payable (id, company_id, description, supplier_id, amount, due_date, status, payment_date, category, payment_method) 
              VALUES (:id, :company_id, :description, :supplier_id, :amount, :due_date, :status, :payment_date, :category, :payment_method)";
    $stmt = $conn->prepare($query);
    $stmt->execute([
        ':id' => $id,
        ':company_id' => '1',
        ':description' => 'Teste',
        ':supplier_id' => null,
        ':amount' => 100,
        ':due_date' => date('Y-m-d'),
        ':status' => 'pending',
        ':payment_date' => null,
        ':category' => 'Geral',
        ':payment_method' => null
    ]);
    echo "INSERT OK! id=$id\n";
    
    // cleanup
    $conn->exec("DELETE FROM accounts_payable WHERE id='$id'");
    echo "CLEANUP OK\n";
} catch (PDOException $e) {
    echo "INSERT ERROR: " . $e->getMessage() . "\n";
}
