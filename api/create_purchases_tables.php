<?php
require_once 'config.php';
require_once 'db.php';

try {
    $db = (new Database())->getConnection();
    echo "<h1>Verificando Tabelas de Compras...</h1>";

    // Tabela: purchases
    $db->exec("CREATE TABLE IF NOT EXISTS `purchases` (
      `id` CHAR(36) PRIMARY KEY,
      `company_id` CHAR(36) NOT NULL,
      `supplier_id` CHAR(36) NULL,
      `total_amount` DECIMAL(10, 2) NOT NULL,
      `created_by` CHAR(36) NOT NULL,
      `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE SET NULL
    )");
    echo "✅ Tabela 'purchases' verificada.<br>";

    // Tabela: purchase_items
    $db->exec("CREATE TABLE IF NOT EXISTS `purchase_items` (
      `id` CHAR(36) PRIMARY KEY,
      `company_id` CHAR(36) NOT NULL,
      `purchase_id` CHAR(36) NOT NULL,
      `product_id` CHAR(36) NOT NULL,
      `quantity` DECIMAL(10, 3) NOT NULL,
      `unit_price` DECIMAL(10, 2) NOT NULL,
      FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON DELETE CASCADE,
      FOREIGN KEY (`product_id`) REFERENCES `products`(`id`)
    )");
    echo "✅ Tabela 'purchase_items' verificada.<br>";

    // Verificar se a coluna company_id existe (caso a tabela já existisse sem ela)
    $tables = ['purchases', 'purchase_items'];
    foreach ($tables as $table) {
        $stmt = $db->query("SHOW COLUMNS FROM `$table` LIKE 'company_id'");
        if (!$stmt->fetch()) {
            $db->exec("ALTER TABLE `$table` ADD COLUMN `company_id` CHAR(36) NOT NULL AFTER `id` ");
            echo "➕ Coluna 'company_id' adicionada em $table.<br>";
        }
    }

    echo "<h2>Tabelas de compras prontas para uso!</h2>";

} catch (Exception $e) {
    echo "<h1 style='color:red'>Erro:</h1>";
    echo "<pre>" . $e->getMessage() . "</pre>";
}
