export interface DbConnectionConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

export function getTestDbName(): string {
  return process.env.TEST_DB_NAME ?? 'users_db_test';
}

export function getTestDbConnection(): Omit<DbConnectionConfig, 'database'> {
  return {
    host: process.env.TEST_DB_HOST ?? '127.0.0.1',
    port: Number(process.env.TEST_DB_PORT ?? 5434),
    username: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
  };
}

export function getAdminDbConfig(): DbConnectionConfig {
  return {
    ...getTestDbConnection(),
    // "postgres" is Postgres's own maintenance database, always present -- needed here
    // because a connection can't DROP/CREATE the database it's currently connected to.
    database: 'postgres',
  };
}
