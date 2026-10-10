const pool = require('../config/database');

async function compareSchemas() {
  try {
    console.log('Comparing schemas between deals_db and task_crm_db_prod...\n');

    // 1. Get Tables
    const [tables] = await pool.query(`
      SELECT TABLE_SCHEMA, TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA IN ('deals_db', 'task_crm_db_prod')
      ORDER BY TABLE_NAME
    `);

    const prodTables = new Set(tables.filter(t => t.TABLE_SCHEMA === 'task_crm_db_prod').map(t => t.TABLE_NAME));
    const dealsTables = new Set(tables.filter(t => t.TABLE_SCHEMA === 'deals_db').map(t => t.TABLE_NAME));

    const missingInDeals = [...prodTables].filter(t => !dealsTables.has(t));
    const missingInProd = [...dealsTables].filter(t => !prodTables.has(t));

    console.log(`=== TABLE COUNT ===`);
    console.log(`task_crm_db_prod: ${prodTables.size} tables`);
    console.log(`deals_db:         ${dealsTables.size} tables\n`);

    if (missingInDeals.length > 0) {
      console.log(`Tables in task_crm_db_prod but MISSING in deals_db (${missingInDeals.length}):`);
      console.log(missingInDeals);
      console.log('');
    } else {
      console.log('No tables missing in deals_db.');
    }

    if (missingInProd.length > 0) {
      console.log(`Tables in deals_db but MISSING in task_crm_db_prod (${missingInProd.length}):`);
      console.log(missingInProd);
      console.log('');
    } else {
      console.log('No tables missing in task_crm_db_prod.');
    }

    // 2. Compare Columns for Common Tables
    const [columns] = await pool.query(`
      SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA IN ('deals_db', 'task_crm_db_prod')
      ORDER BY TABLE_NAME, ORDINAL_POSITION
    `);

    const colMap = {};
    for (const col of columns) {
      const key = `${col.TABLE_NAME}.${col.COLUMN_NAME}`;
      if (!colMap[key]) colMap[key] = {};
      colMap[key][col.TABLE_SCHEMA] = col;
    }

    const missingColsInDeals = [];
    const missingColsInProd = [];
    const diffCols = [];

    for (const [key, schemas] of Object.entries(colMap)) {
      const [tableName, colName] = key.split('.');
      // Only compare for common tables
      if (!prodTables.has(tableName) || !dealsTables.has(tableName)) continue;

      if (!schemas['deals_db']) {
        missingColsInDeals.push({ table: tableName, column: colName, prodDef: schemas['task_crm_db_prod'] });
      } else if (!schemas['task_crm_db_prod']) {
        missingColsInProd.push({ table: tableName, column: colName, dealsDef: schemas['deals_db'] });
      } else {
        const prod = schemas['task_crm_db_prod'];
        const deals = schemas['deals_db'];

        if (prod.COLUMN_TYPE !== deals.COLUMN_TYPE || prod.IS_NULLABLE !== deals.IS_NULLABLE) {
          diffCols.push({
            table: tableName,
            column: colName,
            prod: `${prod.COLUMN_TYPE} (NULL: ${prod.IS_NULLABLE}, DEF: ${prod.COLUMN_DEFAULT})`,
            deals: `${deals.COLUMN_TYPE} (NULL: ${deals.IS_NULLABLE}, DEF: ${deals.COLUMN_DEFAULT})`
          });
        }
      }
    }

    console.log(`\n=== COLUMN DIFFERENCES IN COMMON TABLES ===`);
    console.log(`Columns in task_crm_db_prod but MISSING in deals_db: ${missingColsInDeals.length}`);
    if (missingColsInDeals.length > 0) {
      console.log(missingColsInDeals.map(c => `${c.table}.${c.column} (${c.prodDef.COLUMN_TYPE})`));
    }

    console.log(`\nColumns in deals_db but MISSING in task_crm_db_prod: ${missingColsInProd.length}`);
    if (missingColsInProd.length > 0) {
      console.log(missingColsInProd.map(c => `${c.table}.${c.column} (${c.dealsDef.COLUMN_TYPE})`));
    }

    console.log(`\nColumns with DIFFERENT definitions: ${diffCols.length}`);
    if (diffCols.length > 0) {
      console.log(JSON.stringify(diffCols, null, 2));
    }

    // 3. Compare Indexes
    const [indexes] = await pool.query(`
      SELECT TABLE_SCHEMA, TABLE_NAME, INDEX_NAME, COLUMN_NAME, NON_UNIQUE
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA IN ('deals_db', 'task_crm_db_prod')
      ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX
    `);

    const idxMap = {};
    for (const idx of indexes) {
      const key = `${idx.TABLE_NAME}.${idx.INDEX_NAME}.${idx.COLUMN_NAME}`;
      if (!idxMap[key]) idxMap[key] = {};
      idxMap[key][idx.TABLE_SCHEMA] = idx;
    }

    const missingIdxInDeals = Object.keys(idxMap).filter(k => !idxMap[k]['deals_db']);
    const missingIdxInProd = Object.keys(idxMap).filter(k => !idxMap[k]['task_crm_db_prod']);

    console.log(`\n=== INDEX DIFFERENCES ===`);
    console.log(`Indexes in task_crm_db_prod but MISSING in deals_db: ${missingIdxInDeals.length}`);
    if (missingIdxInDeals.length > 0) console.log(missingIdxInDeals);
    console.log(`Indexes in deals_db but MISSING in task_crm_db_prod: ${missingIdxInProd.length}`);
    if (missingIdxInProd.length > 0) console.log(missingIdxInProd);

    // 4. Compare Foreign Keys
    const [fks] = await pool.query(`
      SELECT TABLE_SCHEMA, TABLE_NAME, CONSTRAINT_NAME
      FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA IN ('deals_db', 'task_crm_db_prod') AND CONSTRAINT_TYPE = 'FOREIGN KEY'
    `);
    const fkMap = {};
    for (const fk of fks) {
      const key = `${fk.TABLE_NAME}.${fk.CONSTRAINT_NAME}`;
      if (!fkMap[key]) fkMap[key] = {};
      fkMap[key][fk.TABLE_SCHEMA] = fk;
    }
    const missingFkInDeals = Object.keys(fkMap).filter(k => !fkMap[k]['deals_db']);
    const missingFkInProd = Object.keys(fkMap).filter(k => !fkMap[k]['task_crm_db_prod']);
    console.log(`\n=== FOREIGN KEY DIFFERENCES ===`);
    console.log(`FKs in task_crm_db_prod but MISSING in deals_db: ${missingFkInDeals.length}`);
    if (missingFkInDeals.length > 0) console.log(missingFkInDeals);
    console.log(`FKs in deals_db but MISSING in task_crm_db_prod: ${missingFkInProd.length}`);
    if (missingFkInProd.length > 0) console.log(missingFkInProd);

  } catch (err) {
    console.error('Error during schema comparison:', err);
  } finally {
    process.exit(0);
  }
}

compareSchemas();
