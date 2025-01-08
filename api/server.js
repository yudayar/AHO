const express = require('express');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2');
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');

dayjs.extend(customParseFormat);

const app = express();
const port = process.env.PORT || 3000;

require('dotenv').config();

const db = mysql.createConnection({
    host: process.env.MYSQLHOST, // Host dari MYSQLHOST
    user: process.env.MYSQLUSER, // Username dari MYSQLUSER
    password: process.env.MYSQLPASSWORD, // Password dari MYSQLPASSWORD
    database: process.env.MYSQLDATABASE, // Nama database dari MYSQLDATABASE
    port: process.env.MYSQLPORT, // Port dari MYSQLPORT
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});


db.connect((err) => {
    if (err) {
        console.error('Error connecting to database:', err);
        process.exit(1);
    }
    console.log('Connected to the database.');
});

// Middleware to serve static files (CSS, images, etc.)
app.use(express.static(path.join(__dirname, 'public'))); // Melayani folder public
app.use(express.static(path.join(__dirname, 'assets'))); // Melayani folder assets
app.use(express.static(path.join(__dirname, 'img'))); // Melayani folder gambar
app.use(express.json());

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html')); // Akses halaman home
});

app.get('/home', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html')); // Akses halaman home
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html')); // Akses dashboard
});

// Protected route for scan.html with time restriction
app.get('/scan', (req, res) => {
    const currentTime = new Date();
    const currentHour = currentTime.getHours();

    // If the time is within the allowed range, show the scan page
    if (currentHour >= 8 && currentHour <= 18) {
        res.sendFile(path.join(__dirname, 'protected', 'scan.html'));
    } else {
        res.status(403).send('Akses ditolak, waktu tidak sesuai!');
    }
});

// Endpoint for saving attendance
app.post('/absensi', (req, res) => {
    const { name, class: studentClass, time } = req.body;

    if (!name || !studentClass || !time) {
        return res.status(400).json({
            message: 'Gagal melakukan absensi. Data tidak lengkap!',
            reason: !name ? 'Nama tidak ada.' : !studentClass ? 'Kelas tidak ada.' : 'Waktu tidak ada.'
        });
    }

    try {
        const correctedTime = time.replace(/\./g, ':');
        const formattedTime = dayjs(correctedTime, 'D/M/YYYY, HH:mm:ss', true).format('YYYY-MM-DD HH:mm:ss');
        if (!formattedTime || formattedTime === 'Invalid Date') {
            throw new Error(`Invalid time value: ${time}`);
        }

        const query = 'INSERT INTO attendance (name, class, time) VALUES (?, ?, ?)';
        db.query(query, [name, studentClass, formattedTime], (err) => {
            if (err) {
                console.error('Error saving to database:', err);
                return res.status(500).json({
                    message: 'Gagal melakukan absensi.',
                    reason: 'Kesalahan pada database.',
                    error: err.message
                });
            }

            const filePath = path.join(__dirname, 'data', 'data.json');
            const newEntry = { name, class: studentClass, time: formattedTime };

            let jsonData = [];
            if (fs.existsSync(filePath)) {
                const fileContent = fs.readFileSync(filePath, 'utf-8');
                jsonData = JSON.parse(fileContent);
            }

            jsonData.push(newEntry);

            fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2), 'utf-8');

            res.json({
                message: 'Data berhasil disimpan!',
                data: newEntry
            });
        });
    } catch (error) {
        console.error('Error processing attendance data:', error.message);
        return res.status(400).json({
            message: 'Gagal melakukan absensi.',
            reason: 'Format waktu tidak valid.',
            error: error.message
        });
    }
});
// History API
app.get('/api/history', (req, res) => {
    const filePath = path.join(__dirname, 'data', 'data.json');

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'Belum ada data absensi!' });
    }

    try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const jsonData = JSON.parse(fileContent);
        res.json(jsonData);
    } catch (error) {
        console.error('Error reading data:', error);
        res.status(500).json({ message: 'Terjadi kesalahan di server.' });
    }
});

// Rekap API with filter
app.get('/api/rekap-db', async (req, res) => {
    const { class, time} = req.query;

    try {
        let query = 'SELECT class, name, time FROM attendance';
        const conditions = [];
        const values = [];

        if (kelas) {
            conditions.push('class = ?');
            values.push(kelas);
        }
        if (tanggal) {
            const formattedDate = new Date(tanggal).toISOString().slice(0, 10);
            conditions.push('DATE(time) = ?');
            values.push(formattedDate);
        }

        if (jam) {
            conditions.push('HOUR(time) = ?');
            values.push(jam);
        }

        if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(' AND ')}`;
        }

        const [rows] = await db.promise().query(query, values);

        const rekap = rows.reduce((acc, row) => {
            const { class: studentClass, name } = row;
            if (!acc[studentClass]) acc[studentClass] = { count: 0, students: [] };
            acc[studentClass].count++;
            acc[studentClass].students.push(name);
            return acc;
        }, {});

        res.json(rekap);
    } catch (error) {
        console.error('Error loading rekap data:', error);
        res.status(500).json({ message: 'Terjadi kesalahan saat memuat data.' });
    }
});

// Server listening on the specified port
module.exports = app;

