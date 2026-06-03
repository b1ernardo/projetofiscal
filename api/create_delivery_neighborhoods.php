<?php
require_once 'db.php';
require_once 'utils.php';

try {
    $database = new Database();
    $db = $database->getConnection();
    
    $db->exec("
    CREATE TABLE IF NOT EXISTS delivery_neighborhoods (
        id CHAR(36) PRIMARY KEY,
        company_id CHAR(36) NOT NULL,
        name VARCHAR(255) NOT NULL,
        fee DECIMAL(10,2) DEFAULT 0,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    );
    ");
    echo "Tabela 'delivery_neighborhoods' criada com sucesso!\n";

    // Seed some test neighborhoods if none exist
    $stmt = $db->query("SELECT id FROM companies LIMIT 1");
    if ($company = $stmt->fetch()) {
        $cid = $company['id'];
        $check = $db->prepare("SELECT id FROM delivery_neighborhoods WHERE company_id = ?");
        $check->execute([$cid]);
        if (!$check->fetch()) {
            $neighborhoods = [
                ['Centro', 5.00],
                ['Bairro das Palmeiras', 7.50],
                ['Jardim das Rosas', 10.00],
                ['Vila Nova', 4.00],
                ['Industrial', 12.00]
            ];
            $st = $db->prepare("INSERT INTO delivery_neighborhoods (id, company_id, name, fee) VALUES (?, ?, ?, ?)");
            foreach ($neighborhoods as $n) {
                $st->execute([generateUUID(), $cid, $n[0], $n[1]]);
            }
            echo "Bairros iniciais cadastrados para teste.\n";
        }
    }
} catch (Exception $e) {
    echo "Erro: " . $e->getMessage() . "\n";
}
