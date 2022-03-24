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


let metadata = {};
let channelTimes = {
    timetable: {

    },
    pending: []
};
let locked_tuners = new Map();
//
let nowPlayingGUID = {};
let pendingBounceTimer = null;

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
        const channelsToUpdate = listChannels().channels.filter(e => (!e.updateOnTune || (e.updateOnTune && e.id && activeChannels.indexOf(e.id))))

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
                console.log(`Pulled Metadata for ${id}`)
            } catch (e) {
                console.error(e);
                console.error("FAULT");
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
// List all tuners
// digital indicates if a tuner is an Android device
// tuner object and active channel is injected
function listTuners() {
    return [
        ...((config.satellite_radios && config.satellite_radios.length > 0) ? Object.keys(config.satellite_radios).map(e => {
            const _a = channelTimes.timetable[e]
            const a = (_a && _a.length > 0) ? _a.slice(-1).pop() : null
            const m = (() => {
                if (a && a.length > 0)
                    return metadata[a.ch].slice(-1).pop()
                return null
            })()
            return {
                id: e,
                tuner: config.satellite_radios[e],
                digital: false,
                activeCh: (a && m) ? { m, ...a} : null
            }
        }) : []),
        ...((config.digital_radios && config.digital_radios.length > 0) ? Object.keys(config.digital_radios).map(e => {
            const _a = channelTimes.timetable[e]
            const a = (_a && _a.length > 0) ? _a.slice(-1).pop() : null
            const m = (() => {
                if (a && a.length > 0)
                    return metadata[a.ch].slice(-1).pop()
                return null
            })()
            return {
                id: e,
                tuner: config.satellite_radios[e],
                digital: true,
                activeCh: (a && m) ? { m, ...a} : null
            }
        }) : [])
    ]
}
// Get tuner by id
function getTuner(id) {
    const t = listTuners().filter(e => e.id === id)
    return (t && t.length > 0) ? t.slice(-1).pop() : false
}
// Return the best radio that is currently tuned to channel else false
// use true or false after channel if you want all that are tuned to a channel
function findActiveRadio(channel, all) {
    const f = listTuners().filter(e => e.activeCh.ch === channel)
    return (f && f.length > 0) ? (all) ? f : f.slice(-1).pop() : false
}
// Return a tuner that is tuned to a channel else false
function findActiveRadioTune(channel) {
    const e = findActiveRadio(channel)
    return (e) ? (!(e.digital && e.tuner.record_only)) ? e : false : false
}
// Return list if tuners that are available for tuning
// Tuners that are locked due to recordings or manual lockout are omitted obviously
function availableTuners() {
    return listTuners().filter(e => !(e.tuner.lock_on_events && locked_tuners.has(e.id)) && !e.tuner.record_only)
}
// List all events for a channel that are after start time
function listEvents(channel, time) {
    return metadata[channel].filter(e => !e.isSong && e.syncStart < time)
}
// Find last event for a channel after the start time
function findEvent(channel, time) {
    const e = listEvents(channel, time)
    return e[findClosest(e.map(f => moment.utc(f.syncStart).local()), time + 60000)]
}
function listEventsValidated() {

}

// Process Pending Events to Extract
async function processPendingBounces() {
    try {
        for (let i in channelTimes.pending.filter(e => e.done === false)) {
            let pendingEvent = channelTimes.pending[i]
            let thisEvent = findEvent(pendingEvent.ch, pendingEvent.time)
            console.log(pendingEvent.time)
            console.log(thisEvent)
            /*if (!digitalRecorderBusy && thisEvent.ch && thisEvent.duration && parseInt(thisEvent.duration.toString()) > 0 && thisEvent.syncEnd <= moment().valueOf() + 60000) {
                if (thisEvent.ch)
                    thisEvent.channelId = config.channels[thisEvent.ch].id
                const recorded = await recordDigitalEvent(thisEvent, config.digitalRecorders[0])
                if (recorded) {
                    await postExtraction(recorded, `${thisEvent.filename.trim()} (${moment(thisEvent.syncStart).format("YYYY-MM-DD HHmm")})${config.record_format}`)
                    pendingEvent.done = true
                }
            }*/

            if (thisEvent.duration && parseInt(thisEvent.duration.toString()) > 0 && thisEvent.syncEnd <= moment().valueOf() + 60000) {
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

                if (pendingEvent.tuner.digital && !pendingEvent.failedRec) {
                    pendingEvent.liveRec = true
                    recordDigitalFile(thisEvent, {...pendingEvent, index: i})
                } else {
                    if (thisEvent.ch)
                        thisEvent.channelId = pendingEvent.id
                    if (pendingEvent.failedRec) {
                        // Add code to search for event in timeline for any tuner that was available during the time
                    } else {
                        thisEvent.tuner = pendingEvent.tuner
                        await bounceEventFile([thisEvent])
                    }
                }
                pendingEvent.done = true
            }
        }
        channelTimes.pending = channelTimes.pending.filter(e => e.done === false && e.liveRec === false)
    } catch (err) {
        console.error(err)
    }
    pendingBounceTimer = setTimeout(() => { processPendingBounces() }, 5 * 60000)
}

async function searchForEvents(_nowPlaying, currentChannel) {
    if (config.autoBounce) {
        config.autoBounce.forEach(lookup => {
            metadata[currentChannel.ch].slice(-8).forEach(nowPlaying => {
                if (!nowPlaying.isSong && (lookup.search.toLowerCase().includes(nowPlaying.title.toLowerCase()) || (nowPlaying.artist && lookup.search.toLowerCase().includes(nowPlaying.artist.toLowerCase()))) && channelTimes.pending.filter(e => e.lookup && e.lookup === lookup.search).length === 0) {
                    channelTimes.pending.push({
                        lookup: lookup.search,
                        ch: currentChannel.ch,
                        time: moment().valueOf(),
                        done: false
                    })
                }
            })
        })
    }
}

async function registerBounce(addTime, channelNumber, tuner) {
    const t = (() => {
        if (tuner)
            return tuner.id
        if (channelNumber)
            return findActiveRadio(channelNumber).id
        return undefined
    })()
    const ch = (() => {
        if (channelNumber)
            return channelTimes
        if (t)
            return t.activeCh.ch
        return undefined
    })()
    channelTimes.pending.push({
        ch,
        tuner: t,
        time: moment().valueOf() + (addTime * 60000),
        done: false,
    })
    await new Promise(resolve => {
        const channelData = config.channels.filter(e => e.id === ch)[0]
        const list = `display notification "💿 This event will be bounced on completion" with title "📻 ${(channelData.name) ? channelData.name : "SiriusXM"}"`
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
    await saveMetadata();
}

async function bounceEventFile(eventsToParse) {
    const analogRecFiles = fs.readdirSync((eventsToParse.tuner.record_dir) ? eventsToParse.tuner.record_dir : config.record_dir).filter(e => e.startsWith(eventsToParse.tuner.record_prefix) && e.endsWith(".mp3")).map(e => {
        return {
            date: moment(e.replace(eventsToParse.tuner.record_prefix, '').split('.')[0] + '', (eventsToParse.tuner.record_date_format) ? eventsToParse.tuner.record_date_format : "YYYYMMDD-HHmmss"),
            file: e
        }
    });
    const analogRecTimes = analogRecFiles.map(e => e.date.valueOf());

    for (let index in eventsToParse) {
        const eventItem = eventsToParse[index]
        console.log(eventItem)

        if (parseInt(eventItem.duration.toString()) > 0) {
            const trueTime = moment.utc(eventItem.syncStart).local();
            const eventFilename = `${eventItem.filename.trim()} (${moment(eventItem.syncStart).format((eventsToParse.tuner.record_date_format) ? eventsToParse.tuner.record_date_format : "YYYYMMDD-HHmmss")}).${(config.extract_format) ? config.extract_format : 'mp3'}`

            let generateAnalogFile = false;
            if (!eventItem.tuner.digital) {
                try {
                    let analogStartFile = findClosest(analogRecTimes, trueTime.valueOf()) - 1
                    if (analogStartFile < 0)
                        analogStartFile = 0
                    const analogEndFile = findClosest(analogRecTimes, eventItem.syncEnd)
                    const analogFileItems = (analogStartFile < analogEndFile) ? analogRecFiles.slice(analogStartFile, analogEndFile + 1) : [analogRecFiles[analogStartFile]]
                    const analogFileList = analogFileItems.map(e => e.file).join('|')

                    if (trueTime.valueOf() > analogFileItems[0].date.valueOf()) {
                        const analogStartTime = msToTime(Math.abs(trueTime.valueOf() - analogFileItems[0].date.valueOf()))
                        const analogEndTime = msToTime((parseInt(eventItem.duration.toString()) * 1000) + 10000)
                        console.log(`${analogStartTime} | ${analogEndTime}`)
                        generateAnalogFile = await new Promise(function (resolve) {
                            console.log(`Ripping Analog File "${eventItem.filename.trim()}"...`)
                            const ffmpeg = [(config.ffmpeg_exec) ? config.ffmpeg_exec : '/usr/local/bin/ffmpeg', '-hide_banner', '-y', '-i', `concat:"${analogFileList}"`, '-ss', analogStartTime, '-t', analogEndTime, `Extracted_${eventItem.guid}.${(config.extract_format) ? config.extract_format : 'mp3'}`]
                            exec(ffmpeg.join(' '), {
                                cwd: (eventsToParse.tuner.record_dir) ? eventsToParse.tuner.record_dir : config.record_dir,
                                encoding: 'utf8'
                            }, (err, stdout, stderr) => {
                                if (err) {
                                    console.error(`Analog Extraction failed: FFMPEG reported a error!`)
                                    console.error(err)
                                    resolve(false)
                                } else {
                                    if (stderr.length > 1)
                                        console.error(stderr);
                                    console.log(stdout.split('\n').filter(e => e.length > 0 && e !== ''))
                                    resolve(path.join((eventsToParse.tuner.record_dir) ? eventsToParse.tuner.record_dir : config.record_dir, `Extracted_${eventItem.guid}.mp3`))
                                }
                            });
                        })
                    } else {
                        console.error("Analog Recordings are not available for this time frame! Canceled")
                    }
                } catch (e) {
                    console.error(`ALERT: FAULT - Analog Extraction Failed: ${e.message}`)
                    console.error(e);
                }
            }

            const extractedFile = (() => {
                if (generateAnalogFile && fs.existsSync(generateAnalogFile.toString())) {
                    return generateAnalogFile
                } else {
                    return null
                }
            })()

            if (extractedFile) {
                await postExtraction(extractedFile, eventFilename);
            } else {
                console.error(`Extraction failed: File was not generated correctly`)
            }
            console.log(`PROGRESS:${(((parseInt(index) + 1) / eventsToParse.length) * 100).toFixed()}`)
            if (parseInt(index) + 1 === eventsToParse.length)
                console.log('PROGRESS:100')
        }
    }
}
async function postExtraction(extractedFile, eventFilename) {
    try {
        if (config.backup_dir) {
            await new Promise(resolve => {
                exec(`cp "${extractedFile.toString()}" "${path.join(config.backup_dir, eventFilename).toString()}"`, (err, result) => {
                    if (err)
                        console.error(err)
                    resolve((err))
                })
            })
        }
        if (config.upload_dir) {
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
        console.log(`Ripping complete for ${eventFilename.trim()}!`)
        await new Promise(resolve => {
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
            }, 90000)
        })
    } catch (e) {
        console.error(`Extraction failed: cant not be parsed because the file failed to be copied!`)
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
async function bounceEventGUI(type, format) {
    try {
        let eventsMeta = [];
        const timetable = (format) ? channelTimes.timetable.filter(e => e.digital === (format === 'digital')) : channelTimes.timetable
        const lastIndex = timetable.length - 1
        for (let c in timetable) {
            let events = await metadata[timetable[parseInt(c)].ch].filter(f => parseInt(f.duration.toString()) > 90 && (parseInt(c) === 0 || (f.syncStart >= (timetable[parseInt(c)].time - (5 * 60000)))) && (parseInt(c) === lastIndex || (parseInt(c) !== lastIndex && f.syncStart <= timetable[parseInt(c) + 1].time)) && ((type && parseInt(f.duration.toString()) < 15 * 60) || (!type && parseInt(f.duration.toString()) > 15 * 60))).map(e => {
                return {
                    ...e,
                    ch: timetable[parseInt(c)].ch,
                    format: timetable[parseInt(c)].digital
                }
            })
            eventsMeta.push(...events)
        }
        if (eventsMeta.length === 0)
            return false
        eventsMeta = eventsMeta.reverse().slice(0, 250).reverse()
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
                return `"[${(e.format) ? '💿' : '📡'}${e.ch}  📅${moment.utc(e.syncStart).local().format("MMM D HH:mm")}] ${(e.isEpisode) ? '🔶' : ''}${(exsists) ? '✅' : '〰'} ${name} ${(duplicate) ? '🔂 ' : '' }(${msToTime(parseInt(e.duration.toString()) * 1000).split('.')[0]})"`
            })
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
            eventItem.format = (eventItem.format === true) ? 'digital' : (eventItem.format === false) ? 'analog' : (format) ? foramt : undefined
            eventItem.channelId = config.channels[eventItem.ch].id
            eventItem.filename = await new Promise(resolve => {
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
        }
        await bounceEventFile(eventsToParse);
    } catch (e) {
        console.error(`ALERT:FAULT - Edit Metadata|${e.message}`)
        console.error(e);
    }
}

// ** Android/Digital Recorder Tools **
// Tune to Digital Channel on Android Device
function tuneDigitalChannel(channel, time, device) {
    return new Promise(function (resolve) {
        console.log(`Tuneing Device ${device} to channel ${channel}...`);
        // shell am start -a android.intent.action.MAIN -n com.sirius/.android.everest.welcome.WelcomeActivity -e linkAction '"Api:tune:liveAudio:9472::1647694800000"'
        const adblaunch = [config.adb_command, '-s', device, 'shell', 'am', 'start', '-a', 'android.intent.action.MAIN', '-n', 'com.sirius/.android.everest.welcome.WelcomeActivity', '-e',
            'linkAction', `'"Api:tune:liveAudio:${channel}::${time}"'`]
        exec(adblaunch.join(' '), {
            encoding: 'utf8'
        }, (err, stdout, stderr) => {
            if (err) {
                console.error(`Failed to send event start command!`)
                console.error(err)
                resolve(false)
            } else {
                if (stderr.length > 1)
                    console.error(stderr);
                const log = stdout.split('\n').filter(e => e.length > 0 && e !== '')
                console.log(log)
                if (log.join('\n').includes('Starting: Intent { act=android.intent.action.MAIN cmp=com.sirius/.android.everest.welcome.WelcomeActivity (has extras) }')) {
                    resolve(true)
                } else {
                    resolve(false)
                }
            }
        });
    })
}
// Stop Playback on Android Device aka Release Stream Entity
function disconnectDigitalChannel(device) {
    return new Promise(function (resolve) {
        console.log(`Stopping Device ${device}...`);
        // shell input keyevent 86
        const adblaunch = [config.adb_command, '-s', device, 'shell', 'input', 'keyevent', '86']
        exec(adblaunch.join(' '), {
            encoding: 'utf8'
        }, (err, stdout, stderr) => {
            if (err) {
                console.error(`Failed to send event stop command!`)
                console.error(err)
                resolve(false)
            } else {
                if (stderr.length > 1)
                    console.error(stderr);
                console.log(stdout.split('\n').filter(e => e.length > 0 && e !== ''))
                resolve(true)
            }
        });
    })
}
// Record Audio from Interface attached to a Android Recorder with a set end time
function recordAudioInterface(tuner, time, name) {
    return new Promise(function (resolve) {
        console.log(`Recording Digital Event "${name.trim()}"...`)
        const ffmpeg = ['/usr/local/bin/ffmpeg', '-hide_banner', '-y', ...tuner.audio_interface, '-t', time, `${name}.mp3`]
        locked_tuners.set(tuner.id, exec(ffmpeg.join(' '), {
            cwd: config.record_dir,
            encoding: 'utf8'
        }, (err, stdout, stderr) => {
            if (err) {
                console.error(`Digital recording failed: FFMPEG reported a error!`)
                console.error(err)
                resolve(false)
            } else {
                if (stderr.length > 1)
                    console.error(stderr);
                console.log(stdout.split('\n').filter(e => e.length > 0 && e !== ''))
                resolve(path.join((tuner.record_dir) ? tuner.record_dir : config.record_dir, `${name}.${(config.extract_format) ? config.extract_format : 'mp3'}`))
                locked_tuners.delete(tuner.id)
            }
        }))
    })
}
// Tune, Record, Disconnect
async function recordDigitalEvent(eventItem, tuner) {
    if (await tuneDigitalChannel(eventItem.ch, (eventItem.syncStart + ((tuner.delay) ? tuner.delay * 1000 : 0)), tuner.serial)) {
        const recordedEvent = await recordAudioInterface(tuner, msToTime((parseInt(eventItem.duration.toString()) * 1000) + 30000), `Extracted_${eventItem.guid}`)
        if (tuner.record_only)
            await disconnectDigitalChannel(tuner.serial)
        return recordedEvent;
    }
    return false
}
// Digital Recorder Controller
async function recordDigitalFile(eventItem, options) {
    if (options.tuner.digital) {
        const recorded = await recordDigitalEvent(eventItem, options.tuner)
        if (recorded) {
            if (options.index) {
                channelTimes.pending[options.index].liveRec = false
                channelTimes.pending[options.index].done = true
            }
            await postExtraction(recorded, `${eventItem.filename.trim()} (${moment(eventItem.syncStart).format("YYYY-MM-DD HHmm")})${config.record_format}`)
        } else {
            if (options.index) {
                channelTimes.pending[options.index].liveRec = false
                channelTimes.pending[options.index].done = false
                channelTimes.pending[options.index].failedRec = true
            }
        }
    } else {
        console.error("This is not a digital recorder")
    }
}

// Tune to a channel
// channelNum or channelId: Channel Number or ID to tune to
// tuner: Tuner ID to tune too
app.get("/tune/:channelNum", async (req, res, next) => {
    // Find Channel object
    const channel = (() => {
        const channels = listChannels()
        let i = -1
        if (req.params.channelId) {
            i = channels.ids.indexOf(req.params.channelId)
        } else if (req.params.channelNum) {
            i = channels.numbers.indexOf(req.params.channelNum)
        }
        if (i !== -1)
            return channels.channels[i]
        return null
    })()
    if (channel) {
        // Get Active Tuner
        const ca = findActiveRadioTune(channel.id)
        console.log(`Tune any available radio to channel ${channel.name}`)
        if (ca && !req.query.tuner) {
            // If channel is active and did not request a specifc Tuner
            const t = getTuner(ca.id)
            if (t) {
                if (t.always_retune &&
                    ((!ca.digital && channel.tuneUrl[ca.id]) || ca.digital)
                ) {
                    const tcb = (ca.digital) ? await tuneDigitalChannel(channel.id, 0, t) : await webRequest(channel.tuneUrl[ca.id])
                    let pcb = {ok: true}
                    if (t.post_tune_url) {
                        pcb = await webRequest(t.post_tune_url)
                    }
                    if (((ca.digital && tcb) || (!ca.digital && tcb.ok)) && pcb.ok) {
                        channelTimes.timetable[t.id].push({
                            time: moment().valueOf(),
                            ch: channel.id,
                        })
                        if (channel.updateOnTune)
                            updateMetadata()
                        res.status(200).send(`OK - Tuner ${ca.tuner} was already on that channel, tuned again`)
                    } else {
                        res.status(500).send(`ERROR - Tuner ${ca.tuner} failed to tune due to a url request error (Tune: ${tcb.ok} Post: ${pcb.ok})`)
                    }
                } else {
                    res.status(200).send(`OK - Tuner ${ca.tuner} is already on that channel`)
                }
            } else {
                res.status(500).send('Internal Error when referencing tuner config')
            }
        } else if (req.query.tuner) {
            const ft = availableTuners().filter(e => e.id === req.query.tuner)
            if (ft.length > 0) {
                const t = ft.slice(-1).pop()
                const tcb = (t.digital) ? await tuneDigitalChannel(channel.id, 0, t.tuner) : (channel.tuneUrl[t.id]) ? await webRequest(channel.tuneUrl[t.id]) : {ok: true, manual: true}
                let pcb = {ok: true}
                if (t.tuner.post_tune_url) {
                    pcb = await webRequest(t.tuner.post_tune_url)
                }
                if (((t.digital && tcb) || (!t.digital && tcb.ok)) && pcb.ok) {
                    channelTimes.timetable[t.id].push({
                        time: moment().valueOf(),
                        ch: channel.id
                    })
                    if (channel.updateOnTune)
                        updateMetadata()
                    res.status(200).send(`OK - Tuner ${t.id} was tuned to ${channel.name}${(tcb.manual) ? ", WARNING: THIS IS A MANUAL TUNER":""}`)
                } else {
                    res.status(500).send(`ERROR - Tuner ${t.id} failed to tune to ${channel.name} due to a url request error (Tune: ${tcb.ok} Post: ${pcb.ok})`)
                }
            } else {
                res.status(500).send(`ERROR - No tuner is available at this time. It could be disabled or actively recording`)
            }
        } else {
            const ft = availableTuners().filter(e => (!e.digital && channel.tuneUrl[e.id]) || e.digital)
            if (ft.length > 0) {
                const t = ft.slice(-1).pop()
                const tcb = (t.digital) ? await tuneDigitalChannel(channel.id, 0, t) : await webRequest(channel.tuneUrl[t.id])
                let pcb = { ok: true }
                if (t.tuner.post_tune_url)
                    pcb = await webRequest(t.tuner.post_tune_url)
                if (((t.digital && tcb) || (!t.digital && tcb.ok)) && pcb.ok) {
                    channelTimes.timetable[t.id].push({
                        time: moment().valueOf(),
                        ch: channel.id,
                    })
                    if (channel.updateOnTune)
                        updateMetadata()
                    res.status(200).send(`OK - Tuner ${t.id} was tuned to ${channel.name}`)
                } else {
                    res.status(500).send(`ERROR - Tuner ${t.id} failed to tune to ${channel.name} due to a url request error (Tune: ${tcb.ok} Post: ${pcb.ok})`)
                }
            } else {
                res.status(500).send(`ERROR - There are no available radios at this time. They could be disabled, actively recording, or missing a tuneing url (aka manual tuner)`)
            }
        }
    } else {
        res.status(404).send('Channel not found')
    }
});
app.get("/pend_bounce", (req, res) => {
    if (req.query.tuner) {
        const t = listTuners().filter(t => t.id === req.query.tuner)
        if (t.length > 0) {
            registerBounce((req.query.add_time) ? parseInt(req.query.add_time) : 0, (req.query.ch) ? req.query.ch : undefined, t[0]);
            res.status(200).send('OK')
        } else {
            res.status(404).send('Tuner not found')
        }
    } else if (req.query.ch) {
        registerBounce((req.query.add_time) ? parseInt(req.query.add_time) : 0, (req.query.ch) ? req.query.ch : undefined, undefined);
    } else {
        req.status(400).send('You must provide a tuner or channel')
    }
})
app.get("/trigger/:display", (req, res, next) => {
    if (req.params.display) {
        switch (req.params.display) {
            case 'select_bounce_event':
                bounceEventGUI(false, (req.query.ch) ? req.query.ch : undefined);
                res.status(200).send('OK')
                break;
            case 'select_bounce_song':
                bounceEventGUI(true, (req.query.ch) ? req.query.ch : undefined);
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
app.use("/dir/record", express.static(path.resolve(config.record_dir)))

app.listen((config.listenPort) ? config.listenPort : 9080, async () => {
    console.log("Server running");
    if (!cookies.authenticate) {
        console.error(`ALERT:FAULT - Authentication|Unable to start authentication because the cookie data is missing!`)
    } else {
        await saveMetadata();
        await processPendingBounces();
        cron.schedule("* * * * *", async () => {
            updateMetadata();
        });cron.schedule("*/5 * * * *", async () => {
            saveMetadata()
        });
        cron.schedule("*/5 * * * *", async () => {
            config = require('./config.json');
            cookies = require("./cookie.json");
        });
    }
});