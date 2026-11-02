require('dotenv').config({path:require('path').join(__dirname,'..','.env'),quiet:true});
const pool=require('../config/database');
// Sheet cells linked to a finished ticket whose due month differs from the cell's month.
(async()=>{
 const [items]=await pool.query('SELECT id,cell_key,issue_key FROM sheet_sync_items');const [iss]=await pool.query("SELECT issue_key,status,DATE_FORMAT(due_date,'%Y-%m') dm FROM it_kanban_issues");const im=new Map(iss.map(x=>[x.issue_key,x]));const rows=items.map(i=>({...i,...(im.get(i.issue_key)||{})}));
 const bad=rows.filter(r=>{const m=/\|(\d{4}-\d{2})-\d{2}\|/.exec(r.cell_key);return m&&r.dm&&m[1]!==r.dm&&/^(DONE|CLOSED|COMPLETED|RESOLVED)$/i.test(String(r.status).trim());});
 console.log(bad.length,'stale links');bad.slice(0,40).forEach(b=>console.log(b.cell_key,b.issue_key,b.dm));
 if(process.argv.includes('--apply')){for(const b of bad)await pool.query('DELETE FROM sheet_sync_items WHERE id=?',[b.id]);console.log('removed');}
 await pool.end();})().catch(e=>{console.error(e.message);process.exit(1)});
