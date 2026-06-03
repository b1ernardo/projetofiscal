<?php
/**
 * Script for emergency diagnostics.
 */

require_once 'api/config.php';
require_once 'api/db.php';

try {
    $db = (new Database())->getConnection();
    echo "<h1>Check for Table: customers</h1>";

    $stmt = $db->query("SHOW TABLES LIKE 'customers'");
    $res = $stmt->fetch();
    if ($res) {
        echo "<p style='color:green'>Table 'customers' exists!</p>";
        $stmt = $db->query("DESCRIBE customers");
        echo "<h3>Columns:</h3><ul>";
        while($c = $stmt->fetch()) {
            echo "<li>{$c['Field']} ({$c['Type']})</li>";
        }
        echo "</ul>";
    } else {
        echo "<p style='color:red'>Table 'customers' is MISSING!</p>";
    }
    
    echo "<h1>Check for Table: companies</h1>";
    $stmt = $db->query("SHOW TABLES LIKE 'companies'");
    $res = $stmt->fetch();
    if ($res) {
        echo "<p style='color:green'>Table 'companies' exists!</p>";
    } else {
        echo "<p style='color:red'>Table 'companies' is MISSING!</p>";
    }

} catch (Exception $e) {
    echo "<p style='color:red'>DB Connection Error: {$e->getMessage()}</p>";
}
