export interface ReceiptData {
  saleNumber: string | number;
  cart: any[];
  total: number;
  discount: number;
  payments: { methodName: string; amount: number }[];
  date: Date;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export const getWhatsappUrl = (data: ReceiptData) => {
  const { saleNumber, cart, total, discount, payments, date } = data;
  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  let whatsappText = `*COMPROVANTE DE VENDA*\n*M O S PANIFICADORA E COMERCIO LTDA*\n`;
  whatsappText += `Venda #${saleNumber}\nData: ${date.toLocaleString('pt-BR')}\n`;
  whatsappText += `--------------------------------\n`;
  cart.forEach(item => {
    whatsappText += `${item.quantity}x ${item.name.substring(0, 20)} - ${formatCurrency(item.price * item.quantity)}\n`;
  });
  whatsappText += `--------------------------------\n`;
  whatsappText += `Subtotal: ${formatCurrency(subtotal)}\n`;
  if (discount > 0) whatsappText += `Desconto: ${formatCurrency(discount)}\n`;
  whatsappText += `*Total: ${formatCurrency(total)}*\n\n`;
  whatsappText += `*Pagamento(s)*\n`;
  payments.forEach(p => {
    whatsappText += `${p.methodName}: ${formatCurrency(p.amount)}\n`;
  });
  whatsappText += `\nObrigado pela preferência!`;

  return `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;
};

export const printReceipt = (data: ReceiptData) => {
  const { saleNumber, cart, total, discount, payments, date } = data;

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const whatsappUrl = getWhatsappUrl(data);

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Comprovante de Venda #${saleNumber}</title>
      <style>
        body {
          font-family: 'Courier New', Courier, monospace;
          font-size: 12px;
          margin: 0;
          padding: 0;
          width: 100%;
          max-width: 300px;
          color: #000;
        }
        @media print {
          @page { margin: 0; }
          body { margin: 0; padding: 0; width: 100%; }
          .no-print { display: none !important; }
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        .bold { font-weight: bold; }
        .divider { 
          border-top: 1px dashed #000; 
          margin: 5px 0; 
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 5px 0;
        }
        th, td {
          padding: 2px 0;
          vertical-align: top;
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="text-align: center; margin-bottom: 15px; padding: 10px; background: #f4f4f5; border-bottom: 2px solid #e4e4e7; position: sticky; top: 0;">
        <button onclick="window.print()" style="padding: 8px 16px; font-size: 14px; cursor: pointer; background: #16a34a; color: white; border: none; border-radius: 4px; font-weight: bold;">🖨️ Imprimir</button>
        <button onclick="window.open('${whatsappUrl}', '_blank')" style="padding: 8px 16px; font-size: 14px; cursor: pointer; background: #25D366; color: white; border: none; border-radius: 4px; font-weight: bold; margin-left: 10px;">💬 WhatsApp</button>
        <button onclick="window.close()" style="padding: 8px 16px; font-size: 14px; cursor: pointer; background: #ef4444; color: white; border: none; border-radius: 4px; font-weight: bold; margin-left: 10px;">❌ Fechar</button>
      </div>
      <div class="text-center">
        <strong style="font-size: 14px;">M O S PANIFICADORA E COMERCIO LTDA</strong><br />
        CNPJ: 25.376.685/0001-04 IE: 125854528<br />
        AV IMPERATRIZ, 1445<br />
        centro<br />
        Jo&atilde;o lisboa-MA<br />
        <div class="divider"></div>
        <strong style="font-size: 11px;">Documento Auxiliar da Nota Fiscal de Consumidor Eletronica</strong><br />
        <strong>N&atilde;o permite aproveitamento de cr&eacute;dito de ICMS</strong>
      </div>
      <div class="divider"></div>
      <div style="font-size: 11px;">
        Venda #${saleNumber}<br />
        Data: ${date.toLocaleString('pt-BR')}
      </div>
      
      <div class="divider"></div>
      
      <table>
        <thead>
          <tr style="border-bottom: 1px dashed #000;">
            <th class="text-left" style="width: 40%">Descri&ccedil;&atilde;o</th>
            <th class="text-right">Qtde</th>
            <th class="text-right">UN</th>
            <th class="text-right">Vl Unit</th>
            <th class="text-right">Vl Total</th>
          </tr>
        </thead>
        <tbody>
          ${cart.map(item => `
            <tr>
              <td class="text-left">${item.name.substring(0, 20)}</td>
              <td class="text-right">${item.quantity}</td>
              <td class="text-right">UN</td>
              <td class="text-right">${(item.price).toFixed(2)}</td>
              <td class="text-right">${(item.price * item.quantity).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="divider"></div>

      <div class="text-right">
        Qtde total de itens: <strong>${totalItems}</strong><br />
        Valor Subtotal: ${formatCurrency(subtotal)}<br />
        Desconto: ${formatCurrency(discount)}<br />
        <strong style="font-size: 14px;">Valor a Pagar: ${formatCurrency(total)}</strong>
      </div>

      <div class="divider"></div>

      <table style="width: 100%;">
        <thead>
           <tr>
             <th class="text-left">FORMA PAGAMENTO</th>
             <th class="text-right">VALOR PAGO</th>
           </tr>
        </thead>
        <tbody>
          ${payments.map(p => `
            <tr>
              <td class="text-left">${p.methodName}</td>
              <td class="text-right">${formatCurrency(p.amount)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="divider"></div>
      <div class="text-center" style="margin-top: 10px;">
        Obrigado pela prefer&ecirc;ncia!
      </div>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  } else {
    console.error("Popup blocked");
  }
};
