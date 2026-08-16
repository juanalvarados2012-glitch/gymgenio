// 🖼️ RESPALDO DEL PIXEL SIN JAVASCRIPT (el <noscript> de las páginas apunta aquí).
// Como el número del pixel vive en Vercel y no dentro del HTML, esta ruta arma
// la imagen de Facebook con ese número y reenvía al navegador hacia ella.
export default function handler(req, res) {
  const id = (process.env.META_PIXEL_ID || '').trim();
  res.setHeader('Cache-Control', 'no-store');
  // Sin pixel configurado: devolvemos un GIF transparente de 1x1 y ya.
  if (!/^\d{6,20}$/.test(id)) {
    const vacio = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.setHeader('Content-Type', 'image/gif');
    return res.status(200).send(vacio);
  }
  const evento = req.query && req.query.ev ? String(req.query.ev) : 'PageView';
  const eventoSeguro = /^[A-Za-z]{1,40}$/.test(evento) ? evento : 'PageView';
  return res.redirect(
    302,
    'https://www.facebook.com/tr?id=' + encodeURIComponent(id) +
    '&ev=' + encodeURIComponent(eventoSeguro) + '&noscript=1'
  );
}
