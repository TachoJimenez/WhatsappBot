/**
 * Bot WhatsApp con whatsapp-web.js
 * - Loguea en consola cada peticion: numero entrante y mensaje
 * - Envia a numeros aunque NO esten en contactos (usa getNumberId)
 * - Soporta media por archivo local o URL
 * - Respuestas JSON consistentes
 * Requisitos: Node 16+, whatsapp-web.js, qrcode-terminal
 */
require('dotenv').config();


const http = require('http');
const https = require('https');            // ? agregado
const { URL } = require('url');            // ? agregado
const fs = require('fs');
const qrcode = require('qrcode-terminal');
const {
    Client,
    LocalAuth,
    MessageMedia
} = require('whatsapp-web.js');
const conexion = require('./conexion');

// (Variables movidas mas abajo)

function esEmailValido(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(String(email || '').trim());
}

const OSTICKET_URL = process.env.OSTICKET_URL;
const OSTICKET_API_KEY = process.env.OSTICKET_API_KEY;


function menuPrincipal() {
    return `*MENÚ PRINCIPAL*
1 Información
2 Soporte
3 Horarios
4 Salir`;
}

function menuSoporte() {
    return `*SOPORTE TÉCNICO*
1 Reportar problema
2 Hablar con asesor
0 Volver al menú`;
}

// -------------------------------------------------------------
// Configuracion
// -------------------------------------------------------------
const hostname = '127.0.0.1';
const port = process.env.PUERTO || 8083;

// Nmeros para notificaciin de arranque (opcional, formato @c.us)
// var numeroConectado = "";  <-- ELIMINADO POR DUPLICIDAD
const numeroInicio = "5215511223344@c.us"; // Numero que recibe aviso cuando arranca el servicio
const numeroInicio2 = "";
// const url_notificacion = "http://localhost:5245/api/Whatsapp/Respuesta";
const url_notificacion = "http://localhost:3000/webhook/whatsapp";

// -------------------------------------------------------------
// VARIABLES GLOBALES EN MEMORIA
// -------------------------------------------------------------
let isReady = false;
let numeroConectado = null;
const estadosUsuario = {};
const esperandoNombre = {};
const esperandoEmail = {};
const bufferMensajes = {};  // buffer para mensajes multiparte (legacy)
const memoriaUsuarios = {}; // { '521...': { topicId: 1, topicName: '...' } }
let bufferTicket = {};      // ✅ NUEVO: buffer para el snippet del usuario
let pendientesAdjunto = {}; // ✅ NUEVO: para guardar mensaje mientras decide adjuntar

// TEMAS DE AYUDA (Mapeo ID -> Nombre) - AJUSTAR IDs SEGÚN TU OSTICKET
const OSTICKET_TOPICS = {
    '1': 'Soporte General',
    '2': 'Facturación',
    '3': 'Ventas',
    '4': 'Reporte de Fallas'
};

// -------------------------------------------------------------
/** Helpers */
// -------------------------------------------------------------
function ts() {
    return new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
}

function onlyDigits(s) {
    return String(s || '').replace(/\D/g, '');
}

/**
 * Normaliza a digitos E.164 sin '+'. Si recibe 10 digitos, antepone pais MX (52).
 * Cambia '52' si tu pais base es otro.
 */
function toE164Digits(raw, defaultCountry = '52') {
    const digits = onlyDigits(raw);
    if (!digits) return '';
    if (digits.startsWith(defaultCountry)) return digits;
    if (digits.length === 10) return defaultCountry + digits; // nacional MX
    return digits; // ya trae pais
}

/** Devuelve ultimos 10 digitos (util para MX local) */
function last10(raw) {
    const d = onlyDigits(raw);
    return d.slice(-10);
}

/** Helper para extensión de archivo */
function getExtension(mimetype) {
    const map = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/webp': '.webp',
        'image/gif': '.gif',
        'application/pdf': '.pdf',
        'application/msword': '.doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
        'application/vnd.ms-excel': '.xls',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
        'text/plain': '.txt'
    };
    return map[mimetype] || '';
}


/** POST JSON (http/https nativo) */
function postJSON(urlString, data) {
    return new Promise((resolve, reject) => {
        try {
            const u = new URL(urlString);
            const body = JSON.stringify(data);
            const isHttps = u.protocol === 'https:';
            const lib = isHttps ? https : http;

            const options = {
                hostname: u.hostname,
                port: u.port || (isHttps ? 443 : 80),
                path: u.pathname + (u.search || ''),
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(body)
                },
                timeout: 10000
            };

            const req = lib.request(options, (res) => {
                let chunks = [];
                res.on('data', (c) => chunks.push(c));
                res.on('end', () => {
                    const text = Buffer.concat(chunks).toString('utf8');
                    resolve({ status: res.statusCode, body: text });
                });
            });

            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy(new Error('timeout'));
            });

            req.write(body);
            req.end();
        } catch (err) {
            reject(err);
        }
    });
}

/**
 * Envia texto/media a un numero que puede NO estar en contactos.
 * Retorna: { ok:boolean, reason?:string, to?:string }
 */
async function sendToNumber(client, rawNumber, text, opts = {}) {
    const e164 = toE164Digits(rawNumber, '52'); // cambia 52 si tu pais base no es MX
    if (!e164) {
        console.log(`[${ts()}] numero_invalido | raw="${rawNumber}"`);
        return { ok: false, reason: 'numero_invalido' };
    }

    console.log(`[${ts()}] Envio | numeroE164=${e164} | mensaje="${(text || '').replace(/\s+/g, ' ').slice(0, 200)}${text && text.length > 200 ? '…' : ''}"`);

    // Verifica si el numero existe en WhatsApp
    const numberId = await client.getNumberId(e164);
    if (!numberId) {
        console.log(`[${ts()}] no_existe_en_whatsapp | e164=${e164}`);
        return { ok: false, reason: 'no_existe_en_whatsapp' };
    }

    const { archivoLocal, archivoUrl, caption } = opts;
    try {
        if (!archivoLocal && !archivoUrl) {
            await client.sendMessage(numberId._serialized, text || '');
            console.log(`[${ts()}] Enviado | to=${numberId._serialized}`);
            return { ok: true, to: numberId._serialized };
        }

        let media = null;
        if (archivoLocal) {
            if (!fs.existsSync(archivoLocal)) {
                console.log(`[${ts()}] archivo_local_no_existe | ${archivoLocal}`);
                return { ok: false, reason: 'archivo_local_no_existe' };
            }
            console.log(`[${ts()}] Media | local="${archivoLocal}" | caption="${(caption || text || '').slice(0, 120)}${(caption || text || '').length > 120 ? '…' : ''}"`);
            media = MessageMedia.fromFilePath(archivoLocal);
        } else if (archivoUrl) {
            console.log(`[${ts()}] Media | url="${archivoUrl}" | caption="${(caption || text || '').slice(0, 120)}${(caption || text || '').length > 120 ? '…' : ''}"`);
            media = await MessageMedia.fromUrl(archivoUrl);
        }

        await client.sendMessage(numberId._serialized, media, { caption: caption || text || '' });
        console.log(`[${ts()}] Enviado  | to=${numberId._serialized}`);
        return { ok: true, to: numberId._serialized };
    } catch (err) {
        console.error(`[${ts()}] error_envio:`, err?.message || err);
        return { ok: false, reason: 'error_envio' };
    }
}

function crearTicketOsTicket({ nombre, email, telefono, mensaje, topicId, attachments = [] }) {
    return new Promise((resolve, reject) => {

        const safeAttachments = (attachments || []).map(a => {

            let data = a.data;
            let type = a.type;
            let name = a.name;

            // Si viene en formato data:image/jpeg;base64,...
            if (typeof data === 'string' && data.includes('base64,')) {
                data = data.split('base64,')[1];
            }

            // 🔥 Detectar tipo si no viene definido
            if (!type || type === 'application/octet-stream') {
                if (name.endsWith('.jpg') || name.endsWith('.jpeg')) {
                    type = 'image/jpeg';
                } else if (name.endsWith('.png')) {
                    type = 'image/png';
                } else if (name.endsWith('.pdf')) {
                    type = 'application/pdf';
                } else if (name.endsWith('.doc')) {
                    type = 'application/msword';
                } else if (name.endsWith('.docx')) {
                    type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                }
            }

            return {
                name: name,
                data: data,
                type: type
            };
        });

        const payload = {
            name: nombre,
            email: email,
            subject: `Soporte WhatsApp - ${telefono}`,
            message: `📱 WhatsApp: ${telefono}\n\n${mensaje}`,
            ip: "127.0.0.1",
            topicId: topicId || 1,
            attachments: safeAttachments
        };

        const data = JSON.stringify(payload);

        const u = new URL(OSTICKET_URL);
        const isHttps = u.protocol === 'https:';
        const lib = isHttps ? https : http;

        const options = {
            hostname: u.hostname,
            port: u.port || (isHttps ? 443 : 80),
            path: u.pathname + u.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-API-Key': OSTICKET_API_KEY,
                'Content-Length': Buffer.byteLength(data)
            }
        };

        console.log('--- osTicket REQUEST ---');
        console.log('URL:', u.toString());

        const req = lib.request(options, (res) => {
            let body = '';
            res.on('data', (c) => body += c);
            res.on('end', () => {
                console.log('--- osTicket RESPONSE ---');
                console.log('STATUS:', res.statusCode);
                console.log('HEADERS:', res.headers);
                console.log('BODY:', body);

                if (res.statusCode === 201 || res.statusCode === 200) {
                    let parsed = null;
                    try { parsed = JSON.parse(body); } catch (_) { }

                    const ticketFromJson =
                        parsed?.ticket?.number ||
                        parsed?.number ||
                        parsed?.ticket_number ||
                        parsed?.id ||
                        null;

                    const ticketFromText = (!ticketFromJson && typeof body === 'string')
                        ? (body.match(/\b\d{5,}\b/)?.[0] || null)
                        : null;

                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        rawBody: body,
                        json: parsed,
                        ticket: ticketFromJson || ticketFromText
                    });
                } else {
                    reject(new Error(`osTicket respondió ${res.statusCode}: ${body}`));
                }
            });
        });

        req.on('error', (err) => reject(err));
        req.write(data);
        req.end();
    });
}

async function finalizarCreacionTicket(msg, usuario, telefono, mensajeCompleto, archivoPath = null) {
    // Traer datos del contacto (incluye tipo_usuario)
    const contacto = await conexion.query(
        'SELECT nombre, email, tipo_usuario FROM contactos WHERE telefono = ?',
        [telefono]
    );

    const nombre = contacto[0]?.nombre || 'Invitado';
    const email = contacto[0]?.email || null;
    const tipoUsuario = contacto[0]?.tipo_usuario || 'invitado';

    // Si no hay email, pedirlo y NO finalizar
    if (!email) {
        esperandoEmail[usuario] = true;
        await msg.reply(
            '📧 Antes de crear el ticket necesito tu *correo real*.\n' +
            'Escríbelo (ej: nombre@dominio.com) o escribe *0* para cancelar.'
        );
        return;
    }

    // ✅ Construir adjuntos si existen
    const attachments = [];
    if (archivoPath && archivoPath.data) {
        const ext = getExtension(archivoPath.mimetype);
        const name = archivoPath.filename || `archivo-adjunto${ext}`;

        attachments.push({
            "name": name,
            "data": archivoPath.data, // SOLO base64 sin prefijo
            "type": archivoPath.mimetype,
            "encoding": "base64"  // INDICAR encoding explícito
        });
    }

    // ✅ Crear ticket en osTicket
    // (tu función actual devuelve body como string con el ID, ej: "668335")
    const respuestaOsTicket = await crearTicketOsTicket({
        nombre,
        email,
        telefono,
        mensaje: mensajeCompleto,
        attachments
    });

    // Intentar extraer ID del body
    // (Ajuste para tu funcion que retorna objeto complejo)
    let bodyStr = '';
    if (typeof respuestaOsTicket === 'string') bodyStr = respuestaOsTicket;
    else if (respuestaOsTicket.ticket) bodyStr = String(respuestaOsTicket.ticket);
    else if (respuestaOsTicket.body) bodyStr = respuestaOsTicket.body;

    const idTicketCreado = bodyStr.match(/\b\d{5,}\b/)?.[0] || null;

    // ✅ Guardar en tu tabla local tickets_whatsapp
    await conexion.query(
        `INSERT INTO tickets_whatsapp 
         (telefono, nombre, email, mensaje, ticket_id_osticket, tipo_usuario, fecha_creacion)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [telefono, nombre, email, mensajeCompleto, idTicketCreado, tipoUsuario]
    );

    // ✅ Estado post ticket (tu misma idea)
    estadosUsuario[usuario] = 'POST_TICKET';

    await msg.reply(
        '✅ Tu ticket ha sido creado correctamente en nuestro sistema.\n' +
        (idTicketCreado ? `🆔 Ticket ID: *${idTicketCreado}*\n` : '') +
        'Un técnico te contactará pronto.\n\n' +
        '¿Qué deseas hacer ahora?\n' +
        '1 Volver al menú\n' +
        '2 Salir'
    );
}

// -------------------------------------------------------------
/** Cliente WhatsApp */
// -------------------------------------------------------------
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: 'bot-whatsapp'
    }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});


client.on('disconnected', (reason) => {
    console.log('WhatsApp desconectado:', reason);
});

// QR para la primera vinculacion
client.on('qr', (qr) => {
    console.log(`[${ts()}] Escanea el QR para vincular tu sesion:`);
    qrcode.generate(qr, { small: true });
});

async function onClientReady() {
    if (isReady) return;
    isReady = true;

    try {
        console.log(`[${ts()}] WhatsApp conectado correctamente`);

        const myWid = client.info?.wid?._serialized || '';
        const myDigits = onlyDigits(myWid);
        numeroConectado = myDigits ? myDigits.slice(-10) : null;

        console.log(`[${ts()}] Mi número WhatsApp: ${myWid}`);

        // Avisos por WhatsApp (con retardo para asegurar carga de chats)
        setTimeout(async () => {
            try {
                if (numeroInicio) {

                }
            } catch (e) {
                console.log(`[DEBUG] No se pudo enviar mensaje de inicio: ${e.message}`);
            }
        }, 3000);

    } catch (err) {
        console.error(`[${ts()}] Error en ready:`, err);
    }
}

// Listo
client.on('ready', onClientReady);

client.on('message', async (msg) => {

    if (msg.from === 'status@broadcast' || msg.to === 'status@broadcast') return;
    if (msg.fromMe) return;
    if (!msg.from.endsWith('@c.us')) return;

    const textoOriginal = (msg.body || '').trim();

    // Normalización: minúsculas y sin acentos
    const normalizado = textoOriginal
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    const usuario = msg.from;
    const telefono = usuario.replace('@c.us', '');

    console.log(`[${ts()}] Mensaje recibido de ${usuario}`);

    // Helper: intenta extraer el ID del ticket sin importar el tipo de respuesta
    const extraerTicketId = (respuestaOsTicket) => {
        // Caso 1: si tu función devuelve el ID como string (ej: "668335")
        if (typeof respuestaOsTicket === 'string') {
            const id = respuestaOsTicket.trim();
            return id || null;
        }

        // Caso 2: si tu función devuelve un número
        if (typeof respuestaOsTicket === 'number') return String(respuestaOsTicket);

        // Caso 3: si devuelve objeto: { ticketId }, { ticket }, { body }, { rawBody }
        if (respuestaOsTicket && typeof respuestaOsTicket === 'object') {
            if (respuestaOsTicket.ticketId) return String(respuestaOsTicket.ticketId).trim();
            if (respuestaOsTicket.ticket) return String(respuestaOsTicket.ticket).trim();

            const body = respuestaOsTicket.body ?? respuestaOsTicket.rawBody ?? null;
            if (typeof body === 'string') {
                const id = body.trim();
                return id || null;
            }
        }

        return null;
    };

    try {
        // 1. Comando universal 'menu'
        if (normalizado === 'menu') {
            const resultados = await conexion.query(
                'SELECT nombre, tipo_usuario FROM contactos WHERE telefono = ?',
                [telefono]
            );

            if (resultados.length === 0 || resultados[0].tipo_usuario === 'invitado') {
                // Usuario NO registrado -> Preguntar
                estadosUsuario[usuario] = 'SELECCION_INGRESO';
                await msg.reply(
                    'Hola 👋\nNo te encuentras registrado en nuestra base de datos.\n\n' +
                    '¿Cómo deseas continuar?\n' +
                    '1 Entrar como *Invitado*\n' +
                    '2 *Registrarme-Entrar*'
                );
                return;
            } else {
                // Usuario registrado -> Saludo personalizado
                const nombre = resultados[0].nombre;
                estadosUsuario[usuario] = 'MENU_PRINCIPAL';
                // Saludo con nombre y número
                await msg.reply(
                    `Hola *${nombre}* con el número *${telefono}*, es un gusto verte de nuevo.\n` +
                    `Por favor escoge una opción del menú.\n\n${menuPrincipal()}`
                );
                return;
            }
        }

        // 2. Manejo de Selección (Invitado vs Registro)
        if (estadosUsuario[usuario] === 'SELECCION_INGRESO') {
            if (normalizado === '1') {
                // Invitado -> Lo registramos como tal si no existe, o actualizamos
                const nombreInvitado = 'Invitado';
                // Insertamos o ignoramos si ya existe, marcándolo como invitado
                await conexion.query(
                    `INSERT INTO contactos (telefono, nombre, tipo_usuario, fecha_registro, ultima_conversacion) 
                     VALUES (?, ?, 'invitado', NOW(), NOW())
                     ON DUPLICATE KEY UPDATE tipo_usuario = 'invitado', ultima_conversacion = NOW()`,
                    [telefono, nombreInvitado]
                );

                estadosUsuario[usuario] = 'MENU_PRINCIPAL';
                await msg.reply(`Entendido, continúas como *Invitado*.\n\n${menuPrincipal()}`);
            } else if (normalizado === '2') {
                // Registrarse
                delete estadosUsuario[usuario];
                esperandoNombre[usuario] = true;
                await msg.reply('Perfecto. Por favor, dime tu nombre para registrarte.');
            } else {
                await msg.reply('⚠️ Opción inválida. Responde *1* para Invitado o *2* para Registrarte.');
            }
            return;
        }

        // 3. Manejo de Flujo de Registro (Captura de nombre)
        if (esperandoNombre[usuario]) {
            const nombre = textoOriginal;

            // Insertar o actualizar como usuario interno
            await conexion.query(
                `INSERT INTO contactos (telefono, nombre, tipo_usuario, fecha_registro, ultima_conversacion) 
                 VALUES (?, ?, 'interno', NOW(), NOW())
                 ON DUPLICATE KEY UPDATE nombre = ?, tipo_usuario = 'interno', ultima_conversacion = NOW()`,
                [telefono, nombre, nombre]
            );

            delete esperandoNombre[usuario];
            estadosUsuario[usuario] = 'MENU_PRINCIPAL';

            await msg.reply(`Gracias *${nombre}* 🙌\nTu registro ha sido completado.\n\n${menuPrincipal()}`);
            return;
        }

        // ✅ ANEXO EMAIL: si estamos esperando el email de este usuario
        if (esperandoEmail[usuario]) {

            // permitir cancelar (0 o menu)
            if (normalizado === '0' || normalizado === 'menu') {
                delete esperandoEmail[usuario];
                estadosUsuario[usuario] = 'MENU_PRINCIPAL';
                await msg.reply('Operación cancelada.\n\n' + menuPrincipal());
                return;
            }

            const emailIngresado = textoOriginal.trim();

            if (!esEmailValido(emailIngresado)) {
                await msg.reply(
                    '❌ Ese correo no parece válido.\n' +
                    'Escríbelo de nuevo (ej: nombre@dominio.com) o escribe *0* para cancelar.'
                );
                return;
            }

            await conexion.query(
                'UPDATE contactos SET email = ?, ultima_conversacion = NOW() WHERE telefono = ?',
                [emailIngresado, telefono]
            );

            delete esperandoEmail[usuario];

            // regresar al flujo del ticket
            estadosUsuario[usuario] = 'CREANDO_TICKET';
            await msg.reply('✅ Listo, correo guardado.\nAhora escribe tu problema para crear el ticket.\n\nCuando termines, escribe la palabra *FIN*.');
            return;
        }

        // 4. Manejo de Menús (Solo si el usuario tiene un estado activo)
        const estado = estadosUsuario[usuario];

        if (estado === 'MENU_PRINCIPAL') {
            switch (normalizado) {
                case '1':
                    await msg.reply('📄 *Información general*\nSomos una empresa dedicada al soporte técnico y soluciones digitales.');
                    break;
                case '2':
                    estadosUsuario[usuario] = 'MENU_SOPORTE';
                    await msg.reply(menuSoporte());
                    break;
                case '3':
                    await msg.reply('🕒 *Horarios*\nAtendemos de Lunes a Viernes de 9:00 AM a 6:00 PM.');
                    break;
                case '4':
                    delete estadosUsuario[usuario];
                    await msg.reply('¡Hasta pronto! 👋 Si necesitas algo más, solo escribe *menu*.');
                    break;
                default:
                    await msg.reply('⚠️ Opción inválida.\n\n' + menuPrincipal());
            }
            return;
        }

        if (estado === 'MENU_SOPORTE') {
            switch (normalizado) {
                case '1':
                    // Opción 1: Crear Nuevo Ticket -> Ir a selección de tema
                    estadosUsuario[usuario] = 'SELECCIONAR_TEMA';
                    {
                        let msgTemas = '📂 *Selecciona un Tema de Ayuda:*\n';
                        for (const [key, val] of Object.entries(OSTICKET_TOPICS)) {
                            msgTemas += `${key}. ${val}\n`;
                        }
                        msgTemas += '\n0. Volver al menú';
                        await msg.reply(msgTemas);
                    }
                    break;
                case '2':
                    // Opción 2: Consultar Estatus -> Listar últimos tickets
                    try {
                        const tickets = await conexion.query(
                            'SELECT id, ticket_id_osticket, fecha_creacion, mensaje FROM tickets_whatsapp WHERE telefono = ? ORDER BY id DESC LIMIT 5',
                            [telefono]
                        );

                        if (tickets.length === 0) {
                            await msg.reply('📭 No tienes tickets registrados con nosotros.');
                        } else {
                            let msgList = '📋 *Tus últimos tickets:*\n\n';
                            tickets.forEach(t => {
                                const idOs = t.ticket_id_osticket || 'Pendiente';
                                const fecha = new Date(t.fecha_creacion).toLocaleDateString();
                                const extracto = t.mensaje.substring(0, 30).replace(/\n/g, ' ') + '...';
                                msgList += `🆔 *${idOs}* (${fecha})\n📝 ${extracto}\n\n`;
                            });
                            msgList += 'Escribe *0* para volver al menú.';
                            await msg.reply(msgList);
                        }
                    } catch (error) {
                        console.error('Error consultando tickets:', error);
                        await msg.reply('❌ Error consultando tus tickets.');
                    }
                    // Mantenemos al usuario en "limbo" o MENU_PRINCIPAL para que con "0" o "menu" salga
                    estadosUsuario[usuario] = 'MENU_PRINCIPAL';
                    break;

                case '0':
                    estadosUsuario[usuario] = 'MENU_PRINCIPAL';
                    await msg.reply(menuPrincipal());
                    break;
                default:
                    await msg.reply('⚠️ Opción inválida.\n\n' + menuSoporte());
            }
            return;
        }

        // ✅ 1. Selección de Tema
        if (estado === 'SELECCIONAR_TEMA') {
            if (OSTICKET_TOPICS[normalizado]) {
                memoriaUsuarios[usuario] = {
                    ...memoriaUsuarios[usuario],
                    topicId: normalizado,
                    topicName: OSTICKET_TOPICS[normalizado]
                };

                // NUEVO FLUJO: Verificar si ya tiene email
                const contacto = await conexion.query(
                    'SELECT email FROM contactos WHERE telefono = ?',
                    [telefono]
                );
                const email = contacto[0]?.email;

                if (!email) {
                    // Si NO tiene email, pedirlo
                    esperandoEmail[usuario] = true;
                    // Borramos estado de tema para que al terminar email se setee CREANDO_TICKET
                    // OJO: esperandoEmail al terminar setea CREANDO_TICKET automáticamente
                    delete estadosUsuario[usuario];

                    await msg.reply(
                        '📧 Para continuar, necesito tu *correo electrónico*.\n' +
                        'Por favor escríbelo (ej: nombre@dominio.com) o escribe *0* para cancelar.'
                    );
                } else {
                    // Si YA tiene email, directo a describir problema
                    estadosUsuario[usuario] = 'CREANDO_TICKET';
                    bufferTicket[usuario] = [];

                    await msg.reply(
                        '✅ Tema: *' + OSTICKET_TOPICS[normalizado] + '*\n\n' +
                        '📝 *Describe tu problema para crear el ticket.*\n' +
                        'Puedes enviar varios mensajes.\n' +
                        'Cuando termines, escribe la palabra *FIN*.\n\n' +
                        'Escribe *0* o *menu* para cancelar.'
                    );
                }

            } else if (normalizado === '0' || normalizado === 'menu') {
                estadosUsuario[usuario] = 'MENU_SOPORTE';
                await msg.reply(menuSoporte());
            } else {
                await msg.reply('⚠️ Elige una opción válida de la lista.');
            }
            return;
        }

        // ===============================
        // ✅ DENTRO de client.on('message', ...)
        // SOLO actualiza este bloque (CREANDO_TICKET + POST_TICKET)
        // ===============================

        if (estado === 'CREANDO_TICKET') {

            // Permitir cancelar
            if (normalizado === '0' || normalizado === 'menu') {
                estadosUsuario[usuario] = 'MENU_PRINCIPAL';
                await msg.reply(menuPrincipal());
                return;
            }

            // ✅ Si estás construyendo el mensaje por partes y usas "fin":
            // Guarda el texto en memoria hasta que llegue "fin"
            // (Esto mantiene tu lógica: el ticket se crea al escribir FIN)
            bufferTicket = bufferTicket || {}; // por si no existe
            bufferTicket[usuario] = bufferTicket[usuario] || [];

            // Si el usuario escribe FIN => preguntar adjunto SI/NO
            if (normalizado === 'fin') {
                const mensajeCompleto = bufferTicket[usuario].join('\n').trim();

                if (!mensajeCompleto) {
                    await msg.reply('⚠️ No recibí descripción del problema. Escribe tu problema y luego escribe *fin*.');
                    return;
                }

                // Guardamos temporalmente el mensaje y preguntamos por adjunto
                pendientesAdjunto = pendientesAdjunto || {};
                pendientesAdjunto[usuario] = { mensajeCompleto };

                estadosUsuario[usuario] = 'PREGUNTA_ADJUNTO';
                await msg.reply('📎 ¿Deseas adjuntar un archivo?\nResponde:\n1 Sí\n2 No');
                return;
            }

            // Si no es FIN, acumular texto
            bufferTicket[usuario].push(textoOriginal);
            // await msg.reply('✅ Anotado. Cuando termines escribe *fin* para crear el ticket.'); // Opcional feedback
            return;
        }


        // ✅ Estado para decidir adjunto (1 sí / 2 no)
        if (estado === 'PREGUNTA_ADJUNTO') {
            // seguridad
            pendientesAdjunto = pendientesAdjunto || {};
            const dataPendiente = pendientesAdjunto[usuario];

            if (!dataPendiente?.mensajeCompleto) {
                // si por alguna razón no existe, regresamos al flujo de ticket
                estadosUsuario[usuario] = 'CREANDO_TICKET';
                await msg.reply('⚠️ Ocurrió un detalle. Escribe tu problema de nuevo y al final escribe *fin*.');
                return;
            }

            if (normalizado === '1') {
                // Sí adjuntar => pasar a estado que espera archivo
                estadosUsuario[usuario] = 'ESPERANDO_ARCHIVO';
                await msg.reply('📎 Perfecto. Envía el archivo ahora (imagen, PDF, etc.).');
                return;
            }

            if (normalizado === '2') {
                // No adjuntar => finalizar creación del ticket
                try {
                    await finalizarCreacionTicket(msg, usuario, telefono, dataPendiente.mensajeCompleto, null);

                    // limpiar buffers
                    delete pendientesAdjunto[usuario];
                    delete bufferTicket?.[usuario];

                } catch (err) {
                    console.error('Error osTicket:', err);
                    await msg.reply(
                        '❌ Hubo un error al crear el ticket.\n\n' +
                        '1. Escribe *fin* para reintentar.\n' +
                        '2. Escribe *0* para cancelar y volver al menú.'
                    );
                    estadosUsuario[usuario] = 'CREANDO_TICKET';
                }
                return;
            }

            await msg.reply('⚠️ Opción inválida. Responde:\n1 Sí\n2 No');
            return;
        }


        // ✅ Recibir el archivo si dijo "1 Sí"
        if (estado === 'ESPERANDO_ARCHIVO') {
            // Si manda "2" o "no", se interpreta como NO adjuntar
            if (normalizado === '2' || normalizado === 'no') {
                estadosUsuario[usuario] = 'PREGUNTA_ADJUNTO';
                await msg.reply('📎 Entendido. Responde:\n2 No');
                return;
            }

            try {
                pendientesAdjunto = pendientesAdjunto || {};
                const dataPendiente = pendientesAdjunto[usuario];

                if (!dataPendiente?.mensajeCompleto) {
                    estadosUsuario[usuario] = 'CREANDO_TICKET';
                    await msg.reply('⚠️ Ocurrió un detalle. Escribe tu problema de nuevo y al final escribe *fin*.');
                    return;
                }

                // Verificar si tiene medios
                if (msg.hasMedia) {
                    try {
                        const media = await msg.downloadMedia();
                        if (media) {
                            // Enviamos con el archivo descargado en memoria (base64)
                            await finalizarCreacionTicket(msg, usuario, telefono, dataPendiente.mensajeCompleto, media);
                        } else {
                            throw new Error('No se pudo descargar el medio.');
                        }
                    } catch (downloadErr) {
                        console.error('Error descargando media:', downloadErr);
                        await msg.reply('⚠️ No pude descargar el archivo. Intenta enviarlo de nuevo o responde *2* para continuar sin archivo.');
                        return;
                    }
                } else {
                    // Si no es un archivo y no es comando de cancelación
                    if (normalizado === '0') {
                        estadosUsuario[usuario] = 'MENU_PRINCIPAL';
                        await msg.reply(menuPrincipal());
                        return;
                    }

                    await msg.reply('⚠️ Por favor envía el archivo (imagen, documento) o escribe *2* (o *no*) para omitir.');
                    return;
                }

                // limpiar buffers
                delete pendientesAdjunto[usuario];
                delete bufferTicket?.[usuario];

            } catch (err) {
                console.error('Error osTicket:', err);
                await msg.reply(
                    '❌ Hubo un error al crear el ticket.\n\n' +
                    '1. Escribe *fin* para reintentar.\n' +
                    '2. Escribe *0* para cancelar y volver al menú.'
                );
                estadosUsuario[usuario] = 'CREANDO_TICKET';
            }
            return;
        }


        // ✅ NUEVO ESTADO: qué hacer después de crear ticket (tu misma lógica)
        if (estado === 'POST_TICKET') {
            switch (normalizado) {
                case '1':
                    estadosUsuario[usuario] = 'MENU_PRINCIPAL';
                    await msg.reply(menuPrincipal());
                    break;

                case '2':
                    delete estadosUsuario[usuario];
                    await msg.reply('¡Listo! 👋 Si necesitas algo más, escribe *menu*.');
                    break;

                default:
                    await msg.reply(
                        '⚠️ Opción inválida.\n' +
                        'Responde con:\n' +
                        '1 Volver al menú\n' +
                        '2 Salir'
                    );
            }
            return;
        }

    } catch (error) {
        console.error('Error procesando mensaje:', error);
    } finally {
        // 5. Notificación a la API
        try {
            const numeroOrigen10 = last10(msg.from);
            const numeroDestino10 = last10(numeroConectado);

            const data = {
                Numero_origen: numeroOrigen10,
                Numero_destino: numeroDestino10,
                Mensaje: textoOriginal
            };

            if (url_notificacion && url_notificacion.startsWith('http')) {
                postJSON(url_notificacion, data).catch(err =>
                    console.error(`[API err] ${err?.message || err}`)
                );
            }
        } catch (_) { }
    }

});

// Manejo bisico de errores para no tumbar el proceso
process.on('unhandledRejection', (r) => console.error(`[${ts()}] unhandledRejection:`, r));
process.on('uncaughtException', (e) => console.error(`[${ts()}] uncaughtException:`, e));

client.initialize();

// -------------------------------------------------------------
/** Servidor HTTP */
// Body esperado (JSON):
// {
//   "numero": "8111223344" | "528111223344" | "+528111223344",
//   "mensaje": "Texto",
//   "Archivo_local": "C:\\ruta\\archivo.pdf",   (opcional)
//   "Archivo_url": "https://dominio/imagen.png" (opcional),
//   "caption": "Texto para media"               (opcional)
// }
// -------------------------------------------------------------
const server = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    const buffers = [];
    for await (const chunk of req) buffers.push(chunk);
    const body = Buffer.concat(buffers).toString('utf8').trim();

    console.log(`[${ts()}] Peticion recibida. Body: ${body || '(vacio)'}`);

    if (!isReady) {
        res.statusCode = 503;
        return res.end(JSON.stringify({ ok: false, message: 'whatsapp_no_listo' }));
    }

    if (!body) {
        res.statusCode = 200;
        return res.end(JSON.stringify({ ok: true, message: 'Servidor de Whatsapp en linea' }));
    }

    // Parse JSON
    let payload;
    try {
        payload = JSON.parse(body.replace(/\n/g, ' '));
    } catch (err) {
        console.log(`[${ts()}] json_invalido: ${err?.message || err}`);
        res.statusCode = 400;
        return res.end(JSON.stringify({ ok: false, message: 'json_invalido' }));
    }

    // Campos (acepta alias comunes)
    const numeroEntrada = payload.numero ?? payload.Numero ?? payload.phone ?? payload.to ?? null;
    const mensajeEntrada = payload.mensaje ?? payload.Mensaje ?? payload.text ?? '';
    const Archivo_local = payload.Archivo_local ?? payload.archivo_local ?? payload.filePath ?? null;
    const Archivo_url = payload.Archivo_url ?? payload.archivo_url ?? payload.fileUrl ?? null;
    const caption = payload.caption ?? payload.titulo ?? null;

    // Log del numero y mensaje TAL CUAL llegaron
    console.log(
        `[${ts()}] Entrante | numero=${numeroEntrada ?? '(null)'} | ` +
        `mensaje="${(mensajeEntrada || '').replace(/\s+/g, ' ').slice(0, 200)}${mensajeEntrada && mensajeEntrada.length > 200 ? '…' : ''}"`
    );

    if (!numeroEntrada) {
        res.statusCode = 422;
        return res.end(JSON.stringify({ ok: false, message: 'numero_requerido' }));
    }

    // Envio
    try {
        const result = await sendToNumber(client, numeroEntrada, mensajeEntrada, {
            archivoLocal: Archivo_local,
            archivoUrl: Archivo_url,
            caption
        });

        // Respondemos 200 aunque no exista en WhatsApp para evitar reintentos infinitos del integrador
        res.statusCode = 200;
        if (!result.ok) {
            return res.end(JSON.stringify({
                ok: false,
                numero: numeroEntrada,
                reason: result.reason || 'desconocido'
            }));
        }

        return res.end(JSON.stringify({ ok: true, numero: result.to, message: 'enviado' }));
    } catch (err) {
        console.log(`[${ts()}] error_interno:`, err?.message || err);
        res.statusCode = 500;
        return res.end(JSON.stringify({ ok: false, message: 'error_interno' }));
    }
});

server.listen(port, hostname, () => {
    console.log(`[${ts()}] HTTP escuchando en http://${hostname}:${port}/`);
});