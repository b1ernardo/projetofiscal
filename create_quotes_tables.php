<?php
require_once 'api/config.php';
require_once 'api/db.php';

$db = (new Database())->getConnection();

$sql = "
CREATE TABLE IF NOT EXISTS `quotes` (
  `id` char(36) NOT NULL,
  `company_id` char(36) DEFAULT NULL,
  `customer_id` char(36) DEFAULT NULL,
  `seller_id` char(36) DEFAULT NULL,
  `created_by` char(36) NOT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `discount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `status` varchar(50) NOT NULL DEFAULT 'pending',
  `validity_days` int NOT NULL DEFAULT 7,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `quote_number` int(11) NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`id`),
  UNIQUE KEY `quote_number` (`quote_number`),
  KEY `customer_id` (`customer_id`),
  KEY `company_id` (`company_id`),
  KEY `fk_quotes_seller` (`seller_id`),
  CONSTRAINT `fk_quotes_seller` FOREIGN KEY (`seller_id`) REFERENCES `sellers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `quotes_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
";

try {
    $db->exec($sql);
    echo "Tables 'quotes' and 'quote_items' created successfully!\n";
} catch (PDOException $e) {
    echo "Error creating tables: " . $e->getMessage() . "\n";
}
