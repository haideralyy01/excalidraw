const { Client } = require('pg');

const connectionString = "postgresql://ef1bd12a68fdafc7e1a54c5a904a1bbad426f684789c7172d437b88bc99ffcac:sk_pdf58-1gfTvq7VtKPd5zI@pooled.db.prisma.io:5432/postgres?sslmode=verify-full";

async function main() {
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  await client.connect();

  console.log("Connected to database. Querying tables...");

  try {
    const usersRes = await client.query('SELECT id, name, email FROM "User" LIMIT 5;');
    console.log("Users in DB:", usersRes.rows);

    const roomsRes = await client.query('SELECT id, slug, "adminId" FROM "Room" LIMIT 5;');
    console.log("Rooms in DB:", roomsRes.rows);
  } catch (err) {
    console.error("Query error:", err);
  } finally {
    await client.end();
  }
}

main();
