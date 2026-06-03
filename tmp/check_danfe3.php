<?php
require 'api/vendor/autoload.php';
$d = new ReflectionClass('NFePHP\DA\NFe\Danfe');
echo "Danfe Constructor:\n";
foreach ($d->getConstructor()->getParameters() as $p) echo "-" . $p->getName() . "\n";

echo "Danfce Constructor:\n";
$dce = new ReflectionClass('NFePHP\DA\NFe\Danfce');
foreach ($dce->getConstructor()->getParameters() as $p) echo "-" . $p->getName() . "\n";

echo "Methods Danfe:\n";
foreach ($d->getMethods() as $m) {
    if ($m->getName() == 'logoParameters') {
        echo "- " . $m->getName() . " (";
        foreach ($m->getParameters() as $p) echo $p->getName() . ", ";
        echo ")\n";
    }
}
