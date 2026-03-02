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

const jobs = {};

// progreso
app.get('/progress/:id', (req, res) => {
    const job = jobs[req.params.id];
    res.json({ progress: job ? job.progress : 0 });
});

// descarga
app.get('/download/:id', (req, res) => {
    const job = jobs[req.params.id];
    if (!job || job.progress < 100) return res.status(404).send('No listo');

    res.download(job.outputPath, 'audio.mp3', () => {
        fs.unlinkSync(job.inputPath);
        fs.unlinkSync(job.outputPath);
        delete jobs[req.params.id];
    });
});

// convertir
app.post('/convert', upload.single('audio'), (req, res) => {
    const jobId = crypto.randomUUID();
    const inputPath = req.file.path;
    const outputPath = `${inputPath}.mp3`;

    jobs[jobId] = { progress: 0, inputPath, outputPath };

    let duration = 0;

    ffmpeg.ffprobe(inputPath, (err, data) => {
        duration = data.format.duration;

        ffmpeg(inputPath)
            .toFormat('mp3')
            .on('progress', p => {
                if (p.timemark && duration) {
                    const parts = p.timemark.split(':');
                    const seconds = (+parts[0]) * 3600 + (+parts[1]) * 60 + parseFloat(parts[2]);
                    const percent = Math.min(100, Math.round((seconds / duration) * 100));
                    jobs[jobId].progress = percent;
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
    });

    res.json({ jobId });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Servidor en puerto', PORT));