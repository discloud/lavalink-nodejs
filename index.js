/*
    
    Este codigo é reponsavel para executar o Lavalink com o Node.js e 1 bot incluido

    Explicação rapida do codigo
        Isto tem varias funções espalhadas pelo codigo (mas esteve mais)
        Mas a principal é a função run que se encontra no final do codigo
        Ela inicia tudas as outras
        Eu sei que tem muitos async/await desnecessários
        Mas tentei o maximo fazer o codigo esperar pela coisas (tenhos uns traumas de codigo não esperar pelo resto)

*/

//Variavel do arquivo de configuração do lavalink (possivel ser editado, é recomendado ter password (existe algumas depencias))
let lavaymal = `
server: # REST and WS server
  port: 2333
  address: 0.0.0.0
lavalink:
  server:
    password: "discloud"
    sources:
      youtube: true
      bandcamp: true
      soundcloud: true
      twitch: true
      vimeo: true
      mixer: true
      http: true
      local: false
    bufferDurationMs: 400
    youtubePlaylistLoadLimit: 6 # Number of pages at 100 each
    youtubeSearchEnabled: true
    soundcloudSearchEnabled: true
    gc-warnings: true
    #ratelimit:
      #ipBlocks: ["1.0.0.0/8", "..."] # list of ip blocks
      #excludedIps: ["...", "..."] # ips which should be explicit excluded from usage by lavalink
      #strategy: "RotateOnBan" # RotateOnBan | LoadBalance | NanoSwitch | RotatingNanoSwitch
      #searchTriggersFail: true # Whether a search 429 should trigger marking the ip as failing
      #retryLimit: -1 # -1 = use default lavaplayer value | 0 = infinity | >0 = retry will happen this numbers times

metrics:
  prometheus:
    enabled: false
    endpoint: /metrics

sentry:
  dsn: ""
#  tags:
#    some_key: some_value
#    another_key: another_value
`
//--------------------------------


// ˘˘˘˘˘˘˘˘˘˘˘ requerimentos ˘˘˘˘˘˘˘˘˘˘˘
const 
    { spawn, spawnSync } = require("child_process"), //chamando o modulo child_porcess (is native in node) (é o shelljs no proprio node) para executar o codigos no shell
    { readdirSync, appendFileSync, unlinkSync, mkdirSync, rmdirSync } = require("fs"), //chamado o fs (is native in node) para ler diretário e criar os arquivos de logs na pasta logs
    moment = require("moment"), //chamando o node
    time = moment().unix(), //hora do start code
    ram = require("discloud-status"), // verificar a ram
    config = require("./config.json") //chamando a config da macumba
        /*Tradução do config.json
            - openJDK //objeto que contem as coisas necesárias do openJDK
                - version //é a verção que fui baixada do openjdk (atualmente é a verção 13)
                - linkDown //Link de download do binário (link da verção linux x64) do openJDK para baixar

            - lavalink //Link de download do lavalink (atual: link da ultima verção do server ci do lavalink))
                //mudar de vez enquanto https://ci.fredboat.com/viewLog.html?buildId=lastSuccessful&buildTypeId=Lavalink_Build&tab=artifacts&guest=1 (mais atualizado)
                    // nota: o link de download tem de acabar com "?guest=1" o site sistema de autenticação

            - fileRunBot //nome do arquivo principal (tem de estar da raiz da pasta bot)    
        */
// ^^^^^^^^^^^ requerimentos ^^^^^^^^^^^

// verifica se os logs estão ativos
if (config.logMODE === true) lavaymal = lavaymal +`
logging:
  file:
    max-history: 10
    max-size: 200MB
  path: ../../logs/lavalink/

  level:
    root: INFO
    lavalink: INFO
`

//função para verificar se existe 1 diretório
async function isDirValid(dirents, name){
    let lookDir //variavel para verficar se existe
    for (const item of dirents) if (item.isDirectory() /*é diretório?*/ && item.name === name/* tem o nome que procuro?*/) lookDir = true //encontrou
    if (!lookDir) lookDir = false //nao encontrou
    return lookDir
}

//função para verificar se existe 1 arquivo 
async function isFileValid(dirents, name){
    let lookFile //variavel para verficar se existe
    for (const item of dirents) if (!item.isDirectory() /*é arquivo?*/ && item.name === name /* tem o nome que procuro?*/) lookFile = true //encontrou
    if (!lookFile) lookFile = false //nao encontrou
    return lookFile
}

let tryRunLavalink = 0,     //isto é 1 sistema de tentar fazer o lavalink reniciar caso ele morra
    runLava,                //variavel que controla o run do lavalink fora da função -- Gambirra para conseguir matar a função - https://cdn.discordapp.com/attachments/589906158924464149/715666337489485864/Captura_de_ecra_de_2020-05-28_21-41-53.png
    runNode                 //variavel que controla o run do lavalink fora da função -- Gambirra para conseguir matar a função - https://cdn.discordapp.com/attachments/589906158924464149/715666337489485864/Captura_de_ecra_de_2020-05-28_21-41-53.png

//função que travalha com o lavalink
async function runLavalink() {
    console.log("Iniciando Lavalink...")
    const urlJava = process.cwd() + `/java/jdk-${config.openJDK.version}/bin/java` //caminho fixo até ao java
    runLava = spawn(urlJava, ["-jar", "Lavalink.jar"], {cwd: "./java/lavalink"}) //executa 1 lavalink no diretório java/lavalink (dando 1 cd até lá executar)

    // quando o lavalink cair
    runLava.on("close", async (code) => {
        console.log(`lavalink desligou com o code ${code}`)
        if (code === 127) {
            console.error("Por favor delete a pasta java para resolver!!\nEsse aconteceu devido que os arquivos estão danificados!!!")
            process.exit(code)
        }
        if (tryRunLavalink < 3) { //já reniciou mais de 3 vezes contadas?
            console.error("Tentando reniciar o lavalink...")
            tryRunLavalink = tryRunLavalink + 1 // contador
            runLavalink() // executar o lava de novo 
        } else { 
            console.error("O lavalink caiu mais de 3 seguidas... Tudo vai ser desligado!!")
            if(runNode) await runNode.kill() //matar o node do bot (pensando bem vai dar BO com shards (já que o codigo é 1 genero de que as shards fazem))
            process.exit(code) //desligar tudo
        }
    })

}

//função que travalha com o bot
async function runBot(dir) {
    console.log("Preparando o Bot...")
    if (await isDirValid(dir, "node_modules")) { //verifica se a pasta node_modules está lá dentro
        try {
            rmdirSync("./bot/node_modules/", {recursive: true})
        } catch (err) {
            console.error("Erro ao remover a pasta node_modules", err)
            if(runLava) { //matar o lavalink tambem
                tryRunLavalink = 4 //por contador mais que 3 para parar de contar
                await runLava.kill() //kill lavalink
            }
            return process.exit(1) //desligar tudo
        }
    }

    const npm = spawnSync("npm", ["i"], {cwd: "./bot", encoding: "utf-8"})
    if (config.logMODE === true) appendFileSync(`./logs/npm-${time}.log`,  `logs:\n${npm.stdout.trim()}\n\n\n\nerros:\n${npm.stderr.trim()}\n`, {encoding: "utf-8"})
    if (npm.status !== 0) {
        console.error("Erro ao instalar os modulos", npm.stderr.trim())
        if(runLava) { //matar o lavalink tambem
            tryRunLavalink = 4 //por contador mais que 3 para parar de contar
            await runLava.kill() //kill lavalink
        }
        return process.exit(1) //desligar tudo
    }

    console.log("Iniciando o bot...")
    runNode = spawn("node", [config.fileRunBot], {cwd: "./bot"}) //executa 1 node separado para trabalhar só com o bot (não terá influencia desta parte do codigo)

    //setar o terminal para utf-8
    runNode.stdout.setEncoding("utf-8")
    runNode.stderr.setEncoding("utf-8")
    //------------------
    
    //eventos de logs do terminal do bot
    runNode.stdout.on("data", (data) => {
        console.log(data.trim()) //console log do bot
        if (config.logMODE === true) appendFileSync(`./logs/bot-logs-${time}.log`, data.trim()+"\n", {encoding: "utf-8"})
    })

    runNode.stderr.on("data", (data) => {
        console.error(data.trim()) //console error do bot
        if (config.logMODE === true) appendFileSync(`./logs/bot-logs-${time}.log`, data.trim()+"\n", {encoding: "utf-8"})
    })
    //--------------

    // quando o bot cair
    runNode.on("close", () => {
        console.error(`O bot caiu!!`)
        if(runLava) { //mata o lavalink
            tryRunLavalink = 4 //por contador mais que 3 para parar de contar
            runLava.kill() //kill lavalink
        }
        process.exit(runNode.exitCode) //desligar tudo
    })
}

//função que executa tuda a magia
async function run(){
    if (process.platform !== "linux") {
        console.error("Este codigo só funciona em plantaformas Linux, de momento este codigo não fuinciona aqui!!!")
        process.exit(1)
    }
    
    const allram = ram.totalRam()
    if (allram == "NaN") console.log("Verificação de RAM inisponivel de Momento!!")
    else {
        const numberRAM = await allram.split("").filter(n => (Number(n) || n == 0)).join("")
        const lRAM = await allram.split("").filter(n => !(Number(n) || n == 0)).join("")
        if (numberRAM < 512 && lRAM === "MB") console.log(`Você so tem ${allram} disponivel para o codigo funcionar!!\nIsso não muito recomendado o minimo é 512MB!!`)
        else console.log(`Você tem disponivel: ${allram}`)
    }
    
    console.log("Preparando o sistema")
    let rootCode = readdirSync("./", {encoding: "utf-8", withFileTypes: true}) //lê a raiz do codigo

    if (config.logMODE === true && !(await isDirValid(rootCode, "logs"))) { //verifica se a diretório logs exite
        try {
            mkdirSync("logs") //cria a diretório logs
        } catch (err) {
            console.error("Erro ao criar a pasta logs:", err)
            return process.exit(1) //parou tudo
        }
    }
    
    if (!(await isDirValid(rootCode, "java"))) { //verifica se a diretório java exite
        try {
            mkdirSync("java") //cria a diretório java
        } catch (err) {
            console.error("Erro ao criar a pasta java:", err)
            return process.exit(1) //parou tudo
        }
    }

    let dirBot = readdirSync("./bot", {encoding: "utf-8", withFileTypes: true}) //lê o diretório bot

    if (!(await isFileValid(dirBot, config.fileRunBot))) { //verifica se o arquivo principal existe
        console.error(`O arquivo ${config.fileRunBot} não fui encontrado`)
        return process.exit(1)//parou tudo
    }
    if (!(await  isFileValid(dirBot, "package.json"))) { //verifica se o package.json existe
        console.error(`O arquivo package.json não fui encontrado\nSem ele não se poderar vereficar as depencias!!`)
        return process.exit(1)//parou tudo
    }
    
    
    let dirJava = readdirSync("./java", {encoding: "utf-8", withFileTypes: true}) //lê o diretório java

    if (!(await isDirValid(dirJava, `jdk-${config.openJDK.version}`))) { //verifica se o openjdk fui baixado (qualquer alteração o arquivo terá de ser removido manualmente)
        console.log("Baixando o openJDK") 
        
        let downJDK
        if (config.logMODE === true) {
            downJDK = spawnSync("wget", ["-c", "-o", `../logs/downjava-${time}.log`, "-O", "java.tar.gz", config.openJDK.linkDown], {encoding: "utf-8", cwd: "./java"}) //wget para baixar o o openjdk
        } else {
            downJDK = spawnSync("wget", ["-c", "-O", "java.tar.gz", config.openJDK.linkDown], {encoding: "utf-8", cwd: "./java"}) //wget para baixar o o openjdk
        }
        if (downJDK.status !== 0) { //deu erro
            console.error("Erro ao baixar o openjdk:", downJDK.stderr.trim())
            return process.exit(1) //parou tudo
        }
        console.log("OpenJDK baixado com sucesso")
        
        console.log("Extraindo o OpenJDK")
        const tarExtract = spawnSync("tar", ["-zxvf", "java.tar.gz"], {encoding: "utf-8", cwd: "./java"}) //extraindo o java
        if (tarExtract.status !== 0) { //deu erro
            console.error("Erro erro ao :", tarExtract.stderr.trim())
            return process.exit(1)//parou tudo
        }
        if (config.logMODE === true) appendFileSync(`./logs/extractJava-${time}.log`, tarExtract.stdout.trim()+"\n", {encoding: "utf-8"}) //logs da extração do java
        console.log("Extração completa")
        try {
            unlinkSync("./java/java.tar.gz")
        } catch (err) {
            console.error("Falha ao remover o java.tar.gz!!")
            console.error(err)
        }
    }

    if (!(await isDirValid(dirJava, "lavalink"))) { //verifica se a diretório lavalink se existe no diretório java
        try {
            mkdirSync("./java/lavalink") //cria a diretório lavalink
        } catch (err) {
            console.error("Erro ao criar a pasta lavalink:", err)
            return process.exit(1) //parou tudo
        }
    }

    let dirLavalink = readdirSync("./java/lavalink", {encoding: "utf-8", withFileTypes: true})   //lê o diretório lavalink que existe no diretório java
    
    if (!(await isFileValid(dirLavalink, "Lavalink.jar"))) { //verefica se o arquivo Lavalink.jat fui baixado (qualquer alteração o arquivo terá de ser removido manualmente)
        console.log("Baixando o Lavalink")

        let downLavalink
        if (config.logMODE === true) downLavalink = spawnSync("wget", ["-c", "-o", `../../logs/lavalinkdown-${time}.log`, "-O", "Lavalink.jar", config.lavalink], {encoding: "utf-8", cwd: "./java/lavalink"}) //baixaindo o lavalink
        else downLavalink = spawnSync("wget", ["-c", "-O", "Lavalink.jar", config.lavalink], {encoding: "utf-8", cwd: "./java/lavalink"}) //baixaindo o lavalink
        if (downLavalink.status !== 0) {//deu erro
            console.error("Erro ao baixar o openjdk:", downLavalink.stderr.trim())
            return process.exit(1)//parou tudo
        }
        console.log("Lavalink baixado com sucesso")
    }

    if (await isFileValid(dirLavalink, "application.yml")) unlinkSync("./java/lavalink/application.yml") //se o arquivo application.yml existe
    appendFileSync("./java/lavalink/application.yml", lavaymal, {encoding: "utf-8"})
    runLavalink() // executa o lavalink

    setTimeout(() => { //delay para executar o bot (dar 1 tempo o lavalink acordar)
        runBot(dirBot) 
    }, 20*1000);

}
run()