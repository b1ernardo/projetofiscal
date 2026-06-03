<?php
require_once 'api/config.php';
require_once 'api/db.php';

$db = (new Database())->getConnection();

// Get all keys from system_modules
$stmt = $db->query("SELECT module_key FROM system_modules");
$keys = $stmt->fetchAll(PDO::FETCH_COLUMN);
$modulesJson = json_encode($keys);

echo "--- Activating All Modules for Companies ---\n";
$db->prepare("UPDATE companies SET modules = ?")->execute([$modulesJson]);
echo "Updated companies with modules: $modulesJson\n";

echo "Done.\n";
