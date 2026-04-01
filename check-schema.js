import { getPool } from './server/db/pool.js';

async function checkSchema() {
  const pool = await getPool();
  try {
    const [favorites] = await pool.execute('DESCRIBE favorites');
    console.log('--- FAVORITES TABLE ---');
    console.table(favorites);
    
    const [events] = await pool.execute('DESCRIBE events');
    console.log('--- EVENTS TABLE ---');
    console.table(events);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

checkSchema();
