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

// Helper for changing export const to async
function makeFunctionAsyncAndAddData(funcName, argDec) {
  const syncMatch = new RegExp(`export const ${funcName} = \\(${argDec}\\) => \\{`);
  if (content.match(syncMatch)) {
    content = content.replace(syncMatch, `export const ${funcName} = async (${argDec}) => {\n  const printWindow = window.open('', '_blank');\n  if (!printWindow) { console.error("Popup blocked"); return; }\n  printWindow.document.write('Gerando documento...');\n${variablesDef}`);
  }
}

makeFunctionAsyncAndAddData('printQuoteA4', 'data: QuoteData');
makeFunctionAsyncAndAddData('printOS', 'data: ServiceOrderData');
makeFunctionAsyncAndAddData('printOSA4', 'data: ServiceOrderData');

// Replace HTML tags
content = content.replace(/<h1 style="color: #003366; margin: 0; font-size: 16pt;">M O S PANIFICADORA E COMERCIO LTDA<\/h1>/g, '<h1 style="color: #003366; margin: 0; font-size: 16pt;">${companyName}</h1>');
content = content.replace(/<p style="color: #003366; margin: 5px 0 0 0; font-size: 10pt;">AV IMPERATRIZ, 1445 - centro - João lisboa-MA \| CNPJ: 25\.376\.685\/0001-04<\/p>/g, '<p style="color: #003366; margin: 5px 0 0 0; font-size: 10pt;">${companyAddress} | ${companyCnpjIe}</p>');

// Replace getOSWhatsappUrl
if (content.includes('export const getOSWhatsappUrl = (data: ServiceOrderData) => {')) {
  content = content.replace('export const getOSWhatsappUrl = (data: ServiceOrderData) => {', `export const getOSWhatsappUrl = async (data: ServiceOrderData) => {\n  const companyData = await getCompanyData();\n  const companyName = companyData?.razao_social || companyData?.nome_fantasia || 'Emissor de Vendas';`);
  content = content.replace('let whatsappText = `*O R D E M   D E   S E R V I Ç O*\\n*M O S PANIFICADORA E COMERCIO LTDA*\\n`;', 'let whatsappText = `*O R D E M   D E   S E R V I Ç O*\\n*${companyName}*\\n`;');
}

// Ensure await on getOSWhatsappUrl in printOS
content = content.replace('const whatsappUrl = getOSWhatsappUrl(data);', 'const whatsappUrl = await getOSWhatsappUrl(data);');

// Clean up windows.open logic for printQuoteA4, printOS, printOSA4 that were modified
content = content.replace(/const printWindow = window\.open\('', '_blank', 'width=800,height=1000'\);\s*if \(printWindow\) {\s*printWindow\.document\.open\(\);\s*printWindow\.document\.write\(html\);\s*printWindow\.document\.close\(\);\s*} else {\s*console\.error\("Popup blocked"\);\s*}/g, 'printWindow.document.open();\n    printWindow.document.write(html);\n    printWindow.document.close();');

content = content.replace(/const printWindow = window\.open\('', '_blank', 'width=400,height=600'\);\s*if \(printWindow\) {\s*printWindow\.document\.open\(\);\s*printWindow\.document\.write\(html\);\s*printWindow\.document\.close\(\);\s*} else {\s*console\.error\("Popup blocked"\);\s*}/g, 'printWindow.document.open();\n    printWindow.document.write(html);\n    printWindow.document.close();');


// one more fallback replace
content = content.replace(/const printWindow = window\.open\('', '_blank'\);\s*if \(printWindow\) {\s*printWindow\.document\.open\(\);\s*printWindow\.document\.write\(html\);\s*printWindow\.document\.close\(\);\s*}/g, 'printWindow.document.open();\n    printWindow.document.write(html);\n    printWindow.document.close();');

fs.writeFileSync(filePath, content, 'utf8');
console.log('printReceipt3 updated');
