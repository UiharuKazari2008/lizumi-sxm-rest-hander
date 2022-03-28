let config = require('./config.json')
let cookies = require("./cookie.json");
//const { sqlPromiseSafe } = require('./sql-client');
const moment = require('moment');
const fs = require('fs');
const path = require("path");
const osascript = require('node-osascript');
const { spawn, exec } = require("child_process");
const cron = require('node-cron');
const request = require('request').defaults({ encoding: null });
const express = require("express");
const app = express();
const net = require('net');
const rimraf = require("rimraf");

let metadata = {};
let channelTimes = {
    timetable: {

    },
    pending: [],
    completed: []
};
let locked_tuners = new Map();
let adblog_tuners = new Map();
let scheduled_tasks = new Map();
let device_logs = {};
let stopwatches_tuners = new Map();
let nowPlayingGUID = {};
let pendingBounceTimer = null;
let digitalAvailable = false
let satelliteAvailable = false
let jobQueue = {};
let activeQueue = {};

const findClosest = (arr, num) => {
    const creds = arr.reduce((acc, val, ind) => {
        let { diff, index } = acc;
        const difference = Math.abs(val - num);
        if (difference < diff) {
            diff = difference;
            index = ind;
        }
        return { diff, index };
    }, {
        diff: Infinity,
        index: -1
    });
    return creds.index;
};
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
function cleanText(t) {
    return t.split('/').join(' & ').split(',').join('').split('...').join('').replace(/[/\\?%*:|"<>]/g, '').trim()
}
function portInUse(port) {
    return new Promise((callback) => {
        const server = net.createServer(function(socket) {
            socket.write('Echo server\r\n');
            socket.pipe(socket);
        });

        server.on('error', function (e) {
            callback(true);
        });
        server.on('listening', function (e) {
            server.close();
            callback(false);
        });

        server.listen(port, '127.0.0.1');
    })
}
function isWantedEvent(l, m) {
    if (m.title && l.search && m.title.toLowerCase().includes(l.search.toLowerCase()))
        return true
    if (m.artist && l.search && m.artist.toLowerCase().includes(l.search.toLowerCase()))
        return true
    if (m.album && l.search && m.album.toLowerCase().includes(l.search.toLowerCase()))
        return true

    if (m.title && l.title && m.title.toLowerCase() === l.title.toLowerCase())
        return true
    if (m.artist && l.artist && m.artist.toLowerCase() === l.artist.toLowerCase())
        return true
    if (m.album && l.album && m.album.toLowerCase() === l.album.toLowerCase())
        return true

    return false
}

if (fs.existsSync(path.join(config.record_dir, `metadata.json`))) {
    metadata = require(path.join(config.record_dir, `metadata.json`))
}
if (fs.existsSync(path.join(config.record_dir, `accesstimes.json`))) {
    channelTimes = require(path.join(config.record_dir, `accesstimes.json`))
}

// Update Metadata for Channels
// All Channels will be updated every minute unless "updateOnTune: true" is set
// In that case the metadata is only pulled if the channel is active on a tunner
async function updateMetadata() {
    try {
        function parseJson(_json) {
            try {
                // Check if messages and successful response
                if (_json['ModuleListResponse']['messages'].length > 0 && _json['ModuleListResponse']['messages'][0]['message'].toLowerCase() === 'successful') {
                    const json = _json['ModuleListResponse']['moduleList']['modules'][0]['moduleResponse']['liveChannelData']['markerLists'].filter(e => e['layer'] === 'cut')[0]['markers']
                    const delay = _json['ModuleListResponse']['moduleList']['modules'][0]['moduleResponse']['liveChannelData']['liveDelay']
                    // For each track that is longer then 65 Seconds
                    let items = json.filter(e => (parseInt(e.duration.toString()) >= 65 || !e.duration)).map(e => {
                        // Get localized timecode
                        const time = moment(e['time'])
                        // Format to Lizumi Meta Format v2
                        return {
                            guid: e.assetGUID,
                            syncStart: time.valueOf(),
                            syncEnd: time.add(parseInt(e.duration.toString()), "seconds").valueOf(),
                            duration: parseInt(e.duration.toString()),
                            delay,

                            title: e.cut.title,
                            artist: e.cut.artists.map(f => f.name).join('/'),
                            album: (e.cut.album) ? e.cut.album.title : undefined,
                            isSong: (e.cut.cutContentType === "Song"),
                            isEpisode: false
                        }
                    })
                    // Append Missing Episodes that are not registering as cuts
                    const episodes = _json['ModuleListResponse']['moduleList']['modules'][0]['moduleResponse']['liveChannelData']['markerLists'].filter(e => e['layer'] === 'episode')[0]['markers'].filter(e => !e['episode']['show']['isPlaceholderShow'] && !(items.filter(f => !f.isSong)[findClosest(items.filter(f => !f.isSong).map(f => f.syncStart), e.time - 60000)] && e.time - items.filter(f => !f.isSong)[findClosest(items.filter(f => !f.isSong).map(f => f.syncStart), e.time - 60000)].syncStart < 900000))
                    if (episodes.length > 0) {
                        items.push(...episodes.map(e => {
                            const time = moment(e['time'])
                            return {
                                guid: e.assetGUID,
                                syncStart: time.valueOf(),
                                syncEnd: time.add(parseInt(e.duration.toString()), "seconds").valueOf(),
                                duration: parseInt(e.duration.toString()),
                                delay,

                                title: e['episode']['longTitle'],
                                isSong: false,
                                isEpisode: true
                            }
                        }))
                    }
                    //const times = itemsSorted.map(e => e['syncStart'])
                    return items
                } else {
                    console.log("FAULT: XM did not give a valid API response");
                    return false;
                }
            } catch (e) {
                console.error(`FAULT: Failed to parse metadata!`)
                console.error(e);
                return false;
            }
        }
        const activeChannels = [...new Set(listTuners().filter(e => e.activeCh).map(e => e.activeCh.ch))]
        const channelsToUpdate = listChannels().channels.filter(e => (!e.updateOnTune || (e.updateOnTune && e.id && activeChannels.indexOf(e.id) !== -1)))

        for (const channelInfo of channelsToUpdate) {
            try {
                const id = (channelInfo.id) ? channelInfo.id : channelInfo.number
                const channel_metadata = await new Promise(resolve => {
                    const timestamp = new moment().utc().subtract(8, "hours").valueOf()
                    const channelURL = `https://player.siriusxm.com/rest/v4/experience/modules/tune/now-playing-live?channelId=${(channelInfo.id) ? channelInfo.id : channelInfo.number}&adsEligible=true&hls_output_mode=none&fbSXMBroadcast=false&marker_mode=all_separate_cue_points&ccRequestType=AUDIO_VIDEO&result-template=radio&time=${timestamp}`
                    request.get({
                        url: channelURL,
                        headers: {
                            'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
                            'accept-language': 'en-US,en;q=0.9',
                            'cache-control': 'max-age=0',
                            'sec-ch-ua': '"Chromium";v="92", " Not A;Brand";v="99", "Microsoft Edge";v="92"',
                            'sec-ch-ua-mobile': '?0',
                            'sec-fetch-dest': 'document',
                            'sec-fetch-mode': 'navigate',
                            'sec-fetch-site': 'none',
                            'sec-fetch-user': '?1',
                            'referer': "https://player.siriusxm.com/now-playing",
                            'upgrade-insecure-requests': '1',
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36 Edg/92.0.902.73',
                            'cookie': cookies.authenticate
                        },
                    }, async function (err, res, body) {
                        if (err) {
                            console.error(err.message);
                            console.log("FAULT");
                            resolve(false);
                        } else {
                            resolve(parseJson(JSON.parse(body)));
                        }
                    })
                })
                if (channel_metadata) {
                    if (metadata[id]) {
                        for (let i in channel_metadata) {
                            const index = metadata[id].map(e => e.syncStart).indexOf(channel_metadata[i].syncStart)
                            if (index !== -1) {
                                const data = metadata[id][index]
                                data.duration = channel_metadata[i].duration
                                data.guid = channel_metadata[i].guid
                                data.syncEnd = channel_metadata[i].syncEnd
                                if (config.ignoredWords.map(word => {
                                    return (
                                        data.title.toLowerCase().includes(word.toLowerCase()) ||
                                        (data.artist && data.artist.toLowerCase().includes(word.toLowerCase())) ||
                                        (data.album && data.album.toLowerCase().includes(word.toLowerCase()))
                                    )
                                }).filter(e => e === true).length > 0 && (!data.isModified && (!data.updateCount || (data.updateCount && data.updateCount <= 10)))) {
                                    data.title = channel_metadata[i].title
                                    data.artist = channel_metadata[i].artist
                                    data.album = channel_metadata[i].album
                                    data.isUpdated = true
                                    if (data.updateCount) {
                                        data.updateCount = data.updateCount + 1
                                    } else {
                                        data.updateCount = 1;
                                    }
                                }
                            } else {
                                metadata[id].push(channel_metadata[i])
                            }
                        }
                        metadata[id] = metadata[id].sort((x, y) => (x.syncStart < y.syncStart) ? -1 : (y.syncStart > x.syncStart) ? 1 : 0)
                    } else {
                        metadata[id] = channel_metadata.sort((x, y) => (x.syncStart < y.syncStart) ? -1 : (y.syncStart > x.syncStart) ? 1 : 0)
                    }
                }
            } catch (e) {
                console.error(e);
                console.error(`Failed to pull metadata`)
            }
        }
        nowPlayingNotification();
    } catch (e) {
        console.error(e);
        console.error("FAULT");
    }
}
// Sync metadata and timetables to disk
async function saveMetadata() {
    // Clean out old metadata
    await new Promise(resolve => {
        try {
            // Delete metadata thats older then a month
            for (let i in metadata) {
                metadata[i] = metadata[i].filter(e => e.syncStart >= moment().subtract(1, 'month').valueOf())
            }
            // Delete tune times that are older then a month
            for (let k of Object.keys(channelTimes.timetable)) {
                const newtable = channelTimes.timetable[k].filter(e => e['time'] >= moment().subtract(1, 'month').valueOf())
                if (newtable.length > 0)
                    channelTimes.timetable[k] = newtable
            }
        } catch (e) {
            console.error(e);
        }
        resolve(null);
    })
    await new Promise(resolve => {
        fs.writeFile(
            path.join(config.record_dir, `metadata.json`),
            JSON.stringify(metadata),
            () => { resolve(null) })
    })
    await new Promise(resolve => {
        fs.writeFile(
            path.join(config.record_dir, `accesstimes.json`),
            JSON.stringify(channelTimes),
            () => { resolve(null) })
    })
    return true;
}
// Get active tuners and send now playing notifications
async function nowPlayingNotification(forceUpdate) {
    const activeTuners = listTuners().filter(e => e.activeCh)
    const channels = listChannels()
    for (const t of activeTuners) {
        const _n = metadata[t.activeCh.ch]
        let n = _n[_n.length - 1]
        if (nowPlayingGUID[t.activeCh.ch] !== n.guid || n.isUpdated || forceUpdate) {
            nowPlayingGUID[t.activeCh.ch] = n.guid
            n.isUpdated = false
            const eventText = (() => {
                if (n.filename) {
                    return n.filename
                } else if (n.isEpisode) {
                    return `${n.title.replace(/[/\\?%*:|"<>]/g, '')}`
                } else if (n.isSong) {
                    return `${n.artist.replace(/[/\\?%*:|"<>]/g, '')} - ${n.title.replace(/[/\\?%*:|"<>]/g, '')}`
                } else {
                    return `${n.title.replace(/[/\\?%*:|"<>]/g, '')} - ${n.artist.replace(/[/\\?%*:|"<>]/g, '')}`
                }
            })()
            const ch = channels.channels[channels.ids.indexOf(t.activeCh.ch)]
            console.log(`Now Playing: ${t.tuner.name}:${t.activeCh.ch} - ${eventText}`)
            await new Promise(resolve => {
                const list = `display notification "${(n.isUpdated) ? '📝 ' : '🆕 '}${eventText} @ ${moment(n.syncStart).format("HH:mm:ss")}" with title "📻 ${(ch.name) ? ch.name : "SiriusXM"}"`
                const childProcess = osascript.execute(list, function (err, result, raw) {
                    resolve(null);
                    if (err) return console.error(err)
                    clearTimeout(childKiller);
                });
                const childKiller = setTimeout(function () {
                    childProcess.stdin.pause();
                    childProcess.kill();
                    resolve(null);
                }, 90000)
            })
            publishMetaIcecast(t, eventText, (ch.name) ? ch.name : "SiriusXM");
            publishMetadataFile(t, n, (ch.name) ? ch.name : "SiriusXM");
            searchForEvents(t, eventTextm (ch.name) ? ch.name : "SiriusXM");
        }
    }
}
// Publish Metadata to Icecast for each tuner
async function publishMetaIcecast(tuner, nowPlayingText, channelName) {
    if (tuner.icecase_meta) {
        return new Promise(resolve => {
            request.get({
                url: tuner.icecase_meta + encodeURIComponent(nowPlayingText + ' // ' + channelName),
                timeout: 5000
            }, async function (err, res, body) { resolve(!err) })
        })
    }
}
// Publish Now Playing to Text File
async function publishMetadataFile(tuner, nowPlaying, channelName) {
    if (tuner.nowplaying_file) {
        let nowPlayingData = [`Title: ${nowPlaying.title}`];
        if (!nowPlaying.isEpisode) {
            nowPlayingData.push(`Artist: ${nowPlaying.artist}`)
            if (nowPlaying.isSong) {
                nowPlayingData.push(`Album: ${nowPlaying.album}`)
            } else if (channelName) {
                nowPlayingData.push(`Album: ${channelName}`)
            }
        } else if (channelName) {
            nowPlayingData.push(`Album: ${channelName}`)
        }
        return new Promise(resolve => {
            fs.writeFile(path.join(config.record_dir, tuner.nowplaying_file), nowPlayingData.join('\n').toString(), () => {
                resolve(null)
            })
        })
    }
}

// Async Web Request as Promise
function webRequest(url) {
    return new Promise(resolve => {
        request.get({
            url: url,
            timeout: 5000
        }, async function (err, resReq, body) {
            if (!err) {
                resolve({
                    body,
                    ok: !err
                })
            } else {
                resolve({
                    err,
                    body,
                    ok: !err
                })
            }
        })
    })
}
// ADB Command Runner
function adbCommand(device, commandArray, expectJson) {
    return new Promise(function (resolve) {
        const adblaunch = ['-s', device, ...commandArray]
        let output = ''
        const command = spawn((config.adb_command) ? config.adb_command : 'adb', adblaunch, {
            encoding: 'utf8',
            timeout: 10000
        });

        command.stdout.on('data', (data) => {
            console.log(data.toString().trim().split('\n').map(e => `${device}: ${e}`).join('\n'));
            output += data.toString().trim()
        })
        command.stderr.on('data', (data) => {
            console.error(data.toString().split('\n').map(e => `${device}: ${e}`).join('\n'));
            output += data.toString().trim()
        });
        command.on('close', (code, signal) => {
            if (code !== 0)
                console.error(`Command Failed: ${code}`)
            if (expectJson) {
                let log = output.split('\n').filter(e => e.length > 0 && e !== '')
                try {
                    resolve({
                        log: JSON.parse(log.join('\n')),
                        isValid: true,
                        exitCode: code
                    })
                } catch (e) {
                    resolve({
                        log: log,
                        isValid: false,
                        exitCode: code
                    })
                }
            } else {
                resolve({
                    log: output.split('\n').map(e => e.trim()).filter(e => e.length > 0 && e !== ''),
                    exitCode: code
                })
            }
        })
    })
}
// Start the Logcat
function adbLogStart(device) {
    device_logs[device] = '';
    const adblaunch = ['-s', device, "logcat"]
    const logWawtcher = spawn(config.adb_command, adblaunch, {
        encoding: 'utf8'
    });
    logWawtcher.stdout.on('data', (data) => {
        if (data.toString().includes('com.sirius' || 'com.rom1v.sndcpy')) {
            device_logs[device] += data.toString()
        }
    })
    logWawtcher.stderr.on('data', (data) => {
        if (data.toString().includes('com.sirius' || 'com.rom1v.sndcpy')) {
            console.error(`${device} : ${data}`)
            device_logs[device] += data.toString()
        }
    })
    adblog_tuners.set(device, logWawtcher)
}

// List All Channels, Numbers, and IDs
// numbers and ids are indexed to channels for lookups
// channels has number added to reference the channel numbers
function listChannels() {
    const c = Object.keys(config.channels).map(e => {
        return {
            number: e,
            ...config.channels[e]
        }
    })
    const cn = c.map(e => e.number)
    const id = c.map(e => e.id)
    return {
        channels: c,
        numbers: cn,
        ids: id
    }
}
// Get Channel by Number
function getChannelbyNumber(number) {
    const channels = listChannels()
    const index = channels.numbers.indexOf(number)
    return (index !== -1) ? channels.channels[index] : false
}
// Get Channel by ID
function getChannelbyId(id) {
    const channels = listChannels()
    const index = channels.ids.indexOf(id)
    return (index !== -1) ? channels.channels[index] : false
}
// List all tuners
// digital indicates if a tuner is an Android device
// tuner object and active channel is injected
function listTuners(digitalOnly) {
    function sortRadios(arrayItemA, arrayItemB) {
        if (arrayItemA.priority < arrayItemB.priority)
            return -1
        if (arrayItemA.priority > arrayItemB.priority)
            return 1
        return 0
    }
    return [
        ...((digitalOnly === true) ? [] : (config.digital_radios && Object.keys(config.digital_radios).length > 0) ? Object.keys(config.digital_radios).map((e, i) => {
            const _a = channelTimes.timetable[e]
            const a = (_a && _a.length > 0) ? _a.slice(-1).pop() : null
            const m = (() => {
                if (a && a.length > 0)
                    return metadata[a.ch].slice(-1).pop()
                return null
            })()
            return {
                id: e,
                audioPort: 28200 + i,
                ...config.digital_radios[e],
                digital: true,
                activeCh: (a && m) ? { m, ...a} : null,
                locked: (Object.keys(activeQueue).indexOf(`REC-${e}`) !== -1)
            }
        }) : []),
        ...((digitalOnly === false) ? [] : (config.satellite_radios && Object.keys(config.digital_radios).length > 0) ? Object.keys(config.satellite_radios).map((e, i) => {
            const _a = channelTimes.timetable[e]
            const a = (_a && _a.length > 0) ? _a.slice(-1).pop() : null
            const m = (() => {
                if (a && a.length > 0)
                    return metadata[a.ch].slice(-1).pop()
                return null
            })()
            return {
                id: e,
                ...config.satellite_radios[e],
                digital: false,
                activeCh: (a && m) ? { m, ...a} : null,
                locked: locked_tuners.has(e)
            }
        }) : [])
    ].sort(sortRadios)
}
// Get tuner by id
function getTuner(id) {
    const t = listTuners().filter(e => e.id === id)
    return (t && t.length > 0) ? t.slice(-1).pop() : false
}
// Return the best radio that is currently tuned to channel else false
// use true or false after channel if you want all that are tuned to a channel
function findActiveRadio(channel, all) {
    const f = listTuners().filter(e => !e.activeCh || (e.activeCh && e.activeCh.ch === channel))
    return (f && f.length > 0) ? (all) ? f : f.slice(-1).pop() : false
}
// Return a tuner that is tuned to a channel else false
function findActiveRadioTune(channel) {
    const e = findActiveRadio(channel)
    return (e) ? (!(e.digital && e.tuner.record_only)) ? e : false : false
}
// Return list if tuners that are available for tuning
// Tuners that are locked due to recordings or manual lockout are omitted obviously
function availableTuners(channel, preferDigital) {
    const ch = getChannelbyId(channel)
    function sortPriority(arrayItemA, arrayItemB) {
        if (arrayItemA.priority < arrayItemB.priority)
            return -1
        if (arrayItemA.priority > arrayItemB.priority)
            return 1
        return 0
    }
    return listTuners()
        .map(e => {
            return {
                ...e,
                priority: ((!e.digital && preferDigital) || (e.digital && !preferDigital)) ? e.priority + 1000 : e.priority
            }
        })
        .sort(sortPriority)
        .filter(e =>
            !e.locked &&
            (e.digital || (!e.digital && ch && ch.tuneUrl[e.id])) &&
            !e.tuner.record_only
        )
}
// Get the best available digital tuner to queue a job
function getBestDigitalTuner() {
    function sortcb(arrayItemA, arrayItemB) {
        if (arrayItemA.length < arrayItemB.length)
            return -1
        if (arrayItemA.length > arrayItemB.length)
            return 1
        return 0
    }
    return Object.keys(jobQueue).filter(e => e.startsWith('REC-')).map(e => {
        return {
            length: jobQueue[e].length,
            id: e
        }
    }).sort(sortcb)[0].id
}
// List all events for a channel that are after start time
function listEvents(channel, time) {
    return metadata[channel].filter(e => !e.isSong && e.syncStart < time)
}
// Get specific event by uuid
function getEvent(channel, guid) {
    return metadata[channel].filter(e => e.guid === guid)[0]
}
// Find last event for a channel after the start time
function findEvent(channel, time) {
    const e = listEvents(channel, time)
    return e[findClosest(e.map(f => moment.utc(f.syncStart).local()), time + 60000)]
}
// Get List of Events and Songs
function listEventsValidated(songs, device, count) {
    function sortEvents(arrayItemA, arrayItemB) {
        if (arrayItemA.syncStart < arrayItemB.syncStart)
            return -1
        if (arrayItemA.syncStart > arrayItemB.syncStart)
            return 1
        return 0
    }
    let events = []
    Object.keys(channelTimes.timetable)
        .slice(0)
        .filter(e => !device || (device && e === device))
        .map(d => {
            return channelTimes.timetable[d]
                .slice(0)
                .map((tc, i, a) => {
                    return metadata[tc.ch].filter(f =>
                        // Has duration aka is completed
                        (parseInt(f.duration.toString()) > 60  || parseInt(f.duration.toString()) === 0)  &&
                        // First Item or Was Tuned after event start
                        (i === 0 || (f.syncStart >= (tc.time - (5 * 60000)))) &&
                        // Is Last Item or Look ahead and see if this has not occured after the next channel change
                        (i === a.length - 1 || (i !== a.length - 1 && f.syncStart <= a[i + 1].time))
                    ).map((f, i, a) => {
                        if ((!f.duration || f.duration === 0) && (i !== a.length - 1) && (a[i + 1].syncStart)) {
                            f.syncEnd = a[i + 1].syncStart - 1
                            f.duration = ((f.syncEnd - f.syncStart) / 1000).toFixed(0)
                        }
                        if (!f.filename) {
                            f.filename = (() => {
                                if (f.isEpisode) {
                                    return `${cleanText(f.title)}`
                                } else if (f.isSong) {
                                    return `${cleanText(f.artist)} - ${cleanText(f.title)}`
                                } else {
                                    return `${cleanText(f.title)} - ${cleanText(f.artist)}`
                                }
                            })()
                        }
                        events.push({
                            ...f,
                            channelId: tc.ch,
                            tunerId: d
                        })
                    })
                })
    })
    events = events
        .filter(f =>
            (parseInt(f.duration.toString()) === 0 ||
            (!songs && parseInt(f.duration.toString()) < 15 * 60) ||
            (songs && parseInt(f.duration.toString()) > 15 * 60))
        )
        .sort(sortEvents)
    if (count)
        return (events.length > count) ? events.slice(Math.abs(count) * -1) : events
    return events
}
// Format List of Events Data
function formatEventList(events) {
    const channel = listChannels()
    return events.map(e => {
        const tun = (e.tuner) ? e.tuner : (e.tunerId) ? getTuner(e.tunerId) : undefined
        const dyp = (events.filter(f =>
            (e.filename && f.filename && e.filename.toLowerCase() === f.filename.toLowerCase()) || (
                (f.title && e.title && f.title.toLowerCase() === e.title.toLowerCase()) &&
                ((f.artist && e.artist && f.artist.toLowerCase() === e.artist.toLowerCase()) || (!f.artist && !e.artist))
            )).length > 1)
        const ex = (() => {
            try {
                return fs.existsSync(path.join((tun.record_dir) ? tun.record_dir : config.record_dir, `Extracted_${e.guid}.mp3`))
            } catch (e) {
                return false
            }
            return false
        })()
        return {
            tunerId: tun.id,
            tuner: tun,
            channel: channel.channels[channel.ids.indexOf(e.channelId)].number,
            isExtractedDigitally: (moment.utc(e.syncStart).local().valueOf() >= (Date.now() - 14400000)),
            date: moment.utc(e.syncStart).local().format("MMM D HH:mm"),
            time: msToTime(parseInt(e.duration.toString()) * 1000).split('.')[0],
            exists: ex,
            duplicate: dyp,
            name: e.filename,
            event: e
        }
    })
}

// Process Pending Events to Extract
async function processPendingBounces() {
    function sortTime(arrayItemA, arrayItemB) {
        if (arrayItemA.time < arrayItemB.time)
            return -1
        if (arrayItemA.time > arrayItemB.time)
            return 1
        return 0
    }
    try {
        console.log(`${channelTimes.pending.filter(e => e.done === false && ((e.time + 6000) > Date.now())).length} Pending Events Post-Dated`)
        console.log(channelTimes.pending.filter(e => e.done === false && ((e.time + 6000) > Date.now())).map(e => moment.utc(e.time).local().format("YYYY-MM-DD HHmm")))
        console.log(`${channelTimes.pending.filter(e => e.done === false && ((e.time + 6000) <= Date.now())).length} Pending Events To Search`)

        let inp = channelTimes.pending.filter(e => e.done === false && (e.time + 6000) <= Date.now()).sort(sortTime)
        for (let i in inp) {
            let pendingEvent = inp[i]
            let thisEvent = (() => {
                if (pendingEvent.ch && pendingEvent.guid)
                    return getEvent(pendingEvent.ch, pendingEvent.guid)
                if (pendingEvent.ch && pendingEvent.time)
                    return findEvent(pendingEvent.ch, pendingEvent.time)
            })()

            thisEvent.filename = (() => {
                if (thisEvent.filename) {
                    return thisEvent.filename
                } else if (thisEvent.isEpisode) {
                    return `${thisEvent.title.replace(/[/\\?%*:|"<>]/g, '')}`
                } else if (thisEvent.isSong) {
                    return `${thisEvent.artist.replace(/[/\\?%*:|"<>]/g, '')} - ${thisEvent.title.replace(/[/\\?%*:|"<>]/g, '')}`
                } else {
                    return `${thisEvent.title.replace(/[/\\?%*:|"<>]/g, '')} - ${thisEvent.artist.replace(/[/\\?%*:|"<>]/g, '')}`
                }
            })()

            if (channelTimes.pending.filter(e => e.guid && e.guid === thisEvent.guid && !pendingEvent.liveRec && (e.time + 6000) <= Date.now()).map(e => e.guid).length !== 0) {
                console.log(`Duplicate Event Registered: ${pendingEvent.time} matches a existing bounce GUID`)
                pendingEvent.done = true
                pendingEvent.inprogress = false
            } else {
                // If Event has completed
                if (thisEvent.duration && parseInt(thisEvent.duration.toString()) > 0 && thisEvent.syncStart <= moment().valueOf() + 5 * 60000 && (pendingEvent.restrict && isWantedEvent(pendingEvent.restrict, thisEvent))) {
                    if (!pendingEvent.failedRec && (moment.utc(thisEvent.syncStart).local().valueOf() >= (Date.now() - 14400000)) && !pendingEvent.tuner && digitalAvailable && !config.disable_digital_extraction) {
                        // If not failed event, less then 3 hours old, not directed to a specifc tuner, digital recorder ready, and enabled
                        pendingEvent.guid = thisEvent.guid;
                        pendingEvent.liveRec = true
                        pendingEvent.done = true
                        pendingEvent.inprogress = true

                        queueDigitalRecording({
                            metadata: {
                                channelId: pendingEvent.ch,
                                ...thisEvent
                            },
                            index: true
                        })
                    } else if (pendingEvent.tuner && (!pendingEvent.digitalOnly || (pendingEvent.digitalOnly && pendingEvent.failedRec))) {
                        // If specific tuner is set, not set to require digital or has failed to extract via digital
                        pendingEvent.guid = thisEvent.guid;
                        pendingEvent.done = true
                        pendingEvent.inprogress = true

                        queueRecordingExtraction({
                            metadata: {
                                channelId: pendingEvent.ch,
                                ...thisEvent,
                                tuner: getTuner(pendingEvent.tunerId)
                            },
                            index: true
                        })
                    }
                } else if (Math.abs(Date.now() - parseInt(thisEvent.syncStart.toString())) >= ((thisEvent.delay) + (5 * 60) * 1000) && (pendingEvent.digitalOnly || config.live_extract) && (pendingEvent.restrict && isWantedEvent(pendingEvent.restrict, thisEvent))) {
                    // Event is 5 min past its start (accounting for digital delay), digital only event or live extract is enabled
                    pendingEvent.guid = thisEvent.guid;
                    pendingEvent.liveRec = true
                    pendingEvent.done = true
                    pendingEvent.inprogress = true
                    queueDigitalRecording({
                        metadata: {
                            channelId: pendingEvent.ch,
                            ...thisEvent
                        },
                        index: true
                    })
                }
            }
        }
        inp.push(...channelTimes.pending.filter(e => !((e.done === false && (e.time + 6000) <= Date.now()))).sort(sortTime))
        channelTimes.pending = inp.filter(e => e.done === false || e.inprogress === true)
    } catch (err) {
        console.error(err)
    }
    pendingBounceTimer = setTimeout(() => { processPendingBounces() }, 5 * 60000)
}
// Search for Events to Auto-Bounce
async function searchForEvents() {

    if (config.auto_extract) {
        config.auto_extract.forEach(lookup => {
            for (let k of Object.keys(metadata)) {
                metadata[k].slice(-10).filter(e => !e.isSong && e.duration && isWantedEvent(lookup, e) && channelTimes.completed.indexOf(e.guid) !== -1 && (!e.isEpisode || (lookup.allow_episodes && e.isEpisode))).forEach(e => {
                    channelTimes.pending.push({
                        ch: k,
                        lookup: lookup,
                        tunerId: (lookup.tuner) ? lookup.tuner : undefined,
                        guid: e.guid,
                        inprogress: false,
                        done: false
                    })
                    channelTimes.completed.push(e.guid)
                })
            }
        })
    }
}
//
function registerSchedule() {
    const configSch = Object.keys(config.schedule)
    const exsistSch = Array.from(scheduled_tasks.keys())

    exsistSch.filter(e => configSch.indexOf(e) === -1).forEach(e => {
        console.log(`Schedule ${e} was removed!`)
        const sch = scheduled_tasks.get(e)
        sch.destroy()
        scheduled_tasks.delete(e)
    })
    configSch.filter(e => exsistSch.indexOf(e) === -1).forEach(k => {
        const e = config.schedule[k]
        if (e.cron) {
            if (cron.validate(e.cron)) {
                let channelId = (e.channelId) ? e.channelId : undefined
                if (e.ch)
                    channelId = getChannelbyNumber(e.ch)

                console.log(`Schedule ${k} @ ${e.cron} was created! `)
                const sch = cron.schedule(e.cron, () => {
                    registerBounce({
                        channel: channelId,
                        tuner: (e.tuner) ? getTuner(e.tuner) : undefined,
                        digitalOnly: (e.digitalOnly) ? e.digitalOnly : undefined,
                        addTime: 0,
                        restrict: (e.restrict) ? e.restrict : undefined
                    })
                })
                scheduled_tasks.set(k, sch)
            } else {
                console.error(`${e.cron} is not a valid cron string`)
            }
        } else {
            console.error(`Scheduled Task Requires a "cron" schedule`)
        }
    })
}
//
function searchEvents() {
    const events = listEventsValidated(false, undefined, 25)
    Object.values(config.autosearch_terms).map(f => {
        events.filter(e => channelTimes.completed.indexOf(e.guid) === -1 && e.filename && e.filename.toLowerCase().includes(f.search.toLowerCase())).map(e => {
            console.log(`Found Event ${e.filename}`)
            channelTimes.completed.push(e.guid)
            channelTimes.pending.push({
                ch: e.channelId,
                guid: e.guid,
                time: e.syncStart + 10,
                tuner: undefined,
                tunerId: e.tunerId,
                digitalOnly: (f.digitalOnly),
                inprogress: false,
                done: false,
            })
        })
    })

}
// Register a event to extract
function registerBounce(options) {
    // Get Passed Tuner or Find one that is using that channel number
    const t = (() => {
        if (options.tuner && (!options.digitalOnly || (options.digitalOnly && options.tuner.digital)))
            return options.tuner
        if (options.digitalOnly)
            return undefined
        if (options.channel)
            return findActiveRadio(options.channel)
        return undefined
    })()
    // Get passed channel number ot find that channel that's active with that tuner
    const ch = (() => {
        if (options.channel)
            return options.channel
        if (t)
            return t.activeCh.ch
        return undefined
    })()

    if (ch) {
        const pendEvent = {
            ch,
            tuner: (options.tuner && (!options.digitalOnly || (options.digitalOnly && options.tuner.digital))) ? t : undefined,
            tunerId: t.id,
            digitalOnly: (options.digitalOnly),
            restrict: (options.restrict) ? options.restrict : undefined,
            time: (options.absoluteTime) ? options.absoluteTime + (options.addTime * 60000) : moment().valueOf() + (options.addTime * 60000),
            inprogress: false,
            done: false,
        }
        channelTimes.pending.push(pendEvent)
        console.log(`Pending Bounce registred!`)
        console.log(pendEvent)
        // Add new notification service
        saveMetadata();
        return true
    } else {
        console.error("Missing Required data to register a pending Extraction")
        return false
    }
}

// macOS GUI - TO BE DEPRECATED AND REPLACED BY A REAL WEB UI
async function modifyMetadataGUI(type) {
    try {
        let eventsMeta = [];
        const lastIndex = channelTimes.timetable.length - 1
        for (let c in channelTimes.timetable) {
            let events = await metadata[channelTimes.timetable[parseInt(c)].ch].filter(f => (parseInt(c) === 0 || (f.syncStart >= (channelTimes.timetable[parseInt(c)].time - (5 * 60000)))) && (parseInt(c) === lastIndex || (parseInt(c) !== lastIndex && f.syncStart <= channelTimes.timetable[parseInt(c) + 1].time)) && ((type && f.isSong) || (!type && !f.isSong))).map(e => {
                return {
                    ...e,
                    ch: channelTimes.timetable[parseInt(c)].ch
                }
            })
            eventsMeta.push(...events)
        }
        if (eventsMeta.length === 0)
            return false
        const eventSearch = await new Promise(resolve => {
            const listmeta = eventsMeta.reverse().map(e => {
                const duplicate = (eventsMeta.filter(f => (e.filename && f.filename && e.filename === f.filename) || (f.title === e.title && ((f.artist && e.artist && f.artist === e.artist) || (!f.artist && !e.artist)))).length > 1)
                const name = (() => {
                    if (e.filename) {
                        return e.filename
                    } else if (e.isEpisode) {
                        return `${e.title.replace(/[/\\?%*:|"<>]/g, '')}`
                    } else if (e.isSong) {
                        return `${e.artist.replace(/[/\\?%*:|"<>]/g, '')} - ${e.title.replace(/[/\\?%*:|"<>]/g, '')}`
                    } else {
                        return `${e.title.replace(/[/\\?%*:|"<>]/g, '')} - ${e.artist.replace(/[/\\?%*:|"<>]/g, '')}`
                    }
                })()
                let exsists = false
                try {
                    exsists = fs.existsSync(path.join(config.record_dir, `Extracted_${e.syncStart}.mp3`))
                } catch (err) { }
                return `"[📡${e.ch} 📅${moment.utc(e.syncStart).local().format("MMM D HH:mm")}] ${(e.isEpisode) ? '🔶' : ''}${(parseInt(e.duration.toString()) === 0) ? '🔴' : (exsists) ? '💿' : '〰'} ${name} ${(duplicate) ? '🔂 ' : '' }(${msToTime(parseInt(e.duration.toString()) * 1000).split('.')[0]})"`
            })
            const list = `choose from list {${listmeta.join(',')}} with title "Modify Metadata" with prompt "Select Event to modify metadata for:" default items ${listmeta[0]} multiple selections allowed true empty selection allowed false`
            const childProcess = osascript.execute(list, function (err, result, raw) {
                if (err) return console.error(err)
                if (result) {
                    resolve(result.map(e => listmeta.indexOf(`"${e}"`)))
                } else {
                    resolve([])
                }
                clearTimeout(childKiller);
            });
            const childKiller = setTimeout(function () {
                childProcess.stdin.pause();
                childProcess.kill();
                resolve([]);
            }, 90000)
        })
        if (!eventSearch || eventSearch.length === 0)
            return false;
        const eventsToParse = eventSearch.map(e => eventsMeta[e]);

        for (let eventItem of eventsToParse) {
            const _eventFilename = (() => {
                if (eventItem.filename) {
                    return eventItem.filename
                } else if (eventItem.isEpisode) {
                    return `${eventItem.title.replace(/[/\\?%*:|"<>]/g, '')}`
                } else if (eventItem.isSong) {
                    return `${eventItem.artist.replace(/[/\\?%*:|"<>]/g, '')} - ${eventItem.title.replace(/[/\\?%*:|"<>]/g, '')}`
                } else {
                    return `${eventItem.title.replace(/[/\\?%*:|"<>]/g, '')} - ${eventItem.artist.replace(/[/\\?%*:|"<>]/g, '')}`
                }
            })()
            let realItem = metadata[eventItem.ch][metadata[eventItem.ch].map(f => f.guid).indexOf(eventItem.guid)]
            realItem.filename = await new Promise(resolve => {
                const dialog = [
                    `set dialogResult to (display dialog "Set Filename" default answer "${_eventFilename}" buttons {"Keep", "Update"} default button 2 giving up after 120)`,
                    `if the button returned of the dialogResult is "Update" then`,
                    'return text returned of dialogResult',
                    'else',
                    `return "${_eventFilename}"`,
                    'end if'
                ].join('\n');
                const childProcess = osascript.execute(dialog, function (err, result, raw) {
                    if (err) {
                        console.error(err)
                        resolve(_eventFilename);
                    } else {
                        resolve(result)
                        clearTimeout(childKiller);
                    }
                });
                const childKiller = setTimeout(function () {
                    childProcess.stdin.pause();
                    childProcess.kill();
                    resolve(_eventFilename);
                }, 120000)
            });
            realItem.isUpdated = true
            const duration = await new Promise(resolve => {
                const dialog = [
                    `set dialogResult to (display dialog "Event has no termination, would you like to set the duration (in minutes)?" default answer "60" buttons {"Keep", "Update"} default button 2 giving up after 120)`,
                    `if the button returned of the dialogResult is "Update" then`,
                    'return text returned of dialogResult',
                    'else',
                    `return "NaN"`,
                    'end if'
                ].join('\n');
                const childProcess = osascript.execute(dialog, function (err, result, raw) {
                    if (err) {
                        console.error(err)
                        resolve("NaN");
                    } else {
                        resolve(result)
                        clearTimeout(childKiller);
                    }
                });
                const childKiller = setTimeout(function () {
                    childProcess.stdin.pause();
                    childProcess.kill();
                    resolve("NaN");
                }, 120000)
            });
            if (duration !== "NaN") {
                realItem.duration = parseInt(duration.toString()) * 60
                realItem.syncEnd = moment(eventItem.syncStart).add(realItem.duration, "seconds").valueOf()
            }
            metadata[eventItem.ch][metadata[eventItem.ch].map(f => f.guid).indexOf(eventItem.guid)] = realItem
        }
    } catch (e) {
        console.error(`ALERT:FAULT - Edit Metadata|${e.message}`)
        console.error(e);
    }
}
// Show UI for selecting events to extract
async function bounceEventGUI(type, device) {
    try {
        const eventsMeta = formatEventList(listEventsValidated(type, device, 250))
        if (eventsMeta.length === 0)
            return false
        const eventSearch = await new Promise(resolve => {
            const listmeta = eventsMeta.reverse().map(e =>
                [
                    '"',
                    `[${(e.tuner.isDigital) ? '💿' : '📡'}${(e.tuner.name)? e.tuner.name : e.tunerId} - ${e.channel}]`,
                    `[📅${e.date}]`,
                    `${(e.event.isEpisode) ? '🔶' : ''}${(e.duplicate) ? '🔂' : '' }${(e.exists) ? '🟩' : (e.isExtractedDigitally) ? '🟪' : ''}`,
                    e.name,
                    `${(e.time !== "00:00:00") ? '(' + e.time + ')' : '🔴'}`,
                    '"'
                ].join(' ')
            )

            const list = `choose from list {${listmeta.join(',')}} with title "Bounce Tracks" with prompt "Select Event to bounce to disk:" default items ${listmeta[0]} multiple selections allowed true empty selection allowed false`
            const childProcess = osascript.execute(list, function (err, result, raw) {
                if (err) return console.error(err)
                if (result) {
                    resolve(result.map(e => listmeta.indexOf(`"${e}"`)))
                } else {
                    resolve([])
                }
                clearTimeout(childKiller);
            });
            const childKiller = setTimeout(function () {
                childProcess.stdin.pause();
                childProcess.kill();
                resolve([]);
            }, 90000)
        })
        if (!eventSearch || eventSearch.length === 0)
            return false;
        const eventsToParse = eventSearch.map(e => eventsMeta[e]);

        for (let eventItem of eventsToParse) {
            let eventsToExtract = eventItem.event
            eventsToExtract.tuner = eventItem.tuner
            eventsToExtract.digitalOnly = (eventItem.isExtractedDigitally) ? await new Promise(resolve => {
                const dialog = [
                    `set dialogResult to (display dialog "Attempt to get this digitaly" buttons {"No", "Yes"} default button 2 giving up after 90)`,
                    `return (the button returned of the dialogResult is "Yes")`
                ].join('\n');
                const childProcess = osascript.execute(dialog, function (err, result, raw) {
                    if (err) {
                        console.error(err)
                        resolve(true);
                    } else {
                        console.log(result)
                        resolve(result)
                        clearTimeout(childKiller);
                    }
                });
                const childKiller = setTimeout(function () {
                    childProcess.stdin.pause();
                    childProcess.kill();
                    resolve(true);
                }, 120000)
            }) : false
            eventsToExtract.filename = await new Promise(resolve => {
                const dialog = [
                    `set dialogResult to (display dialog "Set Filename" default answer "${eventItem.name}" buttons {"Keep", "Update"} default button 2 giving up after 120)`,
                    `if the button returned of the dialogResult is "Update" then`,
                    'return text returned of dialogResult',
                    'else',
                    `return "${eventItem.name}"`,
                    'end if'
                ].join('\n');
                const childProcess = osascript.execute(dialog, function (err, result, raw) {
                    if (err) {
                        console.error(err)
                        resolve(eventItem.name);
                    } else {
                        resolve(result)
                        clearTimeout(childKiller);
                    }
                });
                const childKiller = setTimeout(function () {
                    childProcess.stdin.pause();
                    childProcess.kill();
                    resolve(eventItem.name);
                }, 120000)
            });
            if (!eventsToExtract.duration || eventsToExtract.duration === 0) {
                const duration = await new Promise(resolve => {
                    const dialog = [
                        `set dialogResult to (display dialog "Event has no termination, would you like to set the duration (in minutes)? WARNING: Do not set a duration for live/active events!" default answer "60" buttons {"Keep", "Update"} default button 2 giving up after 120)`,
                        `if the button returned of the dialogResult is "Update" then`,
                        'return text returned of dialogResult',
                        'else',
                        `return "NaN"`,
                        'end if'
                    ].join('\n');
                    const childProcess = osascript.execute(dialog, function (err, result, raw) {
                        if (err) {
                            console.error(err)
                            resolve("NaN");
                        } else {
                            resolve(result)
                            clearTimeout(childKiller);
                        }
                    });
                    const childKiller = setTimeout(function () {
                        childProcess.stdin.pause();
                        childProcess.kill();
                        resolve("NaN");
                    }, 120000)
                });
                if (duration !== "NaN") {
                    eventsToExtract.duration = parseInt(duration.toString()) * 60
                    eventsToExtract.syncEnd = moment(eventItem.syncStart).add(eventsToExtract.duration, "seconds").valueOf()
                }
            }

            if (eventsToExtract.digitalOnly || eventsToExtract.duration === 0) {
                queueDigitalRecording({ metadata: eventsToExtract })
            } else {
                queueRecordingExtraction({ metadata: eventsToExtract })
            }
        }
    } catch (e) {
        console.error(`ALERT:FAULT - Edit Metadata|${e.message}`)
        console.error(e);
    }
}

// ** Job Queue System **
// Queue a recorded event extraction and start the processor if inactive
function queueRecordingExtraction(jobOptions) {
    jobQueue['extract'].push(jobOptions)
    console.log(`Extraction Job #${jobQueue['extract'].length + ((activeQueue['extract'] === false) ? 0 : 1)} Queued`)
    console.log(jobOptions)
    if (activeQueue['extract'] === false)
        startExtractQueue()
}
// Process all pending recording extractions as FIFO
async function startExtractQueue() {
    activeQueue['extract'] = true
    while (jobQueue['extract'].length !== 0) {
        const job = jobQueue['extract'].shift()
        const completed = await extractRecordedEvent(job)
        console.log(`Q/Extract: Last Job Result ${(completed)} - ${jobQueue['extract'].length} jobs left`)
    }
    activeQueue['extract'] = false
    return true
}
// Queue a digital recording on the best available tuner and start the processor if inactive
function queueDigitalRecording(jobOptions) {
    const best_recorder = getBestDigitalTuner()
    if (!best_recorder)
        return false
    jobQueue[best_recorder].push(jobOptions)
    console.log(`Record Job #${jobQueue[best_recorder].length + ((activeQueue[best_recorder] === false) ? 0 : 1)} Queued for ${best_recorder}`)
    console.log(jobOptions)
    if (activeQueue[best_recorder] === false)
        startRecQueue(best_recorder)
}
// Process all pending digital recordings as FIFO
async function startRecQueue(q) {
    activeQueue[q] = true
    while (jobQueue[q].length !== 0) {
        const tuner = getTuner(q.slice(4))
        const job = jobQueue[q].shift()
        const completed = await recordDigitalEvent(job, tuner)
        console.log(`Q/${q.slice(4)}: Last Job Result ${(completed)} - ${jobQueue[q].length} jobs left`)
    }
    activeQueue[q] = false
    return true
}

// ** MobileApp Digital Dubbing System **
// Wait for device to connect and prepare device
async function initDigitalRecorder(device) {
    console.log(`Searching for digital tuner "${device.name}":${device.serial}...`)
    console.log(`Please connect the device via USB if not already`)
    await adbCommand(device.serial, ["wait-for-device"])
    console.log(`Tuner "${device.name}":${device.serial} was connected! Please Wait for initialization...\n!!!! DO NOT TOUCH DEVICE !!!!`)
    const socketready = await startAudioDevice(device);
    if (socketready) {
        console.log(`Tuner "${device.name}":${device.serial} is now ready!`)
        if (!jobQueue['REC-' + device.id]) {
            jobQueue['REC-' + device.id] = [];
            activeQueue['REC-' + device.id] = false;
        }
    } else {
        console.error(`Tuner "${device.name}":${device.serial} has been locked out because the audio interface did not open!`)
        locked_tuners.set(device.id, {})
    }
}
// Start the USB Audio Interface
async function startAudioDevice(device) {
    return await new Promise(async (resolve, reject) => {
        console.log(`Setting up USB Audio Interface for "${device.name}"...`)
        async function start() {
            console.log(`${device.id}: (1/4) Installing USB Interface...`)
            const ins = await adbCommand(device.serial, ["install", "-t", "-r", "-g", "app-release.apk"])
            if (ins.exitCode !== 0 || !ins.exitCode === null) {
                console.error(`${device.id}: Application Failed to install, Maybe try to uninstall the application?`)
                return false
            }
            console.log(`${device.id}: (2/4) Enabling Audio Recording Permissions...`)
            const alw = await adbCommand(device.serial, ["shell", "appops", "set", "com.rom1v.sndcpy", "PROJECT_MEDIA", "allow"])
            if (alw.exitCode !== 0 || !alw.exitCode === null) {
                console.error(`${device.id}: Failed to pre-authorize screen recording permissions, Are you useing Android 10+? you should be`)
                return false
            }
            console.log(`${device.id}: (3/4) Connecting Device Socket @ TCP ${device.audioPort}...`)
            const fwa = await adbCommand(device.serial, ["forward", `tcp:${device.audioPort}`, "localabstract:sndcpy"])
            if ((fwa.exitCode !== 0 || !fwa.exitCode === null) && fwa.log[0] !== `${device.audioPort}`) {
                console.error(`${device.id}: Failed to open the TCP socket, is something using port ${device.audioPort}?`)
                return false
            }
            console.log(`${device.id}: (4/4) Starting Audio Interface...`)
            const kil = await adbCommand(device.serial, ["shell", "am", "kill", "com.rom1v.sndcpy"])
            const sta = await adbCommand(device.serial, ["shell", "am", "start", "com.rom1v.sndcpy/.MainActivity", "--ei", "SAMPLE_RATE", "44100", "--ei", "BUFFER_SIZE_TYPE", "3"])
            if ((sta.exitCode !== 0 || !sta.exitCode === null) && sta.log.length > 1 && sta.log[1].startsWith('Starting: Intent {')) {
                console.error(`${device.id}: Application failed to start!`)
                return false
            }
            console.log(`${device.id}: Ready`)
            return true
        }
        resolve((await start()))
    })
}
// Stop the USB Audio Interface
async function stopAudioDevice(device) {
    await adbCommand(device.serial, ["forward", "--remove", `tcp:${device.audioPort}`])
    await adbCommand(device.serial, ["shell", "am", "kill", "com.rom1v.sndcpy"])
}
// Tune to Digital Channel on Android Device
async function tuneDigitalChannel(channel, time, device) {
    return new Promise(async (resolve) => {
        console.log(`Tuning Device ${device.serial} to channel ${channel} @ ${moment.utc(time).local().format("YYYY-MM-DD HHmm")}...`);
        const tune = await adbCommand(device.serial, ['shell', 'am', 'start', '-a', 'android.intent.action.MAIN', '-n', 'com.sirius/.android.everest.welcome.WelcomeActivity', '-e', 'linkAction', `'Api:tune:liveAudio:${channel}::${time}'`])
        resolve((tune.log.join('\n').includes('Starting: Intent { act=android.intent.action.MAIN cmp=com.sirius/.android.everest.welcome.WelcomeActivity (has extras) }')))
    })
}
// Stop Playback on Android Device aka Release Stream Entity
async function releaseDigitalTuner(device) {
    console.log(`Releasing Device ${device.serial}...`);
    return await adbCommand(device.serial, ['shell', 'input', 'keyevent', '86'])
}
// Record Audio from Interface attached to a Android Recorder with a set end time
function recordDigitalAudioInterface(tuner, time, event) {
    return new Promise(async function (resolve) {
        let controller = null
        const input = await (async () => {
            if (tuner.audio_interface) {
                console.log(`Record/${tuner.id}: Using physical audio interface "${tuner.audio_interface.join(' ')}"`)
                return tuner.audio_interface
            }
            return ["-f", "s16le", "-ar", "48k", "-ac", "2", "-i", `tcp://localhost:${tuner.audioPort}`]
        })()
        if (!input) {
            console.error(`Record/${tuner.id}: No Audio Interface is available for ${tuner.id}`)
            resolve(false)
        } else {
            console.log(`Record/${tuner.id}: Started Digital Dubbing Event "${event.filename}"...`)
            try {
                const startTime = Date.now()
                const ffmpeg = ['-hide_banner', '-stats_period', '300', '-y', ...input, '-ss', '00:00:02', ...((time) ? ['-t', time] : []), '-b:a', '320k', `Extracted_${event.guid}.mp3`]
                const recorder = spawn(((config.ffmpeg_exec) ? config.ffmpeg_exec : '/usr/local/bin/ffmpeg'), ffmpeg, {
                    cwd: (tuner.record_dir) ? tuner.record_dir : config.record_dir,
                    encoding: 'utf8'
                })

                recorder.stdout.on('data', (data) => { console.log(data.toString().split('\n').map((line) => `Record/${tuner.id}: ` + line).join('\n')) })
                recorder.stderr.on('data', (data) => { console.error(data.toString().split('\n').map((line) => `Record/${tuner.id}: ` + line).join('\n')) });
                recorder.on('close', (code, signal) => {
                    const completedFile = path.join((tuner.record_dir) ? tuner.record_dir : config.record_dir, `Extracted_${event.guid}.${(config.extract_format) ? config.extract_format : 'mp3'}`)
                    if (code !== 0) {
                        console.error(`Record/${tuner.id}: Digital dubbing failed: FFMPEG reported a error!`)
                        resolve(false)
                    } else {
                        console.log(`Record/${tuner.id}: Completed!`)
                        resolve(fs.existsSync(completedFile) && fs.statSync(completedFile).size > 1000000)
                    }
                    locked_tuners.delete(tuner.id)
                })

                if (!time) {
                    console.log("Record/${tuner.id}: This is a live event and has no duration, watching for closure")
                    controller = setInterval(() => {
                        const eventData = getEvent(event.channelId, event.guid)
                        if (eventData && eventData.duration && parseInt(eventData.duration.toString()) > 0) {
                            const termTime = Math.abs((Date.now() - startTime) - (parseInt(eventData.duration.toString()) * 1000)) + (10000)
                            console.log(`Event ${event.guid} concluded with duration ${(eventData.duration / 60).toFixed(0)}m, Starting Termination Timer for ${((termTime / 1000) / 60).toFixed(0)}m`)
                            const stopwatch = setTimeout(() => {
                                recorder.stdin.write('q')
                                stopwatches_tuners.delete(tuner.id)
                            }, termTime)
                            stopwatches_tuners.set(tuner.id, stopwatch)
                            clearInterval(controller)
                        }
                    }, 60000)
                }

                locked_tuners.set(tuner.id, recorder)
            } catch (e) {
                console.error(e)
                resolve(false)
            }
        }
    })
}

// Tune, Record, Disconnect
async function recordDigitalEvent(job, tuner) {
    console.log(`Record/${tuner.id}: Preparing for digital dubbing...`)
    const eventItem = job.metadata
    console.log(eventItem)
    console.log(tuner)
    adbLogStart(tuner.serial)
    if (await tuneDigitalChannel(eventItem.channelId, eventItem.syncStart, tuner)) {
        const time = (() => {
            if (eventItem.duration && parseInt(eventItem.duration.toString()) > 0 && tuner.audio_interface)
                return eventItem.duration.toString()
            if (eventItem.duration && parseInt(eventItem.duration.toString()) > 0)
                return msToTime(parseInt(eventItem.duration.toString()) * 1000).split('.')[0]
            return undefined
        })()
        await recordDigitalAudioInterface(tuner, time, eventItem)
        if (tuner.record_only) {
            await releaseDigitalTuner(tuner)
        }
        const completedFile = path.join((tuner.record_dir) ? tuner.record_dir : config.record_dir, `Extracted_${eventItem.guid}.${(config.extract_format) ? config.extract_format : 'mp3'}`)
        if (fs.existsSync(completedFile) && fs.statSync(completedFile).size > 1000000) {
            await postExtraction(path.join((tuner.record_dir) ? tuner.record_dir : config.record_dir, `Extracted_${eventItem.guid}.${(config.extract_format) ? config.extract_format : 'mp3'}`), `${eventItem.filename.trim()} (${moment(eventItem.syncStart).format("YYYY-MM-DD HHmm")}).${(config.extract_format) ? config.extract_format : 'mp3'}`)
        } else if (fs.existsSync(completedFile)) {
            rimraf(completedFile, () => {})
        }
        if (adblog_tuners.has(tuner.serial))
            adblog_tuners.get(tuner.serial).kill(9)
        if (job.index) {
            const index = channelTimes.pending.map(e => e.guid).indexOf(eventItem.guid)
            if (fs.existsSync(completedFile)) {
                channelTimes.pending[index].inprogress = false
                channelTimes.pending[index].liveRec = false
                channelTimes.pending[index].done = true
            } else {
                console.error(`Record/${tuner.id}: Failed job should be picked up by the recording extractor (if available)`)
                channelTimes.pending[index].inprogress = false
                channelTimes.pending[index].liveRec = false
                channelTimes.pending[index].done = false
                channelTimes.pending[index].failedRec = true
            }
        }
        return (fs.existsSync(completedFile));
    } else {
        console.error(`Record/${tuner.id}: Failed to tune to channel, Canceled!`)
        if (job.index) {
            console.error(`Record/${tuner.id}: Failed job should be picked up by the recording extractor (if available)`)
            const index = channelTimes.pending.map(e => e.guid).indexOf(eventItem.guid)
            channelTimes.pending[index].inprogress = false
            channelTimes.pending[index].liveRec = false
            channelTimes.pending[index].done = false
            channelTimes.pending[index].failedRec = true
        }
    }
    return false
}
// Extract Recorded Event from a persistent tuner
async function extractRecordedEvent(job) {
    try {
        console.log(`Extract: Preparing for recording extraction...`)
        const eventItem = job.metadata
        console.log(eventItem)
        const recFiles = fs.readdirSync((eventItem.tuner.record_dir) ? eventItem.tuner.record_dir : config.record_dir).filter(e => e.startsWith(eventItem.tuner.record_prefix) && e.endsWith(".mp3")).map(e => {
            return {
                date: moment(e.replace(eventItem.tuner.record_prefix, '').split('.')[0] + '', (eventItem.tuner.record_date_format) ? eventItem.tuner.record_date_format : "YYYYMMDD-HHmmss"),
                file: e
            }
        });
        const recTimeIndex = recFiles.map(e => e.date.valueOf());

        if (parseInt(eventItem.duration.toString()) > 0) {
            const trueTime = moment.utc(eventItem.syncStart).local();
            const eventFilename = `${eventItem.filename.trim()} (${moment(eventItem.syncStart).format((eventItem.tuner.record_date_format) ? eventItem.tuner.record_date_format : "YYYYMMDD-HHmmss")}).${(config.extract_format) ? config.extract_format : 'mp3'}`
            let startFileIndex = findClosest(recTimeIndex, trueTime.valueOf()) - 1
            if (startFileIndex < 0)
                startFileIndex = 0
            const endFileIndex = findClosest(recTimeIndex, eventItem.syncEnd)
            const eventFiles = (startFileIndex < endFileIndex) ? recFiles.slice(startFileIndex, endFileIndex + 1) : [recFiles[startFileIndex]]

            let trimEventFile = false;
            if (trueTime.valueOf() > eventFiles[0].date.valueOf()) {
                const startTrim = msToTime(Math.abs(trueTime.valueOf() - eventFiles[0].date.valueOf())).split('.')[0]
                const endTrim = msToTime((parseInt(eventItem.duration.toString()) * 1000) + 10000).split('.')[0]

                trimEventFile = await new Promise(function (resolve) {
                    console.log(`Extract: Trimming Live Recording File "${eventItem.filename.trim()}" @ ${startTrim}-${endTrim} ...`)
                    const ffmpeg = [(config.ffmpeg_exec) ? config.ffmpeg_exec : '/usr/local/bin/ffmpeg', '-hide_banner', '-y', '-i', `concat:"${eventFiles.map(e => e.file).join('|')}"`, '-ss', startTrim, '-t', endTrim, `Extracted_${eventItem.guid}.${(config.extract_format) ? config.extract_format : 'mp3'}`]
                    exec(ffmpeg.join(' '), {
                        cwd: (eventItem.tuner.record_dir) ? eventItem.tuner.record_dir : config.record_dir,
                        encoding: 'utf8'
                    }, (err, stdout, stderr) => {
                        if (err) {
                            console.error(`Extract: FFMPEG reported a error!`)
                            console.error(err)
                            resolve(false)
                        } else {
                            if (stderr.length > 1)
                                console.error(stderr);
                            console.log(stdout.split('\n').filter(e => e.length > 0 && e !== ''))
                            resolve(path.join((eventItem.tuner.record_dir) ? eventItem.tuner.record_dir : config.record_dir, `Extracted_${eventItem.guid}.mp3`))
                        }
                    });
                })
            } else {
                console.error("Extract: Recordings are not available for this time frame! Canceled")
            }

            if (trimEventFile && fs.existsSync(trimEventFile.toString())) {
                console.log(`Extract: Extraction complete for ${eventFilename.trim()}!`)
                await postExtraction(trimEventFile, eventFilename);
                if (job.index) {
                    const index = channelTimes.pending.map(e => e.guid).indexOf(eventItem.guid)
                    channelTimes.pending[index].inprogress = false
                    channelTimes.pending[index].liveRec = false
                    channelTimes.pending[index].done = true
                }
                return true
            } else {
                console.error(`Extraction failed: File was not generated correctly`)
                if (job.index) {
                    const index = channelTimes.pending.map(e => e.guid).indexOf(eventItem.guid)
                    channelTimes.pending[index].inprogress = false
                    channelTimes.pending[index].liveRec = false
                    channelTimes.pending[index].done = false
                }
                return false
            }
        } else {
            console.error(`Extract: This event has not concluded, unable to proceed!`)
            return false
        }
    } catch (e) {
        console.error(`ALERT: FAULT - Extraction Failed: ${e.message}`)
        console.error(e);
    }
}
// Move extracted files to the upload and backup folder
async function postExtraction(extractedFile, eventFilename) {
    try {
        if (config.backup_dir) {
            await new Promise(resolve => {
                console.log(`Copying Backup File ... "${eventFilename}"`)
                exec(`cp "${extractedFile.toString()}" "${path.join(config.backup_dir, eventFilename).toString()}"`, (err, result) => {
                    if (err)
                        console.error(err)
                    resolve((err))
                })
            })
        }
        if (config.upload_dir) {
            console.log(`Copying File for Upload ... "${eventFilename}"`)
            await new Promise(resolve => {
                exec(`cp "${extractedFile.toString()}" "${path.join(config.upload_dir, 'HOLD-' + eventFilename).toString()}"`, (err, result) => {
                    if (err)
                        console.error(err)
                    resolve((err))
                })
            })
            await new Promise(resolve => {
                exec(`mv "${path.join(config.upload_dir, 'HOLD-' + eventFilename).toString()}" "${path.join(config.upload_dir, eventFilename).toString()}"`, (err, result) => {
                    if (err)
                        console.error(err)
                    resolve((err))
                })
            })
        }
        new Promise(resolve => {
            const list = `display notification "✅ ${eventFilename.trim().split('.')[0]} was successful" with title "💿 Bouncer" sound name "Glass"`
            const childProcess = osascript.execute(list, function (err, result, raw) {
                resolve(null);
                if (err) return console.error(err)
                clearTimeout(childKiller);
            });
            const childKiller = setTimeout(function () {
                childProcess.stdin.pause();
                childProcess.kill();
                resolve(null);
            }, 5000)
        })
        return true
    } catch (e) {
        console.error(`Post Processing Failed: cant not be parsed because the file failed to be copied!`)
        return false
    }
}


// Tune to a channel
// channelNum or channelId: Channel Number or ID to tune to
// tuner: Tuner ID to tune too
app.get("/tune/:channelNum", async (req, res, next) => {
    const channels = listChannels()
    const channelIndex = channels.numbers.indexOf(req.params.channelNum)
    const channel = channels.channels[channelIndex]

    async function tuneToChannel(ptn, isAlreadyTuned) {
        const tcb = (!(isAlreadyTuned && !ptn.always_retune)) ? (ptn.digital) ? { ok: (await tuneDigitalChannel(channel.id, 0, ptn)) } : await webRequest(channel.tuneUrl[ptn.id]) : { ok: true }
        let pcb = { ok: true}
        if (ptn.post_tune_url !== undefined && ptn.post_tune_url && !(req.query.no_post && req.query.no_post === 'false'))
            await webRequest(t.tuner.post_tune_url)

        if (tcb.ok) {
            channelTimes.timetable[ptn.id].push({
                time: moment().valueOf(),
                ch: channel.id,
            })
            if (channel.updateOnTune)
                updateMetadata()
            res.status(200).send((isAlreadyTuned && !ptn.always_retune) ? `UNMODIFIED - Tuner is already tuned and does not have always_retune set` : `OK - Tuner ${ptn.id} was tuned to ${channel.name}`)
        } else {
            res.status(500).send(`ERROR - Tuner ${ptn.id} failed to tune to ${channel.name} due to a url request error (Tune: ${tcb.ok} Post: ${pcb})`)
        }
    }

    if (channel) {
        // Get Active Tuner
        const tn = ((t,ca) => {
            if (req.query.tuner) {
                const _t = getTuner(t)
                if (_t)
                    return [_t, false]
            }
            if (ca)
                return [ca, true]
            return [false, false]
        })(req.query.tuner, findActiveRadioTune(channel.id))

        if (tn[0]) {
            console.log(`Request to tune "${tn[0].name}" to channel ${channel.name}`)
            await tuneToChannel(tn[0], tn[1])
        } else {
            const _ptn = availableTuners(channel.id, (req.query.digital && req.query.digital === 'true' ))
            if (_ptn && _ptn.length > 0) {
                await tuneToChannel(_ptn[0], false)
            } else {
                res.status(404).send(`There are no tuners available at this time\nThis could be because of locks for events or require manual input (In that case specify that tuner= specifically and change the channel manualy)`)
            }
        }
    } else {
        res.status(404).send('Channel not found')
    }
});
app.get("/pend_bounce", (req, res) => {
    let options = {
        addTime: (req.query.add_time) ? parseInt(req.query.add_time) : 0,
        digitalOnly: (req.query.digitalOnly && req.query.digitalOnly === "true") ? true : undefined
    }
    if (req.query.ch) {
        const channelId = getChannelbyNumber(req.query.ch)
        options.channel = (channelId) ? channelId.id : undefined
    }
    if (req.query.tuner) {
        const tuner = getTuner(req.query.tuner)
        options.tuner = (tuner) ? tuner : undefined;
    }
    if (req.query.time)
        options.absoluteTime = parseInt(req.query.time)

    registerBounce(options);
    res.status(200).json(options);
})
app.get("/search_extract/:action", (req, res) => {
    switch (req.params.action) {
        case 'add':
            if (req.query.search) {
                if (!config.autosearch_terms)
                    config.autosearch_terms = []
                config.autosearch_terms.push({
                    search: req.query.search.trim(),
                    duration: (req.query.duration) ? parseInt(req.query.duration) : undefined
                })
                fs.writeFileSync('./config.json', JSON.stringify(config))
                res.status(200).send("OK")
            } else {
                res.status(400).send("Missing search")
            }
            break;
        case 'remove':
            if (req.query.search) {
                if (!config.autosearch_terms) {
                    res.status(500).send("Not Ready")
                } else {
                    config.autosearch_terms = config.autosearch_terms.filter(e => !e.search !== req.query.search)
                    res.status(200).send("OK")
                }
                fs.writeFileSync('./config.json', JSON.stringify(config))
            } else {
                res.status(400).send("Missing search")
            }
            break;
        case 'list':
            res.status(200).json(config.autosearch_terms)
            break;
        default:
            res.status(400).send("Action Not Available")
            break;
    }
})
app.get("/trigger/:display", (req, res, next) => {
    if (req.params.display) {
        switch (req.params.display) {
            case 'select_bounce_event':
                bounceEventGUI(true, (req.query.ch) ? req.query.ch : undefined);
                res.status(200).send('OK')
                break;
            case 'select_bounce_song':
                bounceEventGUI(false, (req.query.ch) ? req.query.ch : undefined);
                res.status(200).send('OK')
                break;
            case 'modify_meta':
                modifyMetadataGUI();
                res.status(200).send('OK')
                break;
            default:
                res.status(400).send('Invalid')
        }
    } else {
        res.status(400).send('MissingAction')
    }
});
app.get("/debug/digital/:tuner", async (req, res, next) => {
    if (req.params.tuner) {
        const t = getTuner(req.params.tuner)
        if (t) {
            let chid = false
            if (req.query.ch) {
                chid = getChannelbyNumber(req.query.ch)
                const tune = await tuneDigitalChannel(chid.id, (moment().subtract(15, "minutes").valueOf() + ((t.delay) ? t.delay * 1000 : 0)), t)
                if (tune) {
                    const record = await recordDigitalAudioInterface(t, "00:01:00", `Extracted_test`)
                    if (record) {
                        res.sendFile(record)
                    } else {
                        res.status(500).send('Failed to Record')
                    }
                } else {
                    res.status(500).send('Failed to Tune')
                }
            } else {
                res.status(400).send('Channel nunber not found')
            }
        } else {
            res.status(400).send('Invalid Tuner ID')
        }
    } else {
        res.status(400).send('Missing Tuner ID')
    }
});
app.use("/dir/record", express.static(path.resolve(config.record_dir)))
app.use("/debug/logcat/:tuner", (req, res) => {
    const serial = getTuner(req.params.tuner).serial
    res.status(200).json({
        logs: device_logs[serial].split('\n')
    })
})

app.listen((config.listenPort) ? config.listenPort : 9080, async () => {
    console.log("Server running");
    if (!cookies.authenticate) {
        console.error(`ALERT:FAULT - Authentication|Unable to start authentication because the cookie data is missing!`)
    } else {
        const tun = listTuners()
        console.log("Settings up recorder queues...")
        for (let t of tun) {
            if (t.digital)
                await initDigitalRecorder(t);
            if (!channelTimes.timetable[t.id])
                channelTimes.timetable[t.id] = []
        }
        jobQueue['extract'] = [];
        activeQueue['extract'] = false;

        if (tun.filter(e => e.digital).length > 0)
            digitalAvailable = true
        if (tun.filter(e => !e.digital).length > 0)
            satelliteAvailable = true

        cron.schedule("* * * * *", async () => {
            updateMetadata();
        });
        cron.schedule("*/5 * * * *", async () => {
            saveMetadata()
        });
        cron.schedule("*/5 * * * *", async () => {
            config = require('./config.json');
            cookies = require("./cookie.json");
            registerSchedule();
            searchEvents();
        });
        setTimeout(() => {
            searchEvents();
            processPendingBounces();
        }, 30000)
        console.log(tun)
        console.log(jobQueue)
    }
});
