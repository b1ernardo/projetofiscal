<?php
require_once 'api/config.php';
require_once 'api/db.php';

$db = (new Database())->getConnection();

echo "--- Payment Methods in DB ---\n";
$stmt = $db->query("SELECT * FROM payment_methods");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
