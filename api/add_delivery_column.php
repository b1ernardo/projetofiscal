<?php
$host = 'localhost';
$db   = 'distbebidas_db';
$user = 'root';
$pass = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->exec("ALTER TABLE products ADD COLUMN venda_delivery BOOLEAN NOT NULL DEFAULT 0");
    echo 'success';
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
        echo 'already_exists';
    } else {
        echo 'error: ' . $e->getMessage();
    }
}
