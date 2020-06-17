# Lavalink Node.js

> Este codigo tem como função ajudar as pessoas que programam BOTs de Discord em JavaScript/Node.js e querem ter 1 servidor **Lavalink** na mesma instacia do seu BOT na Discloud

**❕Neste codigo só funciona de momento em sistemas Linux e na Discloud❗**


## Como funciona?
Ao executar o codigo
1. Vai baixar o Lavalink e openJDK (referentes ao que está no arquivo [`config.json`](./config.json))
2. Executar o Lavalink com openJDK baixado
3. Executar o codigo do bot que está no diretório [`bot`](./bot/) *(codigo do bot terá de ser adicionado pela propria pessoa que usar o codigo)*
4. Criar 1 diretório chamado `logs` onde terá tudos os logs de tudas as funções executadas na palma da sua mão


## Como usar?
Para usar este codigo basta fazer:
1. Baixar a codigo pelas [`Releases`](https://github.com/discloud/lavalink-nodejs/releases) ou [Clique Aqui](https://github.com/discloud/lavalink-nodejs/releases/latest/download/lavalink-nodejs.zip)
2. Depois de baixado, basta colocar o codigo do seu bot no diretório [`bot`](./bot/)
3. No arquivo [`config.json`](./config.json) no [`fileRunBot`](./config.json#L7) altere o nome do arquivo principal (no caso está `bot.js` mas se for outro nome (como por exemplo `index.js`) troque para o nome correto)
4. No seu codigo, área onde você conecta o Lavalink por favor coloque este dados:
> ```js
>{
>   host: "localhost",
>   port: 2333,
>   password: "discloud"
>}
>```

Depois de tudo feito e envie para a Discloud colocando `index.js` como Arquivo Principal


## FAQ