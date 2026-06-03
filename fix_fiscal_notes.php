<?php
require_once 'api/config.php';
require_once 'api/db.php';

$db = (new Database())->getConnection();

echo "--- Fixing missing company_id in fiscal_notes ---\n";

// Update fiscal_notes where company_id is NULL by JOINing with sales
$sql = "UPDATE fiscal_notes fn 
        JOIN sales s ON fn.sale_id = s.id 
        SET fn.company_id = s.company_id 
        WHERE fn.company_id IS NULL OR fn.company_id = ''";

try {
    $rows = $db->exec($sql);
    echo "Fixed $rows records.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
