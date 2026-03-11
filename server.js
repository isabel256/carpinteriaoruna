require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const BOT_TOKEN = process.env.BOT_TOKEN;
const MI_CHAT_ID = process.env.MI_CHAT_ID;

const dbPath = path.resolve(__dirname, 'carpinteria.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error(" Error al conectar con la DB:", err.message);
    } else {
        console.log(" Conexión exitosa");
    }
});


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

db.run(`CREATE TABLE IF NOT EXISTS registros (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT,
    telefono TEXT,
    pedido TEXT,
    fecha TEXT
)`);

async function enviarAlerta(textoCompleto) {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: MI_CHAT_ID,
                text: textoCompleto,
                parse_mode: 'HTML',
                link_preview_options: { is_disabled: true }
            })
        });
        const data = await response.json();
        if (!data.ok) console.log("Error de Telegram:", data.description);
    } catch (err) {
        console.error("Error de red en Telegram:", err);
    }
}

function obtenerFechaActual() {
    return new Date().toLocaleString('es-PE', {
        timeZone: 'America/Lima',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
}

app.post('/api/registro', async (req, res) => {
    // 2. Recibimos 'telefono' desde el cuerpo de la petición
    const { nombre, telefono, pedido } = req.body;
    const fechaExacta = obtenerFechaActual();

    try {
        // 3. Insertamos el teléfono en la base de datos
        const stmt = db.prepare("INSERT INTO registros (nombre, telefono, pedido, fecha) VALUES (?, ?, ?, ?)");
        stmt.run(nombre, telefono, pedido, fechaExacta);


        const mensajeTelegram = `
📥 <b>NUEVO PEDIDO</b>
───────────────────────
<b>ESTADO:</b> <code>PENDIENTE</code>

📋 <b>CLIENTE</b>
<b>Nombre:</b>  ${nombre.toUpperCase()}
<b>Celular:</b> <code>${telefono}</code>
<b>Chat:</b>    <a href="https://wa.me/51${telefono}">📱 Abrir WhatsApp</a>

📝 <b>PROYECTO</b>
<i>${pedido}</i>

🕒 <b>REGISTRO</b>
<code>${fechaExacta}</code>
───────────────────────
⚒️ <i>Carpintería Oruna • Arte en Madera</i>
`;
        await enviarAlerta(mensajeTelegram);

        res.json({ mensaje: "Registrado con éxito", fecha: fechaExacta });
    } catch (error) {
        console.error("Error en el registro:", error);
        res.status(500).json({ error: "Error interno" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor activo en el puerto ${PORT}`);
});