(async () => {
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
    const NodeID3 = require('node-id3');
    const stream = require('stream');

    let metadata = {};
    let channelsAvailable = {};
    let channelsImages = {};
    let channelTimes = {
        timetable: {

        },
        pending: [],
        completed: [],
        queues:[],
        active_output: null
    };
    let locked_tuners = new Map();
    let watchdog_tuners = {}
    let watchdog_connectivity = {}
    let timeout_tuners = {}
    let timeout_sources = {}
    let adblog_tuners = new Map();
    let scheduled_list = new Map();
    let scheduled_tasks = new Map();
    let scheduled_tunes = new Map();
    let device_logs = {};
    let audio_servers = new Map();
    let nowPlayingGUID = {};
    let digitalAvailable = false
    let satelliteAvailable = false
    let jobQueue = {};
    let activeQueue = {};
    let eventListCache = [];
    const sxmMaxRewind = 14400000;

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
        if (!l.allow_episodes && m.isEpisode)
            return false
        if (m.title && l.search && m.title.toLowerCase().includes(l.search.toLowerCase()))
            return true
        if (m.artist && l.search && m.artist.toLowerCase().includes(l.search.toLowerCase()))
            return true
        if (m.album && l.search && m.album.toLowerCase().includes(l.search.toLowerCase()))
            return true
        if (m.title && l.title && m.title.toLowerCase().includes(l.title.toLowerCase()))
            return true
        if (m.artist && l.artist && m.artist.toLowerCase().includes(l.artist.toLowerCase()))
            return true
        if (m.album && l.album && m.album.toLowerCase().includes(l.album.toLowerCase()))
            return true

        if (m.title && l.titleExactMatch && m.title.toLowerCase() === l.titleExactMatch.toLowerCase())
            return true
        if (m.artist && l.artistExactMatch && m.artist.toLowerCase() === l.artistExactMatch.toLowerCase())
            return true
        if (m.album && l.albumExactMatch && m.album.toLowerCase() === l.albumExactMatch.toLowerCase())
            return true
        return false
    }
    function searchStringInArray (str, strArray) {
        for (let j=0; j<strArray.length; j++) {
            if (strArray[j].match(str)) return j;
        }
        return -1;
    }

    if (fs.existsSync(path.join(config.record_dir, `metadata.json`))) {
        metadata = require(path.join(config.record_dir, `metadata.json`))
        Object.keys(metadata).map(e => {
            if (Object.values(config.channels).filter(f => f.id === e).length === 0)
                delete metadata[e]
        })
    }
    if (fs.existsSync(path.join(config.record_dir, `accesstimes.json`))) {
        channelTimes = require(path.join(config.record_dir, `accesstimes.json`))
    }

    // Metadata Retrieval and Parsing

    // Get All Metadata For Channels
    async function initializeChannels() {
        // https://player.siriusxm.com/rest/v4/experience/carousels?page-name=channels_all&result-template=everest%7Cweb&cacheBuster=1649613776453
        try {
            function parseJson(_json) {
                try {
                    // Check if messages and successful response
                    if (_json['ModuleListResponse']['messages'].length > 0 && _json['ModuleListResponse']['messages'][0]['message'].toLowerCase() === 'successful') {
                        let chItems = {}
                        _json['ModuleListResponse']['moduleList']['modules'][0]['moduleResponse']['carousel'][0]['carouselTiles'].filter(e => e['tileContentType'] === 'channel').map(e => {
                            const data = {
                                number: e['tileMarkup']['tileText'].filter(f => f['textValue'] && f['textValue'].startsWith('Ch '))[0]['textValue'].slice(3),
                                id: e['tileAssetInfo'].filter(f => f['assetInfoKey'] === 'channelId').map(f => f['assetInfoValue'])[0],
                                name: e['tileAssetInfo'].filter(f => f['assetInfoKey'] === 'channelName').map(f => f['assetInfoValue'])[0],
                                description: e['tileMarkup']['tileText'].filter(f => f['textClass'] === 'line3' && f['textValue']).map(f => f['textValue'])[0],
                                color: e['tileAssetInfo'].filter(f => f['assetInfoKey'] === 'backgroundColor').map(f => f['assetInfoValue'])[0] || e['tileMarkup']['backgroundColor'],
                                image: e['tileMarkup']['tileImage'].filter(f => f['imageLink']).map(f => 'http://siriusxm-art-dd.akamaized.net' +  f['imageLink'].slice(7))[0],
                            }
                            chItems[data.number] = data
                        })
                        return chItems
                    } else {
                        console.log("FAULT: XM did not give a valid API response for initialise data");
                        return false;
                    }
                } catch (e) {
                    console.error(`FAULT: Failed to parse initialization data!`)
                    console.error(e);
                    return false;
                }
            }
            const init_metadata = await new Promise(resolve => {
                const refreshURL = `https://player.siriusxm.com/rest/v4/experience/carousels?page-name=channels_all&result-template=everest%7Cweb&cacheBuster=${Date.now()}`
                request.get({
                    url: refreshURL,
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
                        'referer': "https://player.siriusxm.com/all-channels",
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
            if (init_metadata) {
                channelsAvailable = init_metadata;
                console.log(`${Object.keys(channelsAvailable).length} Channels are Available`)
                return true
            } else {
                console.error(`Failed to initialise the application base metadata from SiriusXM`)
                return false
            }
        } catch (e) {
            console.error(e);
            console.error(`Failed to pull metadata`)
        }
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
            const activeChannels = [...new Set(listTuners().filter(e => e.activeCh))]
            const channelsToUpdate = listChannels().channels.filter(e => (!e.updateOnTune || (e.updateOnTune && e.id && activeChannels.filter(f => f.activeCh.ch === e.id && !f.activeCh.hasOwnProperty("end")).length > 0)))

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
                                //console.log(`Updated Metadata for ${channelInfo.id}`)
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
            await cacheEventsValidated()
            nowPlayingNotification();
            await searchEvents();
            await processPendingBounces();
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
        channelTimes.queues = [];
        Object.keys(jobQueue).map(k => {
            const q = jobQueue[k]
            if (q && q.length > 0)
                channelTimes.queues.push({ k, q })
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
        channelTimes.queues = [];
        return true;
    }
    // Get active tuners and send now playing notifications
    async function nowPlayingNotification(forceUpdate) {
        const activeTuners = listTuners().filter(e => e.activeCh && !e.activeCh.hasOwnProperty("end"))
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
                console.log(`Now Playing: ${t.name}:${t.activeCh.ch} - ${eventText}`)
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

    // Support Functions

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
    function adbCommand(device, commandArray, noTimeout) {
        return new Promise(function (resolve) {
            const adblaunch = [(config.adb_command) ? config.adb_command : 'adb', '-s', device, ...commandArray]
            exec(adblaunch.join(' '), {
                encoding: 'utf8',
                timeout: (noTimeout) ? undefined : 10000
            }, (err, stdout, stderr) => {
                if (err) {
                    console.error(stdout.toString().trim().split('\n').map(e => `${device}: ${e}`).join('\n'))
                    console.error(err)
                    resolve({
                        log: stdout.toString().split('\n').map(e => e.trim()).filter(e => e.length > 0 && e !== '').join('\n'),
                        error: true
                    })
                } else {
                    if (stderr.toString().length > 1)
                        console.error(stderr.toString().trim().split('\n').map(e => `${device}: ${e}`).join('\n'))
                    console.log(stdout.toString().trim().split('\n').map(e => `${device}: ${e}`).join('\n'))
                    resolve({
                        log: stdout.toString().split('\n').map(e => e.trim()).filter(e => e.length > 0 && e !== '').join('\n'),
                        error: false
                    })
                }
            });
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
    // Player Status
    async function checkPlayStatus(device) {
        return await new Promise(resolve => {
            const adblaunch = [(config.adb_command) ? config.adb_command : 'adb', '-s', device.serial, 'shell', 'dumpsys', 'media_session']
            exec(adblaunch.join(' '), {
                encoding: 'utf8',
                timeout: 1000
            }, (err, stdout, stderr) => {
                if (err) {
                    console.error(`${device.serial} : ${err.message}`)
                    resolve(false)
                } else {
                    const log = stdout.toString().split('\r').join('').split('\n')
                    const sessionStackIndex = searchStringInArray('Sessions Stack', log)
                    const services = log.slice(sessionStackIndex)
                        .filter(e => e.includes('package='))
                        .map(e => e.split(' package=')[1])
                    resolve(log.slice(sessionStackIndex)
                        .filter(e => e.includes('state=PlaybackState'))
                        .map((e,i) => {
                            return {
                                x: services[i],
                                y: (() => {
                                    const playState = e.split('state=PlaybackState').pop().trim().slice(1,-1)
                                        .split(', ').filter(e => e.startsWith('state='))[0].split('=')[1]
                                    switch (playState) {
                                        case "0": // none
                                            return "none"
                                        case "1": // stop
                                            return "stopped"
                                        case "2": // pause
                                            return "paused"
                                        case "3": // play
                                            return "playing"
                                        default: // everything i dont care about
                                            return "unknown"
                                    }
                                })()
                            }
                        })
                        .filter(e => e.x === 'com.sirius').map(e => e.y)[0])
                }
            });
        })
    }

    // Channel Searching and Retrieval

    // List All Channels, Numbers, and IDs
    // numbers and ids are indexed to channels for lookups
    // channels has number added to reference the channel numbers
    function listChannels() {
        const c = Object.keys(config.channels).map(e => {
            return {
                number: e,
                ...config.channels[e],
                ...channelsAvailable[e]
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

    // Tuner Searching and Retrieval

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
            ...((digitalOnly === false) ? [] : (config.digital_radios && Object.keys(config.digital_radios).length > 0) ? Object.keys(config.digital_radios).map((e, i) => {
                const _a = channelTimes.timetable[e]
                const a = (_a && _a.length > 0) ? _a.slice(-1).pop() : null
                return {
                    id: e,
                    localAudioPort: 28200 + i,
                    audioPort: 29000 + i,
                    ...config.digital_radios[e],
                    digital: true,
                    activeCh: (a) ? a : null,
                    locked: (Object.keys(activeQueue).indexOf(`REC-${e}`) !== -1)
                }
            }) : []),
            ...((digitalOnly === true) ? [] : (config.satellite_radios && Object.keys(config.digital_radios).length > 0) ? Object.keys(config.satellite_radios).map((e, i) => {
                const _a = channelTimes.timetable[e]
                const a = (_a && _a.length > 0) ? _a.slice(-1).pop() : null
                return {
                    id: e,
                    ...config.satellite_radios[e],
                    digital: false,
                    activeCh: (a) ? a : null,
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
        const f = listTuners().filter(e => e.activeCh && e.activeCh.ch === channel && !e.activeCh.hasOwnProperty("end"))
        return (f && f.length > 0) ? (all) ? f : f.slice(-1).pop() : false
    }
    // Return a tuner that is tuned to a channel else false
    function findActiveRadioTune(channel) {
        const e = findActiveRadio(channel)
        return (e) ? (!(e.digital && e.record_only)) ? e : false : false
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
                    priority: (preferDigital && ((!e.digital && preferDigital) || (e.digital && !preferDigital))) ? e.priority + 1000 : e.priority
                }
            })
            .sort(sortPriority)
            .filter(e =>
                !e.locked &&
                (e.digital || (!e.digital && ch && ch.tuneUrl[e.id])) &&
                !e.record_only
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

    // Event Searching and Formatting

    //
    function nowPlaying(channel) {
        return metadata[channel].slice(-1).pop()
    }
    // List all events for a channel that are after start time
    function listEvents(channel, time, after) {
        return listEventsValidated(undefined, undefined, undefined).filter(e => e.channelId === channel && !e.isSong && (!after && e.syncStart < time || after && e.syncStart > time - 300000))
    }
    // Get specific event by uuid
    function getEvent(channel, guid) {
        let events = [];
        const dt = listTuners(true)
        if (channel) {
            metadata[channel]
                .slice(0)
                .filter(f => f.guid === guid ).map((f, i, a) => {
                if ((!f.duration || f.duration === 0) && (i !== a.length - 1) && (a[i + 1].syncStart)) {
                    f.syncEnd = a[i + 1].syncStart - 1
                    f.duration = parseInt(((f.syncEnd - f.syncStart) / 1000).toFixed(0))
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
                    channelId: channel,
                    tunerId: dt[0].id,
                    noTuner: true
                })
            })
        } else {
            Object.keys(metadata).map(k => {
                if (metadata[k]) {
                    metadata[k]
                        .slice(0)
                        .filter(f => f.guid === guid ).map((f, i, a) => {
                        if ((!f.duration || f.duration === 0) && (i !== a.length - 1) && (a[i + 1].syncStart)) {
                            f.syncEnd = a[i + 1].syncStart - 1
                            f.duration = parseInt(((f.syncEnd - f.syncStart) / 1000).toFixed(0))
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
                            channelId: k,
                            tunerId: dt[0].id,
                            noTuner: true
                        })
                    })
                }
            })
        }
        return events[0]
    }
    // Find last event for a channel after the start time
    function findEvent(channel, time, options) {
        const e = listEvents(channel, time, (options.restrict && options.restrict.search_forward))
        return (options.restrict) ? e.filter(e => isWantedEvent(options.restrict, e)).slice(-1).pop() : e[findClosest(e.map(f => moment.utc(f.syncStart).local()), time + 60000)]
    }
    // Generate Event List Cache
    function cacheEventsValidated() {
        let events = []
        let guidMap = []
        Object.keys(channelTimes.timetable)
            .slice(0)
            .map(d => {
                return channelTimes.timetable[d]
                    .slice(0)
                    .map((tc, i, a) => {
                        if (metadata[tc.ch]) {
                            return metadata[tc.ch]
                                .slice(0)
                                .filter(f =>
                                    // First Item or Was Tuned after event start
                                    (i === 0 || (f.syncStart >= (tc.time - (5 * 60000)))) &&
                                    //
                                    (!tc.end || (tc.end && f.syncEnd <= tc.end)) &&
                                    // Is Last Item or Look ahead and see if this has not occured after the next channel change
                                    (i === a.length - 1 || (i !== a.length - 1 && f.syncStart <= a[i + 1].time))
                                ).map((f, i, a) => {
                                    if (guidMap.indexOf(f.guid) === -1 && (i !== a.length - 1 || (i === a.length - 1 && !tc.hasOwnProperty('end')))) {
                                        if ((!f.duration || f.duration === 0 || f.duration === "0") && (i !== a.length - 1) && a[i + 1].syncStart) {
                                            f.syncEnd = a[i + 1].syncStart
                                            f.duration = parseInt(((f.syncEnd - f.syncStart) / 1000).toFixed(0))
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
                                        guidMap.push(f.guid)
                                        events.push({
                                            ...f,
                                            channelId: tc.ch,
                                            tunerId: d
                                        })
                                    }
                                })
                        }
                    })
            })

        const dt = listTuners(true)
        if (dt) {
            Object.keys(metadata).map(k => {
                if (metadata[k]) {
                    const isActive = findActiveRadio(k)
                    metadata[k]
                        .slice(0)
                        .filter((f,i,a) =>
                            // If not already attached to a tuner
                            guidMap.indexOf(f.guid) === -1 &&
                            // If Event is less then 4 Hours old
                            (moment.utc(f.syncStart).local().valueOf() >= (Date.now() - ((config.max_rewind) ? config.max_rewind : sxmMaxRewind)))
                        ).map((f, i, a) => {
                        if (i === a.length - 1 || (i === a.length - 1 && isActive)) {
                            if ((!f.duration || f.duration === 0 || f.duration === "0") && (i !== a.length - 1) && (a[i + 1].syncStart)) {
                                f.syncEnd = a[i + 1].syncStart - 1
                                f.duration = parseInt(((f.syncEnd - f.syncStart) / 1000).toFixed(0))
                                if (f.duration <= 1)
                                    f.duration = 1
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
                                channelId: k,
                                tunerId: dt[0].id,
                                noTuner: true
                            })
                        }
                    })
                }
            })
        }
        eventListCache = events
    }
    // Get List of Events and Songs
    function listEventsValidated(eventsOnly, device, count) {
        function sortEvents(arrayItemA, arrayItemB) {
            if (arrayItemA.syncStart < arrayItemB.syncStart)
                return -1
            if (arrayItemA.syncStart > arrayItemB.syncStart)
                return 1
            return 0
        }
        let events = eventListCache.slice(0).filter(f =>
            ((eventsOnly === true || eventsOnly === undefined) && parseInt(f.duration.toString()) === 0) ||
            ((eventsOnly === false || eventsOnly === undefined) && parseInt(f.duration.toString()) < 15 * 60) ||
            ((eventsOnly === true || eventsOnly === undefined) && parseInt(f.duration.toString()) > 15 * 60)
        ).sort(sortEvents)
        if (count)
            return (events.length > count) ? events.slice(Math.abs(count) * -1) : events
        return events
    }
    // Format List of Events Data
    function formatEventList(events) {
        const channel = listChannels()
        const pendingJobs = Object.keys(jobQueue).map(k => {return { q: k, ids: jobQueue[k].map(e => e.metadata.guid) }})
        const activeJob = Object.keys(activeQueue).map(k => {return { q: k, id: activeQueue[k].guid }})
        return events
            .filter(e => channel.ids.indexOf(e.channelId) > -1)
            .map(e => {
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
            const queued = pendingJobs.filter(q => e.guid && (q.ids.indexOf(e.guid) !== -1)).map(q => q.k)[0]
            const active = activeJob.filter(q => e.guid && (q.id.indexOf(e.guid) !== -1)).map(q => q.k)[0]
            return {
                tunerId: tun.id,
                tuner: tun,
                channelInfo: channel.channels[channel.ids.indexOf(e.channelId)],
                channel: channel.channels[channel.ids.indexOf(e.channelId)].number,
                isExtractedDigitally: (moment.utc(e.syncStart).local().valueOf() >= (Date.now() - ((config.max_rewind) ? config.max_rewind :  sxmMaxRewind))),
                date: moment.utc(e.syncStart).local().format("MMM D HH:mm"),
                niceDate: moment.utc(e.syncStart).local().fromNow(),
                time: msToTime(parseInt(e.duration.toString()) * 1000).split('.')[0],
                queued,
                active,
                exists: ex,
                duplicate: dyp,
                name: e.filename,
                event: e
            }
        })
    }

    // Automated Event Extraction and Recording

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
            let inp = channelTimes.pending.filter(e => e.done === false && ((e.time + 6000) <= Date.now())).sort(sortTime).map(item => {
                let pendingEvent = item
                let thisEvent = (() => {
                    if (pendingEvent.ch && pendingEvent.guid)
                        return getEvent(pendingEvent.ch, pendingEvent.guid)
                    if (pendingEvent.ch && pendingEvent.time)
                        return findEvent(pendingEvent.ch, pendingEvent.time, { restrict: (pendingEvent.restrict) ? pendingEvent.restrict : undefined })
                })()

                if (thisEvent) {
                    console.log(thisEvent)
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
                }

                if (!thisEvent && pendingEvent.time && pendingEvent.time <= (Date.now() - (4 * 3600000))) {
                    console.error(`Pending Request Expired: ${pendingEvent.time} was not found with in 4 hours`)
                    pendingEvent.done = true
                    pendingEvent.inprogress = false
                } else if (thisEvent.guid && channelTimes.pending.filter(e => e.guid && e.guid === thisEvent.guid && !pendingEvent.liveRec && !pendingEvent.automatic && (e.time + 6000) <= Date.now()).map(e => e.guid).length > 1) {
                    console.log(`Duplicate Event Registered: ${pendingEvent.time} matches a existing bounce GUID`)
                    pendingEvent.done = true
                    pendingEvent.inprogress = false
                } else if (thisEvent.duration && parseInt(thisEvent.duration.toString()) > 0 && thisEvent.syncEnd <= (moment().valueOf() + 5 * 60000)) {
                    const tuner = (thisEvent.tunerId) ? getTuner(thisEvent.tunerId) : undefined

                    if (!pendingEvent.failedRec && (moment.utc(thisEvent.syncStart).local().valueOf() >= (Date.now() - ((config.max_rewind) ? config.max_rewind : sxmMaxRewind))) && digitalAvailable && !config.disable_digital_extract) {
                        // If not failed event, less then 3 hours old, not directed to a specifc tuner, digital recorder ready, and enabled
                        console.log(`The event "${thisEvent.filename}" is now concluded and will be recorded digitally`)
                        pendingEvent.guid = thisEvent.guid;
                        pendingEvent.liveRec = true
                        pendingEvent.done = true
                        pendingEvent.inprogress = true

                        console.log(`Digital Recording Found! "${thisEvent.filename}"`)
                        queueDigitalRecording({
                            metadata: {
                                channelId: pendingEvent.ch,
                                ...thisEvent
                            },
                            post_directorys: pendingEvent.post_directorys,
                            switch_source: (pendingEvent.switch_source) ? pendingEvent.switch_source : false,
                            index: true
                        })
                    } else if (tuner && (!pendingEvent.digitalOnly || (pendingEvent.digitalOnly && pendingEvent.failedRec)) && tuner.hasOwnProperty("record_prefix")) {
                        // If specific tuner is set, not set to require digital or has failed to extract via digital
                        console.log(`The event "${thisEvent.filename}" is now concluded and will be cut from the satellite recordings`)
                        pendingEvent.guid = thisEvent.guid;
                        pendingEvent.done = true
                        pendingEvent.inprogress = true

                        console.log(`Extractable Event Found! "${thisEvent.filename}"`)
                        queueRecordingExtraction({
                            metadata: {
                                channelId: pendingEvent.ch,
                                ...thisEvent,
                                tuner: tuner
                            },
                            post_directorys: pendingEvent.post_directorys,
                            index: true
                        })
                    }
                } else if ((Math.abs(Date.now() - parseInt(thisEvent.syncStart.toString())) >= (((thisEvent.delay) + 60) * 1000)) && (pendingEvent.digitalOnly || config.live_extract)) {
                    // Event is 5 min past its start (accounting for digital delay), digital only event or live extract is enabled
                    console.log(`${thisEvent.filename} is live extractable!`)
                    pendingEvent.guid = thisEvent.guid;
                    pendingEvent.liveRec = true
                    pendingEvent.done = true
                    pendingEvent.inprogress = true

                    console.log(`Live Digital Recording Found! "${thisEvent.filename}"`)

                    queueDigitalRecording({
                        metadata: {
                            channelId: pendingEvent.ch,
                            ...thisEvent
                        },
                        post_directorys: pendingEvent.post_directorys,
                        switch_source: (pendingEvent.switch_source) ? pendingEvent.switch_source : false,
                        index: true
                    })
                }
                return pendingEvent
            })
            inp.push(...channelTimes.pending.filter(e => !((e.done === false && (e.time + 6000) <= Date.now()))))
            channelTimes.pending = inp.filter(e => e.done === false || e.inprogress === true)
        } catch (err) {
            console.error(err)
        }
    }
    // Generate Cron Schedules for events
    function registerSchedule() {
        const configSch = Object.keys(config.schedule)
        const exsistSch = Array.from(scheduled_list.keys())

        exsistSch.filter(e => configSch.indexOf(e) === -1).forEach(e => {
            console.log(`Schedule ${e} was removed!`)
            if (scheduled_tasks.has(e)) {
                const sch = scheduled_tasks.get(e)
                sch.destroy()
                scheduled_tasks.delete(e)
            }
            if (scheduled_tunes.has(e)) {
                const sch = scheduled_tunes.get(e)
                sch.destroy()
                scheduled_tunes.delete(e)
            }
        })
        configSch.filter(e => exsistSch.indexOf(e) === -1).forEach(k => {
            const e = config.schedule[k]
            if (e.record_cron && !scheduled_tasks.has(k)) {
                if (cron.validate(e.record_cron)) {
                    let channelId = (e.channelId) ? e.channelId : undefined
                    if (e.ch)
                        channelId = getChannelbyNumber(e.ch).id

                    console.log(`Record Schedule ${k} @ ${e.record_cron} was created! `)
                    const sch = cron.schedule(e.record_cron, () => {
                        registerBounce({
                            channel: channelId,
                            tuner: (e.rec_tuner) ? getTuner(e.rec_tuner) : undefined,
                            allow_events: (e.allow_events) ? e.allow_events : undefined,
                            digitalOnly: (e.digitalOnly) ? e.digitalOnly : undefined,
                            addTime: 0,
                            restrict: (e.restrict) ? e.restrict : undefined,
                            post_directorys: (e.post_directorys) ? e.post_directorys : undefined,
                            switch_source: (e.hasOwnProperty("switch_source")) ? e.switch_source : false
                        })
                    })
                    scheduled_tasks.set(k, sch)
                    scheduled_list.set(k, true)
                } else {
                    console.error(`${e.record_cron} is not a valid cron string`)
                }
            }
            if (e.tune_cron && !scheduled_tunes.has(k)) {
                if (cron.validate(e.tune_cron)) {
                    let channelId = (e.channelId) ? e.channelId : undefined
                    if (e.ch)
                        channelId = getChannelbyNumber(e.ch).id

                    console.log(`Tuning Schedule ${k} @ ${e.tune_cron} was created! `)
                    const sch = cron.schedule(e.tune_cron, () => {
                        let i = -1
                        function search() {
                            i++
                            if (!e.restrict || !e.restrict_applys_to_tune || (e.restrict && e.restrict_applys_to_tune && isWantedEvent(e.restrict, findEvent(channelId, Date.now())))) {
                                tuneToChannel({
                                    channelId: channelId,
                                    tuner: (e.hasOwnProperty("tune_tuner")) ? e.tune_tuner : undefined
                                })
                            } else if (i < ((e.tune_search_retrys) ? e.tune_search_retrys : 5) && e.tune_search) {
                                console.log(`Event ${k} has not started, trying again in a minute...`)
                                setTimeout(search, 60000)
                            } else {
                                console.log(`Event ${k} was not found, giving up!`)
                            }
                        }
                        search()
                    })
                    scheduled_tunes.set(k, sch)
                    scheduled_list.set(k, true)
                } else {
                    console.error(`${e.tune_cron} is not a valid cron string`)
                }
            }
        })
    }
    // Keyword Search for Events
    function searchEvents() {
        const events = listEventsValidated(true, undefined, 8)
        config.autosearch_terms.map(f => {
            events.filter(e => channelTimes.completed.indexOf(e.guid) === -1 && e.filename && e.filename.toLowerCase().includes(f.search.toLowerCase()) && (!f.duration || (f.duration && e.duration > f.duration))).map(e => {
                console.log(`Found Event ${e.filename} ${e.guid} - ${e.duration}`)
                channelTimes.completed.push(e.guid)
                channelTimes.pending.push({
                    ch: e.channelId,
                    guid: e.guid,
                    time: e.syncStart + 10,
                    tuner: undefined,
                    tunerId: e.tunerId,
                    digitalOnly: (f.digitalOnly),
                    allow_events: (f.allow_events),
                    post_directorys: (f.post_directorys) ? f.post_directorys : undefined,
                    switch_source: (f.switch_source) ? f.switch_source : false,
                    automatic: true,
                    inprogress: false,
                    done: false,
                })
            })
        })

    }
    // Register a event to extract
    function registerBounce(options) {
        const event = (() => {
            if (options.eventItem)
                return options.eventItem
            if (options.guid)
                return getEvent((options.channel) ? options.channel : undefined, options.guid)
            return false
        })()
        console.log(options)
        // Get Passed Tuner or Find one that is using that channel number
        const t = (() => {
            if (event && event.tunerId)
                return event.tunerId
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
            if (event && event.channelId)
                return event.channelId
            if (options.channel)
                return options.channel
            if (t)
                return t.activeCh.ch
            return undefined
        })()
        const time = (() => {
            if (options.absoluteTime)
                return options.absoluteTime + (options.addTime * 60000)
            if (event)
                return event.syncStart + 60000
            return moment().valueOf() + (options.addTime * 60000)
        })()

        if (ch) {
            const pendEvent = {
                ch,
                tuner: (options.tuner && (!options.digitalOnly || (options.digitalOnly && options.tuner.digital))) ? t : undefined,
                tunerId: (t) ? t.id : undefined,
                digitalOnly: (options.digitalOnly),
                guid: (event) ? event.guid : undefined,
                restrict: (options.restrict) ? options.restrict : undefined,
                time,
                post_directorys: (options.post_directorys) ? options.post_directorys : undefined,
                switch_source: (options.switch_source) ? options.switch_source : false,
                inprogress: false,
                done: false,
            }
            channelTimes.pending.push(pendEvent)
            console.log(`Pending Bounce registered!`)
            console.log(pendEvent)
            // Add new notification service
            saveMetadata();
            return pendEvent
        } else {
            console.error("Missing Required data to register a pending Extraction")
            return false
        }
    }

    // macOS GUI - TO BE DEPRECATED AND REPLACED BY A REAL WEB UI

    /*
    // Edit Metadata - Needs to be updated
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
            const eventsMeta = formatEventList(listEventsValidated(!(type), device, 250))
            if (eventsMeta.length === 0)
                return false
            const eventSearch = await new Promise(resolve => {
                const listmeta = eventsMeta.reverse().map(e =>
                    [
                        '"',
                        `[${(e.tuner.digital) ? '💎' : '📡'}${(e.tuner.name)? e.tuner.name : e.tunerId} - ${e.channel}]`,
                        `[📅${e.date}]`,
                        e.name,
                        `[${(e.event.isEpisode) ? '🔶' : ''}${(e.duplicate) ? '🔂' : '' }${(e.isExtractedDigitally) ? '⏱' : ''}${(e.exists) ? '💾' : ''}${(e.queued) ? '⏳' : ''}${(e.active) ? '⚙' : ''}${(e.time === "00:00:00") ? '🔴' : ''}]`,
                        `${(e.time !== "00:00:00") ? '(' + e.time + ')' : ''}`,
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
                } else if (eventsToExtract.tuner.hasOwnProperty("record_prefix")) {
                    queueRecordingExtraction({ metadata: eventsToExtract })
                }
            }
        } catch (e) {
            console.error(`ALERT:FAULT - Edit Metadata|${e.message}`)
            console.error(e);
        }
    }
    */
    // Set AirFoil Interface
    async function setAirOutput(tuner, release) {
        return await new Promise(async (resolve) => {
            const input = (release && tuner.airfoil_source.return_source) ? tuner.airfoil_source.return_source : tuner.airfoil_source.name
            const currentSource = await getAirOutput()
            const currentTuner = listTuners().filter(e => e.airfoil_source && e.airfoil_source.name && e.airfoil_source.name === currentSource.trim())[0]

            if (!release && currentTuner.airfoil_source.auto_release && currentTuner.airfoil_source.name !== tuner.airfoil_source.name) {
                console.info(`Last tuner is not in use anymore, starting timeout...`)
                timeout_sources[currentTuner.id] = setTimeout(() => {
                    deTuneTuner(currentTuner)
                    delete timeout_sources[currentTuner.id]
                }, (typeof currentTuner.airfoil_source.auto_release === "number" && currentTuner.airfoil_source.auto_release >= 5000) ? currentTuner.airfoil_source.auto_release : 30000)
            } else if (!release && tuner.airfoil_source.auto_release && timeout_sources[tuner.id]) {
                console.info(`Tuner regained focus, stopping timeout`)
                clearTimeout(timeout_sources[tuner.id])
                delete timeout_sources[tuner.id]
            }

            const list = `tell application "Airfoil" to set current audio source to first device source whose name is "${input}"`
            const childProcess = osascript.execute(list, function (err, result, raw) {
                if (err)
                    console.error(err)
                console.log(`airOutput: Set audio source to ${input}`)
                clearTimeout(childKiller);
                resolve(!(err));
            });
            const childKiller = setTimeout(function () {
                childProcess.stdin.pause();
                childProcess.kill();
                resolve(null);
            }, 5000)
        })
    }
    // Get AirFoil Interface
    async function getAirOutput() {
        return await new Promise(resolve => {
            const list = `tell application "Airfoil" to name of current audio source`
            const childProcess = osascript.execute(list, function (err, result, raw) {
                if (err)
                    console.error(err)
                //console.log(`airOutput: ${result}`)
                clearTimeout(childKiller);
                resolve(result);
            });
            const childKiller = setTimeout(function () {
                childProcess.stdin.pause();
                childProcess.kill();
                resolve("");
            }, 10000)
        })
    }
    // Get AirFoil Speakers
    async function getAirSpeakers() {
        return await new Promise(resolve => {
            const list = `tell application "Airfoil" to {name, connected} of speakers`
            const childProcess = osascript.execute(list, function (err, result, raw) {
                if (err)
                    console.error(err)
                console.log(result)
                clearTimeout(childKiller);
                const state = result[1];
                let devices = {};
                result[0].map((e,i) => {
                    devices[e] = result[1][i]
                })
                resolve(devices);
            });
            const childKiller = setTimeout(function () {
                childProcess.stdin.pause();
                childProcess.kill();
                resolve("");
            }, 10000)
        })
    }
    // Inflate the Room configuration for speakers
    async function inflateRoomConfig() {
        if (config.hasOwnProperty("rooms")) {
            const speakers = await getAirSpeakers();
            let rooms = {};
            Object.keys(config.rooms).map(e => {
                rooms[e] = {
                    name: e,
                    speakers: config.rooms[e].map(f => { return { name: f, state: speakers[f] }})
                }
            })
            return rooms
        }
        return false;
    }
    // Set Airfoil Speakers States
    async function setAirSpeakers(room, device, action) {
        const roomConfig = inflateRoomConfig();
        if (roomConfig.hasOwnProperty(room)) {
            const deviceToUse = roomConfig[room].speakers[device]
            if (deviceToUse && !deviceToUse.state) {
                if (action !== 'leave') {
                    await new Promise(resolve => {
                        const list = `tell application "Airfoil" to connect to (first speaker whose name is "${deviceToUse.name}")`
                        const childProcess = osascript.execute(list, function (err, result, raw) {
                            if (err)
                                console.error(err)
                            clearTimeout(childKiller);
                            resolve(!err);
                        });
                        const childKiller = setTimeout(function () {
                            childProcess.stdin.pause();
                            childProcess.kill();
                            resolve("");
                        }, 10000)
                    })
                }
                roomConfig[room].speakers.filter(e => action !== 'add' && e.state === true && (e.name !== deviceToUse.name && action === 'leave')).map(async e => {
                    await new Promise(resolve => {
                        const list = `tell application "Airfoil" to disconnect from (first speaker whose name is "${e.name}")`
                        const childProcess = osascript.execute(list, function (err, result, raw) {
                            if (err)
                                console.error(err)
                            clearTimeout(childKiller);
                            resolve(!err);
                        });
                        const childKiller = setTimeout(function () {
                            childProcess.stdin.pause();
                            childProcess.kill();
                            resolve("");
                        }, 10000)
                    })
                })
                return true
            }
        }
        return false
    }

    // Job Queues

    // Queue a recorded event extraction and start the processor if inactive
    function queueRecordingExtraction(jobOptions) {
        jobQueue['extract'].push(jobOptions)
        console.log(`Extraction Job #${jobQueue['extract'].length} Queued`)
        console.log(jobOptions)
        if (!activeQueue['extract'])
            startExtractQueue()
    }
    // Process all pending recording extractions as FIFO
    async function startExtractQueue() {
        activeQueue['extract'] = true
        while (jobQueue['extract'].length !== 0) {
            const job = jobQueue['extract'][0]
            const completed = await extractRecordedEvent(job)
            jobQueue['extract'].shift()
            console.log(`Q/Extract: Last Job Result ${(completed)} - ${jobQueue['extract'].length} jobs left`)
        }
        delete activeQueue['extract']
        return true
    }
    // Queue a digital recording on the best available tuner and start the processor if inactive
    function queueDigitalRecording(jobOptions) {
        const best_recorder = getBestDigitalTuner()
        if (!best_recorder)
            return false
        jobQueue[best_recorder].push(jobOptions)
        console.log(`Record Job #${jobQueue[best_recorder].length} Queued for ${best_recorder}`)
        console.log(jobOptions)
        if (!activeQueue[best_recorder])
            startRecQueue(best_recorder)
    }
    // Process all pending digital recordings as FIFO
    async function startRecQueue(q) {
        if (!locked_tuners.has(q.slice(4))) {
            activeQueue[q] = true
            const tuner = getTuner(q.slice(4))
            while (jobQueue[q].length !== 0) {
                const job = jobQueue[q][0]
                let i = (job.retry) ? job.retry : -1
                i++
                jobQueue[q][0].retry = i
                if (i <= 3 && moment.utc(job.metadata.syncStart).local().valueOf() >= (Date.now() - ((config.max_rewind) ? config.max_rewind : sxmMaxRewind))) {
                    const completed = await recordDigitalEvent(job, tuner)
                    if (completed)
                        await jobQueue[q].shift()
                    console.log(`Q/${q.slice(4)}: Last Job Result "${(completed)}" - ${jobQueue[q].length} jobs left`)
                } else {
                    if (job.index) {
                        console.error(`Record/${q.slice(4)}: Failed job should be picked up by the recording extractor (if available)`)
                        const index = channelTimes.pending.map(e => e.guid).indexOf(job.metadata.guid)
                        channelTimes.pending[index].inprogress = false
                        channelTimes.pending[index].liveRec = false
                        channelTimes.pending[index].done = false
                        channelTimes.pending[index].failedRec = true
                    }
                    await jobQueue[q].shift()
                    console.log(`Q/${q.slice(4)}: Last Job Result "Time Expired for this Job" - ${jobQueue[q].length} jobs left`)
                }
            }
            delete activeQueue[q]
            if (tuner.hasOwnProperty('stop_after_record') && !tuner.stop_after_record) {
                reTuneTuner(tuner)
            }
            return true
        } else {
            console.error(`Record/${q.slice(4)}: Unable to start the job queue becuase the tuner is locked!`)
        }
    }

    // Digital Tuner Controls and Recorders

    // Wait for device to connect and prepare device
    async function initDigitalRecorder(device) {
        locked_tuners.set(device.id, true)
        console.log(`Searching for digital tuner "${device.name}":${device.serial}...`)
        console.log(`Please connect the device via USB if not already`)
        await adbCommand(device.serial, ["wait-for-device"], true)
        console.log(`Tuner "${device.name}":${device.serial} was connected! Please Wait for initialization...\n!!!! DO NOT TOUCH DEVICE !!!!`)
        const socketready = await startAudioDevice(device);
        if (socketready) {
            console.log(`Tuner "${device.name}":${device.serial} is now ready!`)
            const clientOk = await (async () => {
                if (device.hasOwnProperty("relay_audio") && device.relay_audio) {
                    await createAudioServer(device);
                    return await startAudioClient(device);
                } else {
                    return true
                }
            })()
            if (!jobQueue['REC-' + device.id] && clientOk) {
                jobQueue['REC-' + device.id] = [];
            }
            locked_tuners.delete(device.id)
        } else {
            console.error(`Tuner "${device.name}":${device.serial} has been locked out because the audio interface did not open!`)
        }
    }
    // Start TCP Audio Server and Pipeline
    async function startAudioClient(device) {
        console.log(`${device.id}: (6/6) Starting Audio Pipeline TCP ${device.localAudioPort} => TCP ${device.audioPort}...`)
        const audioServer = audio_servers.get(device.id)
        if (audioServer.hasOwnProperty("passTrough")) {
            const passTrough = audioServer.passTrough
            let player = new net.Socket()
            async function connectDevice(port) {
                player = net.connect(port, "127.0.0.1", function () {
                    console.log(`Connected to device audio tcp://127.0.0.1:${port}`)
                });
                player.on("data", (data) => passTrough.push(data));
                player.on('close', function () {
                    console.log('Device Audio Disconnect.');
                    setTimeout(() => {
                        connectDevice(port, true)
                    }, 5000)
                });
                player.on('error', function (err) {
                    console.error(JSON.stringify(err));
                });
            }
            connectDevice(device.localAudioPort)
            return true
        } else {
            console.error('No Audio Server is running!')
            return false
        }
    }
    // Connect Device to TCP Audio Server Pipeline
    async function createAudioServer(device) {
        return new Promise((resolve => {
            console.log(`${device.id}: (5/6) Starting Audio Relay @ TCP ${device.audioPort}...`)
            const passTrough = new stream.PassThrough({
                highWaterMark: 2000000
            });
            const audioServer = net.createServer(function (client) {
                console.log(`TAS/${device.id}: Audio Client Connected ${client.localAddress} => ${client.remotePort}`);
                passTrough.pipe(client)
                client.on('error', function (err) {
                    if (err.message === 'read ECONNRESET') {
                        audioServer.getConnections(function (err, count) {
                            if (!err) {
                                console.log(`TAS/${device.id}: Audio Client Disconnected - There are ${count} connections now.`);
                            } else {
                                console.error(JSON.stringify(err))
                            }
                        });
                    } else {
                        console.error(`TAS/${device.id}: Audio Server Error: ${err.message}`);
                    }
                })
            });
            audioServer.listen(device.audioPort, function () {
                const serverInfo = audioServer.address();
                const serverInfoJson = JSON.stringify(serverInfo);
                console.log(`TCP server listen on port : ${serverInfoJson.port}`);
                audioServer.on('close', function () {
                    console.log('TCP Audio Socket Closed');
                });
                audioServer.on('error', function (error) {
                    console.error(JSON.stringify(error));
                });
            });
            audio_servers.set(device.id, {audioServer, passTrough})
            resolve(true)
        }))
    }
    // Start the USB Audio Interface
    async function startAudioDevice(device) {
        return await new Promise(async (resolve, reject) => {
            console.log(`Setting up USB Audio Interface for "${device.name}"...`)
            async function start() {
                console.log(`${device.id}: (1/6) Installing USB Interface...`)
                const ins = await adbCommand(device.serial, ["install", "-t", "-r", "-g", "app-release.apk"])
                console.log(`${device.id}: (2/6) Enabling Audio Recording Permissions...`)
                const alw = await adbCommand(device.serial, ["shell", "appops", "set", "com.rom1v.sndcpy", "PROJECT_MEDIA", "allow"])
                console.log(`${device.id}: (3/6) Connecting Local Device Socket @ TCP ${device.localAudioPort}...`)
                const fwa = await adbCommand(device.serial, ["forward", `tcp:${device.localAudioPort}`, "localabstract:sndcpy"])
                console.log(`${device.id}: (4/6) Starting Audio Interface...`)
                const kil = await adbCommand(device.serial, ["shell", "am", "kill", "com.rom1v.sndcpy"])
                const sta = await adbCommand(device.serial, ["shell", "am", "start", "com.rom1v.sndcpy/.MainActivity", "--ei", "SAMPLE_RATE", "44100", "--ei", "BUFFER_SIZE_TYPE", "3"])
                console.log(`${device.id}: Ready`)
                return true
            }
            resolve((await start()))
        })
    }
    // Stop the USB Audio Interface
    async function stopAudioDevice(device) {
        await adbCommand(device.serial, ["forward", "--remove", `tcp:${device.localAudioPort}`])
        await adbCommand(device.serial, ["shell", "am", "kill", "com.rom1v.sndcpy"])
    }
    // Record Audio from Interface attached to a Android Recorder with a set end time
    function recordDigitalAudioInterface(tuner, time, event) {
        return new Promise(async function (resolve) {
            let controller = null
            let watchdog = null
            let stopwatch = null
            let fault = false
            const input = await (async () => {
                if (tuner.audio_interface) {
                    console.log(`Record/${tuner.id}: Using physical audio interface "${tuner.audio_interface.join(' ')}"`)
                    return tuner.audio_interface
                }
                return ["-f", "s16le", "-ar", "48k", "-ac", "2", "-i", `tcp://localhost:${(tuner.hasOwnProperty("relay_audio") && tuner.relay_audio) ? tuner.audioPort : tuner.localAudioPort}`]
            })()
            if (!input) {
                console.error(`Record/${tuner.id}: No Audio Interface is available for ${tuner.id}`)
                resolve(false)
            } else {
                console.log(`Record/${tuner.id}: Started Digital Dubbing Event "${event.filename}"...`)
                try {
                    const startTime = Date.now()
                    const ffmpeg = ['-hide_banner', '-stats_period', '300', '-y', ...input, ...((time) ? ['-t', time] : []), '-b:a', '320k', `Extracted_${event.guid}.mp3`]
                    console.log(ffmpeg.join(' '))
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
                            clearTimeout(stopwatch)
                            clearInterval(controller)
                            clearInterval(watchdog)
                            resolve((!activeQueue[`REC-${tuner.id}`] || activeQueue[`REC-${tuner.id}`].closed || fault) ? false : fs.existsSync(completedFile) && fs.statSync(completedFile).size > 1000000)
                        }
                        locked_tuners.delete(tuner.id)
                    })

                    let watchdogi = 0
                    watchdog = setInterval(async () => {
                        const state = await checkPlayStatus(tuner)
                        if (!state) {
                            watchdogi++
                        } else if (state === 'playing') {
                            watchdogi = 0
                        }
                        if (!(state === 'playing' || watchdogi < 2)) {
                            console.log(`Record/${tuner.id}: Fault Detected with tuner - Device has unexpectedly stopped playing audio! Job Failed`)
                            fault = true
                            clearTimeout(stopwatch)
                            clearInterval(controller)
                            recorder.stdin.write('q')
                        }
                    }, 5000)

                    activeQueue[`REC-${tuner.id}`] = {
                        recorder,
                        watchdog,
                        startTime,
                        closed: false,
                        guid: event.guid
                    }

                    if (!time) {
                        console.log(`Record/${tuner.id}: This is a live event and has no duration, watching for closure`)
                        controller = setInterval(() => {
                            const eventData = getEvent(event.channelId, event.guid)
                            if (!activeQueue[`REC-${tuner.id}`] || activeQueue[`REC-${tuner.id}`].closed) {
                                clearInterval(controller)
                            } else if (eventData && eventData.duration && parseInt(eventData.duration.toString()) > 0) {
                                const termTime = Math.abs((Date.now() - startTime) - (parseInt(eventData.duration.toString()) * 1000)) + (((eventData.isEpisode) ? 300 : 10) * 1000)
                                console.log(`Event ${event.guid} concluded with duration ${(eventData.duration / 60).toFixed(0)}m, Starting Termination Timer for ${((termTime / 1000) / 60).toFixed(0)}m`)
                                stopwatch = setTimeout(() => {
                                    clearInterval(watchdog)
                                    recorder.stdin.write('q')
                                }, termTime)
                                activeQueue[`REC-${tuner.id}`] = {
                                    recorder,
                                    stopwatch,
                                    startTime,
                                    watchdog,
                                    closed: false,
                                    guid: event.guid
                                }
                                clearInterval(controller)
                                controller = null
                            }
                        }, 60000)
                        activeQueue[`REC-${tuner.id}`] = {
                            recorder,
                            controller,
                            startTime,
                            watchdog,
                            closed: false,
                            guid: event.guid
                        }
                    }
                } catch (e) {
                    console.error(e)
                    resolve(false)
                }
            }
        })
    }
    // Return to the home screen after a timeout of inactivity
    function startDeviceTimeout(device) {
        if (device.timeout) {
            timeout_tuners[device.id] = setTimeout(async() => {
                // adb shell am force-stop com.sirius
                // adb shell am start -a android.intent.action.MAIN -c android.intent.category.HOME
                await adbCommand(device.serial, ["shell", "am", "start", "-a", "android.intent.action.MAIN", '-c', 'android.intent.category.HOME'])
            }, device.timeout)
        }
    }

    // Channel Tuning Functions

    // Tune to Channel on specific Tuner or the best available one
    async function tuneToChannel(options) {
        const channel = (() => {
            if (options.channelId) {
                return getChannelbyId(options.channelId)
            } else {
                return getChannelbyNumber(options.channel)
            }
        })()
        if (channel) {
            const tn = ((t,ca) => {
                if (t) {
                    const _t = getTuner(t)
                    if (_t)
                        return [_t, false]
                }
                if (ca && !ca.hasOwnProperty("end"))
                    return [ca, true]
                return [false, false]
            })(options.tuner, findActiveRadioTune(channel.id))
            const tuneResult = await (async () => {
                if (tn[0]) {
                    console.log(`Request to tune "${tn[0].name}" to channel ${channel.name}`)
                    return _tuneToChannel(tn[0], channel, tn[1])
                } else {
                    console.log(`Request available tuner to channel ${channel.name}`)
                    const _ptn = availableTuners(channel.id, (options.digital && options.digital === 'true' ))
                    if (_ptn && _ptn.length > 0) {
                        return _tuneToChannel(_ptn[0], channel, false)
                    } else {
                        return {
                            ok: false,
                            result: 'unavailable'
                        }
                    }
                }
            })()

            if (tuneResult.ok) {
                const respones = (() => {
                    switch (tuneResult.result) {
                        case 'unmodified':
                            return `UNMODIFIED - Tuner ${tn[0]} is already tuned to "${channel.name}"`
                        case 'not-possible':
                            return `MANUAL - Tuner ${tn[0]} was marked as tuned "${channel.name}" but does not have automation to do so, manually change the channel`
                        case 'tune-digital':
                        case 'tune-satellite':
                            return `OK - Tuner ${tn[0]} was tuned to "${channel.name}"`
                    }
                })()
                if (options.res)
                    options.res.status(200).send(respones)
                console.log(respones)
                return true
            } else {
                const response = (() => {
                    switch (tuneResult.result) {
                        case 'locked':
                            return `LOCKED - Tuner ${tn[0].id} is currently locked`
                        case 'unavailable':
                            return `There are no tuners available at this time\nThis could be because of locks for events or require manual input (In that case specify that tuner= specifically and change the channel manualy)`
                        default:
                            return `ERROR - Tuner ${tn[0].id} failed to tune to ${channel.name} due to a url request error`
                    }
                })()
                if (options.res)
                    options.res.status(500).send(response)
                console.error(response)
                return false
            }
        } else {
            if (options.res)
                options.res.status(404).send('Channel not found')
            console.error("Channel not found")
            return false
        }
    }
    // Does the actual tuning
    async function _tuneToChannel(ptn, channel, isAlreadyTuned) {
        let result = {
            ok: false
        }
        if (ptn.locked) {
            return {
                ok: false,
                result: 'locked'
            }
        }
        let tcb = { ok: true }
        if (!(isAlreadyTuned && !ptn.always_retune)) {
            if (ptn.digital) {
                const resultsTune = await tuneDigitalChannel(channel.id, 0, ptn)
                tcb = { ok: resultsTune }
                result.action = 'tune-digital'
            } else if (channel.tuneUrl[ptn.id]) {
                tcb = await webRequest(channel.tuneUrl[ptn.id])
                result.action = 'tune-satellite'
            } else {
                tcb = { ok: true }
                result.action = 'not-possible'
            }
        } else {
            result.action = 'unmodified'
        }
        if (tcb.ok) {
            if (ptn.post_tune_url !== undefined && ptn.post_tune_url)
                await webRequest(ptn.post_tune_url)
            if (ptn.airfoil_source !== undefined && ptn.airfoil_source && ptn.airfoil_source.conditions.indexOf('tune') !== -1)
                await setAirOutput(ptn, false)

            if (channelTimes.timetable[ptn.id].length > 0) {
                let lastTune = channelTimes.timetable[ptn.id].pop()
                lastTune.end = moment().valueOf()
                channelTimes.timetable[ptn.id].push(lastTune)
            }
            channelTimes.timetable[ptn.id].push({
                time: moment().valueOf(),
                ch: channel.id,
            })
            if (ptn.digital)
                digitalTunerWatcher(ptn)
            if (channel.updateOnTune)
                updateMetadata()
            result.ok = true
        }
        return result
    }
    // End the tuners timeline for the active channel
    async function deTuneTuner(tuner, force) {
        if (force || (!activeQueue[`REC-${tuner.id}`] && !locked_tuners.has(tuner.id))) {
            if (tuner.digital)
                clearInterval(watchdog_tuners[tuner.id])
            if (!force && tuner.airfoil_source !== undefined && tuner.airfoil_source && tuner.airfoil_source.return_source)
                setAirOutput(tuner, true)
            if (tuner.digital) {
                await releaseDigitalTuner(tuner)
                startDeviceTimeout(tuner)
            }
            if (channelTimes.timetable[tuner.id].length > 0) {
                let lastTune = channelTimes.timetable[tuner.id].pop()
                if (!lastTune.hasOwnProperty('end'))
                    lastTune.end = moment().valueOf()
                channelTimes.timetable[tuner.id].push(lastTune)
            }
            if (tuner.digital)
                delete watchdog_tuners[tuner.id]
            return true
        } else {
            return false
        }
    }
    // Used to tune to the last channel once recordings are completed
    function reTuneTuner(tuner) {
        if (channelTimes.timetable[tuner.id].length > 0) {
            let lastTune = channelTimes.timetable[tuner.id].slice(-1).pop()
            if (lastTune.hasOwnProperty('end')) {
                tuneToChannel({
                    channelId: lastTune.ch,
                    tuner: tuner.id
                })
            }
        }
    }
    // Tune to Digital Channel on Android Device
    async function tuneDigitalChannel(channel, time, device) {
        console.log(`Tune/${device.id}: Tuning Device to channel ${channel} @ ${moment.utc(time).local().format("YYYY-MM-DD HHmm")}...`);
        if (timeout_tuners[device.id])
            clearInterval(timeout_tuners[device.id])
        return new Promise(async (resolve) => {
            let k = -1
            let tuneReady = false
            while (!tuneReady) {
                k++
                await adbCommand(device.serial, ['shell', 'input', 'keyevent', '86'])
                const tune = await adbCommand(device.serial, ['shell', 'am', 'start', '-a', 'android.intent.action.MAIN', '-n', 'com.sirius/.android.everest.welcome.WelcomeActivity', '-e', 'linkAction', `'"Api:tune:liveAudio:${channel}::${time}"'`])
                if (tune.log.includes('Starting: Intent { act=android.intent.action.MAIN cmp=com.sirius/.android.everest.welcome.WelcomeActivity (has extras) }')) {
                    let i = -1;
                    while (!tuneReady) {
                        i++
                        tuneReady = await new Promise(ok => {
                            setTimeout(async () => {
                                const state = await checkPlayStatus(device)
                                ok(state === 'playing')
                            }, 1000)
                        })
                        if (i >= 30) {
                            console.error(`Tune/${device.id}: Device did not start playing within the required timeout!`)
                            break
                        }
                    }
                } else {
                    console.error(`Tune/${device.id}: Did not receive expected response from device active manager`)
                }
                if (!tuneReady)
                    console.error(`Tune/${device.id}: Device failed to tune to ${channel}!`)
                if (k >= 3) {
                    console.error(`Tune/${device.id}: Device tuning reties exhausted, giving up!`)
                    break
                }
            }
            if (!tuneReady)
                startDeviceTimeout(device)
            resolve(tuneReady)
        })
    }
    // Stop Playback on Android Device aka Release Stream Entity
    async function releaseDigitalTuner(device) {
        console.log(`Releasing Device ${device.serial}...`);
        return await adbCommand(device.serial, ['shell', 'input', 'keyevent', '86'])
    }
    // Automatically deturns a tuner if playback is stopped
    async function digitalTunerWatcher(device) {
        let watchdogi = 0
        watchdog_tuners[device.id] = setInterval(async () => {
            const state = await checkPlayStatus(device)
            if (!state) {
                watchdogi++
            } else if (state === 'playing') {
                watchdogi = 0
            }
            if (!(state === 'playing' || watchdogi < 1)) {
                console.log(`Player/${device.id}: Tuner is no longer playing and will be detuned`)
                deTuneTuner(device)
            }
        }, 60000)
    }
    // Watches device for the loss of port forwarding
    async function deviceWatcher(device) {
        watchdog_connectivity[device.id] = setInterval(async () => {
            const portlist = await adbCommand(device.serial, ['forward', '--list'])
            if (!portlist.ok || !portlist.log.includes(`localabstract:sndcpy`)) {
                console.error(`Player/${device.id}: Device has lost audio connectivity with the server, attempting to reconfigure...`)
                await initDigitalRecorder(device)
            }
        }, 30000)
    }

    // Job Workers

    // Record an event on a digital tuner
    async function recordDigitalEvent(job, tuner) {
        console.log(`Record/${tuner.id}: Preparing for digital dubbing...`)
        let eventItem = getEvent(job.metadata.channelId, job.metadata.guid)
        if (!eventItem)
            eventItem = job.metadata
        console.log(job)
        console.log(tuner)
        adbLogStart(tuner.serial)
        await deTuneTuner(tuner, true)
        locked_tuners.set(tuner.id, true)
        if (await tuneDigitalChannel(eventItem.channelId, eventItem.syncStart, tuner)) {
            const isLiveRecord = !(eventItem.duration && parseInt(eventItem.duration.toString()) > 0 && eventItem.syncStart < (Date.now() - (30 * 60000)))
            if (tuner.airfoil_source !== undefined && tuner.airfoil_source && job.switch_source && tuner.airfoil_source.conditions.indexOf((isLiveRecord) ? 'live_record' : 'record') !== -1)
                setAirOutput(tuner, false)
            const time = (() => {
                if (eventItem.duration && parseInt(eventItem.duration.toString()) > 0 && tuner.audio_interface)
                    return parseInt(eventItem.duration.toString()) + ((eventItem.isEpisode) ? 300 : 10)
                if (eventItem.duration && parseInt(eventItem.duration.toString()) > 0)
                    return msToTime((parseInt(eventItem.duration.toString()) + ((eventItem.isEpisode) ? 300 : 10)) * 1000).split('.')[0]
                return undefined
            })()
            const recording = await recordDigitalAudioInterface(tuner, time, eventItem)
            if (tuner.record_only || tuner.stop_after_record) {
                if (tuner.airfoil_source !== undefined && tuner.airfoil_source && tuner.airfoil_source.return_source && ((job.switch_source && tuner.airfoil_source.conditions.indexOf((isLiveRecord) ? 'live_record' : 'record') !== -1) || (await getAirOutput()) === tuner.airfoil_source.name) )
                    setAirOutput(tuner, true)
                await releaseDigitalTuner(tuner)
                startDeviceTimeout(tuner)
            }
            const completedFile = path.join((tuner.record_dir) ? tuner.record_dir : config.record_dir, `Extracted_${eventItem.guid}.${(config.extract_format) ? config.extract_format : 'mp3'}`)
            if (recording && fs.existsSync(completedFile) && fs.statSync(completedFile).size > 1000000) {
                try {
                    let tags = {
                        title: eventItem.title,
                        performerInfo: "SiriusXM"
                    }
                    if (eventItem.artist)
                        tags.artist = eventItem.artist
                    tags.album = (eventItem.album) ? eventItem.album : getChannelbyId(eventItem.channelId).name
                    tags.comment = {
                        language: "eng",
                        text: "SiriusXM"
                    }
                    const tagsWritten = NodeID3.write(tags, completedFile)
                } catch (e) {
                    console.error(`Failed to write tags`)
                    console.error(e)
                }
                await postExtraction(path.join((tuner.record_dir) ? tuner.record_dir : config.record_dir, `Extracted_${eventItem.guid}.${(config.extract_format) ? config.extract_format : 'mp3'}`), `${eventItem.filename.trim()} (${moment(eventItem.syncStart).format("YYYY-MM-DD HHmm")}).${(config.extract_format) ? config.extract_format : 'mp3'}`, job.post_directorys)
            } else if (fs.existsSync(completedFile)) {
                rimraf(completedFile, () => {})
            }
            if (adblog_tuners.has(tuner.serial))
                adblog_tuners.get(tuner.serial).kill(9)
            if (job.index) {
                const index = channelTimes.pending.map(e => e.guid).indexOf(eventItem.guid)
                if (recording && channelTimes.pending[index] && channelTimes.pending[index].hasOwnProperty("inprogress")) {
                    channelTimes.pending[index].inprogress = false
                    channelTimes.pending[index].liveRec = false
                    channelTimes.pending[index].done = true
                } else if (channelTimes.pending[index] && channelTimes.pending[index].hasOwnProperty("inprogress")) {
                    console.error(`Record/${tuner.id}: Failed job should be picked up by the recording extractor (if available)`)
                    channelTimes.pending[index].inprogress = false
                    channelTimes.pending[index].liveRec = false
                    channelTimes.pending[index].done = false
                    channelTimes.pending[index].failedRec = true
                }
            }
            return recording;
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
                    try {
                        let tags = {
                            title: eventItem.title,
                            performerInfo: "SiriusXM"
                        }
                        if (eventItem.artist)
                            tags.artist = eventItem.artist
                        tags.album = (eventItem.album) ? eventItem.album : getChannelbyId(eventItem.channelId).name
                        tags.comment = {
                            language: "eng",
                            text: "SiriusXM"
                        }
                        const tagsWritten = NodeID3.write(tags, trimEventFile)
                    } catch (e) {
                        console.error(`Failed to write tags`)
                        console.error(e)
                    }
                    await postExtraction(trimEventFile, eventFilename, job.post_directorys);
                    if (channelTimes.completed.indexOf(eventItem.guid) === -1)
                        channelTimes.completed.push(eventItem.guid)
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
    async function postExtraction(extractedFile, eventFilename, overrides) {
        const upload_dir = (overrides && overrides.upload_dir) ? overrides.upload_dir : config.upload_dir
        const backup_dir = (overrides && overrides.backup_dir) ? overrides.backup_dir : config.backup_dir

        try {
            if (backup_dir) {
                await new Promise(resolve => {
                    console.log(`Copying Backup File ... "${eventFilename}"`)
                    exec(`cp "${extractedFile.toString()}" "${path.join(backup_dir, eventFilename).toString()}"`, (err, result) => {
                        if (err)
                            console.error(err)
                        resolve((err))
                    })
                })
            }
            if (upload_dir) {
                console.log(`Copying File for Upload ... "${eventFilename}"`)
                await new Promise(resolve => {
                    exec(`cp "${extractedFile.toString()}" "${path.join(upload_dir, 'HOLD-' + eventFilename).toString()}"`, (err, result) => {
                        if (err)
                            console.error(err)
                        resolve((err))
                    })
                })
                await new Promise(resolve => {
                    exec(`mv "${path.join(upload_dir, 'HOLD-' + eventFilename).toString()}" "${path.join(upload_dir, eventFilename).toString()}"`, (err, result) => {
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
        await tuneToChannel({
            channel: req.params.channelNum,
            tuner: (req.query.tuner) ? req.query.tuner : undefined,
            digital: (req.query.digital) ? req.query.digital : undefined,
            res
        })
    });
    app.get("/detune/:tuner", async (req, res, next) => {
        const tuner = getTuner(req.params.tuner);
        if (tuner) {
            if (await deTuneTuner(tuner)) {
                res.status(200).send('OK')
            } else {
                res.status(401).send('Tuner Locked or Error')
            }
        } else {
            res.status(404).send('Tuner not found')
        }
    });
    app.get("/source/:tuner", async (req, res, next) => {
        const t = getTuner(req.params.tuner)
        if (t && t.airfoil_source && t.airfoil_source.name && ((t.activeCh && !t.activeCh.hasOwnProperty('end')) || (t.digital && (await checkPlayStatus(t)) === 'playing'))) {
            await setAirOutput(t, false)
            res.status(200).send("OK")
        } else {
            res.status(404).send("Tuner not found")
        }
    })
    app.get("/output/:action/:room/:index", async (req, res, next) => {
        res.status(200).send(await setAirSpeakers(req.params.room, parseInt(req.params.index), req.params.action));
    })
    app.get("/pending/:action", (req, res) => {
        switch (req.params.action) {
            case "add":
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
                if (req.query.guid)
                    options.guid = req.query.guid
                if (req.query.play)
                    options.switch_source = (req.query.play)

                const results = registerBounce(options);
                processPendingBounces();

                if (results) {
                    res.status(200).json(results);
                } else {
                    res.status(500).send("Failed");
                }
                break;
            case "remove":
                if (req.query.guid) {
                    const closeJobs = Object.keys(activeQueue).map(k => {
                        if (activeQueue[k] && activeQueue[k].guid) {
                            const activeJob = activeQueue[k]
                            if (activeJob.guid && activeJob.guid === req.query.guid) {
                                console.log(`${req.query.guid} job is currently active and will be cancelled`)
                                activeQueue[k].closed = true
                                if (activeQueue[k].stopwatch)
                                    clearTimeout(activeQueue[k].stopwatch)
                                if (activeQueue[k].controller)
                                    clearInterval(activeQueue[k].controller)
                                if (activeQueue[k].watchdog)
                                    clearInterval(activeQueue[k].watchdog)
                                if (activeQueue[k].recorder)
                                    activeQueue[k].recorder.kill(9)
                                return true
                            }
                        }
                        return false
                    }).filter(e => e === true).length
                    const clearJobs = Object.keys(jobQueue).map(k => {
                        const clearedPendJobs = jobQueue[k].filter(e => e.metadata.guid !== req.query.guid)
                        if (clearedPendJobs.length !== jobQueue[k].length) {
                            console.log(`Cleared ${jobQueue[k].length - clearedPendJobs.length} Jobs from Pending Jobs`)
                            jobQueue[k] = clearedPendJobs
                            return true
                        }
                        return false
                    }).filter(e => e === true).length
                    const clearPending = (() => {
                        const clearedPending = channelTimes.pending.filter(e => !e.guid || (e.guid && e.guid !== req.query.guid))
                        if (clearedPending.length !== channelTimes.pending.length) {
                            console.log(`Cleared ${channelTimes.pending.length - clearedPending.length} Jobs from Pending Queue`)
                            const length = channelTimes.pending.length - clearedPending.length
                            channelTimes.pending = clearedPending
                            return (length)
                        }
                        return 0
                    })()
                    let response = []
                    if (closeJobs > 0)
                        response.push(`Closed ${closeJobs} active jobs`)
                    if (clearJobs > 0)
                        response.push(`Cleared ${closeJobs} pending jobs`)
                    if (clearPending > 0)
                        response.push(`Cleared ${clearPending} pending requests`)
                    res.status(200).send(response.join('\n'))
                }
                break;
            case "print":
                const activeJobs = Object.keys(activeQueue).map(k => {
                    if (activeQueue[k].guid) {
                        return {
                            queue: k,
                            guid: activeQueue[k].guid,
                            active: !(activeQueue[k].closed),
                            liveRec: (activeQueue[k].hasOwnProperty("controller")),
                            isLive: !(activeQueue[k].hasOwnProperty("stopwatch")),
                        }
                    }
                    return false
                }).filter(e => e !== false)
                const pendingJobs = Object.keys(jobQueue).map(k => {
                    return jobQueue[k].map(pendingJob => {
                        return {
                            channelId: pendingJob.metadata.channelId,
                            guid: pendingJob.metadata.guid,
                            start: pendingJob.metadata.syncStart,
                            name: pendingJob.metadata.filename,
                            post_directorys: pendingJob.post_directorys,
                            switch_source: (pendingJob.switch_source) ? pendingJob.switch_source : true,
                            isRequested: pendingJob.index
                        }
                    })
                })
                res.status(200).json({
                    active: activeJobs,
                    pendingJobs: pendingJobs,
                    requests: channelTimes.pending
                })
                break;
            case "activeRecording":
            case "activeLiveRecording":
            default:
                res.status(400).send(`Unknown Action: ${req.params.action}`);
                break;
        }
    })
    app.get("/metadata/:action", (req, res) => {
        switch (req.params.action) {
            case "update":
                if (req.query.ch && req.query.ch.length > 0 && req.query.guid && req.query.guid.length > 0 && req.query.filename && req.query.filename.length > 0) {
                    const updatedFilenames = metadata[req.query.ch].slice(0).filter(e => e.guid === req.query.guid).map(e => {
                        return {
                            ...e,
                            filename: req.query.filename
                        }
                    })
                    if (updatedFilenames.length > 0) {
                        metadata[req.query.ch] = [
                            ...metadata[req.query.ch].filter(e => e.guid !== req.query.guid),
                            ...updatedFilenames
                        ]
                        res.status(200).send('Filename updated');
                        updateMetadata();
                    } else {
                        res.status(404).send('GUID and Channel Event not found')
                    }
                } else {
                    res.status(400).send('Missing Required Data')
                }
                break;
            default:
                res.status(400).send(`Unknown Action: ${req.params.action}`);
                break;
        }

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
                    bounceEventGUI(false, (req.query.tuner) ? req.query.tuner : undefined);
                    res.status(200).send('OK')
                    break;
                case 'select_bounce_song':
                    bounceEventGUI(true, (req.query.tuner) ? req.query.tuner : undefined);
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
        if (device_logs.hasOwnProperty(serial)) {
            res.status(200).json({
                logs: device_logs[serial].split('\n')
            })
        } else {
            res.status(400).send('No Logs Available')
        }
    })
    app.use("/debug", (req, res) => {
        const activeJobs = Object.keys(activeQueue).map(k => {
            if (activeQueue[k].guid) {
                return {
                    queue: k,
                    guid: activeQueue[k].guid,
                    active: !(activeQueue[k].closed),
                    liveRec: (activeQueue[k].hasOwnProperty("controller")),
                    isLive: !(activeQueue[k].hasOwnProperty("stopwatch")),
                }
            }
            return false
        }).filter(e => e !== false)
        const pendingJobs = Object.keys(jobQueue).map(k => {
            return jobQueue[k].map(pendingJob => {
                return {
                    channelId: pendingJob.metadata.channelId,
                    guid: pendingJob.metadata.guid,
                    start: pendingJob.metadata.syncStart,
                    name: pendingJob.metadata.filename,
                    post_directorys: pendingJob.post_directorys,
                    switch_source: (pendingJob.switch_source) ? pendingJob.switch_source : true,
                    isRequested: pendingJob.index
                }
            })
        })
        const tuners = listTuners()
        const statuses = tuners.filter(e => e.serial).map(async (t) => {
            let x = {}
            x[t] = await checkPlayStatus(t)
            return x
        })
        const results = {
            activeJob: activeJobs,
            pendingJobs: pendingJobs,
            requestedJobs: channelTimes.pending,
            tuners: tuners,
            player_status: statuses
        }
        res.status(200).json(results)
    })
    app.get("/status/:type", async (req, res) => {
        try {
            const activeJobs = Object.keys(activeQueue).map(k => {
                if (activeQueue[k].guid) {
                    return {
                        queue: k,
                        start: activeQueue[k].startTime,
                        guid: activeQueue[k].guid,
                        active: !(activeQueue[k].closed),
                        liveRec: (activeQueue[k].hasOwnProperty("controller")),
                        isLive: !(activeQueue[k].hasOwnProperty("stopwatch")),
                    }
                }
                return false
            }).filter(e => e !== false)
            switch (req.params.type) {
                case 'events':
                    res.status(200).json(formatEventList(listEventsValidated(undefined, undefined, (req.query.count) ? parseInt(req.query.count) : 5000)))
                    break;
                case 'rooms':
                    res.status(200).json(await inflateRoomConfig())
                    break;
                case 'channels':
                    res.status(200).json(listChannels().channels.map(e => {
                        let supportedDevices = (e.tuneUrl) ? Object.keys(e.tuneUrl) : []
                        return {
                            number: parseInt(e.number),
                            name: e.name,
                            id: e.id,
                            description: e.description,
                            color: e.color,
                            imageUrl: e.image,
                            image: channelsImages[e.id],
                            supportedDevices
                        }
                    }))
                    break;
                case 'jobs':
                    let pendingJobs = []
                    Object.keys(jobQueue).map(k => {
                        return jobQueue[k].map(pendingJob => {
                            pendingJobs.push({
                                queue: k,
                                channelId: pendingJob.metadata.channelId,
                                guid: pendingJob.metadata.guid,
                                start: pendingJob.metadata.syncStart,
                                name: pendingJob.metadata.filename,
                                post_directorys: pendingJob.post_directorys,
                                switch_source: (pendingJob.switch_source) ? pendingJob.switch_source : true,
                                isRequested: pendingJob.index
                            })
                        })
                    })
                    const results = {
                        activeJob: activeJobs,
                        pendingJobs: pendingJobs,
                        requestedJobs: channelTimes.pending,
                    }
                    res.status(200).json(results)
                    break;
                case 'devices':
                    const source = await getAirOutput()
                    const tuners = listTuners().map(e => {
                        const meta = (e.activeCh && !e.activeCh.hasOwnProperty("end")) ? nowPlaying(e.activeCh.ch) : false
                        const activeJob = activeJobs.filter(j => j.queue.slice(4) === e.id)
                        const channelMeta = (activeJob.length > 0) ? activeJob.map(j => getEvent(undefined, j.guid))[0] : (meta) ? meta : false
                        return {
                            id: e.id,
                            name: e.name,
                            channel: (() => {
                                if (activeJob.length > 0 && channelMeta) {
                                    const ch = getChannelbyId(channelMeta.channelId)
                                    return {
                                        id: e.activeCh.ch,
                                        name: ch.name,
                                        number: ch.number,
                                        description: ch.description,
                                        color: ch.color,
                                        imageUrl: ch.image,
                                        image: channelsImages[ch.id],
                                    }
                                }
                                if (!meta)
                                    return false
                                const ch = getChannelbyId(e.activeCh.ch)
                                return {
                                    id: e.activeCh.ch,
                                    name: ch.name,
                                    number: ch.number,
                                    description: ch.description,
                                    color: ch.color,
                                    imageUrl: ch.image,
                                    image: channelsImages[ch.id]
                                }
                            })(),
                            digital: e.digital,
                            active: (e.airfoil_source && e.airfoil_source.name === source),
                            locked: e.locked,
                            working: (activeJob.length > 0) ? {
                                guid: activeJob[0].guid,
                                jobCount: jobQueue[activeJob[0].queue].length,
                                startTime: activeJob[0].start,
                                elapsedTime: Math.abs(Date.now() - activeJob[0].start),
                                duration: (channelMeta.duration && channelMeta.duration > 0) ? ((parseInt(channelMeta.duration.toString()) * 1000) + (((channelMeta.isEpisode) ? 300 : 10) * 1000)) : false,
                                timeLeft: (channelMeta.duration && channelMeta.duration > 0) ? Math.abs((Date.now() - activeJob[0].start) - (parseInt(channelMeta.duration.toString()) * 1000)) + (((channelMeta.isEpisode) ? 300 : 10) * 1000) : false
                            } : false,
                            history: (!e.record_only && e.record_prefix),
                            nowPlaying: (() => {
                                if (!channelMeta)
                                    return false
                                let list = [];
                                if (channelMeta.artist)
                                    list.push(channelMeta.artist)
                                if (channelMeta.title)
                                    list.push(channelMeta.title)
                                return {
                                    song: channelMeta.isSong,
                                    episode: channelMeta.isEpisode,
                                    text: list
                                }
                            })()
                        }
                    })
                    res.json(tuners);
                    break;
                default:
                    res.status(400).send("Unknown Request")
                    break;
            }
        } catch (err) {
            console.error(err);
            res.status(500).send(err.message);
        }
    })

    if (!cookies.authenticate) {
        console.error(`ALERT:FAULT - Authentication|Unable to start authentication because the cookie data is missing!`)
    } else {
        await initializeChannels();
        console.log(listChannels())
        const tun = listTuners()

        console.log("Settings up recorder queues...")
        for (let t of tun) {
            if (t.digital) {
                await initDigitalRecorder(t);
                //deviceWatcher(t)
            }
            if (!channelTimes.timetable[t.id])
                channelTimes.timetable[t.id] = []
        }
        if (tun.filter(e => e.digital).length > 0)
            digitalAvailable = true
        if (tun.filter(e => !e.digital).length > 0)
            satelliteAvailable = true

        if (channelTimes.queues && channelTimes.queues.length > 0) {
            jobQueue['extract'] = [];
            for (const a of channelTimes.queues) {
                console.log(`Recovering Queue "${a.k}"...`)
                jobQueue[a.k] = a.q
                if (a.k.startsWith("REC-") && a.q.length > 0) {
                    startRecQueue(a.k)
                } else if (a.q.length > 0) {
                    startExtractQueue()
                }
            }
        } else {
            jobQueue['extract'] = [];
        }
        channelTimes.queues = [];
        await updateMetadata();
        registerSchedule();
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
        });

        console.log(tun)
        console.log(jobQueue)
        app.listen((config.listenPort) ? config.listenPort : 9080, async () => {
            console.log("Server running");
        });

        getAirSpeakers();

        for (let k of Object.keys(channelsAvailable)) {
            if (channelsAvailable[k].image) {
                const image = await new Promise(resolve => {
                    request.get({
                        url: channelsAvailable[k].image,
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
                            'referer': "https://player.siriusxm.com/",
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
                            resolve(body.toString('base64'));
                        }
                    })
                })
                if (image) {
                    channelsImages[channelsAvailable[k].id] = image
                } else {
                    console.error(`No Image Data for ${k}`)
                }
            }
        }
    }
})()
