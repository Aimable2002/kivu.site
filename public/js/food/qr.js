let _qrLoaded = false;

export function generateQR(restaurantId) {
    const modal = document.getElementById('qr-modal');
    const box   = document.getElementById('qr-box');
    if (!modal || !box) return;

    // URL always uses ?id= so anyone scanning cold can load the page directly
    const url = `${window.location.origin}/food/restaurant?id=${restaurantId}`;
    document.getElementById('qr-url-label').textContent = url;

    modal.classList.remove('hidden');
    box.innerHTML = '';

    if (_qrLoaded) {
        renderQR(box, url);
        return;
    }

    const script  = document.createElement('script');
    script.src    = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
    script.onload = () => { _qrLoaded = true; renderQR(box, url); };
    document.head.appendChild(script);
}

function renderQR(box, url) {
    new QRCode(box, {
        text:         url,
        width:        220,
        height:       220,
        colorDark:    '#1e293b',
        colorLight:   '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
    });
}

export function closeQR() {
    document.getElementById('qr-modal')?.classList.add('hidden');
}