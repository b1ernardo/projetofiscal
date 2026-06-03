<?php
ob_start();
date_default_timezone_set('America/Sao_Paulo');
// Configurações Globais e Banco
require_once 'config.php';
require_once 'db.php';
require_once 'vendor/autoload.php';

// Normaliza o cabeçalho de Autorização (Authorization) para aceitar vários formatos de servidor
if (!isset($_SERVER['HTTP_AUTHORIZATION'])) {
    if (isset($_SERVER['Authorization'])) {
        $_SERVER['HTTP_AUTHORIZATION'] = $_SERVER['Authorization'];
    } elseif (function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        if (isset($headers['Authorization'])) {
            $_SERVER['HTTP_AUTHORIZATION'] = $headers['Authorization'];
        }
    }
}

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
        } else if ($id === 'verify-admin' && $method === 'POST') {
            $controller->verifyAdmin();
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

    case 'sellers':
        require_once 'controllers/SellersController.php';
        $db = (new Database())->getConnection();
        $controller = new SellersController($db);
        if ($method === 'GET') $controller->list();
        else if ($method === 'POST') $controller->create();
        else if ($method === 'PUT' && $id) $controller->update($id);
        else if ($method === 'DELETE' && $id) $controller->delete($id);
        break;

    case 'sales':
        require_once 'controllers/SalesController.php';
        $db = (new Database())->getConnection();
        $controller = new SalesController($db);
        if ($id && $method === 'GET') $controller->getDetail($id);
        else if ($method === 'GET') $controller->list();
        else if ($method === 'POST') $controller->create();
        else if ($id && $method === 'PUT') $controller->update($id);
        else if ($id && $method === 'POST' && $route_parts[2] === 'cancel') $controller->cancel($id);
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
        else if ($method === 'PUT' && $id) $controller->update($id);
        else if ($method === 'DELETE' && $id) $controller->delete($id);
        break;

    case 'sub-categories':
        require_once 'controllers/SubCategoriesController.php';
        $db = (new Database())->getConnection();
        $controller = new SubCategoriesController($db);
        if ($method === 'GET') $controller->list();
        else if ($method === 'POST') $controller->create();
        else if ($method === 'DELETE' && $id) $controller->delete($id);
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

    case 'quotes':
        require_once 'controllers/QuotesController.php';
        $db = (new Database())->getConnection();
        $controller = new QuotesController($db);
        if ($method === 'GET' && !$id) $controller->list();
        else if ($method === 'POST' && !$id) $controller->create();
        else if ($id && $method === 'PUT') $controller->update($id);
        else if ($id && $method === 'GET') $controller->get($id);
        break;

    case 'purchases':
        require_once 'controllers/PurchasesController.php';
        $db = (new Database())->getConnection();
        $controller = new PurchasesController($db);
        if ($id === 'parse-xml' && $method === 'POST') $controller->parseXml();
        else if ($method === 'GET') $controller->list();
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
        else if ($id === 'sales-product' && $method === 'GET') $controller->getSalesByProduct();
        else if ($id === 'sales-customer' && $method === 'GET') $controller->getSalesByCustomer();
        else if ($id === 'profitability' && $method === 'GET') $controller->getProfitability();
        else if ($id === 'sellers-commission' && $method === 'GET') $controller->getSellersCommission();
        else if ($id === 'plano-contas' && $method === 'GET') $controller->getPlanoContas();
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

    case 'delivery-orders':
        require_once 'controllers/DeliveryOrdersController.php';
        $db = (new Database())->getConnection();
        $controller = new DeliveryOrdersController($db);
        if ($method === 'GET') $controller->list();
        else if ($method === 'POST') $controller->create();
        else if ($method === 'PUT' && isset($route_parts[2]) && $route_parts[2] === 'status') {
             // e.g. PUT /api/delivery-orders/:id/status
             $controller->updateStatus($id);
        }
        break;

    case 'service-orders':
        require_once 'controllers/ServiceOrdersController.php';
        $db = (new Database())->getConnection();
        $controller = new ServiceOrdersController($db);
        if ($method === 'GET' && !$id) $controller->list();
        else if ($method === 'POST') $controller->create();
        else if ($id && $method === 'GET') $controller->get($id);
        else if ($id && $method === 'PUT' && ($route_parts[2] ?? '') === 'status') $controller->updateStatus($id);
        else if ($id && $method === 'PUT') $controller->update($id);
        else if ($id && $method === 'DELETE') $controller->delete($id);
        break;

    case 'delivery-settings':
        require_once 'controllers/DeliverySettingsController.php';
        $db = (new Database())->getConnection();
        $controller = new DeliverySettingsController($db);
        if ($method === 'GET' && !$id) $controller->getSettings();
        else if ($method === 'POST') $controller->saveSettings();
        // Public settings logic can be moved here or to a separate public endpoint. Let's make it public route:
        else if ($method === 'GET' && $id) $controller->getPublicSettings($id);
        break;

    case 'delivery-neighborhoods':
        require_once 'controllers/DeliveryNeighborhoodsController.php';
        $db = (new Database())->getConnection();
        $controller = new DeliveryNeighborhoodsController($db);
        if ($method === 'GET') $controller->list();
        else if ($method === 'POST') $controller->create();
        else if ($method === 'DELETE' && $id) $controller->delete($id);
        break;

    case 'superadmin':
        require_once 'controllers/SuperAdminController.php';
        $db = (new Database())->getConnection();
        $controller = new SuperAdminController($db);
        // Rotas específicas ANTES das genéricas
        if ($id === 'modules' && $method === 'GET') $controller->listModules();
        else if ($id === 'companies' && isset($route_parts[3]) && $route_parts[3] === 'users' && $method === 'GET') $controller->listCompanyUsers($route_parts[2]);
        else if ($id === 'companies' && $method === 'GET') $controller->listCompanies();
        else if ($id === 'companies' && $method === 'POST') $controller->createCompany();
        else if ($id === 'companies' && $method === 'PUT') $controller->updateCompany($route_parts[2]);
        else if ($id === 'companies' && $method === 'DELETE') $controller->deleteCompany($route_parts[2]);
        else if ($id === 'accounts' && $method === 'POST') $controller->createAccount();
        else if ($id === 'users' && isset($route_parts[2]) && $method === 'PUT') $controller->updateUserBySuper($route_parts[2]);
        else if ($id === 'users' && isset($route_parts[2]) && $method === 'DELETE') $controller->deleteAccountBySuper($route_parts[2]);
        break;

    default:
        http_response_code(404);
        echo json_encode(["message" => "Endpoint not found: " . $resource]);
        break;
}
