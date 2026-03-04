<?php
require_once __DIR__ . '/db.php';
$db = (new Database())->getConnection();
$res = $db->query('DESCRIBE config_fiscal');
echo json_encode($res->fetchAll(PDO::FETCH_ASSOC), JSON_PRETTY_PRINT);
