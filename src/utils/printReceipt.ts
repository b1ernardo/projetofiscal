// ============================================================
// utils/printReceipt.ts – Gerador de Comprovantes
// ============================================================

export interface ReceiptData {
  saleNumber: string | number;
  cart: any[];
  total: number;
  discount: number;
  payments: { methodName: string; amount: number }[];
  date: Date;
  customerName?: string;
  customerDocument?: string;
  fiscal?: {
    id: string;
    tipo: 'NFE' | 'NFCE';
    numero: number;
    serie: number;
    chave: string;
    protocolo: string;
    status: string;
    fiscal_date: string;
    qrCode?: string;
    urlConsulta?: string;
  };
}

export interface QuoteData {
  customerName: string;
  customerDocument?: string;
  cart: any[];
  total: number;
  discount: number;
  date: Date;
  validityDays: number;
  observations?: string;
  sellerName?: string;
}

export interface DeliveryData {
  orderNumber: string;
  customerName: string;
  customerDocument?: string;
  customerPhone: string;
  address: string;
  type: string;
  paymentMethod: string;
  items: any[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  changeFor?: number;
  date: Date;
}

export interface ServiceOrderData {
  id: string;
  so_number?: string;
  customerName: string;
  customerDocument?: string;
  customerPhone: string;
  itemType: string;
  itemMake: string;
  itemModel?: string;
  itemIdentifier: string;
  itemColor?: string;
  itemCondition?: string;
  accessories?: string;
  problemReported: string;
  problemFound: string;
  servicePerformed: string;
  status: string;
  priority: string;
  entryDate: Date;
  expectedDelivery: Date;
  services: any[];
  items: any[];
  laborTotal: number;
  partsTotal: number;
  discount: number;
  totalAmount: number;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const getApiUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || '';
  if (apiUrl) return apiUrl.replace(/\/$/, '');
  
  const base = import.meta.env.BASE_URL === './' ? '' : import.meta.env.BASE_URL;
  return `${window.location.origin}${base.replace(/\/$/, '')}/api`;
};

const getCompanyData = async () => {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) return null;
    const response = await fetch(`${getApiUrl()}/fiscal/config`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.ok) return await response.json();
  } catch (e) {
    console.error('Failed to fetch company data', e);
  }
  return null;
};

const resolveCompany = async () => {
  const c = await getCompanyData();
  const companyName = c?.razao_social || c?.nome_fantasia || 'Empresa';
  const companyAddress = c
    ? `${c.logradouro || ''}, ${c.numero || ''} - ${c.bairro || ''} - ${c.municipio || ''}-${c.uf || ''}`
    : '';
  const companyCnpjIe = c ? `CNPJ: ${c.cnpj || ''} | IE: ${c.ie || ''}` : '';
  const logoSrc: string | null = c?.logo_base64
    ? c.logo_base64.startsWith('data:')
      ? c.logo_base64
      : `data:image/png;base64,${c.logo_base64}`
    : null;
  return { companyName, companyAddress, companyCnpjIe, logoSrc };
};

const executeSilentPrint = (html: string) => {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(iframe);
  if (iframe.contentWindow) {
    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(html);
    iframe.contentWindow.document.close();
    iframe.contentWindow.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); }, 5000);
    }, 250);
  } else {
    if (document.body.contains(iframe)) document.body.removeChild(iframe);
  }
};

// ── WhatsApp URLs ──────────────────────────────────────────────────────────
export const getWhatsappUrl = async (data: ReceiptData) => {
  const { companyName } = await resolveCompany();
  const { saleNumber, cart, total, discount, payments, date, customerName, customerDocument } = data;
  const subtotal = cart.reduce((a, i) => a + i.price * i.quantity, 0);
  let t = `*COMPROVANTE DE VENDA*\n*${companyName}*\n`;
  t += `Venda #${saleNumber}\nData: ${new Date(date).toLocaleString('pt-BR')}\n`;
  if (customerName) t += `Cliente: ${customerName}${customerDocument ? ` - CPF/CNPJ: ${customerDocument}` : ''}\n`;
  t += `--------------------------------\n`;
  cart.forEach(i => { t += `${i.quantity}x ${(i.name || '').substring(0, 20)} - ${formatCurrency(i.price * i.quantity)}\n`; });
  t += `--------------------------------\nSubtotal: ${formatCurrency(subtotal)}\n`;
  if (discount > 0) t += `Desconto: ${formatCurrency(discount)}\n`;
  t += `*Total: ${formatCurrency(total)}*\n\n*Pagamento(s)*\n`;
  payments.forEach(p => { t += `${p.methodName}: ${formatCurrency(p.amount)}\n`; });
  t += `\nObrigado pela preferência!`;
  return `https://wa.me/?text=${encodeURIComponent(t)}`;
};

export const getQuoteWhatsappUrl = async (data: QuoteData) => {
  const { companyName } = await resolveCompany();
  const { customerName, customerDocument, cart, total, discount, date, validityDays, observations } = data;
  const subtotal = cart.reduce((a, i) => a + i.price * i.quantity, 0);
  let t = `*ORÇAMENTO*\n*${companyName}*\n`;
  t += `Cliente: ${customerName}${customerDocument ? ` - CPF/CNPJ: ${customerDocument}` : ''}\nData: ${new Date(date).toLocaleDateString('pt-BR')}\nValidade: ${validityDays} dias\n`;
  t += `--------------------------------\n`;
  cart.forEach(i => { t += `${i.quantity}x ${(i.name || '').substring(0, 20)} - ${formatCurrency(i.price * i.quantity)}\n`; });
  t += `--------------------------------\nSubtotal: ${formatCurrency(subtotal)}\n`;
  if (discount > 0) t += `Desconto: ${formatCurrency(discount)}\n`;
  t += `*Total: ${formatCurrency(total)}*\n`;
  if (observations) t += `\n*Obs:* ${observations}\n`;
  t += `\nObrigado pela preferência! Sujeito a alteração de preços.`;
  return `https://wa.me/?text=${encodeURIComponent(t)}`;
};

// ── Comanda (Cozinha/Bar) ──────────────────────────────────────────────────
export const printComandaItem = (comandaId: string, itemName: string, quantity: number, observation?: string) => {
  const date = new Date().toLocaleString('pt-BR');
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
    <style>body{font-family:'Courier New',monospace;font-size:15px;font-weight:bold;margin:0;padding:10px;max-width:300px;color:#000}
    @media print{@page{margin:0}body{margin:0;padding:10px}}.text-center{text-align:center}
    .divider{border-top:1px dashed #000;margin:10px 0}</style></head><body>
    <div class="text-center"><strong style="font-size:18px">NOVO PEDIDO</strong></div>
    <div class="divider"></div>
    <div><strong>Comanda:</strong> ${comandaId}<br/><strong>Data/Hora:</strong> ${date}</div>
    <div class="divider"></div>
    <div style="font-size:16px"><strong>${quantity}x ${itemName}</strong></div>
    ${observation ? `<div style="margin-top:5px"><strong>Obs:</strong> ${observation}</div>` : ''}
    <div class="divider"></div>
    <div class="text-center">-- Cozinha/Bar --</div>
    </body></html>`;
  executeSilentPrint(html);
};

export const printComandaBatch = (comandaId: string, items: any[], mesa?: string) => {
  const date = new Date().toLocaleString('pt-BR');
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
    <style>body{font-family:'Courier New',monospace;font-size:15px;font-weight:bold;margin:0;padding:10px;max-width:300px;color:#000}
    @media print{@page{margin:0}body{margin:0;padding:10px}}.text-center{text-align:center}
    .divider{border-top:1px dashed #000;margin:10px 0}</style></head><body>
    <div class="text-center"><strong style="font-size:18px">NOVO PEDIDO</strong></div>
    <div class="divider"></div>
    <div><strong>Local:</strong> ${mesa || comandaId}<br/><strong>Data/Hora:</strong> ${date}</div>
    <div class="divider"></div>
    <div style="font-size:15px">${items.map(i => `<div style="margin-bottom:5px"><strong>${i.quantity}x ${i.name}</strong>${i.observation ? `<br/><small>Obs: ${i.observation}</small>` : ''}</div>`).join('')}</div>
    <div class="divider"></div><div class="text-center">-- Cozinha/Bar --</div>
    </body></html>`;
  executeSilentPrint(html);
};

// ── Comprovante de Venda (Bobina 80mm) ────────────────────────────────────
export const printReceipt = async (data: ReceiptData, preOpenedWindow?: Window | null) => {
  const printWindow = preOpenedWindow ?? window.open('', '_blank', 'width=420,height=700');
  if (!printWindow) return;

  // Exibe mensagem de carregamento imediatamente para evitar tela branca
  printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Carregando...</title></head>
    <body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f9fafb">
      <div style="text-align:center;color:#555">
        <div style="width:40px;height:40px;border:4px solid #e5e7eb;border-top:4px solid #16a34a;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 12px"></div>
        <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
        <p style="font-size:14px">Carregando cupom fiscal...</p>
      </div>
    </body></html>`);
  printWindow.document.close();

  const { companyName, companyAddress, companyCnpjIe, logoSrc } = await resolveCompany();
  const whatsappUrl = await getWhatsappUrl(data);
  const { saleNumber, cart, total, discount, payments, date, fiscal, customerName, customerDocument } = data;
  const totalItems = cart.reduce((a, i) => a + Number(i.quantity), 0);
  const subtotal = cart.reduce((a, i) => a + i.price * i.quantity, 0);

  const isFiscal = fiscal && fiscal.tipo === 'NFCE' && (fiscal.status === 'generated' || fiscal.status === 'autorizada' || fiscal.status === 'Autorizada');
  const qrCodeUrl = fiscal?.qrCode 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(fiscal.qrCode)}`
    : null;

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
  <title>Venda #${saleNumber}</title>
  <style>
    body{font-family:'Courier New',monospace;font-size:13px;font-weight:bold;margin:0;padding:0;max-width:300px;color:#000;background:#fff}
    @media print{@page{margin:0}body{margin:0;padding:5px}.no-print{display:none!important}}
    .tc{text-align:center}.tr{text-align:right}.tl{text-align:left}
    .dv{border-top:1px dashed #000;margin:5px 0}
    .dv-double{border-top:1px dashed #000;border-bottom:1px dashed #000;padding:2px 0;margin:5px 0}
    table{width:100%;border-collapse:collapse;margin:5px 0}
    th,td{padding:2px 0;vertical-align:top}
    .font-bold{font-weight:bold}
    .text-sm{font-size:9px}
    .text-xs{font-size:8px}
  </style></head><body>
  <div class="no-print" style="text-align:center;padding:10px;background:#f4f4f5;border-bottom:2px solid #e4e4e7;position:sticky;top:0">
    <button onclick="window.print()" style="padding:8px 16px;background:#16a34a;color:white;border:none;border-radius:4px;font-weight:bold;cursor:pointer">🖨️ Imprimir</button>
    <button onclick="window.open('${whatsappUrl}','_blank')" style="padding:8px 16px;background:#25D366;color:white;border:none;border-radius:4px;font-weight:bold;cursor:pointer;margin-left:8px">💬 WhatsApp</button>
    <button onclick="window.close()" style="padding:8px 16px;background:#ef4444;color:white;border:none;border-radius:4px;font-weight:bold;cursor:pointer;margin-left:8px">✕ Fechar</button>
  </div>
  
  <div class="tc" style="margin-top:10px">
    ${logoSrc ? `<img src="${logoSrc}" style="width:120px;max-height:80px;object-fit:contain" onerror="this.style.display='none'"/>` : ''}
    <div style="line-height:1.4;margin-top:5px">
      <strong style="font-size:16px">${companyName}</strong><br/>
      <span style="font-size:12px">${companyAddress}</span><br/>
      <span style="font-size:12px">${companyCnpjIe}</span>
    </div>
  </div>

  ${isFiscal ? `
    <div class="dv"></div>
    <div class="tc font-bold" style="font-size:10px;line-height:1.2">
      DANFE NFC-e - DOCUMENTO AUXILIAR DA NOTA FISCAL DE CONSUMIDOR ELETRÔNICA
    </div>
  ` : `
    <div class="dv"></div>
    <div class="tc font-bold" style="font-size:12px">Documento Não Fiscal</div>
  `}

  <div class="dv"></div>
  <table>
    <thead>
      <tr style="border-bottom:1px dashed #000">
        <th class="tl" style="width:5%">#</th>
        <th class="tl" style="width:25%">CÓDIGO</th>
        <th class="tl">DESCRIÇÃO</th>
      </tr>
      <tr style="border-bottom:1px dashed #000">
        <th colspan="3" class="tr">
          <span style="display:inline-block;width:25%;text-align:right">QTDE. UN.</span>
          <span style="display:inline-block;width:25%;text-align:right">VL.UNIT.</span>
          <span style="display:inline-block;width:25%;text-align:right">VL.TOTAL</span>
        </th>
      </tr>
    </thead>
    <tbody>
      ${cart.map((i, index) => `
        <tr>
          <td class="tl">${index + 1}</td>
          <td class="tl">${(i.code || i.product_code || '---').substring(0, 13)}</td>
          <td class="tl">${(i.name || 'Produto').toUpperCase()}</td>
        </tr>
        <tr>
          <td colspan="3" class="tr">
            <span style="display:inline-block;width:25%;text-align:right">${i.quantity} ${i.unit || 'UN'}</span>
            <span style="display:inline-block;width:25%;text-align:right">${Number(i.price).toFixed(2)}</span>
            <span style="display:inline-block;width:25%;text-align:right">${(i.price * i.quantity).toFixed(2)}</span>
          </td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="dv"></div>
  <div style="line-height:1.4">
    <div style="display:flex;justify-content:space-between">
      <span>Qtde. Total de Itens</span>
      <span class="font-bold">${totalItems}</span>
    </div>
    <div style="display:flex;justify-content:space-between">
      <span>Valor Total R$</span>
      <span class="font-bold">${Number(total).toFixed(2)}</span>
    </div>
    <div class="dv"></div>
    <div style="display:flex;justify-content:space-between;font-weight:bold">
      <span>FORMA DE PAGAMENTO</span>
      <span>VALOR PAGO</span>
    </div>
    ${payments.map(p => `
      <div style="display:flex;justify-content:space-between">
        <span>${p.methodName.toUpperCase()}</span>
        <span>${Number(p.amount).toFixed(2)}</span>
      </div>
    `).join('')}
  </div>

  ${isFiscal ? `
    <div class="dv"></div>
    <div class="tc text-sm">
      <div class="font-bold">Consulte pela Chave de Acesso em</div>
      <div class="text-xs" style="word-break:break-all;text-decoration:underline;margin:2px 0">
        ${fiscal!.urlConsulta || 'http://www.sefaz.uf.gov.br/nfce/consulta'}
      </div>
      <div class="font-bold" style="letter-spacing:1px;margin:3px 0">${(fiscal!.chave || '').replace(/(.{4})/g, '$1 ')}</div>
    </div>
    <div class="dv"></div>
    <div class="tc font-bold">${customerName ? customerName.toUpperCase() : 'CONSUMIDOR NÃO IDENTIFICADO'}</div>
    ${customerDocument ? `<div class="tc" style="font-size:10px;margin-top:2px">CPF/CNPJ: ${customerDocument}</div>` : ''}
    <div class="dv"></div>
    <div class="tc text-sm">
      <strong>NFC-e nº ${fiscal!.numero}</strong> &nbsp; <strong>Série ${fiscal!.serie}</strong> &nbsp; <strong>${new Date(fiscal!.fiscal_date || new Date()).toLocaleString('pt-BR')}</strong><br/>
      Protocolo de autorização: ${fiscal!.protocolo || 'N/A'}<br/>
      Data de autorização: ${new Date(fiscal!.fiscal_date || new Date()).toLocaleString('pt-BR')}
    </div>
    <div class="dv"></div>
    <div class="tc" style="margin:10px 0">
      ${qrCodeUrl ? `<img src="${qrCodeUrl}" style="width:140px;height:140px"/>` : ''}
    </div>
  ` : `
    <div class="dv"></div>
    <div class="tc" style="font-size:10px">Documento sem valor fiscal</div>
    ${customerName ? `<div class="tc font-bold" style="font-size:10px;margin-top:2px">CLIENTE: ${customerName.toUpperCase()}${customerDocument ? `<br/>CPF/CNPJ: ${customerDocument}` : ''}</div>` : ''}
    <div class="dv"></div>
  `}

  <div class="tc text-xs" style="margin-top:10px;line-height:1.2">
    Tributos totais incidentes (Lei Federal 12.741/2012)<br/>
    OBRIGADO PELA PREFERÊNCIA!
  </div>
  </body></html>`;

  // Usa Blob URL — método mais confiável para escrever HTML após operações assíncronas
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  printWindow.location.replace(blobUrl);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
};

// ── Comprovante A4 (2 vias) ───────────────────────────────────────────────
export const printReceiptA4 = async (data: ReceiptData) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  const { companyName, companyAddress, companyCnpjIe, logoSrc } = await resolveCompany();
  const whatsappUrl = await getWhatsappUrl(data);
  const { customerName, customerDocument } = data;
  const subtotal = data.cart.reduce((a, i) => a + i.price * i.quantity, 0);

  const renderCopy = (via: string) => `
    <div class="copy">
      <div class="via-badge">${via}</div>
      <div class="hdr">
        <div style="display:flex;gap:12px;align-items:center">
          ${logoSrc ? `<img src="${logoSrc}" style="width:55px;height:55px;object-fit:contain" onerror="this.style.display='none'"/>` : ''}
          <div>
            <div style="font-size:13pt;font-weight:900;color:#003366">${companyName}</div>
            <div style="font-size:8pt;color:#555;margin-top:2px">${companyAddress}</div>
            <div style="font-size:8pt;color:#555">${companyCnpjIe}</div>
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-size:13pt;font-weight:900">COMPROVANTE DE VENDA</div>
          <div style="font-size:9pt;margin-top:3px"><b>#${data.saleNumber}</b> &nbsp;|&nbsp; ${new Date(data.date).toLocaleString('pt-BR')}</div>
          ${customerName ? `<div style="font-size:9pt;margin-top:2px">Cliente: <b>${customerName}</b>${customerDocument ? `<br/><span style="font-size:8pt">CPF/CNPJ: ${customerDocument}</span>` : ''}</div>` : ''}
        </div>
      </div>
      <table>
        <thead><tr>
          <th class="tl">Produto</th>
          <th class="tc" style="width:50px">Qtd</th>
          <th class="tr" style="width:80px">Unit.</th>
          <th class="tr" style="width:90px">Total</th>
        </tr></thead>
        <tbody>${data.cart.map(i => `<tr><td class="tl">${i.name || 'Produto'}</td><td class="tc">${i.quantity}</td><td class="tr">${Number(i.price).toFixed(2)}</td><td class="tr">${(i.price * i.quantity).toFixed(2)}</td></tr>`).join('')}</tbody>
      </table>
      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:8px">
        <div style="font-size:8.5pt;color:#444">
          ${data.payments.map(p => `<div>${p.methodName}: <b>${formatCurrency(p.amount)}</b></div>`).join('')}
        </div>
        <div style="text-align:right;font-size:9pt">
          <div>Subtotal: <b>${formatCurrency(subtotal)}</b></div>
          ${data.discount > 0 ? `<div>Desconto: <b>${formatCurrency(data.discount)}</b></div>` : ''}
          <div style="font-size:14pt;font-weight:900;color:#000;margin-top:3px">TOTAL: ${formatCurrency(data.total)}</div>
        </div>
      </div>
      <div class="sig-area">
        <div class="sig-line">Assinatura do Cliente: ___________________________________</div>
        <div class="sig-line">Recebido em: ______ / ______ / __________</div>
      </div>
    </div>`;

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Venda #${data.saleNumber} - A4</title>
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10pt; font-weight: bold; color: #333; margin: 0; padding: 0; background: #fff; }
    .copy { width: 210mm; padding: 9mm 14mm 6mm; overflow: hidden; position: relative; }
    .via-badge { position: absolute; top: 9mm; right: 14mm; font-size: 7pt; font-weight: 900; color: #555; text-transform: uppercase; letter-spacing: 1px; border: 1px solid #999; padding: 2px 7px; border-radius: 3px; }
    .hdr { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #334155; padding-bottom: 7px; margin-top: 7mm; margin-bottom: 8px; padding-right: 110px; }
    table { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 9pt; }
    th { background: #f1f5f9; color: #475569; font-weight: 900; text-transform: uppercase; font-size: 8pt; padding: 5px 7px; border: 1px solid #dde; }
    td { padding: 4px 7px; border: 1px solid #dde; }
    .tl { text-align: left; } .tc { text-align: center; } .tr { text-align: right; }
    .sig-area { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 14px; border-top: 1px solid #ccc; padding-top: 8px; }
    .sig-line { font-size: 8.5pt; color: #444; padding-bottom: 12px; }
    .cut-line { text-align: center; font-size: 8.5pt; color: #777; letter-spacing: 3px; font-family: monospace; margin: 0; padding: 4px 0; border-top: 1.5px dashed #999; border-bottom: 1.5px dashed #999; }
    .no-print { position: fixed; top: 0; left: 0; right: 0; background: #0f172a; padding: 10px; display: flex; justify-content: center; gap: 12px; z-index: 1000; }
    .btn { padding: 8px 18px; border: none; border-radius: 5px; font-weight: bold; cursor: pointer; font-size: 13px; }
    @media print { .no-print { display: none !important; } body { margin: 0; } }
  </style></head><body>
  <div class="no-print">
    <button class="btn" style="background:#16a34a;color:white" onclick="window.print()">🖨️ IMPRIMIR A4 (2 VIAS)</button>
    <button class="btn" style="background:#25D366;color:white" onclick="window.open('${whatsappUrl}','_blank')">💬 WHATSAPP</button>
    <button class="btn" style="background:#ef4444;color:white" onclick="window.close()">✕ FECHAR</button>
  </div>
  ${renderCopy('1ª VIA — ESTABELECIMENTO')}
  <div class="cut-line">✂ - - - - - - - - - - - RECORTE AQUI - - - - - - - - - - - ✂</div>
  ${renderCopy('2ª VIA — CLIENTE')}
  </body></html>`;
  printWindow.document.open(); printWindow.document.write(html); printWindow.document.close();
};

// ── Orçamento Bobina ──────────────────────────────────────────────────────
export const printQuote = async (data: QuoteData) => {
  const printWindow = window.open('', '_blank', 'width=420,height=700');
  if (!printWindow) return;
  const { companyName, companyAddress, companyCnpjIe, logoSrc } = await resolveCompany();
  const whatsappUrl = await getQuoteWhatsappUrl(data);
  const { customerName, customerDocument, cart, total, discount, date, validityDays, observations } = data;
  const totalItems = cart.reduce((a, i) => a + Number(i.quantity), 0);
  const subtotal = cart.reduce((a, i) => a + i.price * i.quantity, 0);
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Orçamento - ${customerName}</title>
  <style>body{font-family:'Courier New',monospace;font-size:13px;font-weight:bold;margin:0;padding:0;max-width:300px;color:#000}
  @media print{@page{margin:0}body{margin:0;padding:0}.no-print{display:none!important}}
  .tc{text-align:center}.tr{text-align:right}.tl{text-align:left}
  .dv{border-top:1px dashed #000;margin:5px 0}
  table{width:100%;border-collapse:collapse;margin:5px 0}th,td{padding:2px 0;vertical-align:top}</style></head><body>
  <div class="no-print" style="text-align:center;padding:10px;background:#f4f4f5;border-bottom:2px solid #e4e4e7;position:sticky;top:0">
    <button onclick="window.print()" style="padding:8px 16px;background:#16a34a;color:white;border:none;border-radius:4px;font-weight:bold;cursor:pointer">🖨️ Imprimir</button>
    <button onclick="window.open('${whatsappUrl}','_blank')" style="padding:8px 16px;background:#25D366;color:white;border:none;border-radius:4px;font-weight:bold;cursor:pointer;margin-left:8px">💬 WhatsApp</button>
  </div>
  <div style="display:flex;align-items:center;gap:10px;margin:8px 4px">
    ${logoSrc ? `<img src="${logoSrc}" style="width:55px;height:55px;object-fit:contain" onerror="this.style.display='none'"/>` : ''}
    <div style="line-height:1.3">
      <strong style="font-size:16px;color:#003366">${companyName}</strong><br/>
      <span style="font-size:12px;color:#003366">${companyAddress}<br/>${companyCnpjIe}</span>
    </div>
  </div>
  <div class="tc"><strong style="font-size:17px">O R Ç A M E N T O</strong></div>
  <div class="dv"></div>
  <div style="font-size:11px">Cliente: ${customerName}${customerDocument ? `<br/>CPF/CNPJ: ${customerDocument}` : ''}<br/>Data: ${new Date(date).toLocaleDateString('pt-BR')}<br/>Validade: ${validityDays} dias</div>
  <div class="dv"></div>
  <table><thead><tr style="border-bottom:1px dashed #000">
    <th class="tl">Descrição</th><th class="tr">Qtde</th><th class="tr">Unit.</th><th class="tr">Total</th>
  </tr></thead><tbody>
    ${cart.map(i=>`<tr><td class="tl">${(i.name||'Produto').substring(0,18)}</td><td class="tr">${i.quantity}</td><td class="tr">${Number(i.price).toFixed(2)}</td><td class="tr">${(i.price*i.quantity).toFixed(2)}</td></tr>`).join('')}
  </tbody></table>
  <div class="dv"></div>
  ${observations?`<div style="font-size:10px;margin-bottom:5px"><strong>Obs:</strong> ${observations}</div><div class="dv"></div>`:''}
  <div class="tr">Itens: <strong>${totalItems}</strong><br/>Subtotal: ${formatCurrency(subtotal)}<br/>Desconto: ${formatCurrency(discount)}<br/><strong style="font-size:14px">Total: ${formatCurrency(total)}</strong></div>
  <div class="dv"></div>
  <div class="tc" style="margin-top:10px;font-size:10px">Este documento não é nota fiscal.<br/>Preços sujeitos a alteração.</div>
  </body></html>`;
  printWindow.document.open(); printWindow.document.write(html); printWindow.document.close();
};

// ── Orçamento A4 ──────────────────────────────────────────────────────────
export const printQuoteA4 = async (data: QuoteData) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  const { companyName, companyAddress, companyCnpjIe, logoSrc } = await resolveCompany();
  const whatsappUrl = await getQuoteWhatsappUrl(data);
  const subtotal = data.cart.reduce((a, i) => a + Number(i.price) * Number(i.quantity), 0);
  
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
  <title>Orçamento - ${data.customerName}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; font-size: 14px; font-weight: bold; color: #1e293b; margin: 0; padding: 0; background: #fff; line-height: 1.5; }
    .page { max-width: 210mm; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 2px solid #334155; margin-bottom: 30px; }
    .company-info { display: flex; gap: 20px; align-items: center; }
    .company-logo { width: 90px; height: 90px; object-fit: contain; }
    .company-details h1 { margin: 0; font-size: 22px; color: #0f172a; text-transform: uppercase; letter-spacing: -0.5px; }
    .company-details p { margin: 2px 0; font-size: 11px; color: #64748b; }
    
    .doc-title { text-align: right; }
    .doc-title h2 { margin: 0; font-size: 28px; font-weight: 900; color: #334155; letter-spacing: 2px; }
    .doc-title p { margin: 5px 0; font-weight: bold; font-size: 12px; }

    .grid-info { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; margin-bottom: 30px; }
    .info-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; background: #f8fafc; }
    .info-box h3 { margin: 0 0 10px; font-size: 10px; font-weight: 900; text-transform: uppercase; color: #64748b; letter-spacing: 1px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }
    .info-box p { margin: 4px 0; font-size: 13px; }
    .info-label { font-weight: bold; color: #475569; width: 80px; display: inline-block; }

    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
    th { background: #f1f5f9; color: #475569; font-weight: 900; text-transform: uppercase; font-size: 10px; padding: 12px 10px; border: 1px solid #e2e8f0; text-align: left; }
    td { padding: 10px; border: 1px solid #e2e8f0; }
    .tr { text-align: right; }
    .tc { text-align: center; }
    .font-bold { font-weight: bold; }

    .summary { margin-top: 30px; display: flex; justify-content: space-between; align-items: flex-start; }
    .obs-box { flex: 1; max-width: 60%; font-size: 12px; color: #64748b; padding-right: 40px; }
    .obs-box strong { color: #334155; display: block; margin-bottom: 5px; }
    .totals { width: 250px; }
    .total-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 14px; }
    .total-row.final { border-top: 2px solid #334155; margin-top: 10px; padding-top: 10px; font-size: 20px; font-weight: 900; color: #0f172a; }

    .footer { margin-top: 60px; display: grid; grid-template-columns: 1fr 1fr; gap: 60px; }
    .signature { border-top: 1px solid #94a3b8; text-align: center; padding-top: 10px; font-size: 11px; color: #64748b; }
    
    .no-print { position: fixed; top: 0; left: 0; right: 0; background: #0f172a; padding: 15px; display: flex; justify-content: center; gap: 15px; z-index: 1000; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
    .btn { padding: 10px 20px; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 14px; transition: transform 0.1s; }
    .btn:active { transform: scale(0.98); }
    .btn-print { background: #3b82f6; color: white; }
    .btn-wa { background: #22c55e; color: white; }
    .btn-close { background: #ef4444; color: white; }
    
    @media print {
      .no-print { display: none !important; }
      body { padding: 0; }
      .container { border: none; box-shadow: none; padding: 0; }
    }
  </style>
  </head><body>
  <div class="no-print">
    <button class="btn btn-print" onclick="window.print()">🖨️ IMPRIMIR ORÇAMENTO</button>
    <button class="btn btn-wa" onclick="window.open('${whatsappUrl}','_blank')">💬 ENVIAR WHATSAPP</button>
    <button class="btn btn-close" onclick="window.close()">✕ FECHAR</button>
  </div>
  
  <div class="page" style="margin-top: 80px">
    <div class="header">
      <div class="company-info">
        ${logoSrc ? `<img src="${logoSrc}" class="company-logo" onerror="this.style.display='none'"/>` : ''}
        <div class="company-details">
          <h1>${companyName}</h1>
          <p>${companyAddress}</p>
          <p>${companyCnpjIe}</p>
        </div>
      </div>
      <div class="doc-title">
        <h2>ORÇAMENTO</h2>
        <p>Data: ${new Date(data.date).toLocaleDateString('pt-BR')}</p>
        <p>Validade: ${data.validityDays} dias</p>
      </div>
    </div>

    <div class="grid-info">
      <div class="info-box">
        <h3>Dados do Cliente</h3>
        <p><span class="info-label">Nome:</span> ${data.customerName}</p>
        ${data.customerDocument ? `<p><span class="info-label">CPF/CNPJ:</span> ${data.customerDocument}</p>` : ''}
      </div>
      <div class="info-box">
        <h3>Informações</h3>
        <p><span class="info-label">Vendedor:</span> ${data.sellerName || '—'}</p>
        <p><span class="info-label">Status:</span> Pendente</p>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 50px" class="tc">Item</th>
          <th class="tl">Descrição do Produto/Serviço</th>
          <th style="width: 80px" class="tc">Qtd</th>
          <th style="width: 100px" class="tr">Unitário</th>
          <th style="width: 120px" class="tr">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${data.cart.map((i, idx) => `
          <tr>
            <td class="tc text-muted-foreground">${idx + 1}</td>
            <td class="tl font-bold">${i.name || 'Produto'}</td>
            <td class="tc">${i.quantity}</td>
            <td class="tr">${formatCurrency(Number(i.price))}</td>
            <td class="tr font-bold">${formatCurrency(Number(i.price) * Number(i.quantity))}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="summary">
      <div class="obs-box">
        ${data.observations ? `<strong>Observações Importantes:</strong><p>${data.observations}</p>` : ''}
        <p style="font-size: 10px; margin-top: 20px">Preços e condições sujeitos a alteração sem aviso prévio. Este documento tem caráter informativo e não possui valor fiscal.</p>
      </div>
      <div class="totals">
        <div class="total-row">
          <span>Subtotal</span>
          <span>${formatCurrency(subtotal)}</span>
        </div>
        ${data.discount > 0 ? `
          <div class="total-row" style="color: #ef4444">
            <span>Desconto (-)</span>
            <span>${formatCurrency(data.discount)}</span>
          </div>
        ` : ''}
        <div class="total-row final">
          <span>TOTAL</span>
          <span>${formatCurrency(data.total)}</span>
        </div>
      </div>
    </div>

    <div class="footer">
      <div class="signature">
        <p><b>${companyName}</b></p>
        <p>Responsável</p>
      </div>
      <div class="signature">
        <p><b>${data.customerName}</b></p>
        <p>Aceite do Cliente</p>
      </div>
    </div>
  </div>
  </body></html>`;
  printWindow.document.open(); printWindow.document.write(html); printWindow.document.close();
};

// ── Delivery Bobina ───────────────────────────────────────────────────────
export const printDelivery = async (data: DeliveryData) => {
  const printWindow = window.open('', '_blank', 'width=420,height=700');
  if (!printWindow) return;
  const { companyName, companyAddress, companyCnpjIe, logoSrc } = await resolveCompany();
  const { orderNumber, customerName, customerDocument, customerPhone, address, type, paymentMethod, items, subtotal, deliveryFee, total, changeFor, date } = data;
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Pedido #${orderNumber}</title>
  <style>body{font-family:'Courier New',monospace;font-size:13px;font-weight:bold;margin:0;padding:0;max-width:300px;color:#000}
  @media print{@page{margin:0}body{margin:0;padding:0}.no-print{display:none!important}}
  .tc{text-align:center}.tr{text-align:right}.tl{text-align:left}
  .dv{border-top:1px dashed #000;margin:5px 0}
  table{width:100%;border-collapse:collapse;margin:5px 0}th,td{padding:2px 0;vertical-align:top}</style></head><body>
  <div class="no-print" style="text-align:center;padding:10px;background:#f4f4f5;border-bottom:2px solid #e4e4e7;position:sticky;top:0">
    <button onclick="window.print()" style="padding:8px 16px;background:#16a34a;color:white;border:none;border-radius:4px;font-weight:bold;cursor:pointer">🖨️ Imprimir</button>
  </div>
  <div style="display:flex;align-items:center;gap:10px;margin:8px 4px">
    <img src="${logoSrc}" style="width:55px;height:55px;object-fit:contain" onerror="this.style.display='none'"/>
    <div style="line-height:1.3">
      <strong style="font-size:16px;color:#003366">${companyName}</strong><br/>
      <span style="font-size:12px;color:#003366">${companyAddress}<br/>${companyCnpjIe}</span>
    </div>
  </div>
  <div class="tc"><strong style="font-size:14px">COMPROVANTE DE ${type==='retirada'?'RETIRADA':'ENTREGA'}</strong><br/>Pedido #${orderNumber}</div>
  <div class="dv"></div>
  <div style="font-size:11px">
    <strong>Data:</strong> ${new Date(date).toLocaleString('pt-BR')}<br/>
    <strong>Cliente:</strong> ${customerName}<br/>
    ${customerDocument ? `<strong>CPF/CNPJ:</strong> ${customerDocument}<br/>` : ''}
    <strong>Telefone:</strong> ${customerPhone}<br/>
    ${type==='entrega'?`<strong>Endereço:</strong> ${address}<br/>`:''}
  </div>
  <div class="dv"></div>
  <table><thead><tr style="border-bottom:1px dashed #000"><th class="tl">Qtd</th><th class="tl">Produto</th><th class="tr">Total</th></tr></thead>
  <tbody>${items.map(i=>`<tr><td class="tl">${i.quantity}</td><td class="tl">${(i.product_name||i.name||'Produto').substring(0,20)}</td><td class="tr">${formatCurrency(Number(i.unit_price)*Number(i.quantity))}</td></tr>`).join('')}</tbody></table>
  <div class="dv"></div>
  <div class="tr" style="font-size:11px">
    Subtotal: ${formatCurrency(subtotal)}<br/>
    ${type==='entrega'?`Taxa de Entrega: ${formatCurrency(deliveryFee)}<br/>`:''}
    <strong style="font-size:14px">TOTAL: ${formatCurrency(total)}</strong>
  </div>
  <div class="dv"></div>
  <div style="font-size:11px">
    <strong>Pagamento:</strong> ${paymentMethod}<br/>
    ${changeFor?`<strong>Troco para:</strong> ${formatCurrency(changeFor)}<br/><strong>Troco a levar:</strong> ${formatCurrency(changeFor-total)}`:''}
  </div>
  <div class="dv"></div>
  <div class="tc" style="margin-top:10px;font-size:10px">Documento sem valor fiscal</div>
  </body></html>`;
  printWindow.document.open(); printWindow.document.write(html); printWindow.document.close();
};

// ── Delivery A4 ───────────────────────────────────────────────────────────
export const printDeliveryA4 = async (data: DeliveryData) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  const { companyName, companyAddress, companyCnpjIe, logoSrc } = await resolveCompany();
  const { orderNumber, customerName, customerDocument, customerPhone, address, type, paymentMethod, items, subtotal, deliveryFee, total, changeFor, date } = data;
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Delivery #${orderNumber}</title>
  <style>body{font-family:'Segoe UI',Arial,sans-serif;font-size:14px;font-weight:bold;padding:20px;color:#333}
  .container{max-width:800px;margin:0 auto;border:1px solid #ddd;padding:20px;border-radius:8px}
  .header{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:20px}
  table{width:100%;border-collapse:collapse;margin-top:20px}
  th,td{border:1px solid #ddd;padding:10px;text-align:left}
  th{background:#f4f4f5;font-weight:bold}
  @media print{.no-print{display:none}.container{border:none}}</style></head><body>
  <div class="no-print" style="margin-bottom:20px">
    <button onclick="window.print()" style="padding:10px 20px;background:#16a34a;color:white;border:none;border-radius:4px;font-weight:bold;cursor:pointer">🖨️ IMPRIMIR A4</button>
    <button onclick="window.close()" style="padding:10px 20px;background:#ef4444;color:white;border:none;border-radius:4px;cursor:pointer;margin-left:8px">FECHAR</button>
  </div>
  <div class="container">
    <div class="header">
      <div style="display:flex;gap:15px;align-items:center">
        ${logoSrc ? `<img src="${logoSrc}" style="width:80px;height:80px;object-fit:contain" onerror="this.style.display='none'"/>` : ''}
        <div><h1 style="margin:0;color:#003366;font-size:18pt">${companyName}</h1>
             <p style="margin:5px 0 0 0;color:#555">${companyAddress} | ${companyCnpjIe}</p></div>
      </div>
      <div style="text-align:right"><h2 style="margin:0">PEDIDO ${type==='retirada'?'RETIRADA':'ENTREGA'}</h2><p><b>#${orderNumber}</b></p></div>
    </div>
    <div style="margin-bottom:20px;padding:15px;background:#f8fafc;border:1px solid #ddd;border-radius:6px">
      <h3 style="margin:0 0 8px">DADOS DA ${type==='retirada'?'RETIRADA':'ENTREGA'}</h3>
      <p style="margin:2px 0">Data: ${new Date(date).toLocaleString('pt-BR')}</p>
      <p style="margin:2px 0">Cliente: ${customerName}</p>
      ${customerDocument ? `<p style="margin:2px 0">CPF/CNPJ: ${customerDocument}</p>` : ''}
      <p style="margin:2px 0">Telefone: ${customerPhone}</p>
      ${type==='entrega'?`<p style="margin:2px 0">Endereço: ${address}</p>`:''}
    </div>
    <table><thead><tr><th>Qtd</th><th>Produto</th><th style="text-align:right">Total</th></tr></thead>
    <tbody>${items.map(i=>`<tr><td>${i.quantity}</td><td>${i.product_name||i.name||'Produto'}</td><td style="text-align:right">${formatCurrency(Number(i.unit_price)*Number(i.quantity))}</td></tr>`).join('')}</tbody></table>
    <div style="margin-top:20px;padding:15px;text-align:right;border-top:1px solid #ddd">
      <p>Subtotal: ${formatCurrency(subtotal)}</p>
      ${type==='entrega'?`<p>Taxa de Entrega: ${formatCurrency(deliveryFee)}</p>`:''}
      <h2 style="color:#000">TOTAL: ${formatCurrency(total)}</h2>
      <p>Forma de Pagamento: <b>${paymentMethod}</b></p>
      ${changeFor?`<p>Troco para: ${formatCurrency(changeFor)} | Troco a levar: ${formatCurrency(changeFor-total)}</p>`:''}
    </div>
  </div></body></html>`;
  printWindow.document.open(); printWindow.document.write(html); printWindow.document.close();
};

// ── OS Bobina ─────────────────────────────────────────────────────────────
export const printSO_A4 = async (data: ServiceOrderData) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  const { companyName, companyAddress, companyCnpjIe, logoSrc } = await resolveCompany();
  const { id, so_number, customerName, customerDocument, customerPhone, itemType, itemMake, itemModel, itemIdentifier, itemColor, itemCondition, accessories, problemReported, problemFound, servicePerformed, services, items, laborTotal, partsTotal, discount, totalAmount, status, priority, entryDate, expectedDelivery } = data;
  const osNum = so_number || id.slice(0,8).toUpperCase();

  const renderCopy = (via: string) => `
    <div class="copy">
      <div class="via">${via}</div>
      <div class="hdr">
        <div style="display:flex;gap:10px;align-items:center">
          ${logoSrc ? `<img src="${logoSrc}" style="width:60px;height:60px;object-fit:contain" onerror="this.style.display='none'"/>` : ''}
          <div><h2 style="margin:0;color:#003366">${companyName}</h2>
               <p style="margin:2px 0;font-size:9pt;color:#555">${companyAddress} | ${companyCnpjIe}</p></div>
        </div>
        <div style="text-align:right"><h3 style="margin:0">ORDEM DE SERVIÇO</h3><p style="margin:2px 0">Nº <b>${osNum}</b> | ${status.toUpperCase()}</p></div>
      </div>
      <div class="sec"><div class="sec-h">CLIENTE E OBJETO</div><div class="sec-c">
        <b>Cliente:</b> ${customerName} ${customerDocument ? `&nbsp;|&nbsp; <b>CPF/CNPJ:</b> ${customerDocument}` : ''} &nbsp;|&nbsp; <b>Telefone:</b> ${customerPhone||'—'}<br/>
        <b>Objeto:</b> ${itemType.toUpperCase()} ${itemMake||''} ${itemModel||''} &nbsp;|&nbsp; <b>Placa/Série:</b> ${itemIdentifier||'—'}<br/>
        <b>Cor:</b> ${itemColor||'—'} &nbsp;|&nbsp; <b>Condição:</b> ${itemCondition||'—'}<br/>
        <b>Acessórios:</b> ${accessories||'—'}<br/>
        <b>Entrada:</b> ${entryDate instanceof Date?entryDate.toLocaleDateString('pt-BR'):entryDate} &nbsp;|&nbsp; <b>Previsão:</b> ${expectedDelivery instanceof Date?expectedDelivery.toLocaleDateString('pt-BR'):'N/A'}
      </div></div>
      <div class="sec"><div class="sec-h">DIAGNÓSTICO</div><div class="sec-c" style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div><small><b>Problema Relatado</b></small><div class="diag">${problemReported}</div></div>
        <div><small><b>Serviço / Diagnóstico</b></small><div class="diag" style="background:#f0fdf4">${problemFound||servicePerformed||'Em análise...'}</div></div>
      </div></div>
      ${services.length>0||items.length>0?`<div class="sec"><div class="sec-h">SERVIÇOS E PEÇAS</div>
      <table style="width:100%;border-collapse:collapse"><thead><tr style="background:#f4f4f5"><th style="text-align:left;padding:4px 8px">Descrição</th><th style="padding:4px;text-align:right">Qtd</th><th style="padding:4px;text-align:right">Valor</th></tr></thead>
      <tbody>${services.map(s=>`<tr><td style="padding:3px 8px">(S) ${s.description}</td><td style="padding:3px;text-align:right">1</td><td style="padding:3px;text-align:right">${formatCurrency(Number(s.price))}</td></tr>`).join('')}${items.map(i=>`<tr><td style="padding:3px 8px">(P) ${i.description}</td><td style="padding:3px;text-align:right">${i.quantity}</td><td style="padding:3px;text-align:right">${formatCurrency(Number(i.total_price))}</td></tr>`).join('')}</tbody></table></div>`:''}
      <div style="display:grid;grid-template-columns:1fr 1.5fr;gap:15px;margin-top:8px">
        <div style="border:1px solid #ddd;padding:8px;border-radius:4px">
          <div style="display:flex;justify-content:space-between;font-size:9pt">Mão de obra: <b>${formatCurrency(laborTotal)}</b></div>
          <div style="display:flex;justify-content:space-between;font-size:9pt">Peças: <b>${formatCurrency(partsTotal)}</b></div>
          <div style="display:flex;justify-content:space-between;font-size:9pt">Desconto: <b>${formatCurrency(discount)}</b></div>
          <div style="display:flex;justify-content:space-between;font-size:11pt;font-weight:bold;border-top:1px solid #000;margin-top:4px;padding-top:4px">TOTAL: ${formatCurrency(totalAmount)}</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div style="border-top:1px solid #000;text-align:center;font-size:8pt;padding-top:4px;margin-top:30px">Assinatura Técnico</div>
          <div style="border-top:1px solid #000;text-align:center;font-size:8pt;padding-top:4px;margin-top:30px">Assinatura Cliente</div>
        </div>
      </div>
    </div>`;

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>OS #${osNum}</title>
  <style>@page{size:A4;margin:0}body{font-family:'Segoe UI',Arial,sans-serif;font-size:10pt;font-weight:bold;color:#333;margin:0;padding:0}
  .copy{width:210mm;height:148mm;padding:8mm;box-sizing:border-box;overflow:hidden;position:relative}
  .copy:first-child{border-bottom:2px dashed #999}
  .via{position:absolute;top:8mm;right:8mm;font-size:7pt;color:#aaa;text-transform:uppercase;font-weight:bold}
  .hdr{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #000;padding-bottom:5px;margin-bottom:6px}
  .sec{margin-bottom:5px;border:1px solid #ddd;border-radius:3px;overflow:hidden}
  .sec-h{background:#f4f4f5;padding:2px 8px;font-size:7pt;font-weight:bold;text-transform:uppercase;border-bottom:1px solid #ddd}
  .sec-c{padding:4px 8px;font-size:7.5pt}
  .diag{border:1px solid #eee;padding:3px;margin-top:2px;font-size:7.5pt;min-height:12px}
  @media print{.no-print{display:none}}</style></head><body>
  <div class="no-print" style="position:fixed;top:0;left:0;right:0;background:#111;color:#fff;padding:8px;text-align:center;z-index:100">
    <button onclick="window.print()" style="padding:8px 16px;background:#16a34a;color:white;border:none;border-radius:4px;font-weight:bold;cursor:pointer">🖨️ IMPRIMIR A4 (2 VIAS)</button>
    <button onclick="window.close()" style="padding:8px 16px;background:#ef4444;color:white;border:none;border-radius:4px;cursor:pointer;margin-left:8px">FECHAR</button>
  </div>
  ${renderCopy('1ª Via – Empresa')}
  ${renderCopy('2ª Via – Cliente')}
  </body></html>`;
  printWindow.document.open(); printWindow.document.write(html); printWindow.document.close();
};
