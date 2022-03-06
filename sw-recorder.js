let config = require('./config.json')
const moment = require('moment');
const osascript = require('node-osascript');
const { spawn } = require("child_process");
const fs = require("fs");
const request = require("request");
const path = require("path");
const rimraf = require('rimraf');
const crypto = require('crypto');
function msToTime(s) {
    // Pad to 2 or 3 digits, default is 2
    function pad(n, z) {
        z = z || 2;
        return ('00' + n).slice(-z);
    }

    var ms = s % 1000;
    s = (s - ms) / 1000;
    var secs = s % 60;
    s = (s - secs) / 60;
    var mins = s % 60;
    var hrs = (s - mins) / 60;

    return pad(hrs) + ':' + pad(mins) + ':' + pad(secs) + '.' + pad(ms, 3);
}

let activeRecordings = new Map();

console.log(`Lizumi Digital Recorder v0.1`);
function newRadioStream(channelNumber) {
    return new Promise(resolve => {
        try {
            request.get({
                url: `http://${config.sxmclient_host}/${channelNumber}.m3u8`,
            }, async function (err, res, body) {
                if (err) {
                    console.error("Faulty Server Response: " + err.message);
                    resolve(false);
                } else {
                    try {
                        const data = body.toString().split('\n').map(e => {
                            if (e.startsWith('#EXT-X-KEY')) {
                                return e.replace('URI="', `URI="http://${config.sxmclient_host}/`);
                            } else if (e.startsWith('AAC_Data')) {
                                return `http://${config.sxmclient_host}/${e}`
                            } else {
                                return e
                            }
                        })
                        const startSync = moment(data.find(e => e.startsWith('#EXT-X-PROGRAM-DATE-TIME')).split('PROGRAM-DATE-TIME:').pop().split('+')[0]).valueOf();
                        const stopSync = moment(data.reverse().find(e => e.startsWith('#EXT-X-PROGRAM-DATE-TIME')).split('PROGRAM-DATE-TIME:').pop().split('+')[0]).valueOf();
                        resolve({
                            playlist: data.reverse(),
                            startSync,
                            stopSync
                        })
                    } catch (e) {
                        console.error('AAC Data Failure');
                        console.error(e);
                        resolve(false);
                    }
                }
            })
        } catch (e) {
            console.error(`Failed to get stream URLs!`)
            console.error(e)
            resolve(false);
        }
    })
}
function writeStreamSheet(playlist) {
    return new Promise(resolve => {
        let token = crypto.randomBytes(16).toString("hex");
        fs.writeFile(path.join(config.record_dir, `AACSTREAM_${token}.m3u8`), playlist.toString(), () => {
            resolve(`AACSTREAM_${token}.m3u8`)
        })
    })
}
async function startNewRecording(channel, lastSync) {
    const maxFileTime = 2;
    return new Promise(async resolve => {
        const streamData = await newRadioStream(channel);
        const steamFile = await writeStreamSheet(streamData.playlist.join('\n'));

        const startTime = ((x,y) => {
            if (lastSync) {
                if (x <= y && (x - y) > 0)
                    return [[ '-ss', msToTime(x - y) ], y]
                return [[],0]
            }
            return [[],0]
        })(streamData.syncStart, lastSync)
        let metadata = {
            channel: channel,
            streamFile: steamFile,
            startSync: streamData.startSync - startTime[1],
            stopSync: streamData.startSync + (maxFileTime * 3600000),
            targetDuration: (maxFileTime * 3600000),
            startStream: streamData.startSync,
            stopStream: streamData.stopSync,
            droppedSegments: [],
            closedGracefully: false
        }

        const recordingFile = `SXM_Digital_${channel}_${streamData.startSync}`;


        function writeMetadata() {
            return new Promise(f => {
                fs.writeFile(path.join(config.record_dir, `${recordingFile}.json`), JSON.stringify(metadata).toString(), () => f(null))
            })
        }

        console.log(metadata);
        const spawnedRecorder = spawn('/usr/local/bin/ffmpeg', [
            '-hide_banner',
            '-y',
            '-protocol_whitelist', 'concat,file,http,https,tcp,tls,crypto',
            '-reconnect', 'true',
            '-reconnect_on_network_error', 'false',
            ...startTime[0],
            '-t', `${maxFileTime}:00:00`,
            '-i', steamFile,
            `${recordingFile}.mp3`
        ], {
            cwd: config.record_dir,
            encoding: 'utf8'
        })
        activeRecordings.set(channel, spawnedRecorder);
        writeMetadata();

        spawnedRecorder.stdout.on('data', (data) => {
            if (data.toString().includes('#EXT-X-PROGRAM-DATE-TIME')) {

            } else {
                console.log(data.toString())
            }
        });
        spawnedRecorder.stderr.on('data', (data) => {
            console.error(data.toString())
        });
        spawnedRecorder.on('close', (code) => {
            rimraf(steamFile, () => {});
            activeRecordings.delete(channel);
            console.log(`Recorder closed with code: ${code}`);
            if (code === 0)
                metadata.closedGracefully = true;
            writeMetadata();
            resolve(true);
            setTimeout(() => {
                startNewRecording(channel, metadata.stopSync);
            }, 30000);
        });
    })
}

Object.keys(config.channels).forEach((channelNumber) => {
    const ch = config.channels[channelNumber]
    if (ch.id && ch.allowDigital === true) {
        console.log(`Started Channel ${ch.id}`)
        startNewRecording(ch.id);
    }
})
