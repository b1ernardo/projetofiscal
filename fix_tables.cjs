const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        if (fs.statSync(dirPath).isDirectory()) {
            walkDir(dirPath, callback);
        } else {
            callback(dirPath);
        }
    });
}

function fixFile(filePath) {
    if (!filePath.endsWith('.tsx')) return;

    let original = fs.readFileSync(filePath, 'utf8');
    let content = original;

    // Remove any previous wrapping if I made a mistake, though I didn't wrap Table directly yet
    // Just add generic overflow wrapper to ALL Table usages
    // First, find <Table> or <Table ...>
    // but avoid wrapping multiple times if already wrapped

    if (content.includes('<Table') && !content.includes('overflow-x-auto')) {
        // If the file uses Table but doesn't have overflow-x-auto anywhere, 
        // it means we need to protect these tables.
        // A simple way is to replace <Table> with <div className="overflow-x-auto w-full pb-4"><Table>
        // and </Table> with </Table></div>
        content = content.replace(/(<Table[^>]*>)/g, '<div className="overflow-x-auto w-full pb-4">$1');
        content = content.replace(/(<\/Table>)/g, '$1</div>');
    }

    // Fix flex grid on pages (like Vendas, ContasPagar filter grids)
    // Things like: grid grid-cols-1 md:grid-cols-5
    content = content.replace(/grid-cols-5/g, 'md:grid-cols-5'); // make sure they aren't explicitly 5 on mobile
    content = content.replace(/grid-cols-4/g, 'md:grid-cols-4');
    content = content.replace(/grid-cols-3/g, 'md:grid-cols-3');
    // Careful not to over-replace md:md:grid-cols
    content = content.replace(/md:md:/g, 'md:');

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log("Fixed: " + filePath);
    }
}

walkDir(path.join(__dirname, 'src', 'pages'), fixFile);
walkDir(path.join(__dirname, 'src', 'components'), fixFile);

console.log('Mobile Table \u0026 Grid fixes applied!');
