const fs = require('fs');
const path = require('path');

const ignoreList = ['TABS', 'COLORS', 'PIE_COLORS', 'STATUS_COLORS'];

function wipeDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      wipeDir(fullPath);
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf-8');
      const originalLength = content.length;

      content = content.replace(/const ([A-Z_0-9]+|init[A-Z][a-zA-Z0-9]+|mock[A-Z][a-zA-Z0-9]+|dummy[A-Z][a-zA-Z0-9]+) = \[\s*(?:\{[\s\S]*?\}\s*,?\s*)+\];/g, (match, p1) => {
        if (ignoreList.includes(p1) || p1.endsWith('Cols') || p1.endsWith('Columns')) {
          return match;
        }
        return `const ${p1} = [];`;
      });
      
      if (content.length !== originalLength) {
        console.log(`Modified mock data in ${fullPath.replace(__dirname, '')}`);
        fs.writeFileSync(fullPath, content, 'utf-8');
      }
    }
  }
}

wipeDir(path.join(__dirname, 'src', 'components'));
console.log("Done wiping frontend static data globally.");
