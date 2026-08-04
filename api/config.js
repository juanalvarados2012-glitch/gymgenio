// Le pasa al navegador los datos PÚBLICOS de Supabase (URL + llave publishable).
// La URL la lee de Vercel (donde tu papá la conectó). La publishable key es pública.
export default function handler(req, res) {
  res.status(200).json({
    url: process.env.SUPABASE_URL || null,
    key: process.env.SUPABASE_ANON_KEY || 'sb_publishable_U5r1SWasZHIDvoMBnG5JrQ_qfD4C1Vb'
  });
}
