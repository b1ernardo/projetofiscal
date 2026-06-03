<?php
require_once 'api/config.php';
require_once 'api/db.php';

$db = (new Database())->getConnection();

$stmt = $db->query("SELECT uf, ambiente FROM config_fiscal LIMIT 1");
print_r($stmt->fetch(PDO::FETCH_ASSOC));
