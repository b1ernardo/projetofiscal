const fs = require('fs');
const path = require('path');

// The correct approach: find <Card> or <div> containers that directly wrap <Table>
// and add overflow-x-auto to them, NOT to the table elements themselves.
// Since the Table component in shadcn/ui already wraps itself with `<div className="relative w-full overflow-auto">`,
// the tables are ALREADY scrollable horizontally by default!
// The real mobile issues are layout/padding related, not the tables.

// So this script just adds a few targeted responsive improvements:
// 1. Make stat/metric grids responsive
// 2. Reduce page padding on mobile

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

    // Fix 1: pages with className="p-6 space-y-6" -> "p-4 md:p-6 space-y-4 md:space-y-6"
    content = content.replace(/className="p-6 space-y-6"/g, 'className="p-4 md:p-6 space-y-4 md:space-y-6"');

    // Fix 2: grid-cols-4 stat grids -> sm:grid-cols-2 lg:grid-cols-4
    content = content.replace(/className="grid grid-cols-4 gap-4"/g, 'className="grid grid-cols-2 md:grid-cols-4 gap-4"');
    content = content.replace(/className="grid grid-cols-4 gap-6"/g, 'className="grid grid-cols-2 md:grid-cols-4 gap-6"');

    // Fix 3: grid-cols-3 -> sm:grid-cols-2 lg:grid-cols-3
    content = content.replace(/className="grid grid-cols-3 gap-4"/g, 'className="grid sm:grid-cols-2 md:grid-cols-3 gap-4"');
    content = content.replace(/className="grid grid-cols-3 gap-6"/g, 'className="grid sm:grid-cols-2 md:grid-cols-3 gap-6"');

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Fixed: ' + filePath);
    }
}

walkDir(path.join(__dirname, 'src', 'pages'), fixFile);
walkDir(path.join(__dirname, 'src', 'components'), fixFile);

console.log('Safe responsive fixes applied!');
