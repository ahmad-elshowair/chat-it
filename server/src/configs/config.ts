import dotenv from "dotenv";

dotenv.config();

export default {
  port: Number(process.env.PORT),
  pg_port: Number(process.env.PG_PORT),
  pg_host: process.env.PG_HOST,
  pg_user: process.env.PG_USER,
  pg_password: process.env.PG_PASSWORD,
  pg_database: process.env.PG_DATABASE,
  jwt_secret: String(process.env.JWT_SECRET),
  salt: Number(process.env.SALT_ROUNDS),
  pepper: process.env.PEPPER,
  node_env: process.env.NODE_ENV,
  jwt_refresh_secret: String(process.env.JWT_REFRESH_SECRET),
  client_url: String(process.env.CLIENT_URL),
};
