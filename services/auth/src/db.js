import pkg from 'pg';
const {Pool} = pkg;

const pool = new Pool({ connectionString: process.env.AUTH_DB_URL });


export const query = (text, params) => pool.query(text, params);