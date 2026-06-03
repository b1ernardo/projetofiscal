<?php
require_once 'db.php';
try {
    $db = (new Database())->getConnection();
    
    // Check if company 1 exists
    $stmt = $db->prepare("SELECT id FROM companies WHERE id = '1'");
    $stmt->execute();
    if (!$stmt->fetch()) {
        $db->exec("INSERT INTO companies (id, name, modules) VALUES ('1', 'GestaoSystem', '[\"pdv\", \"vendas\", \"produtos\", \"dashboard\", \"configuracoes\", \"fiscal\", \"delivery\"]')");
        echo "Company 1 created.\n";
    }

    $pw_hash = password_hash('admin123', PASSWORD_DEFAULT);
    
    // Insert Admin
    $db->prepare("INSERT IGNORE INTO users (id, email, password_hash, company_id) VALUES (?, ?, ?, '1')")
       ->execute(['user-admin-123', 'admin@admin.com', $pw_hash]);
       
    $db->prepare("INSERT IGNORE INTO users (id, email, password_hash, company_id) VALUES (?, ?, ?, '1')")
       ->execute(['user-b1ernardo', 'b1ernardo@gmail.com', $pw_hash]);
    
    $db->exec("INSERT IGNORE INTO profiles (id, user_id, company_id, full_name) VALUES 
    ('profile-admin-123', 'user-admin-123', '1', 'Administrador'),
    ('profile-b1ernardo', 'user-b1ernardo', '1', 'Bernardo')");
    
    $db->exec("INSERT IGNORE INTO user_roles (id, user_id, company_id, role) VALUES 
    ('role-admin-123', 'user-admin-123', '1', 'admin'),
    ('role-b1ernardo', 'user-b1ernardo', '1', 'super_admin')");
    
    echo "Users and roles created.\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
