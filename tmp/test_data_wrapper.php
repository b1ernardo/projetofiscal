<?php
$str = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
$b64 = substr($str, strpos($str, ',') + 1);
$dataStr = 'data://text/plain;base64,' . $b64;

$info = @getimagesize($dataStr);
var_dump($info);

$info2 = @getimagesize('data:image/png;base64,' . $b64);
var_dump($info2);

file_put_contents('tmp/logo_test.png', base64_decode($b64));
var_dump(getimagesize('tmp/logo_test.png'));
