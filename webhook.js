const express = require('express');
const app = express();

app.use(express.json());

app.post('/webhook/whatsapp', (req, res) => {
    console.log('Mensaje recibido desde WhatsApp:');
    console.log(req.body);

    res.status(200).json({
        ok: true,
        message: 'Webhook recibido'
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Webhook escuchando en http://localhost:${PORT}`);
});