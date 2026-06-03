<?php
require 'api/vendor/autoload.php';
$d = new ReflectionClass('NFePHP\DA\NFe\Danfe');
foreach ($d->getMethods() as $method) {
    if ($method->getName() === 'render') {
        echo "Method: " . $method->getName() . "\n";
        foreach ($method->getParameters() as $param) {
            echo "Param: " . $param->getName() . "\n";
        }
    }
}
$d = new ReflectionClass('NFePHP\DA\NFe\Danfce');
foreach ($d->getMethods() as $method) {
    if ($method->getName() === 'render') {
        echo "Method Danfce: " . $method->getName() . "\n";
        foreach ($method->getParameters() as $param) {
            echo "Param: " . $param->getName() . "\n";
        }
    }
}
