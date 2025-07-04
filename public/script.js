document.addEventListener('DOMContentLoaded', () => {
    const convertBtn = document.getElementById('convertBtn');
    const videoUrlInput = document.getElementById('videoUrl');
    const qualitySelect = document.getElementById('quality');
    const status = document.getElementById('status');
    const btnText = convertBtn.querySelector('.btn-text');
    const loadingSpinner = convertBtn.querySelector('.loading-spinner');

    convertBtn.addEventListener('click', async () => {
        const videoUrl = videoUrlInput.value.trim();
        const quality = qualitySelect.value;

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
            showStatus('Convertendo...', 'info');

            const response = await fetch(`/download?url=${encodeURIComponent(videoUrl)}&quality=${quality}`);
            
            if (!response.ok) {
                throw new Error('Erro na conversão');
            }

            // Get filename from Content-Disposition header
            const contentDisposition = response.headers.get('Content-Disposition');
            const filename = contentDisposition
                ? contentDisposition.split('filename=')[1].replace(/"/g, '')
                : 'audio.mp3';

            // Create a blob from the response
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);

            // Create temporary link and trigger download
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            showStatus('Download concluído!', 'success');
            setLoading(false);

        } catch (error) {
            console.error('Error:', error);
            showStatus('Erro ao converter o vídeo', 'error');
            setLoading(false);
        }
    });

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
                status.textContent = '';
                status.className = 'status';
            }, 5000);
        }
    }
}); 