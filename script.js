document.addEventListener('DOMContentLoaded', () => {
    const convertBtn = document.getElementById('convertBtn');
    const videoUrlInput = document.getElementById('videoUrl');
    const status = document.getElementById('status');
    const btnText = convertBtn.querySelector('.btn-text');
    const loadingSpinner = convertBtn.querySelector('.loading-spinner');
    const downloadArea = document.getElementById('downloadArea');
    const downloadBtn = document.getElementById('downloadBtn');

    convertBtn.addEventListener('click', async () => {
        const videoUrl = videoUrlInput.value.trim();

        if (!videoUrl) {
            showStatus('Por favor, insira um link do YouTube', 'error');
            return;
        }

        if (!isValidYouTubeUrl(videoUrl)) {
            showStatus('Link do YouTube inválido', 'error');
            return;
        }

        try {
            setLoading(true);
            showStatus('Preparando seu download...', 'info');
            downloadArea.style.display = 'none';

            // Extrair o ID do vídeo
            const videoId = extractVideoId(videoUrl);
            if (!videoId) {
                throw new Error('ID do vídeo não encontrado');
            }

            // Usar a API do y2mate
            const apiUrl = `https://yt2mp3.info/api/button/mp3/${videoId}`;
            downloadBtn.href = apiUrl;
            
            showStatus('Pronto para download!', 'success');
            downloadArea.style.display = 'block';
            setLoading(false);

        } catch (error) {
            console.error('Error:', error);
            showStatus('Erro ao processar o vídeo. Tente novamente.', 'error');
            setLoading(false);
        }
    });

    function extractVideoId(url) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }

    function isValidYouTubeUrl(url) {
        const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
        return pattern.test(url);
    }

    function setLoading(isLoading) {
        if (isLoading) {
            btnText.style.opacity = '0';
            loadingSpinner.style.display = 'block';
            convertBtn.disabled = true;
        } else {
            btnText.style.opacity = '1';
            loadingSpinner.style.display = 'none';
            convertBtn.disabled = false;
        }
    }

    function showStatus(message, type) {
        status.textContent = message;
        status.className = 'status ' + type;
        
        if (type === 'success' || type === 'error') {
            setTimeout(() => {
                if (type === 'error') {
                    status.textContent = '';
                    status.className = 'status';
                }
            }, 5000);
        }
    }
}); 