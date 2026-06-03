<?php
require 'api/config.php';
require 'api/db.php';
$db = new Database();
$conn = $db->getConnection();
echo "Cleaning up duplicate roles...\n";
// Temporarily move to temporary table, group by user_id and role
$conn->exec("CREATE TABLE tmp_roles AS SELECT DISTINCT user_id, role, company_id FROM user_roles");
$conn->exec("DELETE FROM user_roles");
$conn->exec("INSERT INTO user_roles (id, user_id, role, company_id) SELECT UUID(), user_id, role, company_id FROM tmp_roles");
$conn->exec("DROP TABLE tmp_roles");
echo "Done.\n";
