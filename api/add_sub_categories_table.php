<?php
// Migration: cria tabela sub_categories
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'projetofiscal');

try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4", DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->exec("CREATE TABLE IF NOT EXISTS sub_categories (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        company_id VARCHAR(36) NOT NULL,
        category_id VARCHAR(36) NOT NULL,
        name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_company (company_id),
        INDEX idx_category (category_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    echo "OK: tabela sub_categories criada (ou já existia).\n";
} catch (Exception $e) {
    echo "ERRO: " . $e->getMessage() . "\n";
}
