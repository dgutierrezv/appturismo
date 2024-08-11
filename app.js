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

    // Manejar accesos para diferentes dispositivos
    function handleCameraAccess() {
        navigator.mediaDevices.getUserMedia(constraints)
            .then((stream) => {
                video.srcObject = stream;
                video.play();
            })
            .catch((err) => {
                console.error("Error al acceder a la cámara: " + err);
                // Intentar de nuevo sin especificar "facingMode"
                if (err.name === "OverconstrainedError" || err.name === "NotAllowedError") {
                    navigator.mediaDevices.getUserMedia({ video: true })
                        .then((stream) => {
                            video.srcObject = stream;
                            video.play();
                        })
                        .catch((error) => {
                            console.error("Error al acceder a la cámara sin facingMode: " + error);
                            alert("No se pudo acceder a la cámara. Por favor, verifica los permisos.");
                        });
                }
            });
    }

    // Llamar a la función para manejar la cámara
    handleCameraAccess();

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

    // Obtener información de Wikipedia
    async function fetchWikipediaInfo(query) {
        try {
            const normalizedQuery = encodeURIComponent(query.trim());
            const response = await fetch(`https://es.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&format=json&redirects=1&origin=*&titles=${normalizedQuery}`);
            const data = await response.json();
            const pages = data.query.pages;
            const pageId = Object.keys(pages)[0];
            const page = pages[pageId];

            if (pageId === "-1" || !page.extract) {
                historicalInfo.innerHTML += "<p>No se encontró información histórica para este lugar.</p>";
            } else {
                historicalInfo.innerHTML += `<h3>Reseña histórica</h3><p>${page.extract}</p>`;
            }
        } catch (error) {
            console.error("Error al obtener información de Wikipedia:", error);
            historicalInfo.innerHTML += "<p>Error al obtener información histórica. Por favor, intente de nuevo.</p>";
        }
    }

    // Buscar imágenes en Wikimedia Commons con mejores filtros y combinación de GPS
async function fetchWikimediaImages(query, latitude, longitude) {
    try {
        console.log("Buscando imágenes para:", query);
        const searchQueries = [
            encodeURIComponent(`${query} ${latitude},${longitude}`),  // Combinación de nombre y coordenadas
            encodeURIComponent(query)
        ];

        const fetchPromises = searchQueries.map(searchQuery =>
            fetch(`https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&prop=imageinfo&iiprop=url|extmetadata&generator=search&gsrsearch=${searchQuery}&gsrnamespace=6&gsrlimit=10`)
                .then(response => response.json())
        );

        const results = await Promise.all(fetchPromises);
        let allPages = [];
        results.forEach(data => {
            if (data.query && data.query.pages) {
                allPages = allPages.concat(Object.values(data.query.pages));
            }
        });

        let imageUrls = allPages
            .filter(page => page.imageinfo && page.imageinfo[0])
            .map(page => ({
                url: page.imageinfo[0].url,
                title: page.title.replace('File:', ''),
                description: page.imageinfo[0].extmetadata.ImageDescription ?
                    page.imageinfo[0].extmetadata.ImageDescription.value : ''
            }));

        if (imageUrls.length > 0) {
            displayHistoricalImages(imageUrls.slice(0, 5));  // Mostrar más imágenes si están disponibles
        } else {
            showPlaceholderImages(3);
        }
    } catch (error) {
        console.error("Error al obtener imágenes de Wikimedia Commons:", error);
        showPlaceholderImages(3);
    }
}

// Mostrar imágenes en un carrusel (puedes usar cualquier librería como Slick, OwlCarousel, etc.)
function displayHistoricalImages(images) {
    const imagesHtml = images.map((img, index) => `
        <div class="historical-image">
            <img src="${img.url}" alt="${img.title}" onclick="openImageModal('${img.url}', '${img.title}', '${img.description}')">
            <p>${img.title}</p>
        </div>
    `).join('');

    pastImages.innerHTML = `
        <h3>Imágenes Históricas</h3>
        <div class="historical-images-carousel">
            ${imagesHtml}
        </div>
    `;
}

// Abrir modal al hacer clic en una imagen
function openImageModal(url, title, description) {
    const modalHtml = `
        <div class="image-modal">
            <span class="close-modal" onclick="closeImageModal()">&times;</span>
            <img src="${url}" alt="${title}">
            <div class="modal-caption">
                <h4>${title}</h4>
                <p>${description}</p>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closeImageModal() {
    const modal = document.querySelector('.image-modal');
    if (modal) {
        modal.remove();
    }
}
    async function fetchWikimediaImages(query, latitude, longitude) {
        try {
            console.log("Buscando imágenes para:", query);
            const searchQueries = [
                encodeURIComponent(query),
                `geo:${41.8902102},${12.4922309}` // Usar coordenadas GPS en la consulta
            ];

            const fetchPromises = searchQueries.map(searchQuery =>
                fetch(`https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&prop=imageinfo&iiprop=url|extmetadata&generator=search&gsrsearch=${searchQuery}&gsrnamespace=6&gsrlimit=10`)
                    .then(response => response.json())
            );

            const results = await Promise.all(fetchPromises);
            let allPages = [];
            results.forEach(data => {
                if (data.query && data.query.pages) {
                    allPages = allPages.concat(Object.values(data.query.pages));
                }
            });

            console.log("Total de páginas encontradas:", allPages.length);

            let imageUrls = allPages
                .filter(page => page.imageinfo && page.imageinfo[0])
                .map(page => ({
                    url: page.imageinfo[0].url,
                    title: page.title.replace('File:', ''),
                    description: page.imageinfo[0].extmetadata.ImageDescription ?
                        page.imageinfo[0].extmetadata.ImageDescription.value : ''
                }));

            console.log("Imágenes antes del filtrado:", imageUrls.length);

            if (imageUrls.length > 0) {
                displayHistoricalImages(imageUrls.slice(0, 3));
            } else {
                console.log("No se encontraron imágenes relevantes. Mostrando marcadores de posición.");
                showPlaceholderImages(3);
            }
        } catch (error) {
            console.error("Error al obtener imágenes de Wikimedia Commons:", error);
            showPlaceholderImages(3);
        }
    }

    // Función actualizada para mostrar imágenes históricas
    function displayHistoricalImages(images) {
        console.log("Mostrando imágenes:", images);
        const imagesHtml = images.map((img, index) => `
            <div class="historical-image">
                <img src="${img.url}" alt="${img.title}">
                <p>${img.title}</p>
            </div>
        `).join('');

        pastImages.innerHTML = `
            <h3>Imágenes Históricas</h3>
            <div class="historical-images-row">
                ${imagesHtml}
            </div>
        `;
    }

    // Mostrar imágenes de marcador de posición en caso de no encontrar imágenes reales
    function showPlaceholderImages(count) {
        let placeholders = '';
        for (let i = 1; i <= count; i++) {
            placeholders += `
                <div class="historical-image">
                    <img src="https://picsum.photos/200/200?random=${Math.floor(Math.random() * 1000)}" alt="Marcador de posición ${i}">
                    <p>Marcador de posición ${i}</p>
                </div>
            `;
        }

        pastImages.innerHTML = `
            <h3>Imágenes Históricas</h3>
            <div class="historical-images-row">
                ${placeholders}
            </div>
        `;
    }
});
