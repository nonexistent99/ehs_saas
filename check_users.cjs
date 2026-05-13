const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: 'postgresql://postgres.wkxipzashmovnbbxltxi:94PJ8qjPhGZcEAp!@aws-1-us-east-1.pooler.supabase.com:6543/postgres'
  });
  
  try {
    await client.connect();
    console.log("Connected successfully!");

    try {
      const res = await client.query('SELECT id, email FROM auth.users LIMIT 10;');
      console.log('auth.users:', res.rows);
    } catch (e) {
      console.log('Error reading auth.users:', e.message);
    }

  } catch (err) {
    console.error('Connection error:', err.stack);
  } finally {
    await client.end();
  }
}

run();
