FROM node:18-slim

# Instala as dependências necessárias
RUN apt-get update && \
    apt-get install -y python3 ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Cria e define o diretório de trabalho
WORKDIR /app

# Copia os arquivos do projeto
COPY package*.json ./
COPY . .

# Instala as dependências do Node.js
RUN npm install

# Expõe a porta que o app usa
EXPOSE 3000

# Comando para iniciar o app
CMD ["npm", "start"] 