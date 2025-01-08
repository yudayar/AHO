// api/absensi.js
export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { name, class: className, time } = req.body;
    
    // Proses penyimpanan ke database atau operasi lainnya
    try {
      // Misalnya, simpan data ke database
      const savedData = { name, className, time };

      // Kirim response sukses
      res.status(200).json(savedData);
    } catch (error) {
      res.status(500).json({ error: 'Gagal menyimpan data' });
    }
  } else {
    // Jika bukan POST
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}
