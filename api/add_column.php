<?php
require_once __DIR__ . '/db.php';
try {
    $db = (new Database())->getConnection();
    $db->exec('ALTER TABLE config_fiscal ADD COLUMN percentual_tributos DECIMAL(5,2) DEFAULT 0.00 AFTER ambiente');
    echo 'Coluna adicionada com sucesso.' . PHP_EOL;
} catch (Exception $e) {
    if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
        echo 'A coluna ja existe.' . PHP_EOL;
    } else {
        echo 'Erro: ' . $e->getMessage() . PHP_EOL;
    }
}
