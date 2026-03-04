<?php
// /api/utils.php

function generateUUID() {
    return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}

function getOrCreateCategory($conn, $name) {
    if (empty($name)) return null;
    $name = trim($name);

    $stmt = $conn->prepare("SELECT id FROM categories WHERE name = :name LIMIT 1");
    $stmt->execute([':name' => $name]);
    $row = $stmt->fetch();

    if ($row) return $row['id'];

    $id = generateUUID();
    $stmt = $conn->prepare("INSERT INTO categories (id, name) VALUES (:id, :name)");
    $stmt->execute([':id' => $id, ':name' => $name]);

    return $id;
}
