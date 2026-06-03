<?php
/**
 * ESTE SCRIPT CRIA AS TABELAS DE ORÇAMENTOS DIRETAMENTE NO BANCO DE DADOS DA HOSTINGER.
 * 
 * INSTRUÇÕES:
 * 1. Suba este arquivo para a Hostinger.
 * 2. Acesse pelo navegador: seusite.com.br/instalar_tabelas_hostinger.php
 * 3. Delete este arquivo logo após a mensagem de sucesso.
 */

require_once 'api/config.php';
require_once 'api/db.php';

try {
    $db = (new Database())->getConnection();

    // SQL limpo para evitar erros de caracteres
    $sql = "
    CREATE TABLE IF NOT EXISTS `quotes` (
      `id` char(36) NOT NULL,
      `company_id` char(36) DEFAULT NULL,
      `customer_id` char(36) DEFAULT NULL,
      `seller_id` char(36) DEFAULT NULL,
      `created_by` char(36) NOT NULL,
      `total_amount` decimal(10,2) NOT NULL,
      `observations` TEXT DEFAULT NULL,
      `discount` decimal(10,2) NOT NULL DEFAULT 0.00,
      `status` varchar(50) NOT NULL DEFAULT 'pending',
      `validity_days` int NOT NULL DEFAULT 7,
      `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
      `quote_number` int(11) NOT NULL AUTO_INCREMENT,
      PRIMARY KEY (`id`),
      UNIQUE KEY `quote_number` (`quote_number`),
      KEY `customer_id` (`customer_id`),
      KEY `company_id` (`company_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS `quote_items` (
      `id` char(36) NOT NULL,
      `company_id` char(36) DEFAULT NULL,
      `quote_id` char(36) NOT NULL,
      `product_id` char(36) NOT NULL,
      `quantity` decimal(10,3) NOT NULL,
      `unit_price` decimal(10,2) NOT NULL,
      `multiplier` int(11) NOT NULL DEFAULT 1,
      PRIMARY KEY (`id`),
      KEY `quote_id` (`quote_id`),
      KEY `product_id` (`product_id`),
      KEY `company_id` (`company_id`),
      CONSTRAINT `quote_items_ibfk_1` FOREIGN KEY (`quote_id`) REFERENCES `quotes` (`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ";

    $db->exec($sql);
    
    echo "<div style='font-family: sans-serif; padding: 20px; border: 2px solid green; background: #e6ffed; border-radius: 8px;'>";
    echo "<h1 style='color: green;'>✅ Sucesso! Tabelas de Orçamentos Criadas.</h1>";
    echo "<p>As tabelas <strong>quotes</strong> e <strong>quote_items</strong> já estão instaladas no banco de dados.</p>";
    echo "<p style='color: red; font-weight: bold;'>⚠️ AVALO DE SEGURANÇA: Apague este arquivo ('instalar_tabelas_hostinger.php') do seu servidor agora.</p>";
    echo "</div>";

} catch (Exception $e) {
    echo "<div style='font-family: sans-serif; padding: 20px; border: 2px solid red; background: #fff5f5; border-radius: 8px;'>";
    echo "<h1 style='color: red;'>❌ Erro ao criar tabelas:</h1>";
    echo "<pre>" . $e->getMessage() . "</pre>";
    echo "</div>";
}
