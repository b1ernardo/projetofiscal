<?php
require_once 'config.php';
require_once 'db.php';
$db = (new Database())->getConnection();

try {
    $db->exec("
    CREATE TABLE IF NOT EXISTS delivery_orders (
        id CHAR(36) PRIMARY KEY,
        company_id CHAR(36) NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(50) NOT NULL,
        delivery_address TEXT,
        payment_method VARCHAR(50),
        subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
        delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
        total DECIMAL(10,2) NOT NULL DEFAULT 0,
        status VARCHAR(50) NOT NULL DEFAULT 'pendente', -- pendente, preparando, saiu_entrega, entregue, cancelado
        order_type VARCHAR(50) NOT NULL DEFAULT 'delivery', -- delivery, retira
        source VARCHAR(50) NOT NULL DEFAULT 'app', -- app, manual
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS delivery_order_items (
        id CHAR(36) PRIMARY KEY,
        delivery_order_id CHAR(36) NOT NULL,
        product_id CHAR(36) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        quantity INT NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        observation TEXT,
        FOREIGN KEY (delivery_order_id) REFERENCES delivery_orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
    );
    ");

    echo "Delivery order tables created successfully.";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
