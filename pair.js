//////========================
const express = require('express');
const fs = require('fs');
const { exec } = require("child_process");
let router = express.Router()
const pino = require("pino");
const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers,
    jidNormalizedUser
} = require("@whiskeysockets/baileys");
const { upload } = require('./mega');

function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
    let num = req.query.number;
    async function TechbrosPair() {
        const { state, saveCreds } = await useMultiFileAuthState(`./session`);
        try {
            let TechbrosPairWeb = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                },
                printQRInTerminal: false,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                browser: Browsers.macOS("Safari"),
            });

            if (!TechbrosPairWeb.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, '');
                const code = await TechbrosPairWeb.requestPairingCode(num);
                if (!res.headersSent) {
                    await res.send({ code });
                }
            }

            TechbrosPairWeb.ev.on('creds.update', saveCreds);
            TechbrosPairWeb.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;
                if (connection === "open") {
                    try {
                        await delay(10000);
                        const sessionTechbros = fs.readFileSync('./session/creds.json');

                        const auth_path = './session/';
                        const user_jid = jidNormalizedUser(TechbrosPairWeb.user.id);

                        function randomMegaId(length = 6, numberLength = 4) {
                            const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                            let result = '';
                            for (let i = 0; i < length; i++) {
                                result += characters.charAt(Math.floor(Math.random() * characters.length));
                            }
                            const number = Math.floor(Math.random() * Math.pow(10, numberLength));
                            return `${result}${number}`;
                        }

                        const mega_url = await upload(fs.createReadStream(auth_path + 'creds.json'), `${randomMegaId()}.json`);

                        const string_session = mega_url.replace('https://mega.nz/file/', '');

                        const sid = string_session;

                        // Send the session ID message
                        await TechbrosPairWeb.sendMessage(user_jid, { text: sid });

                        // Send an additional text message
                        await TechbrosPairWeb.sendMessage(user_jid, { text: "Session ID sent successfully. Here's additional info!" });

                        // Send an audio message
                        await TechbrosPairWeb.sendMessage(user_jid, {
                            audio: { url: './path/to/your/audio/file.mp3' },
                            mimetype: 'audio/mpeg'
                        });

                        // Send an image message via URL
                        await TechbrosPairWeb.sendMessage(user_jid, {
                            image: { url: 'https://example.com/path/to/your/image.jpg' },
                            caption: "Here's an image for you!"
                        });

                    } catch (e) {
                        exec('pm2 restart techbros');
                    }

                    await delay(100);
                    return await removeFile('./session');
                    process.exit(0);
                } else if (connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode !== 401) {
                    await delay(10000);
                    TechbrosPair();
                }
            });
        } catch (err) {
            exec('pm2 restart techbros-md');
            console.log("service restarted");
            TechbrosPair();
            await removeFile('./session');
            if (!res.headersSent) {
                await res.send({ code: "Service Unavailable" });
            }
        }
    }
    return await TechbrosPair();
});

process.on('uncaughtException', function (err) {
    console.log('Caught exception: ' + err);
    exec('pm2 restart techbros');
});


module.exports = router;


      
