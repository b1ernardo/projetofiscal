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

    // Undo: <div className="overflow-x-auto w-full pb-4"><Table> -> <Table>
    // The script wrongly wrapped every JSX element (Table, TableHeader, TableRow, TableHead, TableBody, TableCell) with this div.
    // We need to remove ALL these spurious wrappers.

    // Step 1: Remove the opening <div className="overflow-x-auto w-full pb-4"> that was inserted BEFORE Table-related tags
    // Pattern: <div className="overflow-x-auto w-full pb-4"><TableXxx  or <Table>
    content = content.replace(/<div className="overflow-x-auto w-full pb-4">(<(?:Table|TableHeader|TableBody|TableFooter|TableRow|TableHead|TableCell|TableCaption)[^>]*>)/g, '$1');

    // Step 2: Remove </TableXxx></div> -> </TableXxx>  (the spurious closing div)
    content = content.replace(/(<\/(?:Table|TableHeader|TableBody|TableFooter|TableRow|TableHead|TableCell|TableCaption)>)<\/div>/g, '$1');

    // Also fix the AppLayout that the first script changed (p-4 md:p-6 -> p-4 md:p-6 is actually fine)

    // Fix the broken grid- classes that were double-prepended
    content = content.replace(/md:md:grid-cols/g, 'md:grid-cols');

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Fixed: ' + filePath);
    }
}

walkDir(path.join(__dirname, 'src', 'pages'), fixFile);
walkDir(path.join(__dirname, 'src', 'components'), fixFile);

console.log('Revert complete!');
