const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/utils/printReceipt.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Replace standard variables
const variablesDef = `  const companyData = await getCompanyData();
  const companyName = companyData?.razao_social || companyData?.nome_fantasia || 'Emissor de Vendas';
  const companyAddress = companyData ? \`\${companyData.logradouro || ''}, \${companyData.numero || ''} - \${companyData.bairro || ''} - \${companyData.municipio || ''}-\${companyData.uf || ''}\` : '';
  const companyCnpjIe = companyData ? \`CNPJ: \${companyData.cnpj || ''} | IE: \${companyData.ie || ''}\` : '';
  const logoSrc = companyData?.logo_base64 
    ? (companyData.logo_base64.startsWith('data:') ? companyData.logo_base64 : \`data:image/png;base64,\${companyData.logo_base64}\`)
    : \`\${getApiUrl()}/logo.php\`;
`;

const setupPrintReceiptA4 = `export const printReceiptA4 = async (data: ReceiptData) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) { console.error("Popup blocked"); return; }
  printWindow.document.write('Gerando comprovante A4...');
${variablesDef}
`;

if (content.includes('export const printReceiptA4 = (data: ReceiptData) => {')) {
  content = content.replace('export const printReceiptA4 = (data: ReceiptData) => {', setupPrintReceiptA4);
  content = content.replace('const whatsappUrl = getWhatsappUrl(data);', 'const whatsappUrl = await getWhatsappUrl(data);');
}

const setupPrintDelivery = `export const printDelivery = async (data: DeliveryData) => {
  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (!printWindow) { console.error("Popup blocked"); return; }
  printWindow.document.write('Gerando roteiro de entrega...');
${variablesDef}
`;
if (content.includes('export const printDelivery = (data: DeliveryData) => {')) {
    content = content.replace('export const printDelivery = (data: DeliveryData) => {', setupPrintDelivery);
}

// Ensure window.open logic at the end of A4 and Delivery are cleaned
content = content.replace(/const printWindow = window\.open\('', '_blank'.*?;\s*if \(printWindow\) {\s*printWindow\.document\.open\(\);\s*printWindow\.document\.write\(html\);\s*printWindow\.document\.close\(\);\s*} else {\s*console\.error\("Popup blocked"\);\s*}/g, 'printWindow.document.open();\n    printWindow.document.write(html);\n    printWindow.document.close();');

// Also plain replace for window.open for printReceiptA4 where it doesn't specify 'width=400...'
content = content.replace(/const printWindow = window\.open\('', '_blank'\);\s*if \(printWindow\) {\s*printWindow\.document\.open\(\);\s*printWindow\.document\.write\(html\);\s*printWindow\.document\.close\(\);\s*} else {\s*console\.error\("Popup blocked"\);\s*}/g, 'printWindow.document.open();\n    printWindow.document.write(html);\n    printWindow.document.close();');


// Replace inside HTML templates for ALL occurrences!
content = content.replace(/<img src="\${getApiUrl\(\)}\/logo\.php"/g, '<img src="${logoSrc}"');
content = content.replace(/<strong style="font-size: 13px; color: #003366;">M O S PANIFICADORA E COMERCIO LTDA<\/strong><br \/>/g, '<strong style="font-size: 13px; color: #003366;">${companyName}</strong><br />');
content = content.replace(/<span style="font-size: 10px; color: #003366;">AV IMPERATRIZ, 1445 - centro - João lisboa-MA<br \/>\s*CNPJ: 25\.376\.685\/0001-04 \| IE: 125854528<\/span>/g, '<span style="font-size: 10px; color: #003366;">${companyAddress}<br />${companyCnpjIe}</span>');

// Replace Whatsapp constants
content = content.replace(/let whatsappText = `\*COMPROVANTE DE VENDA\*\n\*M O S PANIFICADORA E COMERCIO LTDA\*\n`;/g, 'let whatsappText = `*COMPROVANTE DE VENDA*\\n*${companyName}*\\n`;');
content = content.replace(/let whatsappText = `\*COMPROVANTE DE ENTREGA\*\n\*M O S PANIFICADORA E COMERCIO LTDA\*\n`;/g, 'let whatsappText = `*COMPROVANTE DE ENTREGA*\\n*${companyName}*\\n`;');

// getDeliveryWhatsappUrl
if (!content.includes('export const getDeliveryWhatsappUrl = async')) {
  content = content.replace('export const getDeliveryWhatsappUrl = (data: DeliveryData) => {', 'export const getDeliveryWhatsappUrl = async (data: DeliveryData) => {\n  const companyData = await getCompanyData();\n  const companyName = companyData?.razao_social || companyData?.nome_fantasia || \'Emissor de Vendas\';');
}


fs.writeFileSync(filePath, content, 'utf8');
console.log('printReceipt2 updated');
