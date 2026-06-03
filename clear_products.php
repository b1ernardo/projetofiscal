<?php
$host = "localhost";
$db_name = "distbebidas_db";
$username = "root";
$password = "";

try {
    $conn = new PDO("mysql:host=" . $host . ";dbname=" . $db_name, $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $stmt = $conn->prepare("DELETE FROM products WHERE name LIKE '%xl/workbook.xml%' OR name LIKE '%_rels/%' OR name LIKE 'PK%' OR name LIKE '%[Content_Types].xml%' OR name LIKE '%.rels%' OR name LIKE '%/theme/%'");
    $stmt->execute();
    echo "Deleted " . $stmt->rowCount() . " garbage products.";
} catch(PDOException $exception) {
    echo "Connection error: " . $exception->getMessage();
}
?>
