const express = require('express');
const cors = require('cors');
const ytdl = require('ytdl-core');
const app = express();
const port = process.env.PORT || 3000;

// Desabilitar checagem de atualizações do ytdl-core
process.env.YTDL_NO_UPDATE = '1';

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const COOKIE = 'CONSENT=YES+; Path=/; Domain=.youtube.com;';

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
        
        const info = await ytdl.getInfo(videoURL, {
            requestOptions: {
                headers: {
                    cookie: COOKIE,
                    'x-youtube-client-name': '1',
                    'x-youtube-client-version': '2.20200101',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            }
        });

        console.log('Informações do vídeo obtidas:', info.videoDetails.title);

        const title = info.videoDetails.title.replace(/[^\w\s]/gi, '');
        
        const format = ytdl.chooseFormat(info.formats, { 
            quality: 'highestaudio',
            filter: 'audioonly' 
        });
        
        if (!format) {
            return res.status(400).json({ error: 'Nenhum formato de áudio disponível' });
        }

        res.header('Content-Disposition', `attachment; filename="${title}.mp3"`);
        res.header('Content-Type', 'audio/mpeg');

        console.log('Iniciando download do áudio...');

        const stream = ytdl(videoURL, {
            format: format,
            requestOptions: {
                headers: {
                    cookie: COOKIE,
                    'x-youtube-client-name': '1',
                    'x-youtube-client-version': '2.20200101',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            }
        });

        stream.on('error', (error) => {
            console.error('Erro no stream:', error);
            if (!res.headersSent) {
                res.status(500).json({ 
                    error: 'Erro ao processar o vídeo',
                    details: error.message
                });
            }
        });

        stream.on('info', (info, format) => {
            console.log('Stream iniciado:', format.container);
        });

        // Adiciona tratamento de timeout
        const timeout = setTimeout(() => {
            if (!res.headersSent) {
                res.status(504).json({ error: 'Tempo limite excedido' });
            }
            stream.destroy();
        }, 30000); // 30 segundos de timeout

        stream.on('end', () => {
            clearTimeout(timeout);
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

// Rota de health check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${port}`);
}); 