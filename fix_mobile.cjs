const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
    });
}

function fixFile(filePath) {
    if (!filePath.endsWith('.tsx')) return;

    let original = fs.readFileSync(filePath, 'utf8');
    let content = original;

    // Fix 1: Add overflow-x-auto and min-w-0 to table wrapper divs
    content = content.replace(/className="((?:[^"]* )?rounded-md border( [^"]*)?|border rounded-md( [^"]*)?)"(\s*>\s*<Table)/g, 'className="$1 overflow-x-auto"$4');

    // Fix 2: AppLayout p-6 to p-4 md:p-6
    if (filePath.includes('AppLayout.tsx')) {
        content = content.replace(/className="flex-1 overflow-auto p-6"/g, 'className="flex-1 overflow-auto p-4 md:p-6"');
    }

    // Fix 3: Dialogs often need w-[95vw] on mobile to fit nicely. Usually sm:max-w- is fine for desktop but mobile uses 100%. 
    // Usually shadcn dialog handles it nicely out of box if we don't apply w-[...].

    // Fix 4: Comandas grid sm:grid-cols-2 lg:grid-cols-3 -> normally correct.

    // Fix 5: Change fixed min-widths in tables if they are causing overflow without scroll. 
    // Not needed if we used overflow-x-auto.

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log("Fixed: " + filePath);
    }
}

walkDir(path.join(__dirname, 'src', 'pages'), fixFile);
walkDir(path.join(__dirname, 'src', 'components'), fixFile);

console.log('Mobile fixes applied!');
