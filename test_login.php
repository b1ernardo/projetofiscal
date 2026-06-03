<?php
    $data = json_encode(['email' => 'b1ernardo@gmail.com', 'password' => '123456']);
    $url = 'http://localhost/projetofiscal/api/login';
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type:application/json']);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $result = curl_exec($ch);
    echo $result;
    curl_close($ch);
