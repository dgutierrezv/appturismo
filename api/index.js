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

        // Verificar si la respuesta de Google contiene errores
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

// Exporta el app para que Vercel lo maneje como una Serverless Function
module.exports = app;
