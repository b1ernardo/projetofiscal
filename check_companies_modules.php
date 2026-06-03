<?php
require_once 'api/config.php';
require_once 'api/db.php';

$db = (new Database())->getConnection();

echo "--- Companies and Modules ---\n";
$stmt = $db->query("SELECT id, name, modules FROM companies");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
