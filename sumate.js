document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-sumate');
    const fileInput = document.getElementById('logo-file');
    const fileNameDisplay = document.getElementById('file-name');
    const dropzone = document.getElementById('dropzone');
    const loader = document.getElementById('loader');
    const modalSuccess = document.getElementById('modal-success');

    // Configuración de APIs
    const IMGBB_API_KEY = '3f059751d7037792d68c4c2f3c163040';
    const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz5aCl4lshSRs2mnN2-J1AXPtpkWO-RCXbfsffbKHfss4ZusEvhois0e1xXgBPoCKw1/exec';

    // Función para convertir a WebP y optimizar tamaño
    const procesarImagenAWebP = (archivo) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(archivo);
            reader.onload = (e) => {
                const img = new Image();
                img.src = e.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 800; 
                    let width = img.width;
                    let height = img.height;
                    if (width > MAX_WIDTH) { 
                        height *= MAX_WIDTH / width; 
                        width = MAX_WIDTH; 
                    }
                    canvas.width = width; 
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    canvas.toBlob((blob) => resolve(blob), 'image/webp', 0.8);
                };
            };
        });
    };

    // Feedback visual al seleccionar archivo
    fileInput.onchange = () => {
        if (fileInput.files.length > 0) {
            fileNameDisplay.innerText = "✓ " + fileInput.files[0].name;
            // Cambiamos las clases para que combinen con tu diseño oscuro
            dropzone.classList.remove('border-slate-700');
            dropzone.classList.add('border-yellow-comunidad', 'bg-yellow-comunidad/10');
        }
    };

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Mostrar Loader
        loader.classList.remove('hidden');
        loader.classList.add('flex');

        try {
            // 1. Procesar Imagen a WebP
            const webpBlob = await procesarImagenAWebP(fileInput.files[0]);

            // 2. Subir a ImgBB
            const formDataImg = new FormData();
            formDataImg.append('image', webpBlob, 'logo.webp');
            
            const imgRes = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { 
                method: 'POST', 
                body: formDataImg 
            });
            const imgData = await imgRes.json();
            
            if (!imgData.success) throw new Error("Error en ImgBB");
            const linkLogo = imgData.data.url;

            // 3. Preparar datos para Google Sheets
            const datos = {
                marca: form.marca.value,
                rubro: form.rubro.value,
                instagram: form.instagram.value,
                whatsapp: form.whatsapp.value,
                testimonio: form.testimonio.value,
                logo: linkLogo
            };

            // 4. Enviar a Apps Script (CORREGIDO: modo cors y content-type)
            await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                mode: 'cors', 
                headers: { 
                    'Content-Type': 'text/plain;charset=utf-8' 
                },
                body: JSON.stringify(datos)
            });

            // ÉXITO: Ocultar loader y mostrar modal
            loader.classList.add('hidden');
            loader.classList.remove('flex');
            modalSuccess.classList.remove('hidden');
            modalSuccess.classList.add('flex');

        } catch (error) {
            console.error("Error detallado:", error);
            alert("Hubo un problema al enviar la información. Por favor, revisá tu conexión e intentá de nuevo.");
            loader.classList.add('hidden');
            loader.classList.remove('flex');
        }
    });
});