<?php
$c = new PDO('mysql:host=localhost;dbname=distbebidas_db','root','');
try {
    $c->exec('ALTER TABLE config_fiscal ADD COLUMN logo_base64 LONGTEXT NULL');
    echo "Column logo_base64 added to config_fiscal\n";
} catch (Exception $e) {
    echo "Error config_fiscal: " . $e->getMessage() . "\n";
}
try {
    $c->exec('ALTER TABLE companies ADD COLUMN logo_base64 LONGTEXT NULL');
    echo "Column logo_base64 added to companies\n";
} catch (Exception $e) {
    echo "Error companies: " . $e->getMessage() . "\n";
}
