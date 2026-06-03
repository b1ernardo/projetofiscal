<?php
require_once 'config.php';
require_once 'db.php';
$db = (new Database())->getConnection();

if (isset($argv[1])) {
    try {
        $stmt = $db->query($argv[1]);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($results, JSON_PRETTY_PRINT);
    } catch (Exception $e) {
        echo "Error: " . $e->getMessage();
    }
} else {
    echo "Usage: php query.php \"SQL_QUERY\"";
}
