<?php
require_once 'config.php';
require_once 'db.php';
$db = (new Database())->getConnection();

try {
    $db->exec("ALTER TABLE delivery_settings MODIFY logo_url LONGTEXT, MODIFY banner_url LONGTEXT");
    echo "Columns altered to LONGTEXT successfully.";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
