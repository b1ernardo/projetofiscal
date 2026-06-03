<?php
require_once 'api/config.php';
require_once 'api/db.php';

$db = (new Database())->getConnection();
$stmt = $db->query("SHOW CREATE TABLE sales");
print_r($stmt->fetch());
