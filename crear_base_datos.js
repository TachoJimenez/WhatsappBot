const mysql = require('mysql2/promise');

const config = {
    host: 'localhost',
    user: 'root',
    password: 'root', // Misma contraseña que tienes en conexion.js
    port: 3306
};

async function setup() {
    let connection;
    try {
        // 1. Conectar sin base de datos para crearla
        console.log('Conectando a MySQL...');
        connection = await mysql.createConnection(config);

        // 2. Crear BD si no existe
        console.log("Creando base de datos 'whatsapp_bot'...");
        await connection.query(`CREATE DATABASE IF NOT EXISTS whatsapp_bot`);
        console.log("Base de datos creada (o ya existía).");

        // 3. Usar la BD
        await connection.query(`USE whatsapp_bot`);

        // 4. Crear tabla 'contactos'
        console.log("Creando tabla 'contactos'...");
        const sqlContacto = `
            CREATE TABLE IF NOT EXISTS contactos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                telefono VARCHAR(50) NOT NULL UNIQUE,
                nombre VARCHAR(100),
                fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
                ultima_conversacion DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;
        await connection.query(sqlContacto);
        console.log("Tabla 'contactos' asegurada.");

        console.log("\n¡Listo! Base de datos configurada correctamente.");

    } catch (error) {
        console.error("ERROR:", error.message);
    } finally {
        if (connection) await connection.end();
    }
}

setup();
