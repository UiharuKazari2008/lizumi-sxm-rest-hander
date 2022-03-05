let config = require('./config.json')
const moment = require('moment');
const fs = require('fs');
const path = require("path");
const osascript = require('node-osascript');
const { spawn, exec } = require("child_process");

console.log(`Lizumi Digital Recorder v0.1`);

async function recorder(channel) {
    console.log(`Streaming Recorder for ${channel}...`)

    const ffmpegOptions = [
        '-hide_banner',
        '-y',
        '-protocol_whitelist', 'concat,file,http,https,tcp,tls,crypto',
        '-reconnect', 'true',
        ' -reconnect_streamed', 'true',
        '-reconnect_on_network_error', 'false',
        '-i', `http://${config.sxmclient_host}/${channel}.m3u8`,
        `SXM_Digital_${channel}_${moment().valueOf()}.mp3`
    ];
    // ffmpeg -y -i http://127.0.0.1:9999/octane.m3u8 -f mp2 output.mp3

    const spawnedRecorder = spawn('/usr/local/bin/ffmpeg', ffmpegOptions, {
        cwd: config.record_dir,
        encoding: 'utf8'
    })

    spawnedRecorder.stdout.on('data', (data) => {
        console.log(`${data}`);
    });
    spawnedRecorder.stderr.on('data', (data) => {
        console.error(`${data}`);
    });

    spawnedRecorder.on('close', (code) => {
        console.log(`Recorder closed with code: ${code}, Restarting...`);
        recorder(channel);
    });
}

for (let channelNumber of Object.keys(config.channels)) {
    const ch = config.channels[channelNumber]
    if (ch.id && ch.allowDigital) {
        recorder(ch.id)
    }
}