const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'components', 'seo-gmb');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

const ignoreList = ['TABS', 'COLORS', 'PIE_COLORS', 'STATUS_COLORS'];

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  const originalLength = content.length;

  // Match: const SOME_CONSTANT = [ { ... }, ... ]; or const initSomething = [ { ... }, ... ];
  content = content.replace(/const ([A-Z_0-9]+|init[A-Z][a-zA-Z0-9]+) = \[\s*(?:\{[\s\S]*?\}\s*,?\s*)+\];/g, (match, p1) => {
    if (ignoreList.includes(p1) || p1.endsWith('Cols') || p1.endsWith('Columns')) {
      return match;
    }
    return `const ${p1} = [];`;
  });
  
  if (content.length !== originalLength) {
    console.log(`Modified mock data in ${file}`);
    fs.writeFileSync(filePath, content, 'utf-8');
  }
}
console.log("Done wiping static data.");
