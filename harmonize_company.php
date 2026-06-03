<?php
require_once 'api/config.php';
require_once 'api/db.php';

$db = (new Database())->getConnection();

echo "--- Harmonizing Company IDs ---\n";

// 1. Get the correct company ID (Empresa Padrão)
$companyId = $db->query("SELECT id FROM companies WHERE id = 'default-company-uuid' OR name LIKE '%Padrão%' OR name LIKE '%Gestao%' LIMIT 1")->fetchColumn();

if (!$companyId) {
    echo "Correct company ID not found. Using 'default-company-uuid' as target.\n";
    $companyId = 'default-company-uuid';
}

echo "Target Company ID: $companyId\n";

// 2. Update Users
$rows = $db->prepare("UPDATE users SET company_id = :cid WHERE company_id IS NULL OR company_id = '' OR company_id = '1'")
           ->execute([':cid' => $companyId]);
echo "Updated users: $rows\n";

// 3. Update Profiles
$rows = $db->prepare("UPDATE profiles SET company_id = :cid WHERE company_id IS NULL OR company_id = '' OR company_id = '1'")
           ->execute([':cid' => $companyId]);

// 4. Update Sales
$rows = $db->prepare("UPDATE sales SET company_id = :cid WHERE company_id IS NULL OR company_id = '' OR company_id = '1'")
           ->execute([':cid' => $companyId]);
echo "Updated sales: $rows\n";

// 5. Update Fiscal Notes
$rows = $db->prepare("UPDATE fiscal_notes SET company_id = :cid WHERE company_id IS NULL OR company_id = '' OR company_id = '1'")
           ->execute([':cid' => $companyId]);
echo "Updated fiscal notes: $rows\n";

// 6. Ensure b1ernardo@gmail.com has correct profile
$userId = $db->query("SELECT id FROM users WHERE email = 'b1ernardo@gmail.com'")->fetchColumn();
if ($userId) {
    $exists = $db->prepare("SELECT id FROM profiles WHERE user_id = :uid")->execute([':uid' => $userId]);
    if (!$db->prepare("SELECT id FROM profiles WHERE user_id = :uid")->execute([':uid' => $userId]) || !$stmt = $db->prepare("SELECT id FROM profiles WHERE user_id = :uid")) {
         // wait
    }
    
    // Check if profile exists
    $stmt = $db->prepare("SELECT id FROM profiles WHERE user_id = ?");
    $stmt->execute([$userId]);
    if (!$stmt->fetch()) {
        $db->prepare("INSERT INTO profiles (id, user_id, company_id, full_name) VALUES (?, ?, ?, ?)")
           ->execute([bin2hex(random_bytes(16)), $userId, $companyId, 'Bernardo']);
        echo "Created profile for Bernardo.\n";
    } else {
        $db->prepare("UPDATE profiles SET company_id = ? WHERE user_id = ?")
           ->execute([$companyId, $userId]);
        echo "Updated profile for Bernardo.\n";
    }
}

echo "Done.\n";
