<?php
require_once 'api/config.php';
require_once 'api/db.php';

$db = (new Database())->getConnection();

echo "--- Latest Sale info ---\n";
$stmt = $db->query("SELECT * FROM sales ORDER BY created_at DESC LIMIT 1");
print_r($stmt->fetch(PDO::FETCH_ASSOC));
