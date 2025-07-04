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

// Cookies mais completos do YouTube
const COOKIES = [
    'CONSENT=YES+; Path=/; Domain=.youtube.com;',
    'VISITOR_INFO1_LIVE=somevalue; Path=/; Domain=.youtube.com;',
    'LOGIN_INFO=somevalue; Path=/; Domain=.youtube.com;',
    'YSC=somevalue; Path=/; Domain=.youtube.com;',
    'PREF=somevalue; Path=/; Domain=.youtube.com;'
].join(' ');

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

        // Opções para a requisição
        const options = {
            requestOptions: {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Connection': 'keep-alive',
                    'Cookie': COOKIES
                }
            }
        };

        // Primeiro tenta obter informações básicas
        const videoId = ytdl.getVideoID(videoURL);
        console.log('Video ID:', videoId);

        const info = await ytdl.getBasicInfo(videoId, options);
        console.log('Informações do vídeo obtidas:', info.videoDetails.title);

        const title = info.videoDetails.title.replace(/[^\w\s]/gi, '');

        // Escolhe o melhor formato de áudio
        const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
        const format = audioFormats.reduce((prev, curr) => {
            return (curr.audioBitrate || 0) > (prev.audioBitrate || 0) ? curr : prev;
        }, audioFormats[0]);

        if (!format) {
            return res.status(400).json({ error: 'Nenhum formato de áudio disponível' });
        }

        res.header('Content-Disposition', `attachment; filename="${title}.mp3"`);
        res.header('Content-Type', 'audio/mpeg');

        console.log('Iniciando download do áudio...');
        console.log('Formato escolhido:', format.qualityLabel || format.audioBitrate + 'kbps');

        const stream = ytdl(videoId, {
            ...options,
            format: format
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