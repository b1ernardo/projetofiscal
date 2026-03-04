<?php
// Configurações Globais e Banco
require_once 'config.php';
require_once 'db.php';
require_once 'vendor/autoload.php';

// Captura a rota (ex: login)
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uri = str_replace(['/projetofiscal/api', '/sistemavendas/api', '/api'], '', $uri);
$route = trim($uri, '/');
$route_parts = explode('/', $route);

$resource = $route_parts[0] ?? '';
$id = $route_parts[1] ?? null;

// Resposta rápida para preflight CORS (OPTIONS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];

// Roteador Básico
switch ($resource) {
    case 'login':
        require_once 'controllers/AuthController.php';
        $controller = new AuthController();
        if ($method === 'POST') {
            $controller->login();
        } else {
            http_response_code(405);
            echo json_encode(["message" => "Method not allowed"]);
        }
        break;

    case 'auth':
        require_once 'controllers/AuthController.php';
        $controller = new AuthController();
        if ($id === 'me' && $method === 'GET') {
            $controller->me();
        }
        break;

    case 'products':
        require_once 'controllers/ProductsController.php';
        $db = (new Database())->getConnection();
        $controller = new ProductsController($db);
        if ($id === 'next-code' && $method === 'GET') {
            $controller->getNextCode();
        } else if ($method === 'GET') {
            $controller->list();
        } else if ($method === 'POST') {
            $controller->create();
        } else if ($method === 'PUT') {
            $controller->update();
        } else if ($method === 'DELETE') {
            $controller->delete();
        } else {
            http_response_code(405);
            echo json_encode(["message" => "Method not allowed"]);
        }
        break;

    case 'dashboard':
        require_once 'controllers/DashboardController.php';
        $db = (new Database())->getConnection();
        $controller = new DashboardController($db);
        if ($id === 'stats' && $method === 'GET') {
            $controller->getStats();
        } else if ($id === 'chart' && $method === 'GET') {
            $controller->getChartData();
        } else {
            http_response_code(404);
            echo json_encode(["message" => "Dashboard endpoint not found"]);
        }
        break;
        
    case 'customers':
        require_once 'controllers/CustomersController.php';
        $db = (new Database())->getConnection();
        $controller = new CustomersController($db);
        if ($method === 'GET') $controller->list();
        else if ($method === 'POST') $controller->create();
        else if ($method === 'PUT' && $id) $controller->update($id);
        else if ($method === 'DELETE' && $id) $controller->delete($id);
        break;

    case 'suppliers':
        require_once 'controllers/SuppliersController.php';
        $db = (new Database())->getConnection();
        $controller = new SuppliersController($db);
        if ($method === 'GET') $controller->list();
        else if ($method === 'POST') $controller->create();
        break;

    case 'sales':
        require_once 'controllers/SalesController.php';
        $db = (new Database())->getConnection();
        $controller = new SalesController($db);
        if ($id && $method === 'GET') $controller->getDetail($id);
        else if ($method === 'GET') $controller->list();
        else if ($method === 'POST') $controller->create();
        else if ($id && $method === 'PUT') $controller->update($id);
        else if ($id && $method === 'DELETE') $controller->delete($id);
        else {
             http_response_code(405);
             echo json_encode(["message" => "Method not allowed"]);
        }
        break;

    case 'cashier':
        require_once 'controllers/CashierController.php';
        $db = (new Database())->getConnection();
        $controller = new CashierController($db);
        if ($id === 'current' && $method === 'GET') $controller->getCurrent();
        else if ($id === 'open' && $method === 'POST') $controller->open();
        else if ($id === 'close' && $method === 'POST') $controller->close();
        else if ($id === 'summary' && $method === 'GET') $controller->getSummary();
        else if ($id === 'movements' && $method === 'GET') $controller->getMovements();
        else if ($id === 'movements' && $method === 'POST') $controller->addMovement();
        else if ($id === 'movements' && $method === 'PUT') $controller->updateMovement($id);
        else if ($id === 'movements' && $method === 'DELETE') $controller->deleteMovement($id);
        else if ($id === 'history' && $method === 'GET') $controller->getHistory();
        else if ($id === 'history' && $method === 'DELETE') {
            $item_id = $route_parts[2] ?? $_GET['id'] ?? null;
            $controller->deleteHistory($item_id);
        }
        break;

    case 'payment_methods':
        require_once 'controllers/PaymentMethodsController.php';
        $db = (new Database())->getConnection();
        $controller = new PaymentMethodsController($db);
        if ($method === 'GET') $controller->list();
        else if ($method === 'POST') $controller->create();
        else if ($method === 'PUT') $controller->update($id);
        else if ($method === 'DELETE') $controller->delete($id);
        break;

    case 'categories':
        require_once 'controllers/CategoriesController.php';
        $db = (new Database())->getConnection();
        $controller = new CategoriesController($db);
        if ($method === 'GET') $controller->list();
        else if ($method === 'POST') $controller->create();
        else if ($method === 'DELETE') $controller->delete($id);
        break;

    case 'comandas':
        require_once 'controllers/ComandasController.php';
        $db = (new Database())->getConnection();
        $controller = new ComandasController($db);
        if ($method === 'GET' && !$id) $controller->list();
        else if ($method === 'POST' && !$id) $controller->create();
        else if ($id && $method === 'GET') $controller->getDetail($id);
        else if ($id && $method === 'PUT') $controller->update($id);
        else if ($id && $method === 'POST' && $route_parts[2] === 'items') $controller->addItem($id);
        else if ($id && $method === 'POST' && $route_parts[2] === 'items-batch') $controller->addItems($id);
        else if ($method === 'DELETE' && $route_parts[1] === 'items') $controller->removeItem($route_parts[2]); // URL: /comandas/items/ID
        else if ($id && $method === 'POST' && $route_parts[2] === 'close') $controller->close($id);
        else if ($id && $method === 'DELETE') $controller->delete($id);
        break;

    case 'purchases':
        require_once 'controllers/PurchasesController.php';
        $db = (new Database())->getConnection();
        $controller = new PurchasesController($db);
        if ($method === 'GET') $controller->list();
        else if ($method === 'POST') $controller->create();
        break;

    case 'users':
        require_once 'controllers/UsersController.php';
        $db = (new Database())->getConnection();
        $controller = new UsersController($db);
        if ($method === 'GET') $controller->list();
        else if ($method === 'POST') $controller->create();
        else if ($method === 'PUT') $controller->update($id);
        else if ($method === 'DELETE') $controller->delete($id);
        break;

    case 'reports':
        require_once 'controllers/ReportsController.php';
        $db = (new Database())->getConnection();
        $controller = new ReportsController($db);
        if ($id === 'financial' && $method === 'GET') $controller->getFinancial();
        else if ($id === 'sales' && $method === 'GET') $controller->getSales();
        else if ($id === 'sales-period' && $method === 'GET') $controller->getSalesByPeriod();
        else if ($id === 'stock' && $method === 'GET') $controller->getStockReport();
        else if ($id === 'top-products' && $method === 'GET') $controller->getTopProducts();
        else if ($id === 'dashboard' && $method === 'GET') $controller->getDashboardStats();
        break;

    case 'accounts-payable':
        require_once 'controllers/FinancesController.php';
        $db = (new Database())->getConnection();
        $controller = new FinancesController($db);
        if ($method === 'GET') $controller->listPayable();
        else if ($method === 'POST') $controller->createPayable();
        else if ($method === 'PUT') $controller->updatePayable($id);
        else if ($method === 'DELETE') $controller->deletePayable($id);
        break;

    case 'accounts-receivable':
        require_once 'controllers/FinancesController.php';
        $db = (new Database())->getConnection();
        $controller = new FinancesController($db);
        if ($method === 'GET') $controller->listReceivable();
        else if ($method === 'POST') $controller->createReceivable();
        else if ($method === 'PUT') $controller->updateReceivable($id);
        else if ($method === 'DELETE') $controller->deleteReceivable($id);
        break;

    case 'chart-of-accounts':
        require_once 'controllers/ChartOfAccountsController.php';
        $db = (new Database())->getConnection();
        $controller = new ChartOfAccountsController($db);
        if ($method === 'GET') $controller->list();
        else if ($method === 'POST') $controller->create();
        else if ($method === 'DELETE') $controller->delete($id);
        break;

    case 'fiscal':
        require_once 'controllers/FiscalController.php';
        $db = (new Database())->getConnection();
        $controller = new FiscalController($db);
        if ($id === 'config' && $method === 'GET') $controller->getConfig();
        else if ($id === 'config' && $method === 'POST') $controller->saveConfig();
        else if ($id === 'notas' && $method === 'GET') $controller->listNotas();
        else if ($id === 'rascunhos' && $method === 'GET') $controller->listarRascunhos();
        else if ($id === 'rascunho' && $method === 'POST') $controller->salvarRascunho();
        else if ($id === 'rascunho' && $method === 'GET' && isset($route_parts[2])) $controller->getRascunho($route_parts[2]);
        else if ($id === 'rascunho' && $method === 'DELETE' && isset($route_parts[2])) $controller->deletarRascunho($route_parts[2]);
        else if ($id === 'emitir' && $method === 'POST') $controller->emitirNFe();
        else if ($id === 'emit-avulsa' && $method === 'POST') $controller->emitirAvulsa();
        else if ($id === 'cancelar' && $method === 'POST') $controller->cancelarNFe();
        else if ($id === 'danfe' && isset($route_parts[2])) $controller->gerarDanfe($route_parts[2]);
        else if ($id === 'xml' && isset($route_parts[2])) $controller->downloadXml($route_parts[2]);
        else if ($id === 'ncm' && ($route_parts[2] ?? '') === 'search') $controller->searchNcm();
        else if ($id === 'ncm' && isset($route_parts[2])) $controller->getNcm($route_parts[2]);
        else if ($id === 'naturezas') {
            require_once 'controllers/NaturezasController.php';
            $natController = new NaturezasController($db);
            
            if ($method === 'GET') {
                $natController->list();
            } else if ($method === 'POST' && isset($route_parts[2]) && ($route_parts[3] ?? '') === 'set-padrao') {
                $natController->setPadrao($route_parts[2]);
            } else if ($method === 'POST') {
                $natController->create();
            } else if ($method === 'DELETE' && isset($route_parts[2])) {
                $natController->delete($route_parts[2]);
            } else {
                http_response_code(405);
                echo json_encode(["message" => "Method not allowed"]);
            }
        }
        break;

    default:
        http_response_code(404);
        echo json_encode(["message" => "Endpoint not found: " . $resource]);
        break;
}
