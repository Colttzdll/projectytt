const express = require('express');
const cors = require('cors');
const ytdl = require('ytdl-core');
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.get('/download', async (req, res) => {
    try {
        const videoURL = req.query.url;
        console.log('Recebida requisição para URL:', videoURL);

        if (!videoURL) {
            return res.status(400).json({ error: 'URL não fornecida' });
        }

        if (!ytdl.validateURL(videoURL)) {
            return res.status(400).json({ error: 'URL do YouTube inválida' });
        }

        console.log('URL validada, obtendo informações do vídeo...');
        
        const info = await ytdl.getBasicInfo(videoURL);
        console.log('Informações do vídeo obtidas:', info.videoDetails.title);

        const title = info.videoDetails.title.replace(/[^\w\s]/gi, '');
        
        const formats = ytdl.filterFormats(info.formats, 'audioonly');
        const format = formats.find(f => f.audioBitrate >= 128) || formats[0];
        
        if (!format) {
            return res.status(400).json({ error: 'Nenhum formato de áudio disponível' });
        }

        res.header('Content-Disposition', `attachment; filename="${title}.mp3"`);
        res.header('Content-Type', 'audio/mpeg');

        console.log('Iniciando download do áudio...');

        const stream = ytdl(videoURL, {
            format: format,
            filter: 'audioonly',
            quality: 'highestaudio',
            requestOptions: {
                headers: {
                    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            }
        });

        stream.on('error', (error) => {
            console.error('Erro no stream:', error);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Erro ao processar o vídeo' });
            }
        });

        stream.on('info', (info, format) => {
            console.log('Stream iniciado:', format.container);
        });

        stream.pipe(res);

    } catch (error) {
        console.error('Erro no servidor:', error);
        if (!res.headersSent) {
            res.status(500).json({ 
                error: 'Falha ao converter vídeo',
                details: error.message 
            });
        }
    }
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
}); 