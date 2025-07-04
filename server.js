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

// Função para verificar se o vídeo está disponível
async function checkVideoAvailability(url) {
    try {
        const result = await youtubedl(url, {
            dumpSingleJson: true,
            noWarnings: true,
            noCallHome: true,
            noCheckCertificate: true,
            preferFreeFormats: true,
            addHeader: [
                'referer:youtube.com',
                'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            ]
        });
        console.log('Video info:', result);
        return { available: true };
    } catch (error) {
        console.error('Erro detalhado ao verificar vídeo:', error);
        if (error.message.includes('Video unavailable')) {
            return { 
                available: false, 
                error: 'Erro ao acessar o vídeo. Por favor, verifique se o vídeo está público e tente novamente.'
            };
        }
        if (error.message.includes('copyright')) {
            return { 
                available: false, 
                error: 'Este vídeo não pode ser baixado devido a restrições de direitos autorais.'
            };
        }
        return { 
            available: false, 
            error: `Erro ao verificar disponibilidade do vídeo: ${error.message}`
        };
    }
}

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

        // Verifica disponibilidade do vídeo
        const availability = await checkVideoAvailability(videoURL);
        if (!availability.available) {
            return res.status(400).json({ error: availability.error });
        }

        console.log('URL validada, obtendo informações do vídeo...');

        // Obtém informações do vídeo com configurações atualizadas
        const videoInfo = await youtubedl(videoURL, {
            dumpSingleJson: true,
            noWarnings: true,
            noCallHome: true,
            noCheckCertificate: true,
            preferFreeFormats: true,
            addHeader: [
                'referer:youtube.com',
                'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            ]
        });

        const title = videoInfo.title.replace(/[^\w\s]/gi, '');
        console.log('Título do vídeo:', title);
        console.log('Informações do vídeo:', videoInfo);

        // Configura os headers da resposta
        res.header('Content-Disposition', `attachment; filename="${title}.mp3"`);
        res.header('Content-Type', 'audio/mpeg');

        console.log('Iniciando download do áudio...');

        // Inicia o download do áudio com configurações atualizadas
        const download = youtubedl.exec(videoURL, {
            extractAudio: true,
            audioFormat: 'mp3',
            audioQuality: 0,
            output: '-',
            format: 'bestaudio',
            quiet: false, // Alterado para ver mais logs
            noWarnings: true,
            noCallHome: true,
            noCheckCertificate: true,
            preferFreeFormats: true,
            addHeader: [
                'referer:youtube.com',
                'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            ]
        });

        // Pipe a saída do download para a resposta
        download.stdout.pipe(res);

        // Tratamento de erros durante o download
        download.stderr.on('data', (data) => {
            const errorMsg = data.toString();
            console.error('Erro detalhado no download:', errorMsg);
            
            if (!res.headersSent) {
                let userError = 'Erro ao processar o vídeo';
                
                if (errorMsg.includes('copyright')) {
                    userError = 'Este vídeo não pode ser baixado devido a restrições de direitos autorais';
                } else if (errorMsg.includes('unavailable')) {
                    userError = 'Erro ao acessar o vídeo. Por favor, verifique se o vídeo está público e tente novamente.';
                }
                
                res.status(400).json({ error: userError, details: errorMsg });
            }
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
            console.log('Download concluído com sucesso');
        });

        // Tratamento de erro no processo
        download.on('error', (error) => {
            console.error('Erro detalhado no processo:', error);
            if (!res.headersSent) {
                res.status(500).json({ 
                    error: 'Erro ao processar o vídeo. Tente novamente mais tarde.',
                    details: error.message
                });
            }
        });

    } catch (error) {
        console.error('Erro detalhado no servidor:', error);
        if (!res.headersSent) {
            let userError = 'Falha ao converter vídeo';
            
            if (error.message.includes('copyright')) {
                userError = 'Este vídeo não pode ser baixado devido a restrições de direitos autorais';
            } else if (error.message.includes('unavailable')) {
                userError = 'Erro ao acessar o vídeo. Por favor, verifique se o vídeo está público e tente novamente.';
            }
            
            res.status(500).json({ 
                error: userError,
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