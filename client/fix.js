const fs = require('fs');
const file = 'd:/projects/Codigix-Task-CRM/client/src/components/common/BacklogPage.js';
let content = fs.readFileSync(file, 'utf8');

const r1 = /\{\/\* Backlog section \*\/\}[\s\S]*?<Plus size=\{13\} \/> Create sprint\r?\n\s*<\/button>/;
const match = content.match(r1);
if (match) {
  const extracted = match[0] + '\n            </div>\n';
  
  content = content.replace(r1, '');
  content = content.replace(/\{\!collapsed\.backlog/g, extracted + '            {!collapsed.backlog');
  
  fs.writeFileSync(file, content);
  console.log('Fixed Backlog layout structure!');
} else {
  console.log('Could not find backlog header to replace');
}
