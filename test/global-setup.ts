import { config } from 'dotenv';
import { Client } from 'pg';
import { getAdminDbConfig, getTestDbName } from './test-db.config';

export default async function globalSetup(): Promise<void> {
  config({ quiet: true });

  const testDbName = getTestDbName();
  const adminDbConfig = getAdminDbConfig();

  const client = new Client({
    host: adminDbConfig.host,
    port: adminDbConfig.port,
    user: adminDbConfig.username,
    password: adminDbConfig.password,
    database: adminDbConfig.database,
  });

  await client.connect();

  try {
    await client.query(`DROP DATABASE IF EXISTS "${testDbName}" WITH (FORCE)`);
    await client.query(`CREATE DATABASE "${testDbName}"`);
  } finally {
    await client.end();
  }
}
