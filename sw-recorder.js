let config = require('./config.json')
const moment = require('moment');
const osascript = require('node-osascript');
const { spawn } = require("child_process");
const RateLimiter = require('limiter').RateLimiter;
const limiter1 = new RateLimiter(5, 60000);

console.log(`Lizumi Digital Recorder v0.1`);
(async () => {
    function startRecorder(channel) {
        limiter1.removeTokens(1, () => { ffmpegRecoder(channel); })
    }
    async function ffmpegRecoder(channel) {
        console.log(`Streaming Recorder for ${channel}...`)

        // ffmpeg -y -i http://127.0.0.1:9999/octane.m3u8 -f mp2 output.mp3
        const spawnedRecorder = spawn('/usr/local/bin/ffmpeg', [
            '-hide_banner',
            '-loglevel', 'error',
            '-y',
            '-protocol_whitelist', 'concat,file,http,https,tcp,tls,crypto',
            '-reconnect', 'true',
            '-reconnect_on_network_error', 'false',
            '-t', '04:00:00',
            '-i', `http://${config.sxmclient_host}/${channel}.m3u8`,
            `SXM_Digital_${channel}_${moment().valueOf()}.mp3`
        ], {
            cwd: config.record_dir,
            encoding: 'utf8'
        })

        spawnedRecorder.stdout.on('data', (data) => console.log(data));
        spawnedRecorder.stderr.on('data', (data) => console.error(data));
        spawnedRecorder.on('close', (code) => {
            console.log(`Recorder closed with code: ${code}, Restarting...`);
            startRecorder(channel);
        });
    }

    for (let channelNumber of Object.keys(config.channels)) {
        const ch = config.channels[channelNumber]
        if (ch.id && ch.allowDigital === true) {
            startRecorder(ch.id)
        }
    }
})()