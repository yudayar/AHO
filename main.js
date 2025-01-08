document.addEventListener('DOMContentLoaded', () => {
    const scanBtn = document.getElementById('scan-btn');
    const resultBox = document.getElementById('scan-result');
    const html5QrCode = new Html5Qrcode("reader");

        // Fungsi untuk mendapatkan riwayat absensi berdasarkan nama
        function fetchHistoryByName(name) {
            showLoader();
            fetch(`/api/history/${encodeURIComponent(name)}`)
                .then(response => {
                    console.log('Status respon:', response.status); // Debug status respon
                    if (!response.ok) throw new Error(`Gagal mengambil data! Status: ${response.status}`);
                    return response.json();
                })
                .then(data => {
                    console.log('Respon dari server:', data); // Debug respon dari server
                    const historyBox = document.getElementById('history-result');
                    if (historyBox) {
                        if (Array.isArray(data) && data.length > 0) {
                            historyBox.innerHTML = data.map(entry => `
                                <li>Nama: ${entry.name}</li>
                                <li>Kelas: ${entry.class}</li>
                                <li>Waktu: ${entry.time}</li>
                                <hr>
                            `).join('');
                        } else {
                            historyBox.innerHTML = '<p>Belum ada data absensi untuk nama ini.</p>';
                        }
                    } else {
                        console.warn('#history-result tidak ditemukan di DOM!');
                    }
                })
                .catch(err => {
                    console.error('Error:', err);
                    alert('Terjadi kesalahan saat mengambil riwayat.');
                })
                .finally(() => {
                    hideLoader();
                });
        }
    
        // Event Listener untuk tombol pencarian riwayat berdasarkan nama
        const historySearchBtn = document.getElementById('history-search-btn');
        if (historySearchBtn) {
            historySearchBtn.addEventListener('click', () => {
                const nameInput = document.getElementById('history-name-input');
                if (nameInput && nameInput.value.trim() !== '') {
                    fetchHistoryByName(nameInput.value.trim());
                } else {
                    alert('Masukkan nama untuk mencari riwayat.');
                }
            });
        }    

    // Deklarasi dateElement dan timeElement
    const dateElement = document.getElementById('Date');
    const timeElement = document.getElementById('time');

    // Fungsi untuk update tanggal dan waktu
    function updateDateTime() {
        const currentDate = new Date();
        const formattedDate = `${currentDate.getDate()}/${currentDate.getMonth() + 1}/${currentDate.getFullYear()}`;
        const formattedTime = currentDate.toLocaleTimeString();

        console.log('Formatted Date:', formattedDate); // Debug tanggal
        console.log('Formatted Time:', formattedTime); // Debug waktu

        if (dateElement) {
            dateElement.textContent = formattedDate;
        } else {
            console.warn('#Date tidak ditemukan di DOM!');
        }

        if (timeElement) {
            timeElement.textContent = formattedTime;
        } else {
            console.warn('#time tidak ditemukan di DOM!');
        }
    }

    // Jalankan updateDateTime() segera
    updateDateTime();

    // Perbarui tanggal dan waktu setiap 1 detik
    setInterval(updateDateTime, 1000);

    // Event Listener untuk tombol scan manual
    if (scanBtn) {
        scanBtn.addEventListener('click', () => {
            showLoader();

            const qrData = {
                name: 'John Doe',
                class: 'XII-RPL',
                time: new Date().toLocaleString(),
            };

            fetch('/api/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(qrData),
            })
                .then((response) => {
                    console.log('Status respon:', response.status); // Debug status respon
                    if (!response.ok) throw new Error(`Gagal mengirim data! Status: ${response.status}`);
                    return response.json();
                })
                .then((data) => {
                    console.log('Respon dari server:', data); // Debug respon dari server
                    if (data.message) {
                        alert(data.message);

                        resultBox.innerHTML = ` 
                            <li>Nama: ${data.data.name}</li>
                            <li>Kelas: ${data.data.class}</li>
                            <li>Waktu: ${data.data.time}</li>
                        `;
                    }
                })
                .catch((err) => {
                    console.error('Error:', err);
                    alert('Terjadi kesalahan saat memproses data.');
                })
                .finally(() => {
                    hideLoader();
                });
        });
    }

    // Fungsi untuk memulai QR Code Scanner
    function startQrScanner() {
        const scanResultElement = document.getElementById('scan-result');

        function onScanSuccess(decodedText, decodedResult) {
            try {
                const qrData = JSON.parse(decodedText);
                const { name, class: studentClass } = qrData;
                const currentTime = new Date().toLocaleString();
                console.log('Data QR terparse:', qrData);

                scanResultElement.innerHTML = `
                    <li>Nama: ${name}</li>
                    <li>Kelas: ${studentClass}</li>
                    <li>Waktu: ${currentTime}</li>
                `;
                showLoader();

                sendAbsensiData(name, studentClass, currentTime)
                    .then(() => {
                        alert('Absensi berhasil disimpan.');
                    })
                    .catch(err => {
                        console.error('Error:', err);
                        alert('Gagal mengirim data ke server.');
                    })
                    .finally(() => {
                        hideLoader();
                    });

                html5QrCode.stop().then(() => {
                    console.log("Scanning dihentikan.");
                }).catch(err => console.error("Error menghentikan scan:", err));
            } catch (error) {
                console.error("Format QR Code salah:", error);
                alert("QR Code tidak valid.");
            }
        }

        function onScanFailure(error) {
            console.warn(`Scan gagal: ${error}`);
        }

        html5QrCode.start(
            { facingMode: "environment" },
            {
                fps: 10,
                qrbox: { width: 250, height: 250 }
            },
            onScanSuccess,
            onScanFailure
        ).catch(err => console.error("Error memulai scanner:", err));
    }

    if (document.getElementById('reader')) {
        startQrScanner();
    }

    // Fungsi untuk menampilkan loader
    function showLoader() {
        const loader = document.getElementById('loaderPopup');
        if (loader) loader.style.display = 'flex';
    }

    // Fungsi untuk menyembunyikan loader
    function hideLoader() {
        const loader = document.getElementById('loaderPopup');
        if (loader) loader.style.display = 'none';
    }
});
