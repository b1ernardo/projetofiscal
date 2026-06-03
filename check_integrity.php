<?php
require_once 'api/config.php';
require_once 'api/db.php';

$db = (new Database())->getConnection();

echo "--- Checking for mismatched sale_id in fiscal_notes ---\n";
$stmt = $db->query("SELECT fn.id, fn.sale_id, fn.company_id FROM fiscal_notes fn LEFT JOIN sales s ON fn.sale_id = s.id WHERE s.id IS NULL");
$mismatches = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (!$mismatches) {
    echo "No mismatches found.\n";
} else {
    print_r($mismatches);
}

echo "\n--- Checking current company_id in fiscal_notes ---\n";
$stmt = $db->query("SELECT DISTINCT company_id FROM fiscal_notes");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
