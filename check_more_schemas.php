<?php
require_once 'api/config.php';
require_once 'api/db.php';

$db = (new Database())->getConnection();
echo "--- cash_movements ---\n";
print_r($db->query("SHOW CREATE TABLE cash_movements")->fetch());
echo "\n--- stock_movements ---\n";
print_r($db->query("SHOW CREATE TABLE stock_movements")->fetch());
