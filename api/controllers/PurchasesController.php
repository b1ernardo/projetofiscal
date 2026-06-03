<?php
// /api/controllers/PurchasesController.php

require_once 'ApiController.php';
require_once __DIR__ . '/../utils.php';

class PurchasesController extends ApiController {

    // ─── Listagem ──────────────────────────────────────────────────────────────

    public function list() {
        $this->authenticate();
        $stmt = $this->conn->prepare("
            SELECT p.*, s.name as supplier_name,
                   (SELECT COUNT(*) FROM purchase_items pi WHERE pi.purchase_id = p.id) as item_count
            FROM purchases p
            LEFT JOIN suppliers s ON p.supplier_id = s.id
            WHERE p.company_id = :company_id
            ORDER BY p.created_at DESC
        ");
        $stmt->execute([':company_id' => $this->company_id]);
        $this->jsonResponse($stmt->fetchAll());
    }

    // ─── Criação de compra ─────────────────────────────────────────────────────

    public function create() {
        $auth = $this->authenticate();
        $data = $this->getPostData();

        if (empty($data->items) && empty($data->new_products)) {
            $this->jsonResponse(["message" => "Itens da compra são obrigatórios"], 400);
            return;
        }

        try {
            $this->conn->beginTransaction();

            // ── Auto-cadastrar fornecedor (quando vem do XML e usuário marcou salvar) ──
            $supplier_id = $data->supplier_id ?? null;
            if (!empty($data->save_supplier) && !empty($data->supplier_data)) {
                $sd = $data->supplier_data;
                $cnpj_clean = preg_replace('/\D/', '', $sd->cnpj ?? '');

                $chk = $this->conn->prepare("SELECT id FROM suppliers WHERE cnpj = :cnpj AND company_id = :cid LIMIT 1");
                $chk->execute([':cnpj' => $cnpj_clean, ':cid' => $this->company_id]);
                $existing_sup = $chk->fetch();

                if ($existing_sup) {
                    $supplier_id = $existing_sup['id'];
                } else {
                    $supplier_id = generateUUID();
                    $this->conn->prepare(
                        "INSERT INTO suppliers (id, company_id, name, cnpj) VALUES (:id, :cid, :name, :cnpj)"
                    )->execute([
                        ':id'   => $supplier_id,
                        ':cid'  => $this->company_id,
                        ':name' => $sd->name ?? $sd->razao_social ?? 'Fornecedor XML',
                        ':cnpj' => $cnpj_clean,
                    ]);
                }
            }

            // ── Cabeçalho da compra ──
            $purchase_id = generateUUID();
            $this->conn->prepare(
                "INSERT INTO purchases (id, company_id, supplier_id, total_amount, created_by)
                 VALUES (:id, :company_id, :supplier, :total, :uid)"
            )->execute([
                ":id"         => $purchase_id,
                ":company_id" => $this->company_id,
                ":supplier"   => $supplier_id,
                ":total"      => $data->total_amount,
                ":uid"        => $auth['id'],
            ]);

            // ── Itens de produtos EXISTENTES ──
            if (!empty($data->items)) {
                foreach ($data->items as $item) {
                    $this->conn->prepare(
                        "INSERT INTO purchase_items (id, company_id, purchase_id, product_id, quantity, unit_price)
                         VALUES (:id, :company_id, :pid, :prod_id, :qty, :price)"
                    )->execute([
                        ":id"         => generateUUID(),
                        ":company_id" => $this->company_id,
                        ":pid"        => $purchase_id,
                        ":prod_id"    => $item->product_id,
                        ":qty"        => $item->quantity,
                        ":price"      => $item->unit_price,
                    ]);

                    // Atualiza estoque e custo
                    $this->conn->prepare(
                        "UPDATE products SET stock_current = stock_current + :qty, cost_price = :cost
                         WHERE id = :prod_id AND company_id = :company_id"
                    )->execute([
                        ":qty"        => $item->quantity,
                        ":cost"       => $item->unit_price,
                        ":prod_id"    => $item->product_id,
                        ":company_id" => $this->company_id,
                    ]);

                    // Atualiza preço de venda se informado
                    if (!empty($item->sale_price) && (float)$item->sale_price > 0) {
                        $this->conn->prepare(
                            "UPDATE products SET sale_price = :sale_price WHERE id = :prod_id AND company_id = :company_id"
                        )->execute([
                            ":sale_price"  => (float)$item->sale_price,
                            ":prod_id"     => $item->product_id,
                            ":company_id"  => $this->company_id,
                        ]);
                    }
                }
            }

            // ── Produtos NOVOS (vindos do XML) – auto-cadastro com dados fiscais ──
            if (!empty($data->new_products) && is_array($data->new_products)) {
                foreach ($data->new_products as $np) {

                    // Categoria padrão "Geral"
                    $cat_stmt = $this->conn->prepare(
                        "SELECT id FROM categories WHERE name = :name AND company_id = :company_id LIMIT 1"
                    );
                    $cat_stmt->execute([':name' => 'Geral', ':company_id' => $this->company_id]);
                    $cat = $cat_stmt->fetch();
                    $categoryId = $cat ? $cat['id'] : null;
                    if (!$categoryId) {
                        $categoryId = generateUUID();
                        $this->conn->prepare(
                            "INSERT INTO categories (id, company_id, name) VALUES (:id, :cid, :name)"
                        )->execute([':id' => $categoryId, ':cid' => $this->company_id, ':name' => 'Geral']);
                    }

                    // Próximo código
                    $code_stmt = $this->conn->prepare(
                        "SELECT MAX(product_code) as max_code FROM products WHERE company_id = :company_id"
                    );
                    $code_stmt->execute([':company_id' => $this->company_id]);
                    $next_code = (int)(($code_stmt->fetch())['max_code'] ?? 0) + 1;

                    // Dados fiscais convertidos (entrada→saída) vindos do frontend
                    $cst        = $np->cst_saida        ?? '00';
                    $csosn      = $np->csosn_saida       ?? '102';
                    $cfop_saida = $np->cfop_saida        ?? '5102';
                    $pis_ent    = $np->pis_cst_entrada   ?? '70';
                    $pis_sai    = $np->pis_cst_saida     ?? '07';
                    $pis_aliq   = (float)($np->pis_aliquota  ?? 0);
                    $cof_ent    = $np->cofins_cst_entrada ?? '70';
                    $cof_sai    = $np->cofins_cst_saida  ?? '07';
                    $cof_aliq   = (float)($np->cofins_aliquota ?? 0);
                    $ipi_sai    = $np->ipi_cst_saida     ?? '53';
                    $ipi_aliq   = (float)($np->ipi_aliquota   ?? 0);
                    $origem     = (int)($np->origem       ?? 0);
                    $ncm        = preg_replace('/\D/', '', $np->ncm ?? '');

                    $npId = generateUUID();
                    $this->conn->prepare(
                        "INSERT INTO products
                            (id, company_id, name, category_id, product_code, code,
                             cost_price, sale_price, sale_price2, stock_current, stock_min,
                             unit, photo_url, active, ncm, cest,
                             cfop_padrao, origem,
                             cst, csosn,
                             pis_cst_entrada, pis_cst_saida, pis_aliquota,
                             cofins_aliquota,
                             ipi_cst, ipi_aliquota, venda_delivery)
                         VALUES
                            (:id, :cid, :name, :cat, :pcode, :code,
                             :cost, :sale, 0, :stock, 0,
                             :unit, null, 1, :ncm, null,
                             :cfop, :origem,
                             :cst, :csosn,
                             :pis_ent, :pis_sai, :pis_aliq,
                             :cof_aliq,
                             :ipi_sai, :ipi_aliq, 0)"
                    )->execute([
                        ':id'       => $npId,
                        ':cid'      => $this->company_id,
                        ':name'     => $np->name,
                        ':cat'      => $categoryId,
                        ':pcode'    => $next_code,
                        ':code'     => !empty($np->ean) ? $np->ean : null,
                        ':cost'     => (float)$np->unit_price,
                        ':sale'     => !empty($np->sale_price) && (float)$np->sale_price > 0
                                        ? (float)$np->sale_price
                                        : round((float)$np->unit_price * 1.3, 2),
                        ':stock'    => (float)$np->quantity,
                        ':unit'     => $np->unit ?? 'UN',
                        ':ncm'      => $ncm,
                        ':cfop'     => $cfop_saida,
                        ':origem'   => $origem,
                        ':cst'      => $cst,
                        ':csosn'    => $csosn,
                        ':pis_ent'  => $pis_ent,
                        ':pis_sai'  => $pis_sai,
                        ':pis_aliq' => $pis_aliq,
                        ':cof_aliq' => $cof_aliq,
                        ':ipi_sai'  => $ipi_sai,
                        ':ipi_aliq' => $ipi_aliq,
                    ]);

                    // purchase_item para o novo produto
                    $this->conn->prepare(
                        "INSERT INTO purchase_items (id, company_id, purchase_id, product_id, quantity, unit_price)
                         VALUES (:id, :cid, :pid, :prod_id, :qty, :price)"
                    )->execute([
                        ':id'      => generateUUID(),
                        ':cid'     => $this->company_id,
                        ':pid'     => $purchase_id,
                        ':prod_id' => $npId,
                        ':qty'     => (float)$np->quantity,
                        ':price'   => (float)$np->unit_price,
                    ]);
                }
            }

            $this->conn->commit();
            $this->jsonResponse(["message" => "Compra registrada com sucesso", "id" => $purchase_id], 201);
        } catch (Exception $e) {
            $this->conn->rollBack();
            $this->jsonResponse(["message" => "Erro ao registrar compra: " . $e->getMessage()], 500);
        }
    }

    // ─── Helpers de conversão fiscal entrada → saída ───────────────────────────

    /**
     * CFOP: 1xxx→5xxx, 2xxx→6xxx, 3xxx→7xxx
     */
    private static function cfopSaida(string $cfop): string {
        $cfop = preg_replace('/\D/', '', $cfop);
        if (!$cfop) return '5102';
        $map = ['1' => '5', '2' => '6', '3' => '7'];
        $first = substr($cfop, 0, 1);
        return isset($map[$first]) ? ($map[$first] . substr($cfop, 1)) : $cfop;
    }

    /**
     * PIS/COFINS CST entrada → saída
     */
    private static function cstPisCofins(string $cst): string {
        $cst = str_pad($cst, 2, '0', STR_PAD_LEFT);
        $map = [
            '50'=>'01','51'=>'02','53'=>'03','54'=>'06','55'=>'04',
            '56'=>'07','60'=>'49',
            '70'=>'07','71'=>'07','72'=>'07','73'=>'07','74'=>'07','75'=>'07',
            '98'=>'06','99'=>'49',
        ];
        return $map[$cst] ?? '07';
    }

    /**
     * IPI CST entrada → saída
     * Entrada 00-05 → saída 50-55; entrada 49 → 99
     */
    private static function cstIpi(string $cst): string {
        $n = (int)$cst;
        if ($n >= 50) return str_pad($n, 2, '0', STR_PAD_LEFT); // já saída
        if ($n >= 0 && $n <= 5) return str_pad($n + 50, 2, '0', STR_PAD_LEFT);
        if ($n === 49) return '99';
        return '53'; // NT
    }

    // ─── Parse XML NF-e ───────────────────────────────────────────────────────

    /**
     * POST /purchases/parse-xml
     * Lê XML de NF-e, extrai dados fiscais e converte entrada→saída automaticamente.
     */
    public function parseXml() {
        $this->authenticate();

        if (!isset($_FILES['xml']) || $_FILES['xml']['error'] !== UPLOAD_ERR_OK) {
            $this->jsonResponse(["message" => "Arquivo XML não enviado ou inválido"], 400);
            return;
        }

        $xmlContent = file_get_contents($_FILES['xml']['tmp_name']);
        if ($xmlContent === false) {
            $this->jsonResponse(["message" => "Não foi possível ler o arquivo XML"], 400);
            return;
        }

        libxml_use_internal_errors(true);
        $xml = simplexml_load_string($xmlContent);
        if ($xml === false) {
            $errors = libxml_get_errors(); libxml_clear_errors();
            $this->jsonResponse(["message" => "XML inválido: " . ($errors[0]->message ?? 'parse error')], 400);
            return;
        }

        // Localiza infNFe
        $infNFe = null;
        if (isset($xml->NFe->infNFe))  $infNFe = $xml->NFe->infNFe;
        elseif (isset($xml->infNFe))   $infNFe = $xml->infNFe;
        else {
            $found = $xml->xpath('//*[local-name()="infNFe"]');
            if (!empty($found)) $infNFe = $found[0];
        }
        if (!$infNFe) {
            $this->jsonResponse(["message" => "XML inválido: infNFe não encontrado"], 400);
            return;
        }

        // CRT do emitente (1=Simples Nacional, 3=Normal)
        $emit = $infNFe->emit ?? null;
        $crt  = (int)($emit->CRT ?? 3);

        // Fornecedor
        $supplier = null;
        if ($emit) {
            $cnpj = preg_replace('/\D/', '', (string)($emit->CNPJ ?? ''));
            $supplier = [
                "cnpj"         => $cnpj,
                "name"         => (string)($emit->xFant ?? $emit->xNome ?? ''),
                "razao_social" => (string)($emit->xNome ?? ''),
                "ie"           => (string)($emit->IE ?? ''),
            ];
            $s = $this->conn->prepare(
                "SELECT id FROM suppliers WHERE cnpj = :cnpj AND company_id = :cid LIMIT 1"
            );
            $s->execute([':cnpj' => $cnpj, ':cid' => $this->company_id]);
            $found = $s->fetch();
            $supplier['id']     = $found ? $found['id'] : null;
            $supplier['exists'] = (bool)$found;
        }

        // Itens
        $items = [];
        $dets  = $infNFe->xpath('.//*[local-name()="det"]');
        if (empty($dets) && isset($infNFe->det)) {
            foreach ($infNFe->det as $d) $dets[] = $d;
        }

        foreach ($dets as $det) {
            $prod = $det->prod ?? null;
            if (!$prod) continue;

            // Produto básico
            $ean  = trim((string)($prod->cEAN ?? ''));
            if (in_array($ean, ['SEM GTIN','SEM GTIN ']) || strlen($ean) < 8) $ean = '';
            $ncm       = preg_replace('/\D/', '', (string)($prod->NCM  ?? ''));
            $name      = (string)($prod->xProd ?? '');
            $unit      = strtoupper(trim((string)($prod->uCom ?? 'UN')));
            $qty       = (float)($prod->qCom   ?? 1);
            $unitPrice = (float)($prod->vUnCom  ?? 0);
            $cfop_ent  = (string)($prod->CFOP   ?? '1102');
            $cfop_sai  = self::cfopSaida($cfop_ent);

            // Impostos
            $imposto = $det->imposto ?? null;
            $origem  = 0;

            // ── ICMS ──
            $cst_ent = ''; $csosn_ent = ''; $aliq_icms = 0.0;
            if ($imposto && isset($imposto->ICMS)) {
                foreach ($imposto->ICMS->children() as $node) {
                    $origem    = (int)($node->orig   ?? 0);
                    $cst_ent   = (string)($node->CST   ?? '');
                    $csosn_ent = (string)($node->CSOSN ?? '');
                    $aliq_icms = (float)($node->pICMS  ?? 0);
                    break;
                }
            }

            // Conversão ICMS para saída
            if ($crt <= 2) {
                // Simples Nacional
                $cst_saida   = '00';
                $csosn_saida = ($csosn_ent === '500' || $cst_ent === '60') ? '500' : '102';
            } else {
                // Lucro Real/Presumido
                $cst_saida   = $cst_ent ?: '00';
                $csosn_saida = '102';
            }

            // ── PIS ──
            $pis_cst_ent = '70'; $pis_aliq = 0.0;
            if ($imposto && isset($imposto->PIS)) {
                foreach ($imposto->PIS->children() as $node) {
                    $pis_cst_ent = (string)($node->CST  ?? '70');
                    $pis_aliq    = (float)($node->pPIS   ?? 0);
                    break;
                }
            }
            $pis_cst_sai = self::cstPisCofins($pis_cst_ent);

            // ── COFINS ──
            $cof_cst_ent = '70'; $cof_aliq = 0.0;
            if ($imposto && isset($imposto->COFINS)) {
                foreach ($imposto->COFINS->children() as $node) {
                    $cof_cst_ent = (string)($node->CST   ?? '70');
                    $cof_aliq    = (float)($node->pCOFINS ?? 0);
                    break;
                }
            }
            $cof_cst_sai = self::cstPisCofins($cof_cst_ent);

            // ── IPI ──
            $ipi_cst_ent = '53'; $ipi_aliq = 0.0;
            if ($imposto && isset($imposto->IPI)) {
                foreach ($imposto->IPI->children() as $node) {
                    // IPITrib ou IPINT
                    $ipi_cst_ent = (string)($node->CST  ?? '53');
                    $ipi_aliq    = (float)($node->pIPI   ?? 0);
                    break;
                }
            }
            $ipi_cst_sai = self::cstIpi($ipi_cst_ent);

            // Verifica produto existente
            $existing = null;
            if ($ean) {
                $p = $this->conn->prepare(
                    "SELECT id, name, sale_price, cost_price FROM products
                     WHERE code = :code AND company_id = :cid AND active = 1 LIMIT 1"
                );
                $p->execute([':code' => $ean, ':cid' => $this->company_id]);
                $existing = $p->fetch();
            }
            if (!$existing && $name) {
                $p = $this->conn->prepare(
                    "SELECT id, name, sale_price, cost_price FROM products
                     WHERE name = :name AND company_id = :cid AND active = 1 LIMIT 1"
                );
                $p->execute([':name' => $name, ':cid' => $this->company_id]);
                $existing = $p->fetch();
            }

            $curSale = $existing ? (float)$existing['sale_price'] : 0;

            $items[] = [
                // Produto
                "name"               => $name,
                "ean"                => $ean,
                "ncm"                => $ncm,
                "unit"               => $unit,
                "quantity"           => $qty,
                "unit_price"         => $unitPrice,
                "total_price"        => round($qty * $unitPrice, 2),
                "origem"             => $origem,
                // CFOP
                "cfop_entrada"       => $cfop_ent,
                "cfop_saida"         => $cfop_sai,
                // ICMS
                "cst_icms_entrada"   => $cst_ent,
                "csosn_entrada"      => $csosn_ent,
                "cst_saida"          => $cst_saida,
                "csosn_saida"        => $csosn_saida,
                "aliq_icms"          => $aliq_icms,
                // PIS
                "pis_cst_entrada"    => $pis_cst_ent,
                "pis_cst_saida"      => $pis_cst_sai,
                "pis_aliquota"       => $pis_aliq,
                // COFINS
                "cofins_cst_entrada" => $cof_cst_ent,
                "cofins_cst_saida"   => $cof_cst_sai,
                "cofins_aliquota"    => $cof_aliq,
                // IPI
                "ipi_cst_entrada"    => $ipi_cst_ent,
                "ipi_cst_saida"      => $ipi_cst_sai,
                "ipi_aliquota"       => $ipi_aliq,
                // Existência
                "is_new"             => !$existing,
                "product_id"         => $existing ? $existing['id'] : null,
                "product_name"       => $existing ? $existing['name'] : null,
                "current_sale_price" => $curSale,
                "current_cost_price" => $existing ? (float)$existing['cost_price'] : 0,
                "sale_price"         => $existing ? $curSale : round($unitPrice * 1.3, 2),
                "margin_percent"     => 30.0,
            ];
        }

        $this->jsonResponse([
            "supplier" => $supplier,
            "items"    => $items,
            "total"    => array_sum(array_column($items, 'total_price')),
        ]);
    }
}
