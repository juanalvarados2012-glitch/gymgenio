// Le pasa al navegador los datos PÚBLICOS de Supabase (URL + llave publishable).
// La URL la lee de Vercel (donde tu papá la conectó). La publishable key es pública.
// También manda el número del Meta Pixel (también público: va en el HTML de todos
// los que hacen anuncios), para no dejarlo escrito dentro del código.
export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });
  res.setHeader('Cache-Control', 'no-store');
  const url = process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_ANON_KEY || '';
  const metaPixelId = (process.env.META_PIXEL_ID || '').trim();
  if (!url || !key) return res.status(503).json({ url: null, key: null, metaPixelId });
  return res.status(200).json({ url, key, metaPixelId });
}
