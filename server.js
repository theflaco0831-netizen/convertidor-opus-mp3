const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const upload = multer({ dest: '/tmp' });

ffmpeg.setFfmpegPath(ffmpegPath);
app.use(express.static(__dirname));

// 🔹 progreso por trabajo
const progressMap = {};

// endpoint para leer progreso por id
app.get('/progress/:id', (req, res) => {
    const id = req.params.id;
    res.json({ progress: progressMap[id] || 0 });
});

app.post('/convert', upload.single('audio'), (req, res) => {

    if (!req.file) {
        return res.status(400).send('No se recibió archivo');
    }

    const jobId = crypto.randomUUID();
    const inputPath = req.file.path;
    const outputPath = `${inputPath}.mp3`;

    progressMap[jobId] = 0;

    ffmpeg(inputPath)
        .toFormat('mp3')
        .on('progress', (p) => {
            if (p.percent) {
                progressMap[jobId] = Math.round(p.percent);
            }
        })
        .on('end', () => {
            progressMap[jobId] = 100;

            res.setHeader('X-Job-Id', jobId);
            res.download(outputPath, 'audio.mp3', () => {
                fs.unlinkSync(inputPath);
                fs.unlinkSync(outputPath);
                delete progressMap[jobId]; // limpiar memoria
            });
        })
        .on('error', (err) => {
            console.error('FFMPEG ERROR:', err);
            delete progressMap[jobId];
            res.status(500).send('Error al convertir');
        })
        .save(outputPath);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('Servidor en puerto', PORT);
});