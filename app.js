document.addEventListener('DOMContentLoaded', (event) => {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const snapButton = document.getElementById('snap');
    const locationInfo = document.getElementById('location-info');
    const historicalInfo = document.getElementById('historical-info');
    const pastImages = document.getElementById('past-images');
    let latitude = null;
    let longitude = null;
    
    const constraints = {
        video: true
    };

    // Obtener acceso a la cámara
    navigator.mediaDevices.getUserMedia(constraints)
        .then((stream) => {
            video.srcObject = stream;
        })
        .catch((err) => {
            console.error("Error al acceder a la cámara: " + err);
        });

    // Capturar la imagen
    snapButton.addEventListener('click', () => {
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL('image/png');
        processImage(imageData);
    });

    // Obtener ubicación GPS
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            latitude = position.coords.latitude;
            longitude = position.coords.longitude;
            locationInfo.innerHTML = `Latitud: ${latitude}, Longitud: ${longitude}`;
        }, (err) => {
            console.error("Error al obtener la ubicación GPS: " + err);
        });
    } else {
        locationInfo.innerHTML = "Geolocalización no soportada por este navegador.";
    }

    // Procesar la imagen con el backend
    async function processImage(imageData) {
        try {
            const response = await fetch('http://localhost:3000/process-image', {
                method: 'POST',
                body: JSON.stringify({ imageData: imageData.split(',')[1] }),
                headers: {
                    'Content-Type': 'application/json'
                }
            });
    
            const data = await response.json();
            // Aquí manejas la respuesta que viene del backend...
        } catch (error) {
            console.error("Error al procesar la imagen:", error);
        }
    }
    
    // Traducir el nombre del lugar al español usando el backend
    async function translateToSpanish(englishText) {
        try {
            const response = await fetch('http://localhost:3000/translate', {
                method: 'POST',
                body: JSON.stringify({ text: englishText }),
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            if (data.translatedText) {
                const spanishText = data.translatedText;
                historicalInfo.innerHTML = `Detectado: ${spanishText}`;
                fetchWikipediaInfo(spanishText);
                fetchWikimediaImages(spanishText, latitude, longitude); // Pasar coordenadas GPS
            } else {
                throw new Error("Error en la traducción.");
            }
        } catch (error) {
            console.error("Error al traducir el texto:", error);
            fetchWikipediaInfo(englishText);
            fetchWikimediaImages(englishText, latitude, longitude); // Pasar coordenadas GPS
        }
    }

    // Funciones adicionales para Wikipedia, imágenes históricas, etc., permanecen igual...
});
