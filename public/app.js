document.addEventListener('DOMContentLoaded', (event) => {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const snapButton = document.getElementById('snap');
    const locationInfo = document.getElementById('location-info');
    const historicalInfo = document.getElementById('historical-info');
    const pastImages = document.getElementById('past-images');
    let latitude = null;
    let longitude = null;

    // Configuración para acceder a la cámara trasera en dispositivos móviles
    const constraints = {
        video: {
            facingMode: "environment",
            width: { ideal: 640 },
            height: { ideal: 480 }
        }
    };

    function handleCameraAccess() {
        navigator.mediaDevices.getUserMedia(constraints)
            .then((stream) => {
                video.srcObject = stream;
                video.play();
                console.log("Cámara accedida correctamente.");
            })
            .catch((err) => {
                console.error("Error al acceder a la cámara: " + err);
                alert("No se pudo acceder a la cámara. Por favor, verifica los permisos.");
            });
    }

    // Llamar a la función para manejar la cámara
    handleCameraAccess();

    // Capturar la imagen al hacer clic en el botón
    snapButton.addEventListener('click', () => {
        console.log("Botón de captura presionado.");

        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            console.log("El video está listo. Capturando imagen...");
            const context = canvas.getContext('2d');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = canvas.toDataURL('image/png');
            console.log("Imagen capturada. Procesando imagen...");

            processImage(imageData);
        } else {
            alert("La cámara aún no está lista. Intenta de nuevo en un momento.");
        }
    });

    // Obtener ubicación GPS
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            latitude = position.coords.latitude;
            longitude = position.coords.longitude;
            locationInfo.innerHTML = `Latitud: ${latitude}, Longitud: ${longitude}`;
            console.log(`Ubicación obtenida: Latitud ${latitude}, Longitud ${longitude}`);
        }, (err) => {
            console.error("Error al obtener la ubicación GPS: " + err);
        });
    } else {
        locationInfo.innerHTML = "Geolocalización no soportada por este navegador.";
    }

    // Procesar la imagen con el backend
    async function processImage(imageData) {
        try {
            const response = await fetch('http://localhost:3000/api/process-image', {
                method: 'POST',
                body: JSON.stringify({ imageData: imageData.split(',')[1] }),
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Error en la solicitud: ${response.statusText}`);
            }

            const data = await response.json();
            console.log("Respuesta recibida del backend:", data);

            if (data.responses && data.responses[0].landmarkAnnotations && data.responses[0].landmarkAnnotations.length > 0) {
                const landmark = data.responses[0].landmarkAnnotations[0];
                historicalInfo.innerHTML = `Lugar detectado: ${landmark.description}`;
                translateToSpanish(landmark.description);
            } else {
                historicalInfo.innerHTML = "No se detectaron puntos de referencia en la imagen.";
                pastImages.innerHTML = ""; // Limpiar imágenes anteriores
            }

        } catch (error) {
            console.error("Error al procesar la imagen:", error);
            historicalInfo.innerHTML = "Error al procesar la imagen. Por favor, intente de nuevo.";
        }
    }

    // Traducir el nombre del lugar al español usando el backend
    async function translateToSpanish(englishText) {
        try {
            const response = await fetch('http://localhost:3000/api/translate', {
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
                console.log("Texto traducido:", spanishText);
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

    // Obtener información histórica de Wikipedia
    async function fetchWikipediaInfo(searchTerm) {
        try {
            const response = await fetch(`https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchTerm)}`);
            const data = await response.json();

            if (data.extract) {
                historicalInfo.innerHTML = `Reseña histórica: ${data.extract}`;
            } else {
                historicalInfo.innerHTML = "No se encontró información histórica.";
            }
        } catch (error) {
            console.error("Error al obtener la información de Wikipedia:", error);
            historicalInfo.innerHTML = "Error al obtener la información histórica.";
        }
    }

    // Obtener imágenes históricas de Wikimedia
    async function fetchWikimediaImages(searchTerm, latitude, longitude) {
        try {
            const response = await fetch(`https://commons.wikimedia.org/w/api.php?action=query&generator=geosearch&ggscoord=${latitude}|${longitude}&ggsradius=10000&ggslimit=3&prop=pageimages|coordinates&pithumbsize=500&format=json&origin=*`);
            const data = await response.json();
    
            if (data.query && data.query.pages) {
                pastImages.innerHTML = ""; // Limpiar imágenes anteriores
    
                Object.values(data.query.pages).forEach(page => {
                    if (page.thumbnail) {
                        const img = document.createElement('img');
                        img.src = page.thumbnail.source;
                        img.alt = page.title;
                        img.style.maxWidth = "200px"; // Ajusta el tamaño de las imágenes si es necesario
                        pastImages.appendChild(img);
                    } else {
                        console.log(`No se encontró una miniatura para la página ${page.title}`);
                    }
                });
            } else {
                pastImages.innerHTML = "No se encontraron imágenes históricas.";
            }
        } catch (error) {
            console.error("Error al obtener las imágenes de Wikimedia:", error);
            pastImages.innerHTML = "Error al obtener imágenes históricas.";
        }
    }
    
});
