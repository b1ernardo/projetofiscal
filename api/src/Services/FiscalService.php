<?php

namespace App\Services;

use NFePHP\NFe\Tools;
use NFePHP\Common\Certificate;
use NFePHP\NFe\Make;
use NFePHP\NFe\Complements;
use NFePHP\DA\NFe\Danfe;
use NFePHP\DA\NFe\Danfce;
use Exception;
use PDO;

class FiscalService {
    private $db;
    private $config;
    private $tools;

    public function __construct(PDO $db) {
        $this->db = $db;
        $this->loadConfig();
    }

    private function loadConfig() {
        $stmt = $this->db->prepare("SELECT * FROM config_fiscal LIMIT 1");
        $stmt->execute();
        $this->config = $stmt->fetch();

        if (!$this->config) {
            throw new Exception("Configuração fiscal não encontrada.");
        }

        if (empty($this->config['certificado_pfx']) || empty($this->config['certificado_senha'])) {
            throw new Exception("Certificado digital ou senha não configurados.");
        }
    }

    private function getTools() {
        if ($this->tools) return $this->tools;

        $pfxContents = base64_decode($this->config['certificado_pfx']);
        $password = $this->config['certificado_senha'];
        
        $configData = [
            "atualizacao" => date('Y-m-d H:i:s'),
            "tpAmb" => (int)$this->config['ambiente'], // 1-Produção, 2-Homologação
            "razaosocial" => $this->config['razao_social'],
            "cnpj" => $this->config['cnpj'],
            "siglaUF" => $this->config['uf'],
            "schemes" => "PL_009_V4",
            "versao" => "4.00",
            "tokenIBPT" => "",
            "CSC" => $this->config['csc_token'],
            "CSCid" => $this->config['csc_id']
        ];

        $configJson = json_encode($configData);
        $certificate = Certificate::readPfx($pfxContents, $password);
        $this->tools = new Tools($configJson, $certificate);
        $this->tools->model('55'); // Padrão NF-e, alterado dinamicamente para 65 se for NFC-e
        
        return $this->tools;
    }

    private function getIBPTTax($ncm, $ex = 0, $orig = 0) {
        if (!$ncm) return null;
        $ncm = preg_replace('/[^0-9]/', '', $ncm);
        
        $stmt = $this->db->prepare("SELECT * FROM ibpt_codes WHERE codigo = ? AND ex = ? LIMIT 1");
        $stmt->execute([$ncm, $ex]);
        $ibpt = $stmt->fetch(\PDO::FETCH_ASSOC);
        
        if (!$ibpt) return null;
        
        // Se a origem for importada (1, 2, 3, 6, 7), usar importadosfederal, senão usar nacionalfederal
        $isImported = in_array($orig, [1, 2, 3, 6, 7]);
        $federal = $isImported ? (float)$ibpt['importadosfederal'] : (float)$ibpt['nacionalfederal'];
        $estadual = (float)$ibpt['estadual'];
        $municipal = (float)$ibpt['municipal'];
        
        return $federal + $estadual + $municipal;
    }

    public function generateNFe($sale, $items, $model = '55', $customerData = null, $ideData = null) {
        $tools = $this->getTools();
        $tools->model((int)$model);

        $nfe = new Make();

        // Informações da NF-e (infNFe)
        $std = new \stdClass();
        $std->versao = '4.00';
        $nfe->taginfNFe($std);

        // Identificação (ide)
        $ide = new \stdClass();
        $ide->cUF = $this->getCUF($this->config['uf']);
        $ide->cNF = rand(10000000, 99999999);
        $ide->natOp = !empty($ideData['natOp']) ? $ideData['natOp'] : 'VENDA DE MERCADORIA';
        $ide->mod = $model;
        $ide->serie = !empty($ideData['serie']) ? $ideData['serie'] : (($model == '55') ? $this->config['serie_nfe'] : $this->config['serie_nfce']);
        $ide->nNF = !empty($ideData['numero']) ? (int)$ideData['numero'] : (($model == '55') ? $this->config['ultimo_numero_nfe'] + 1 : $this->config['ultimo_numero_nfce'] + 1);
        $ide->dhEmi = date('Y-m-d\TH:i:sP');
        $ide->tpNF = !empty($ideData['tpNF']) ? (int)$ideData['tpNF'] : 1;
        $ide->idDest = !empty($ideData['idDest']) ? (int)$ideData['idDest'] : 1;
        
        // Verifica se a UF do destinatário difere da UF do emissor
        if (empty($ideData['idDest']) && $customerData && !empty($customerData['uf']) && strtoupper($customerData['uf']) !== strtoupper($this->config['uf'])) {
            $ide->idDest = 2;
        }

        // cMunFG deve ter 7 dígitos (código IBGE)
        $codMun = preg_replace('/[^0-9]/', '', $this->config['cod_municipio'] ?? '');
        $ide->cMunFG = str_pad($codMun, 7, '0', STR_PAD_LEFT);
        $ide->tpImp = ($model == '55') ? 1 : 4; // 1-Retrato (NFe), 4-DANFe NFCe
        $ide->tpEmis = 1; // 1-Normal
        $ide->cDV = 0;
        $ide->tpAmb = (int)$this->config['ambiente'];
        $ide->finNFe = isset($ideData['finNFe']) ? (int)$ideData['finNFe'] : 1; // 1-Normal
        $ide->indFinal = 1; // 1-Consumidor Final
        $ide->indPres = isset($ideData['indPres']) ? (int)$ideData['indPres'] : 1; // 1-Presencial
        $ide->procEmi = 0;
        $ide->verProc = '3.10';
        $nfe->tagide($ide);

        // Chave Referenciada
        if (!empty($ideData['refNFe'])) {
            $ref = new \stdClass();
            $ref->refNFe = preg_replace('/[^0-9]/', '', $ideData['refNFe']);
            $nfe->tagrefNFe($ref);
        }

        // Emitente (emit)
        $emit = new \stdClass();
        $emit->CNPJ = $this->config['cnpj'];
        $emit->xNome = $this->config['razao_social'];
        $emit->xFant = $this->config['nome_fantasia'];
        $emit->IE = $this->config['ie'];
        $emit->CRT = 1; // 1-Simples Nacional
        $nfe->tagemit($emit);

        // Helper: garante cMun com 7 dígitos (padrão IBGE)
        $normalizarCMun = function($cod) {
            $cod = preg_replace('/[^0-9]/', '', $cod ?? '');
            return str_pad($cod, 7, '0', STR_PAD_LEFT);
        };

        // Endereço do Emitente (enderEmit)
        $enderEmit = new \stdClass();
        $enderEmit->xLgr = $this->config['logradouro'];
        $enderEmit->nro = $this->config['numero'];
        $enderEmit->xBairro = $this->config['bairro'];
        $enderEmit->cMun = $normalizarCMun($this->config['cod_municipio']);
        $enderEmit->xMun = $this->config['municipio'];
        $enderEmit->UF = $this->config['uf'];
        $enderEmit->CEP = $this->config['cep'];
        $enderEmit->cPais = '1058';
        $enderEmit->xPais = 'BRASIL';
        $enderEmit->fone = $this->config['fone'];
        $nfe->tagenderEmit($enderEmit);

        // Destinatário (dest)
        // Aceitar doc tanto do $sale quanto do $customerData (NF-e avulsa)
        $destDoc = !empty($sale['customer_doc']) ? $sale['customer_doc'] : ($customerData['documento'] ?? '');
        $destNome = !empty($sale['customer_name']) ? $sale['customer_name'] : ($customerData['nome'] ?? 'Consumidor Final');
        
        if (!empty($destDoc)) {
            $doc = preg_replace('/[^0-9]/', '', $destDoc);
            if (!empty($doc)) {
                $dest = new \stdClass();
                if (strlen($doc) > 11) {
                    $dest->CNPJ = $doc;
                } else {
                    $dest->CPF = $doc;
                }
                
                $dest->xNome = $destNome ?: 'Consumidor Final';
                
                // Tratar IE
                if ($customerData && !empty($customerData['ie']) && strtoupper($customerData['ie']) !== 'ISENTO') {
                    $dest->indIEDest = 1; // 1-Contribuinte ICMS
                    $dest->IE = preg_replace('/[^0-9]/', '', $customerData['ie']);
                } else {
                    $dest->indIEDest = 9; // 9-Não Contribuinte
                }
                
                $destEmail = !empty($sale['customer_email']) ? $sale['customer_email'] : ($customerData['email'] ?? '');
                if (!empty($destEmail)) {
                    $dest->email = $destEmail;
                }
                $nfe->tagdest($dest);

                // Endereço do Destinatário: só inclui se tiver código IBGE válido (7 dígitos, não-zero)
                $codMunDest = preg_replace('/[^0-9]/', '', $customerData['codigo_municipio'] ?? '');
                $codMunDestPadded = str_pad($codMunDest, 7, '0', STR_PAD_LEFT);
                $codMunValido = strlen($codMunDest) > 0 && (int)$codMunDestPadded > 0 && $codMunDestPadded !== '9999999';
                
                if ($customerData && !empty($customerData['logradouro']) && $codMunValido) {
                    $enderDest = new \stdClass();
                    $enderDest->xLgr = $customerData['logradouro'];
                    $enderDest->nro = $customerData['numero'] ?: 'SN';
                    $enderDest->xBairro = $customerData['bairro'] ?: 'Centro';
                    $enderDest->cMun = $codMunDestPadded;
                    $enderDest->xMun = $customerData['municipio'];
                    $enderDest->UF = $customerData['uf'];
                    $enderDest->CEP = preg_replace('/[^0-9]/', '', $customerData['cep']);
                    $enderDest->cPais = '1058';
                    $enderDest->xPais = 'BRASIL';
                    if (!empty($customerData['telefone'])) {
                        $enderDest->fone = preg_replace('/[^0-9]/', '', $customerData['telefone']);
                    }
                    $nfe->tagenderDest($enderDest);
                }
            }
        }

        // Variável para somar o valor total de tributos da nota
        $vTotTribGeral = 0.00;
        $percentualTributos = isset($this->config['percentual_tributos']) ? (float)$this->config['percentual_tributos'] : 0.00;

        // Itens (prod)
        $n = 1;
        foreach ($items as $item) {
            $prod = new \stdClass();
            $prod->item = $n;
            $prod->cProd = !empty($item['code']) ? $item['code'] : substr(str_replace('-', '', $item['product_id']), 0, 14);
            $prod->cEAN = 'SEM GTIN';
            $prod->xProd = !empty($item['name']) ? substr($item['name'], 0, 120) : 'PRODUTO SEM NOME';
            $prod->NCM = !empty($item['ncm']) ? preg_replace('/[^0-9]/', '', $item['ncm']) : '00000000';
            $prod->CEST = !empty($item['cest']) ? preg_replace('/[^0-9]/', '', $item['cest']) : null;
            $prod->CFOP = $item['cfop_padrao'];
            $prod->uCom = $item['unit'];
            $prod->qCom = number_format($item['quantity'], 4, '.', '');
            $prod->vUnCom = number_format($item['unit_price'], 10, '.', '');
            $prod->vProd = number_format($item['quantity'] * $item['unit_price'], 2, '.', '');
            $prod->cEANTrib = 'SEM GTIN';
            $prod->uTrib = $item['unit'];
            $prod->qTrib = number_format($item['quantity'], 4, '.', '');
            $prod->vUnTrib = number_format($item['unit_price'], 10, '.', '');
            $prod->indTot = 1;

            // Cálculo do imposto aproximado (Lei da Transparência)
            // Acumulamos em centavos (inteiro) para evitar erros de ponto flutuante
            $vItem = round($item['quantity'] * $item['unit_price'], 2);
            $taxPerc = $this->getIBPTTax($item['ncm'] ?? null, 0, $item['origem'] ?? 0);
            if ($taxPerc === null) {
                $taxPerc = $percentualTributos;
            }
            // Calcular em centavos
            $vTotTribItemCentavos = (int) round(($vItem * $taxPerc), 0); // centavos * 100
            $vTotTribItem = round(($vItem * $taxPerc) / 100, 2);
            $vTotTribGeralCentavos = ($vTotTribGeralCentavos ?? 0) + $vTotTribItemCentavos;

            // Sempre definir vTotTrib no item (0.00 se não houver) - necessário para consistência
            // Mas só inclui se o total geral > 0 para não enviar campo desnecessário
            // Guardamos para usar após o loop
            $itemTributos[] = $vTotTribItem;

            $nfe->tagprod($prod);

            // ICMSSN102 (Simples Nacional)
            $imposto = new \stdClass();
            $imposto->item = $n;
            $nfe->tagimposto($imposto);

            $icms = new \stdClass();
            $icms->item = $n;
            $icms->orig = $item['origem'];
            $icms->CSOSN = $item['csosn'] ?? $item['cst'] ?? '102'; // Operação isenta/sem crédito
            $nfe->tagICMSSN($icms);

            // PIS (PISOutr)
            $pis = new \stdClass();
            $pis->item = $n;
            $pis->CST = '99';
            $pis->vBC = 0.00;
            $pis->pPIS = 0.00;
            $pis->vPIS = 0.00;
            $nfe->tagPIS($pis);

            // COFINS (COFINSOutr)
            $cofins = new \stdClass();
            $cofins->item = $n;
            $cofins->CST = '99';
            $cofins->vBC = 0.00;
            $cofins->pCOFINS = 0.00;
            $cofins->vCOFINS = 0.00;
            $nfe->tagCOFINS($cofins);
            
            $n++;
        }

        // Totais (ICMSTot)
        $tot = new \stdClass();
        $tot->vBC = 0.00;
        $tot->vICMS = 0.00;
        $tot->vICMSDeson = 0.00;
        $tot->vFCP = 0.00;
        $tot->vBCST = 0.00;
        $tot->vST = 0.00;
        $tot->vFCPST = 0.00;
        $tot->vFCPSTRet = 0.00;
        $tot->vProd = number_format($sale['total_amount'] + $sale['discount'], 2, '.', '');
        $tot->vFrete = 0.00;
        $tot->vSeg = 0.00;
        $tot->vDesc = number_format($sale['discount'], 2, '.', '');
        $tot->vII = 0.00;
        $tot->vIPI = 0.00;
        $tot->vIPIDevol = 0.00;
        $tot->vPIS = 0.00;
        $tot->vCOFINS = 0.00;
        $tot->vOutro = 0.00;
        $tot->vNF = number_format($sale['total_amount'], 2, '.', '');
        // Não enviamos vTotTrib para evitar Rejeição 685 por diferença de arredondamento

        $nfe->tagICMSTot($tot);

        // Transporte (transp)
        $transp = new \stdClass();
        $transp->modFrete = 9; // 9-Sem Frete
        $nfe->tagtransp($transp);

        // Pagamento (pag)
        $pag = new \stdClass();
        $pag->vTroco = 0.00;
        $nfe->tagpag($pag);

        $detpag = new \stdClass();
        $detpag->indPag = 0; // 0-À Vista
        
        // Mapear tPag conforme payment_method da venda
        $metodoRecebido = strtolower($sale['payment_method'] ?? 'dinheiro');
        $tPag = '01'; // Default Dinheiro
        if (strpos($metodoRecebido, 'pix') !== false) {
            $tPag = '17';
        } elseif (strpos($metodoRecebido, 'debito') !== false || strpos($metodoRecebido, 'débito') !== false) {
            $tPag = '04';
        } elseif (strpos($metodoRecebido, 'credito') !== false || strpos($metodoRecebido, 'crédito') !== false) {
            $tPag = '03';
        } elseif (strpos($metodoRecebido, 'boleto') !== false) {
            $tPag = '15';
        } elseif (strpos($metodoRecebido, 'conta') !== false || strpos($metodoRecebido, 'fiado') !== false) {
            $tPag = '99'; // Outros
        }

        $detpag->tPag = $tPag;
        $detpag->vPag = number_format($sale['total_amount'], 2, '.', '');
        $nfe->tagdetpag($detpag);

        // Informações Adicionais (infAdic)
        $infAdic = new \stdClass();
        $mensagensAdicionais = [];

        // Mensagem Simples Nacional
        if ($this->config['ambiente'] == 1 || $this->config['ambiente'] == 2) { // Regra aplica-se indep de ambiente
             $mensagensAdicionais[] = "DOCUMENTO EMITIDO POR ME OU EPP OPTANTE PELO SIMPLES NACIONAL. NAO GERA DIREITO A CREDITO FISCAL DE IPI.";
        }

        // Mensagem Lei da Transparência
        if ($vTotTribGeral > 0) {
            $valorTribFormatado = number_format($vTotTribGeral, 2, ',', '.');
            // Calcula alíquota média real da nota
            $totalVenda = (float)$sale['total_amount'];
            $percMedioReal = ($totalVenda > 0) ? ($vTotTribGeral / $totalVenda) * 100 : 0;
            $percTribFormatado = number_format($percMedioReal, 2, ',', '.');
            $mensagensAdicionais[] = "Val Aprox Tributos R$ {$valorTribFormatado} ({$percTribFormatado}%) Fonte: IBPT";
        }

        if (count($mensagensAdicionais) > 0) {
            $infCplTexto = implode(" ", $mensagensAdicionais);
            $infAdic->infCpl = $infCplTexto . " Venda realizada no sistema.";
            $nfe->taginfAdic($infAdic);
        } else {
            $infAdic->infCpl = 'Venda realizada no sistema.';
            $nfe->taginfAdic($infAdic);
        }

        $xml = $nfe->getXML();
        
        // Assinar
        $xmlAssinado = $tools->signNFe($xml);

        return [
            'xml' => $xmlAssinado,
            'nNF' => $ide->nNF,
            'serie' => $ide->serie
        ];
    }

    public function transmit($xml, $model = '55') {
        $tools = $this->getTools();
        $tools->model($model);
        
        $idLote = str_pad(1, 15, '0', STR_PAD_LEFT);
        
        // Envio síncrono para obter o recibo/protocolo na mesma requisição
        $resp = $tools->sefazEnviaLote([$xml], (int)$idLote, 1);
        
        $st = new \NFePHP\NFe\Common\Standardize();
        $std = $st->toStd($resp);

        // Se processou o lote com protocolo atrelado
        if (isset($std->protNFe)) {
            $protStat = (int) $std->protNFe->infProt->cStat;
            if ($protStat === 100) {
                // 100 - Autorizado o uso da NFe
                $xmlFinal = Complements::toAuthorize($xml, $resp);
                return [
                    'success' => true,
                    'xml' => $xmlFinal,
                    'protocol' => (string) $std->protNFe->infProt->nProt,
                    'status' => $protStat,
                    'motivo' => (string) $std->protNFe->infProt->xMotivo
                ];
            } else {
                throw new Exception("Rejeição SEFAZ: [{$protStat}] " . $std->protNFe->infProt->xMotivo);
            }
        } 
        
        // Se falhou no processamento do lote como um todo
        if (isset($std->cStat) && $std->cStat != 104) {
            throw new Exception("Erro de Lote SEFAZ: [{$std->cStat}] {$std->xMotivo}");
        }

        throw new Exception("Retorno inesperado da SEFAZ na transmissão.");
    }

    public function cancelarNFe($xml, $justificativa, $model = '55') {
        $tools = $this->getTools();
        $tools->model($model);

        // Extrai a chave de acesso e protocolo
        $xmlObj = simplexml_load_string($xml);
        if (!$xmlObj) {
            throw new Exception("Falha ao ler o conteúdo do XML da nota. O arquivo pode estar corrompido ou vazio.");
        }
        $xmlObj->registerXPathNamespace('ns', 'http://www.portalfiscal.inf.br/nfe');
        
        $chNodes = $xmlObj->xpath('//ns:protNFe/ns:infProt/ns:chNFe');
        $protNodes = $xmlObj->xpath('//ns:protNFe/ns:infProt/ns:nProt');
        
        $chNFe = $chNodes ? (string)$chNodes[0] : null;
        $nProt = $protNodes ? (string)$protNodes[0] : null;

        if (empty($chNFe) || empty($nProt)) {
            throw new Exception("XML inválido: Chave de acesso ou Protocolo não encontrados. A nota precisa estar previamente autorizada para ser cancelada.");
        }

        // Tenta realizar o cancelamento
        $resp = $tools->sefazCancela($chNFe, $justificativa, $nProt);

        $st = new \NFePHP\NFe\Common\Standardize();
        $std = $st->toStd($resp);

        if (isset($std->retEvento->infEvento)) {
            $cStat = (int)$std->retEvento->infEvento->cStat;
            // 135: Evento registrado e vinculado, 155: Cancelamento fora do prazo regulamentar (mas homologado)
            if ($cStat === 135 || $cStat === 155) {
                return [
                    'success' => true,
                    'xml' => $resp,
                    'status' => $cStat,
                    'motivo' => (string)$std->retEvento->infEvento->xMotivo
                ];
            } else {
                throw new Exception("Rejeição SEFAZ ao Cancelar: [{$cStat}] " . $std->retEvento->infEvento->xMotivo);
            }
        }
        
        if (isset($std->cStat) && $std->cStat != 128) { // 128 = Lote Evento Processado
            throw new Exception("Erro de Lote SEFAZ (Cancelamento): [{$std->cStat}] {$std->xMotivo}");
        }

        throw new Exception("Retorno inesperado da SEFAZ na tentativa de cancelamento.");
    }

    public function generateDanfe($xml, $model = '55') {
        if ($model == '55') {
            $danfe = new Danfe($xml);
            return $danfe->render();
        } else {
            // Para NFC-e, geralmente usa-se bobina (margens menores)
            $danfe = new Danfce($xml);
            return $danfe->render();
        }
    }

    private function getCUF($uf) {
        $ufs = [
            'RO' => 11, 'AC' => 12, 'AM' => 13, 'RR' => 14, 'PA' => 15, 'AP' => 16, 'TO' => 17,
            'MA' => 21, 'PI' => 22, 'CE' => 23, 'RN' => 24, 'PB' => 25, 'PE' => 26, 'AL' => 27,
            'SE' => 28, 'BA' => 29, 'MG' => 31, 'ES' => 32, 'RJ' => 33, 'SP' => 35, 'PR' => 41,
            'SC' => 42, 'RS' => 43, 'MS' => 50, 'MT' => 51, 'GO' => 52, 'DF' => 53
        ];
        return $ufs[strtoupper($uf)] ?? 35;
    }
}
