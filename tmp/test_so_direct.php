<?php
require_once 'c:/xampp/htdocs/projetofiscal/api/db.php';
$db = new Database();
$conn = $db->getConnection();

// Get company_id from user
$stmt = $conn->query("SELECT company_id FROM users LIMIT 1");
$companyId = $stmt->fetchColumn();
echo "Company ID: $companyId\n";

// Check if customers exist
$stmt = $conn->prepare("SELECT count(*) FROM customers WHERE company_id = ?");
$stmt->execute([$companyId]);
echo "Customers count: " . $stmt->fetchColumn() . "\n";

// Create a test customer if none
$custId = bin2hex(random_bytes(18));
$conn->prepare("INSERT INTO customers (id, company_id, name, phone) VALUES (?, ?, 'Cliente Teste OS', '99999999999')")
    ->execute([$custId, $companyId]);
echo "Created test customer: $custId\n";

// Now test the service order create directly
require_once 'c:/xampp/htdocs/projetofiscal/api/utils.php';

try {
    $soId = generateUUID();
    $stmt = $conn->prepare("INSERT INTO service_orders 
        (id, company_id, customer_id, user_id, status, priority, item_type, problem_reported, labor_total, parts_total, discount, total_amount) 
        VALUES 
        (:id, :company_id, :customer_id, :user_id, :status, :priority, :item_type, :problem_reported, :labor_total, :parts_total, :discount, :total_amount)");
    
    $stmt->execute([
        ":id" => $soId,
        ":company_id" => $companyId,
        ":customer_id" => $custId,
        ":user_id" => "system",
        ":status" => "pendente",
        ":priority" => "media",
        ":item_type" => "Celular",
        ":problem_reported" => "Tela quebrada",
        ":labor_total" => 0,
        ":parts_total" => 0,
        ":discount" => 0,
        ":total_amount" => 0,
    ]);
    
    echo "INSERT OK! SO id=$soId\n";
    
    // Cleanup
    $conn->exec("DELETE FROM service_orders WHERE id='$soId'");
    $conn->exec("DELETE FROM customers WHERE id='$custId'");
    echo "Cleanup OK\n";
    
} catch (PDOException $e) {
    echo "INSERT ERROR: " . $e->getMessage() . "\n";
    // Cleanup
    $conn->exec("DELETE FROM customers WHERE id='$custId'");
}
