
export const printDeliveryA4 = async (data: DeliveryData) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) { console.error("Popup blocked"); return; }
  printWindow.document.write('Gerando roteiro de entrega A4...');

  const { companyName, companyAddress, companyCnpjIe, logoSrc } = await resolveCompanyVariables();
  const { orderNumber, customerName, customerPhone, address, type, paymentMethod, items, subtotal, deliveryFee, total, changeFor, date } = data;

  const html = \`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Pedido Delivery #\${orderNumber}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; color: #333; }
        .container { max-width: 800px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
        .company-info h1 { margin: 0; font-size: 18pt; color: #003366; }
        .company-info p { margin: 5px 0 0 0; font-size: 11pt; color: #555; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        th { background: #f4f4f5; font-weight: bold; }
        @media print { .no-print { display: none; } .container { border: none; } }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom: 20px;">
        <button onclick="window.print()" style="padding: 10px 20px; background: #16a34a; color: white; border: none; border-radius: 4px; font-weight: bold;">🖨️ IMPRIMIR A4</button>
        <button onclick="window.close()" style="padding: 10px 20px; background: #ef4444; color: white; border: none; border-radius: 4px; margin-left: 10px;">FECHAR</button>
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
            <h2>PEDIDO \${type === 'retirada' ? 'RETIRADA' : 'ENTREGA'}</h2>
            <p><b>#\${orderNumber}</b></p>
          </div>
        </div>
        <div style="margin-bottom: 20px; padding: 15px; background: #f8fafc; border: 1px solid #ddd; border-radius: 6px;">
          <h3>DADOS DO CLIENTE E \${type === 'retirada' ? 'RETIRADA' : 'ENTREGA'}</h3>
          <p>Data: \${new Date(date).toLocaleString('pt-BR')}</p>
          <p>Cliente: \${customerName}</p>
          <p>Telefone: \${customerPhone}</p>
          \${type === 'entrega' ? \`<p>Endereço: \${address}</p>\` : ''}
        </div>
        <table>
          <thead><tr><th>Qtd</th><th>Produto</th><th>Total</th></tr></thead>
          <tbody>
            \${items.map(i => \`<tr><td>\${i.quantity}</td><td>\${(i.product_name || i.name || 'Produto')}</td><td style="text-align:right;">\${formatCurrency(Number(i.unit_price) * Number(i.quantity))}</td></tr>\`).join('')}
          </tbody>
        </table>
        <div style="margin-top:20px; padding: 15px; text-align: right; border-top: 1px solid #ddd;">
          <p>Subtotal: \${formatCurrency(subtotal)}</p>
          \${type === 'entrega' ? \`<p>Taxa de Entrega: \${formatCurrency(deliveryFee)}</p>\` : ''}
          <h2 style="color: #000;">TOTAL: \${formatCurrency(total)}</h2>
          <p style="margin-top: 5px;">Forma de Pagamento: <b>\${paymentMethod}</b></p>
          \${changeFor ? \`<p>Troco para: \${formatCurrency(changeFor)} | Troco a levar: \${formatCurrency(changeFor - total)}</p>\` : ''}
        </div>
      </div>
    </body>
    </html>
  \`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
};

export const printQuoteA4 = async (data: QuoteData) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) { console.error("Popup blocked"); return; }
  printWindow.document.write('Gerando orçamento...');

  const { companyName, companyAddress, companyCnpjIe, logoSrc } = await resolveCompanyVariables();
  const subtotal = data.cart.reduce((acc, item) => acc + (Number(item.price) * Number(item.quantity)), 0);
  const whatsappUrl = await getQuoteWhatsappUrl(data);

  const html = \`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Orçamento - \${data.customerName}</title>
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
        <button onclick="window.open('\${whatsappUrl}', '_blank')" style="padding: 10px 20px; background: #25D366; color: white; border: none; border-radius: 4px; margin-left: 10px;">💬 WHATSAPP</button>
        <button onclick="window.close()" style="padding: 10px 20px; background: #ef4444; color: white; border: none; border-radius: 4px; margin-left: 10px;">FECHAR</button>
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
             <h2>ORÇAMENTO</h2>
             <p>Validade: \${data.validityDays} dias</p>
           </div>
        </div>
        <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 6px; background: #fafafa;">
           <h3>DADOS DO CLIENTE</h3>
           <p>Nome: \${data.customerName}</p>
           <p>Data: \${new Date(data.date).toLocaleDateString('pt-BR')}</p>
        </div>
        <table>
          <thead><tr><th class="text-left">Produto</th><th>Qtd</th><th>Unit.</th><th>Total</th></tr></thead>
          <tbody>
            \${data.cart.map(i => \`<tr><td class="text-left">\${i.name || 'Produto'}</td><td>\${i.quantity}</td><td>\${Number(i.price).toFixed(2)}</td><td>\${(Number(i.price) * Number(i.quantity)).toFixed(2)}</td></tr>\`).join('')}
          </tbody>
        </table>
        \${data.observations ? \`<div style="margin-top:20px; padding: 15px; border: 1px solid #ddd; border-radius: 6px; background: #fdfdfd;"><h3>Observações:</h3><p>\${data.observations}</p></div>\` : ''}
        <div style="margin-top:20px; text-align: right; font-size: 14pt;">
          <p>Subtotal: <b>\${formatCurrency(subtotal)}</b></p>
          <p>Desconto: <b>\${formatCurrency(data.discount)}</b></p>
          <h2 style="color: #000; margin-top: 10px;">TOTAL: \${formatCurrency(data.total)}</h2>
        </div>
      </div>
    </body>
    </html>
  \`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
};
