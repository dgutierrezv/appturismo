const express = require('express');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();

app.use(express.json());

// Ruta para procesar la imagen con Google Cloud Vision
app.post('/process-image', async (req, res) => {
    const imageData = req.body.imageData;
    const googleCloudVisionApiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;

    try {
        const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${googleCloudVisionApiKey}`, {
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
        res.json(data);
    } catch (error) {
        console.error("Error al procesar la imagen:", error);
        res.status(500).send("Error al procesar la imagen.");
    }
});

// Nueva ruta para traducir texto con Google Translate
app.post('/translate', async (req, res) => {
    const text = req.body.text;
    const googleTranslateApiKey = process.env.GOOGLE_TRANSLATE_API_KEY;

    try {
        const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${googleTranslateApiKey}`, {
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
        if (data.data && data.data.translations && data.data.translations[0]) {
            res.json({ translatedText: data.data.translations[0].translatedText });
        } else {
            res.status(500).send("Error en la estructura de la respuesta de la traducción.");
        }
    } catch (error) {
        console.error("Error al traducir el texto:", error);
        res.status(500).send("Error al traducir el texto.");
    }
});

// Exporta el app para que Vercel lo maneje como una Serverless Function
module.exports = app;
