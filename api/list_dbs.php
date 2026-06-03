<?php
$host = 'localhost';
$user = 'root';
$pass = '';
try {
    $conn = new PDO("mysql:host=$host", $user, $pass);
    $stmt = $conn->query("SHOW DATABASES");
    $dbs = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo "Existing databases:\n";
    print_r($dbs);
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
