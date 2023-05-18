import dotenv from 'dotenv'

dotenv.config();

export default {
    port: process.env.PORT,
    pg_port: process.env.PG_PORT,
    pg_host: process.env.PG_HOST,
    pg_user: process.env.PG_USER,
    pg_password: process.env.PG_PASSWORD,
    pg_database: process.env.PG_DATABASE,
    jwt_secret: process.env.JWT_SECRET,
    salt: process.env.SALT_ROUNDS,
    pepper: process.env.PEPPER 
}