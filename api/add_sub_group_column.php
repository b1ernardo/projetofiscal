<?php
// Migration: adiciona coluna sub_group na tabela products
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'projetofiscal');

try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4", DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->exec("ALTER TABLE products ADD COLUMN IF NOT EXISTS sub_group VARCHAR(100) NULL DEFAULT NULL AFTER category_id");
    echo "OK: coluna sub_group adicionada (ou já existia).\n";
} catch (Exception $e) {
    echo "ERRO: " . $e->getMessage() . "\n";
}
