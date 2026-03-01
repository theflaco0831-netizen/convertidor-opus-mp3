onst express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const fs = require('fs');

const app = express();

// Render permite escribir en /tmp
const upload = multer({ dest: '/tmp' });

ffmpeg.setFfmpegPath(ffmpegPath);

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('Servidor en puerto', PORT);
});