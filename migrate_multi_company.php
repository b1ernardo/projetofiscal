<?php
require 'api/config.php';
require 'api/db.php';

$db = new Database();
$conn = $db->getConnection();

try {
    // 1. Create companies table
    $conn->exec("CREATE TABLE IF NOT EXISTS companies (
        id CHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        cnpj VARCHAR(20),
        email VARCHAR(255),
        phone VARCHAR(50),
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )");

    // 2. Add 'super_admin' to user_roles enum
    $conn->exec("ALTER TABLE user_roles MODIFY COLUMN role VARCHAR(50) NOT NULL");

    // 3. Create a default company for existing data
    $company_id = '1';
    $conn->exec("INSERT IGNORE INTO companies (id, name, active) VALUES ('$company_id', 'Empresa Padrão', 1)");

    $tables = [
        'users', 'products', 'customers', 'suppliers', 'sales', 'sale_items', 
        'comandas', 'comanda_items', 'purchases', 'purchase_items', 'categories', 
        'cash_registers', 'cash_movements', 'accounts_payable', 'accounts_receivable', 
        'payment_methods', 'naturezas_operacao', 'fiscal_notes', 'nfe_rascunhos', 
        'profiles', 'chart_of_accounts', 'stock_movements', 'config_fiscal', 
        'sale_payments', 'product_box_configs', 'user_roles', 'user_module_permissions'
    ];

    foreach ($tables as $table) {
        $checkTable = $conn->query("SHOW TABLES LIKE '$table'");
        if ($checkTable->rowCount() == 0) {
            echo "Skipping missing table $table...\n";
            continue;
        }
        $stmt = $conn->query("SHOW COLUMNS FROM $table LIKE 'company_id'");
        if ($stmt->rowCount() == 0) {
            echo "Adding company_id to $table...\n";
            $conn->exec("ALTER TABLE $table ADD COLUMN company_id CHAR(36) AFTER id");
            $conn->exec("UPDATE $table SET company_id = '$company_id' WHERE company_id IS NULL");
            $conn->exec("ALTER TABLE $table ADD INDEX (company_id)");
        } else {
            // Ensure data is initialized
            $conn->exec("UPDATE $table SET company_id = '$company_id' WHERE company_id IS NULL");
        }
    }

    echo "Migration completed successfully.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
