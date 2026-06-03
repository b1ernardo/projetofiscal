<?php
require 'api/db.php';
$db = (new Database())->getConnection();
$email = 'b1ernardo@gmail.com';
$pass = '123456';
$hash = password_hash($pass, PASSWORD_DEFAULT);

// Check if user exists
$stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
$stmt->execute([$email]);
if ($stmt->fetch()) {
    $db->prepare("UPDATE users SET password_hash = ? WHERE email = ?")->execute([$hash, $email]);
    echo "User updated with hash: $hash\n";
} else {
    $id = substr(md5(uniqid()), 0, 36);
    $db->prepare("INSERT INTO users (id, email, password_hash, company_id) VALUES (?, ?, ?, '1')")->execute([$id, $email, $hash]);
    $db->prepare("INSERT INTO user_roles (id, user_id, role, company_id) VALUES (?, ?, 'super_admin', '1')")->execute([substr(md5(uniqid()), 0, 36), $id]);
    echo "User created and role assigned.\n";
}
