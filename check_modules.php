<?php
require_once 'api/config.php';
require_once 'api/db.php';

$db = (new Database())->getConnection();

echo "--- System Modules ---\n";
$stmt = $db->query("SELECT * FROM system_modules");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
