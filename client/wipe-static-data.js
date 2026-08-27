const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'components', 'seo-gmb');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  // Match: const SOME_CONSTANT = [ { ... }, ... ];
  // Explanation: 
  // const ([A-Z_0-9]+) = \[  -> matches const NAME = [
  // ([\s\S]*?)              -> matches anything lazily inside
  // \];                     -> matches the closing ];
  // We want to make sure it's replacing top-level mock arrays.
  
  const originalLength = content.length;

  content = content.replace(/const ([A-Z_0-9]+) = \[\s*(?:\{[\s\S]*?\}\s*,?\s*)+\];/g, 'const $1 = [];');
  
  if (content.length !== originalLength) {
    console.log(`Modified mock data in ${file}`);
    fs.writeFileSync(filePath, content, 'utf-8');
  }
}
console.log("Done wiping static data.");
