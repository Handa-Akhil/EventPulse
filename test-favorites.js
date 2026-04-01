import { fetchInitialData } from './src/services/api.js'; // This won't work in node directly without polyfills

// I'll use a direct fetch with the token I can find from local storage? 
// No, I'll just write a script that uses the pool to test the INSERT.

import { getPool } from './server/db/pool.js';
import { randomUUID } from 'node:crypto';

async function testInsert() {
  const pool = await getPool();
  const userId = 'TEST-USER-ID'; // Need a real one?
  const eventId = 'midnight-mission';
  
  try {
    // 1. Check if user exists
    const [users] = await pool.execute('SELECT id FROM users LIMIT 1');
    if (users.length === 0) {
      console.log('No users found to test with.');
      process.exit(0);
    }
    const realUserId = users[0].id;
    console.log('Testing with real user ID:', realUserId);

    // 2. Try the INSERT
    const id = randomUUID();
    await pool.execute(
      "INSERT INTO favorites (id, user_id, event_id) VALUES (?, ?, ?)",
      [id, realUserId, eventId]
    );
    console.log('INSERT successful!');
    
    // 3. Try the DELETE
    await pool.execute(
      "DELETE FROM favorites WHERE id = ?",
      [id]
    );
    console.log('DELETE successful!');
  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    process.exit(0);
  }
}

testInsert();
