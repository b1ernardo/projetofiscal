<?php
require_once 'api/db.php';
$db = (new Database())->getConnection();

try {
    // 1. Create Sellers table
    $db->exec("CREATE TABLE IF NOT EXISTS sellers (
        id CHAR(36) PRIMARY KEY,
        company_id CHAR(36) NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NULL,
        phone VARCHAR(50) NULL,
        active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (company_id)
    )");

    // 2. Add seller_id to sales
    $stmt = $db->query("SHOW COLUMNS FROM sales LIKE 'seller_id'");
    if (!$stmt->fetch()) {
        $db->exec("ALTER TABLE sales ADD COLUMN seller_id CHAR(36) NULL AFTER customer_id");
        $db->exec("ALTER TABLE sales ADD CONSTRAINT fk_sales_seller FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE SET NULL");
    }

    // 3. Add seller_id to comandas
    $stmt = $db->query("SHOW COLUMNS FROM comandas LIKE 'seller_id'");
    if (!$stmt->fetch()) {
        $db->exec("ALTER TABLE comandas ADD COLUMN seller_id CHAR(36) NULL AFTER customer_name");
        $db->exec("ALTER TABLE comandas ADD CONSTRAINT fk_comandas_seller FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE SET NULL");
    }

    echo "MIGRATION SELLERS SUCCESSFUL\n";
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
