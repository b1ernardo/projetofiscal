
export const printReceipt = async (data: ReceiptData) => {
  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (!printWindow) { console.error("Popup blocked"); return; }
  printWindow.document.write('Gerando comprovante...');

  const { companyName, companyAddress, companyCnpjIe, logoSrc } = await resolveCompanyVariables();
  const { saleNumber, cart, total, discount, payments, date } = data;

  const totalItems = cart.reduce((acc, item) => acc + Number(item.quantity), 0);
  const subtotal = cart.reduce((acc, item) => acc + (Number(item.price) * Number(item.quantity)), 0);
  const whatsappUrl = await getWhatsappUrl(data);

  const html = \`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Comprovante de Venda #\${saleNumber}</title>
      <style>
        body { font-family: 'Courier New', Courier, monospace; font-size: 12px; margin: 0; padding: 0; width: 100%; max-width: 300px; color: #000; }
        @media print { @page { margin: 0; } body { margin: 0; padding: 0; width: 100%; } .no-print { display: none !important; } }
        .text-center { text-align: center; } .text-right { text-align: right; } .text-left { text-align: left; }
        .divider { border-top: 1px dashed #000; margin: 5px 0; }
        table { width: 100%; border-collapse: collapse; margin: 5px 0; }
        th, td { padding: 2px 0; vertical-align: top; }
      </style>
    </head>
    <body>
      <div class="no-print" style="text-align: center; margin-bottom: 15px; padding: 10px; background: #f4f4f5; border-bottom: 2px solid #e4e4e7; position: sticky; top: 0;">
        <button onclick="window.print()" style="padding: 8px 16px; font-size: 14px; cursor: pointer; background: #16a34a; color: white; border: none; border-radius: 4px; font-weight: bold;">🖨️ Imprimir</button>
        <button onclick="window.open('\${whatsappUrl}', '_blank')" style="padding: 8px 16px; font-size: 14px; cursor: pointer; background: #25D366; color: white; border: none; border-radius: 4px; font-weight: bold; margin-left: 10px;">💬 WhatsApp</button>
        <button onclick="window.close()" style="padding: 8px 16px; font-size: 14px; cursor: pointer; background: #ef4444; color: white; border: none; border-radius: 4px; font-weight: bold; margin-left: 10px;">❌ Fechar</button>
      </div>
      <div style="display: flex; align-items: center; justify-content: flex-start; gap: 10px; margin-bottom: 5px;">
        <img src="\${logoSrc}" style="width: 60px; height: 60px; object-fit: contain;" />
        <div style="text-align: left; line-height: 1.2;">
          <strong style="font-size: 13px; color: #003366;">\${companyName}</strong><br />
          <span style="font-size: 10px; color: #003366;">\${companyAddress}<br />\${companyCnpjIe}</span>
        </div>
      </div>
      <div class="text-center">
        <div class="divider"></div>
        <strong style="font-size: 11px;">Documento Auxiliar da Nota Fiscal de Consumidor Eletronica</strong><br />
        <strong>Não permite aproveitamento de crédito de ICMS</strong>
      </div>
      <div class="divider"></div>
      <div style="font-size: 11px;">Venda #\${saleNumber}<br />Data: \${new Date(date).toLocaleString('pt-BR')}</div>
      <div class="divider"></div>
      <table>
        <thead>
          <tr style="border-bottom: 1px dashed #000;">
            <th class="text-left" style="width: 40%">Descrição</th><th class="text-right">Qtde</th><th class="text-right">UN</th><th class="text-right">Vl Unit</th><th class="text-right">Vl Total</th>
          </tr>
        </thead>
        <tbody>
          \${cart.map(item => \`
            <tr>
              <td class="text-left">\${(item.name || 'Produto').substring(0, 20)}</td>
              <td class="text-right">\${item.quantity}</td>
              <td class="text-right">UN</td>
              <td class="text-right">\${Number(item.price).toFixed(2)}</td>
              <td class="text-right">\${(Number(item.price) * Number(item.quantity)).toFixed(2)}</td>
            </tr>
          \`).join('')}
        </tbody>
      </table>
      <div class="divider"></div>
      <div class="text-right">
        Qtde total de itens: <strong>\${totalItems}</strong><br />
        Valor Subtotal: \${formatCurrency(subtotal)}<br />
        Desconto: \${formatCurrency(discount)}<br />
        <strong style="font-size: 14px;">Valor a Pagar: \${formatCurrency(total)}</strong>
      </div>
      <div class="divider"></div>
      <table style="width: 100%;">
        <thead><tr><th class="text-left">FORMA PAGAMENTO</th><th class="text-right">VALOR PAGO</th></tr></thead>
        <tbody>
          \${payments.map(p => \`<tr><td class="text-left">\${p.methodName}</td><td class="text-right">\${formatCurrency(p.amount)}</td></tr>\`).join('')}
        </tbody>
      </table>
      <div class="divider"></div>
      <div class="text-center" style="margin-top: 10px;">Obrigado pela preferência!</div>
    </body>
    </html>
  \`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
};

export const printReceiptA4 = async (data: ReceiptData) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) { console.error("Popup blocked"); return; }
  printWindow.document.write('Gerando comprovante A4...');

  const { companyName, companyAddress, companyCnpjIe, logoSrc } = await resolveCompanyVariables();
  const whatsappUrl = await getWhatsappUrl(data);
  const totalItems = data.cart.reduce((acc, item) => acc + Number(item.quantity), 0);
  const subtotal = data.cart.reduce((acc, item) => acc + (Number(item.price) * Number(item.quantity)), 0);

  const html = \`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Venda #\${data.saleNumber} - A4</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; color: #333; }
        .container { max-width: 800px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
        .company-info h1 { margin: 0; font-size: 18pt; color: #003366; }
        .company-info p { margin: 5px 0 0 0; font-size: 11pt; color: #555; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: right; }
        th.text-left, td.text-left { text-align: left; }
        th { background: #f4f4f5; font-weight: bold; }
        @media print { .no-print { display: none; } .container { border: none; } }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom: 20px;">
        <button onclick="window.print()" style="padding: 10px 20px; font-weight: bold; background: #16a34a; color: white; border: none; border-radius: 4px;">🖨️ IMPRIMIR A4</button>
        <button onclick="window.open('\${whatsappUrl}', '_blank')" style="padding: 10px 20px; background: #25D366; color: white; border: none; border-radius: 4px; margin-left:10px;">💬 WHATSAPP</button>
        <button onclick="window.close()" style="padding: 10px 20px; background: #ef4444; color: white; border: none; border-radius: 4px; margin-left:10px;">FECHAR</button>
      </div>
      <div class="container">
        <div class="header">
           <div style="display: flex; gap: 15px; align-items: center;">
             <img src="\${logoSrc}" style="width: 80px; height: 80px; object-fit: contain;" />
             <div class="company-info">
               <h1>\${companyName}</h1>
               <p>\${companyAddress} | \${companyCnpjIe}</p>
             </div>
           </div>
           <div style="text-align: right;">
             <h2>COMPROVANTE DE VENDA</h2>
             <p><b>#\${data.saleNumber}</b> | \${new Date(data.date).toLocaleString('pt-BR')}</p>
           </div>
        </div>
        <table>
          <thead><tr><th class="text-left">Produto</th><th>Qtd</th><th>Unit.</th><th>Total</th></tr></thead>
          <tbody>
            \${data.cart.map(i => \`<tr><td class="text-left">\${i.name || 'Produto'}</td><td>\${i.quantity}</td><td>\${Number(i.price).toFixed(2)}</td><td>\${(Number(i.price) * Number(i.quantity)).toFixed(2)}</td></tr>\`).join('')}
          </tbody>
        </table>
        <div style="margin-top:20px; text-align: right; font-size: 14pt;">
          <p>Subtotal: <b>\${formatCurrency(subtotal)}</b></p>
          <p>Desconto: <b>\${formatCurrency(data.discount)}</b></p>
          <h2 style="color: #000; margin-top: 10px;">TOTAL: \${formatCurrency(data.total)}</h2>
        </div>
        <div style="margin-top:20px; display: flex; gap: 20px; justify-content: flex-end;">
          \${data.payments.map(p => \`<div style="padding: 10px; background: #f8fafc; border: 1px solid #ddd; border-radius: 4px;">\${p.methodName}: <b>\${formatCurrency(p.amount)}</b></div>\`).join('')}
        </div>
      </div>
    </body>
    </html>
  \`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
};

export const printQuote = async (data: QuoteData) => {
  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (!printWindow) { console.error("Popup blocked"); return; }
  printWindow.document.write('Gerando orcamento...');

  const { companyName, companyAddress, companyCnpjIe, logoSrc } = await resolveCompanyVariables();
  const { customerName, cart, total, discount, date, validityDays, observations } = data;

  const totalItems = cart.reduce((acc, item) => acc + Number(item.quantity), 0);
  const subtotal = cart.reduce((acc, item) => acc + (Number(item.price) * Number(item.quantity)), 0);
  const whatsappUrl = await getQuoteWhatsappUrl(data);

  const html = \`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Orçamento - \${customerName}</title>
      <style>
        body { font-family: 'Courier New', Courier, monospace; font-size: 12px; margin: 0; padding: 0; width: 100%; max-width: 300px; color: #000; }
        @media print { @page { margin: 0; } body { margin: 0; padding: 0; width: 100%; } .no-print { display: none !important; } }
        .text-center { text-align: center; } .text-right { text-align: right; } .text-left { text-align: left; }
        .divider { border-top: 1px dashed #000; margin: 5px 0; }
        table { width: 100%; border-collapse: collapse; margin: 5px 0; }
        th, td { padding: 2px 0; vertical-align: top; }
      </style>
    </head>
    <body>
      <div class="no-print" style="text-align: center; margin-bottom: 15px; padding: 10px; background: #f4f4f5; border-bottom: 2px solid #e4e4e7;">
        <button onclick="window.print()" style="padding: 8px 16px; font-size: 14px; cursor: pointer; background: #16a34a; color: white; border: none; border-radius: 4px; font-weight: bold;">🖨️ Imprimir</button>
        <button onclick="window.open('\${whatsappUrl}', '_blank')" style="padding: 8px 16px; font-size: 14px; cursor: pointer; background: #25D366; color: white; border: none; border-radius: 4px; font-weight: bold; margin-left: 10px;">💬 WhatsApp</button>
      </div>
      <div style="display: flex; align-items: center; justify-content: flex-start; gap: 10px; margin-bottom: 10px;">
        <img src="\${logoSrc}" style="width: 60px; height: 60px; object-fit: contain;" />
        <div style="text-align: left; line-height: 1.2;">
          <strong style="font-size: 13px; color: #003366;">\${companyName}</strong><br />
          <span style="font-size: 10px; color: #003366;">\${companyAddress}<br />\${companyCnpjIe}</span>
        </div>
      </div>
      <div class="text-center"><strong style="font-size: 16px;">O R Ç A M E N T O</strong></div>
      <div class="divider"></div>
      <div style="font-size: 11px;">
        Cliente: \${customerName}<br />
        Data: \${new Date(date).toLocaleDateString('pt-BR')}<br />
        Validade: \${validityDays} dias
      </div>
      <div class="divider"></div>
      <table>
        <thead><tr style="border-bottom: 1px dashed #000;"><th class="text-left">Descrição</th><th class="text-right">Qtde</th><th class="text-right">Vl Unit</th><th class="text-right">Vl Total</th></tr></thead>
        <tbody>
          \${cart.map(item => \`<tr><td class="text-left">\${(item.name || 'Produto').substring(0, 18)}</td><td class="text-right">\${item.quantity}</td><td class="text-right">\${Number(item.price).toFixed(2)}</td><td class="text-right">\${(Number(item.price) * Number(item.quantity)).toFixed(2)}</td></tr>\`).join('')}
        </tbody>
      </table>
      <div class="divider"></div>
      \${observations ? \`<div style="font-size: 10px; margin-bottom: 5px;"><strong>Obs:</strong> \${observations}</div><div class="divider"></div>\` : ''}
      <div class="text-right">
        Qtde itens: <strong>\${totalItems}</strong><br />
        Subtotal: \${formatCurrency(subtotal)}<br />
        Desconto: \${formatCurrency(discount)}<br />
        <strong style="font-size: 14px;">Total: \${formatCurrency(total)}</strong>
      </div>
      <div class="divider"></div>
      <div class="text-center" style="margin-top: 10px; font-size: 10px;">
        Este documento não é nota fiscal.<br />Preços sujeitos a alteração sem prévio aviso.
      </div>
    </body>
    </html>
  \`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
};
