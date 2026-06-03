<?php
require 'api/vendor/autoload.php';
$d = new ReflectionClass('NFePHP\DA\NFe\Danfe');
echo "Constructor:\n";
print_r($d->getConstructor()->getParameters());
echo "Methods:\n";
foreach ($d->getMethods() as $method) {
    if ($method->getName() === 'render' || $method->getName() === '__construct' || $method->getName() === 'monta') {
        echo "Method: " . $method->getName() . "\n";
        foreach ($method->getParameters() as $param) {
            echo "Param: " . $param->getName() . "\n";
        }
    }
}
