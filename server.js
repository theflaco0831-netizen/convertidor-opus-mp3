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

const jobs = {}; // { jobId: { progress, outputPath } }

// progreso
app.get('/progress/:id', (req, res) => {
    const job = jobs[req.params.id];
    res.json({ progress: job ? job.progress : 0 });
});

// descargar
app.get('/download/:id', (req, res) => {
    const job = jobs[req.params.id];
    if (!job || job.progress < 100) {
        return res.status(404).send('No listo');
    }

    res.download(job.outputPath, 'audio.mp3', () => {
        fs.unlinkSync(job.inputPath);
        fs.unlinkSync(job.outputPath);
        delete jobs[req.params.id];
    });
});

// convertir
app.post('/convert', upload.single('audio'), (req, res) => {
    if (!req.file) return res.status(400).send('No se recibió archivo');

    const jobId = crypto.randomUUID();
    const inputPath = req.file.path;
    const outputPath = `${inputPath}.mp3`;

    jobs[jobId] = {
        progress: 0,
        inputPath,
        outputPath
    };

    ffmpeg(inputPath)
        .toFormat('mp3')
        .on('progress', p => {
            if (p.percent) {
                jobs[jobId].progress = Math.round(p.percent);
            }
        })
        .on('end', () => {
            jobs[jobId].progress = 100;
        })
        .on('error', err => {
            console.error(err);
            delete jobs[jobId];
        })
        .save(outputPath);

    // RESPUESTA INMEDIATA
    res.json({ jobId });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Servidor en puerto', PORT));