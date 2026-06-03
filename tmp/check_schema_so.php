<?php
require 'api/db.php';
$db = new Database();
$c = $db->getConnection();
$stmt = $c->query('DESCRIBE service_orders');
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
