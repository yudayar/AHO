export default function handler(req, res) {
    if (req.method === 'POST') {
        const { name, class: kelas, time } = req.body;
        if (!name || !kelas || !time) {
            return res.status(400).json({ error: 'Invalid input' });
        }

        // Simpan data (dummy response untuk tes)
        return res.status(200).json({ message: 'Data berhasil disimpan', data: { name, kelas, time } });
    }

    // Jika metode bukan POST
    return res.status(405).json({ error: 'Method Not Allowed' });
}
