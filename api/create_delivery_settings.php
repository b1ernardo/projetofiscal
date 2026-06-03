<?php
require_once 'config.php';
require_once 'db.php';
$db = (new Database())->getConnection();

try {
    $db->exec("
    CREATE TABLE IF NOT EXISTS delivery_settings (
        id CHAR(36) PRIMARY KEY,
        company_id CHAR(36) NOT NULL UNIQUE,
        slug VARCHAR(255) NOT NULL UNIQUE,
        logo_url TEXT,
        banner_url TEXT,
        primary_color VARCHAR(50) DEFAULT '#facc15',
        greeting_text VARCHAR(255) DEFAULT 'Boa noite, cliente!',
        store_status VARCHAR(50) DEFAULT 'open',
        whatsapp_number VARCHAR(50),
        min_order_value DECIMAL(10,2) DEFAULT 0,
        delivery_fee DECIMAL(10,2) DEFAULT 0,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    );
    ");

    // Get company ID to seed setting if needed
    $stmt = $db->query("SELECT id FROM companies LIMIT 1");
    if ($company = $stmt->fetch()) {
        $cid = $company['id'];
        $check = $db->prepare("SELECT id FROM delivery_settings WHERE company_id = ?");
        $check->execute([$cid]);
        if (!$check->fetch()) {
            require_once 'utils.php';
            $st = $db->prepare("INSERT INTO delivery_settings (id, company_id, slug, logo_url, banner_url, primary_color, greeting_text, store_status, whatsapp_number) 
                VALUES (?, ?, 'cantinho-burguer', 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=100&h=100&fit=crop', '', '#facc15', 'Boa noite, Cantinho Burguer!', 'open', '5511999999999')");
            $st->execute([generateUUID(), $cid]);
            echo "Seeded delivery settings for company";
        }
    }
    
    echo "\nDelivery settings table created.";
} catch (Exception $e) {
    echo "\nError: " . $e->getMessage();
}
