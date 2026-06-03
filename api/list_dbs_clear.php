<?php
$conn = new PDO("mysql:host=localhost", 'root', '');
$stmt = $conn->query("SHOW DATABASES");
while ($row = $stmt->fetchColumn()) {
    echo $row . "\n";
}
