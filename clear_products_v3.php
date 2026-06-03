<?php
$host = "localhost";
$db_name = "distbebidas_db";
$username = "root";
$password = "";

try {
    $conn = new PDO("mysql:host=" . $host . ";dbname=" . $db_name, $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $stmt = $conn->prepare("DELETE FROM products WHERE (name LIKE '%xl/%' OR name LIKE '%rels%' OR name LIKE '%PK%' OR length(name) > 80) AND active = 1 AND product_code IS NULL AND cost_price = 0 AND sale_price = 0");
    $stmt->execute();
    echo "Deleted " . $stmt->rowCount() . " garbage products.";
} catch(PDOException $exception) {
    echo "Connection error: " . $exception->getMessage();
}
?>
