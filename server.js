const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const fs = require('fs');
const path = require('path');

const app = express();

// USAR /tmp EN RENDER
const upload = multer({ dest: '/tmp' });

ffmpeg.setFfmpegPath(ffmpegPath);

// Servir la página web
app.use(express.static(__dirname));

app.post('/convert', upload.single('audio'), (req, res) => {

    if (!req.file) {
        return res.status(400).send('No se recibió archivo');
    }

    const inputPath = req.file.path;
    const outputPath = `${inputPath}.mp3`;

    ffmpeg(inputPath)
        .toFormat('mp3')
        .on('end', () => {
            res.download(outputPath, 'audio.mp3', () => {
                fs.unlinkSync(inputPath);
                fs.unlinkSync(outputPath);
            });
        })
        .on('error', (err) => {
            console.error('FFMPEG ERROR:', err);
            res.status(500).send('Error al convertir');
        })
        .save(outputPath);
});

// Render usa PORT automático
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('Servidor en puerto', PORT);
});