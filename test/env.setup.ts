import { config } from 'dotenv';
import { getTestDbConnection, getTestDbName } from './test-db.config';

config({ quiet: true });

const testDbConnection = getTestDbConnection();
process.env.DB_HOST = testDbConnection.host;
process.env.DB_PORT = String(testDbConnection.port);
process.env.DB_NAME = getTestDbName();
