<?php
require_once 'api/config.php';
try {
    $db = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME, DB_USER, DB_PASS);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // 1. Adicionar sale_id em accounts_receivable
    $db->exec("ALTER TABLE accounts_receivable ADD COLUMN sale_id CHAR(36) NULL AFTER company_id");
    echo "Coluna sale_id adicionada com sucesso em accounts_receivable.\n";

} catch (PDOException $e) {
    echo "Erro ao migrar: " . $e->getMessage() . "\n";
}
