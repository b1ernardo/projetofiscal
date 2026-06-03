<?php
require_once 'api/config.php';
require_once 'api/db.php';

try {
    $db = (new Database())->getConnection();
    $stmt = $db->query("DESCRIBE quotes");
    $fields = $stmt->fetchAll(PDO::FETCH_ASSOC);
    header('Content-Type: application/json');
    echo json_encode($fields, JSON_PRETTY_PRINT);
} catch (Exception $e) {
    echo $e->getMessage();
}
