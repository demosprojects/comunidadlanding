/* =========================================================
   SITE-DATA.JS
   Escucha en TIEMPO REAL (onSnapshot) los cambios en Firestore
   que se hacen desde el panel admin (admin.html) y actualiza
   la web pública (index.html) sin necesidad de recargar.
   No modifica el comportamiento de app.js, solo llena el DOM
   con datos y después dispara las funciones de app.js que
   necesitan que el contenido ya esté en la página
   (actualizarImagenesGaleria, iniciarCarruselInfinito).
   ========================================================= */

function escaparHtml(texto) {
    const div = document.createElement('div');
    div.textContent = texto ?? "";
    return div.innerHTML;
}

/* ---------- 1. PRÓXIMA FERIA ---------- */
function escucharFeriaActiva() {
    const card = document.getElementById('feria-card');
    const sinEventos = document.getElementById('feria-sin-eventos');
    if (!card) return;

    db.collection('ferias')
        .where('activa', '==', true)
        .limit(1)
        .onSnapshot(snap => {
            if (snap.empty) {
                card.classList.add('hidden');
                sinEventos.classList.remove('hidden');
                return;
            }

            const feria = snap.docs[0].data();

            document.getElementById('feria-titulo').textContent = feria.titulo || '';
            document.getElementById('feria-dia-semana').textContent = feria.diaSemana || '';
            document.getElementById('feria-mes').textContent = feria.mes || '';
            document.getElementById('feria-dia-num').textContent = feria.diaNumero || '';
            document.getElementById('feria-horario').textContent = feria.horario || '';
            document.getElementById('feria-ubicacion').textContent = feria.ubicacion || '';

            const flyer = document.getElementById('feria-flyer');
            flyer.src = feria.flyerUrl || '';
            flyer.alt = feria.titulo || 'Flyer de la próxima feria';

            // Ver flyer en grande usa el modal de fotos ya definido en app.js
            document.getElementById('feria-flyer-click').onclick = () => abrirFoto(feria.flyerUrl || '');

            // Botón de "Ver ubicación" usa el modal de mapa ya definido en app.js
            const btnMapa = document.getElementById('feria-btn-mapa');
            if (feria.mapaEmbedUrl) {
                btnMapa.onclick = () => abrirMapa(feria.mapaEmbedUrl);
                btnMapa.classList.remove('hidden');
            } else {
                btnMapa.classList.add('hidden');
            }

            sinEventos.classList.add('hidden');
            card.classList.remove('hidden');
        }, err => {
            console.error('Error al escuchar la feria activa:', err);
            sinEventos.classList.remove('hidden');
        });
}

/* ---------- 2. GALERÍA DE FOTOS ---------- */
function escucharGaleria() {
    const container = document.getElementById('gallery-container');
    const vacio = document.getElementById('gallery-empty');
    if (!container) return;

    db.collection('galeria').orderBy('orden', 'asc').onSnapshot(snap => {
        if (snap.empty) {
            container.innerHTML = '';
            vacio.classList.remove('hidden');
            return;
        }

        vacio.classList.add('hidden');
        container.innerHTML = snap.docs.map(doc => {
            const foto = doc.data();
            const url = escaparHtml(foto.url);
            return `
                <div class="flex-none w-[80%] sm:w-[45%] lg:w-[30%] snap-center">
                    <div onclick="abrirFoto('${url}')" class="relative group cursor-pointer overflow-hidden rounded-[1.5rem] md:rounded-[2rem] shadow-md">
                        <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-2 z-10">
                            <i class="fas fa-search-plus text-white text-2xl"></i>
                            <span class="text-white text-[10px] font-black uppercase tracking-widest">Ver foto</span>
                        </div>
                        <img src="${url}" class="w-full h-[300px] md:h-[400px] object-cover transform group-hover:scale-105 transition duration-500" alt="${escaparHtml(foto.alt || 'Foto de la feria')}">
                    </div>
                </div>`;
        }).join('');

        window.actualizarImagenesGaleria();
    }, err => {
        console.error('Error al escuchar la galería:', err);
    });
}

/* ---------- 3. EMPRENDEDORES PARTICIPANTES + TESTIMONIOS ---------- */
function escucharEmprendedores() {
    const container = document.getElementById('carousel-container');
    const testimoniosContainer = document.getElementById('testimonios-container');
    const testimoniosVacio = document.getElementById('testimonios-empty');
    if (!container) return;

    db.collection('emprendedores').orderBy('orden', 'asc').onSnapshot(snap => {
        if (snap.empty) {
            container.innerHTML = '';
            if (testimoniosContainer) testimoniosContainer.innerHTML = '';
            if (testimoniosVacio) testimoniosVacio.classList.remove('hidden');
            return;
        }

        // Importante: acá se pinta el set "original" (sin duplicar). La
        // duplicación para el efecto de scroll infinito la hace
        // iniciarCarruselInfinito() en app.js.
        container.innerHTML = snap.docs.map(doc => {
            const e = doc.data();
            return `
                <div class="flex-none w-36 md:w-40">
                    <div class="w-28 h-28 md:w-32 md:h-32 mx-auto rounded-full border-4 border-yellow-comunidad p-1 mb-4 shadow-md">
                        <img src="${escaparHtml(e.logoUrl)}" class="w-full h-full object-cover rounded-full bg-slate-100" alt="${escaparHtml(e.nombre)}">
                    </div>
                    <p class="font-bold text-base md:text-lg">${escaparHtml(e.nombre)}</p>
                    <span class="text-xs uppercase tracking-widest text-slate-400">${escaparHtml(e.categoria || '')}</span>
                </div>`;
        }).join('');

        window.iniciarCarruselInfinito();

        // "Lo que dicen nuestros emprendedores": solo los que cargaron un testimonio
        if (testimoniosContainer) {
            const conTestimonio = snap.docs.filter(doc => (doc.data().testimonio || '').trim().length > 0);

            if (!conTestimonio.length) {
                testimoniosContainer.innerHTML = '';
                if (testimoniosVacio) testimoniosVacio.classList.remove('hidden');
            } else {
                if (testimoniosVacio) testimoniosVacio.classList.add('hidden');
                testimoniosContainer.innerHTML = conTestimonio.map(doc => {
                    const e = doc.data();
                    return `
                        <div class="bg-slate-50 p-8 rounded-[2rem] shadow-sm relative italic text-slate-600">
                            <i class="fas fa-quote-left text-yellow-400 text-3xl absolute top-6 left-6 opacity-30"></i>
                            <p class="relative z-10 mb-6 mt-4">"${escaparHtml(e.testimonio)}"</p>
                            <div class="flex items-center justify-center gap-3 not-italic">
                                <img src="${escaparHtml(e.logoUrl)}" class="w-10 h-10 rounded-full object-cover border-2 border-yellow-comunidad" alt="${escaparHtml(e.nombre)}">
                                <div class="text-left leading-tight">
                                    <p class="font-bold text-black text-sm">${escaparHtml(e.nombre)}</p>
                                    <p class="text-xs text-slate-400">${escaparHtml(e.categoria || '')}</p>
                                </div>
                            </div>
                        </div>`;
                }).join('');
            }
        }
    }, err => {
        console.error('Error al escuchar emprendedores:', err);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    escucharFeriaActiva();
    escucharGaleria();
    escucharEmprendedores();
});