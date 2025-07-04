const express = require('express');
const cors = require('cors');
const youtubedl = require('youtube-dl-exec');
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

        // Verifica se é uma URL do YouTube
        if (!videoURL.includes('youtube.com') && !videoURL.includes('youtu.be')) {
            return res.status(400).json({ error: 'URL do YouTube inválida' });
        }

        console.log('URL validada, obtendo informações do vídeo...');

        // Obtém informações do vídeo
        const videoInfo = await youtubedl(videoURL, {
            dumpSingleJson: true,
            noWarnings: true,
            noCallHome: true,
            noCheckCertificate: true,
            preferFreeFormats: true,
            youtubeSkipDashManifest: true
        });

        const title = videoInfo.title.replace(/[^\w\s]/gi, '');
        console.log('Título do vídeo:', title);

        // Configura os headers da resposta
        res.header('Content-Disposition', `attachment; filename="${title}.mp3"`);
        res.header('Content-Type', 'audio/mpeg');

        console.log('Iniciando download do áudio...');

        // Inicia o download do áudio
        const download = youtubedl.exec(videoURL, {
            extractAudio: true,
            audioFormat: 'mp3',
            audioQuality: 0, // 0 é a melhor qualidade
            output: '-', // Output para stdout
            quiet: true,
            noWarnings: true,
            noCallHome: true,
            noCheckCertificate: true,
            preferFreeFormats: true,
            youtubeSkipDashManifest: true
        });

        // Pipe a saída do download para a resposta
        download.stdout.pipe(res);

        // Tratamento de erros durante o download
        download.stderr.on('data', (data) => {
            console.error('Erro no download:', data.toString());
        });

        // Timeout de 5 minutos
        const timeout = setTimeout(() => {
            if (!res.headersSent) {
                res.status(504).json({ error: 'Tempo limite excedido' });
            }
            download.kill();
        }, 300000);

        // Limpa o timeout quando o download terminar
        download.stdout.on('end', () => {
            clearTimeout(timeout);
        });

        // Tratamento de erro no processo
        download.on('error', (error) => {
            console.error('Erro no processo:', error);
            if (!res.headersSent) {
                res.status(500).json({ 
                    error: 'Erro ao processar o vídeo',
                    details: error.message
                });
            }
        });

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