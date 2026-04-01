import { getPool } from './server/db/pool.js';
import { randomUUID } from 'crypto';

async function debugInsert() {
  const pool = await getPool();
  try {
    const [users] = await pool.execute('SELECT id FROM users LIMIT 1');
    if (users.length === 0) {
      console.log('No users to test with.');
      return;
    }
    const userId = users[0].id;
    const eventId = 'midnight-mission';
    const id = Date.now().toString(36);

    console.log(`Attempting INSERT for User: ${userId}, Event: ${eventId}`);
    
    // Try plain query
    try {
      await pool.query(
        "INSERT INTO favorites (id, user_id, event_id) VALUES (?, ?, ?)",
        [id, userId, eventId]
      );
      console.log('INSERT with query(?) worked!');
    } catch (e) {
      console.error('INSERT with query(?) FAILED:', e.message);
    }
    
    // Try named query
    try {
      await pool.query(
        "INSERT INTO favorites (id, user_id, event_id) VALUES (:id, :userId, :eventId)",
        { id: id + 'b', userId, eventId }
      );
      console.log('INSERT with query(:name) worked!');
    } catch (e) {
      console.error('INSERT with query(:name) FAILED:', e.message);
    }

  } catch (err) {
    console.error('Pool connection failed:', err.message);
  } finally {
    process.exit(0);
  }
}

debugInsert();
