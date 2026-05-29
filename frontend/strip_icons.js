const fs = require('fs');
const path = require('path');

const directory = path.join(__dirname, 'src');

const iconPattern1 = /<i className="bi [^"]*"><\/i>/g;
const iconPattern2 = /<i class="bi [^"]*"><\/i>/g;
const iconPattern3 = /<i className=\{`bi [^`]*`\}><\/i>/g;
const emojiPattern = /[🟢🟡🔴⚠✨⭐]/g;

function walkDir(dir) {
    fs.readdirSync(dir).forEach(file => {
        let fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath);
        } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let newContent = content
                .replace(iconPattern1, '')
                .replace(iconPattern2, '')
                .replace(iconPattern3, '')
                .replace(emojiPattern, '');
            if (content !== newContent) {
                fs.writeFileSync(fullPath, newContent, 'utf8');
                console.log(`Stripped icons from ${fullPath}`);
            }
        }
    });
}

walkDir(directory);
console.log('Done stripping icons globally.');
