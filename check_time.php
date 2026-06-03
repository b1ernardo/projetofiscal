<?php
header('Content-Type: application/json');
require_once 'api/config.php';
require_once 'api/db.php';

date_default_timezone_set('America/Sao_Paulo');

$db = (new Database())->getConnection();

$php_time = date('Y-m-d H:i:s');
$mysql_time = $db->query("SELECT NOW() as now")->fetch()['now'];
$mysql_tz = $db->query("SELECT @@session.time_zone as tz")->fetch()['tz'];

echo json_encode([
    "php_timezone" => date_default_timezone_get(),
    "php_time" => $php_time,
    "mysql_time" => $mysql_time,
    "mysql_timezone" => $mysql_tz,
    "user_expected_time" => "Approx 00:50"
], JSON_PRETTY_PRINT);
