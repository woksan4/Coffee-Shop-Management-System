import mysql from 'mysql2/promise';
import 'dotenv/config';

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'coffee_app',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'coffee_shop',
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: false,
  timezone: 'Z',
  supportBigNumbers: true,
  bigNumberStrings: false
});
export default pool;
