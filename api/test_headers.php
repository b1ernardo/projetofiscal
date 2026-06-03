<?php
header("Content-Type: application/json");
echo json_encode([
    "headers" => apache_request_headers(),
    "server" => $_SERVER,
    "env" => $_ENV
]);
