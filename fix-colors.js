const fs = require('fs');
const path = require('path');
const dir = 'd:/projects/Codigix-Task-CRM/client/src/components/landing';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

for (const file of files) {
  const p = path.join(dir, file);
  let content = fs.readFileSync(p, 'utf8');
  
  content = content.replace(/red- /g, 'red-600 ');
  content = content.replace(/red-\"/g, 'red-600"');
  content = content.replace(/red-\//g, 'red-600/');
  content = content.replace(/rose- /g, 'rose-600 ');
  content = content.replace(/rose-\"/g, 'rose-600"');
  content = content.replace(/orange- /g, 'orange-600 ');
  content = content.replace(/orange-\"/g, 'orange-600"');

  fs.writeFileSync(p, content);
}
console.log('Fixed broken tailwind classes successfully');
