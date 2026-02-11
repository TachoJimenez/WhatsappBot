const mysql = require('mysql2/promise');

class Conexion {
    constructor() {
        this.pool = mysql.createPool({
            host: '127.0.0.1',
            user: 'bot',
            password: 'BotClave123!',
            database: 'whatsapp_bot',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
    }

    async query(sql, params = []) {
        const [rows] = await this.pool.execute(sql, params);
        return rows;
    }
}

module.exports = new Conexion();