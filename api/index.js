const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Configurar CORS para permitir solicitudes desde http://127.0.0.1:5500
app.use(cors({
    origin: 'http://127.0.0.1:5500',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

// Aumentar el límite de tamaño de carga
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Ruta para procesar la imagen con Google Cloud Vision
app.post('/api/process-image', async (req, res) => {
    const imageData = req.body.imageData;
    const googleCloudVisionApiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;

    try {
        const fetch = await import('node-fetch');
        const response = await fetch.default(`https://vision.googleapis.com/v1/images:annotate?key=${googleCloudVisionApiKey}`, {
            method: 'POST',
            body: JSON.stringify({
                requests: [
                    {
                        image: {
                            content: imageData
                        },
                        features: [
                            {
                                type: 'LANDMARK_DETECTION',
                                maxResults: 5
                            }
                        ]
                    }
                ]
            }),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (response.ok) {
            res.json(data);
        } else {
            console.error("Error en la respuesta de Google Cloud Vision:", data);
            res.status(500).json({ error: "Error procesando la imagen en Google Cloud Vision API" });
        }
    } catch (error) {
        console.error("Error en el servidor al procesar la imagen:", error);
        res.status(500).json({ error: "Error en el servidor al procesar la imagen" });
    }
});

// Ruta para traducir texto con Google Translate
app.post('/api/translate', async (req, res) => {
    const text = req.body.text;
    const googleTranslateApiKey = process.env.GOOGLE_TRANSLATE_API_KEY;

    try {
        const fetch = await import('node-fetch');
        const response = await fetch.default(`https://translation.googleapis.com/language/translate/v2?key=${googleTranslateApiKey}`, {
            method: 'POST',
            body: JSON.stringify({
                q: text,
                target: 'es',
                format: 'text'
            }),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        if (response.ok) {
            res.json({ translatedText: data.data.translations[0].translatedText });
        } else {
            console.error("Error en la respuesta de Google Translate:", data);
            res.status(500).json({ error: "Error procesando la traducción en Google Translate API" });
        }
    } catch (error) {
        console.error("Error en el servidor al traducir el texto:", error);
        res.status(500).json({ error: "Error en el servidor al traducir el texto" });
    }
});

// Iniciar el servidor
app.listen(3000, () => {
    console.log('Servidor corriendo en el puerto 3000');
});

module.exports = app;
