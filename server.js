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
    timetable: [
        {
            "time": moment().valueOf(),
            "ch": '52'
        }
    ],
    pending: [],
};
let nowPlayingGUID = null;
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
        const currentChannel = channelTimes.timetable.slice(-1).pop()
        for (let channelNumber of Object.keys(config.channels)) {
            const channelInfo = config.channels[channelNumber]
            if (!channelInfo.updateOnTune || (channelInfo.updateOnTune && currentChannel.ch === channelNumber)) {
                try {
                    const chmeta = await new Promise(resolve => {
                        const timestamp = new moment().utc().subtract(8, "hours").valueOf()
                        const channelURL = `https://player.siriusxm.com/rest/v4/experience/modules/tune/now-playing-live?channelId=${(channelInfo.id) ? channelInfo.id : channelNumber}&adsEligible=true&hls_output_mode=none&fbSXMBroadcast=false&marker_mode=all_separate_cue_points&ccRequestType=AUDIO_VIDEO&result-template=radio&time=${timestamp}`
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
                    if (chmeta) {
                        if (metadata[channelNumber]) {
                            for (let i in chmeta) {
                                const index = metadata[channelNumber].map(e => e.syncStart).indexOf(chmeta[i].syncStart)
                                if (index !== -1) {
                                    const data = metadata[channelNumber][index]
                                    data.duration = chmeta[i].duration
                                    data.guid = chmeta[i].guid
                                    data.syncEnd = chmeta[i].syncEnd
                                    if (config.ignoredWords.map(word => {
                                        return (
                                            data.title.toLowerCase().includes(word.toLowerCase()) ||
                                            (data.artist && data.artist.toLowerCase().includes(word.toLowerCase())) ||
                                            (data.album && data.album.toLowerCase().includes(word.toLowerCase()))
                                        )
                                    }).filter(e => e === true).length > 0 && (!data.isModified && (!data.updateCount || (data.updateCount && data.updateCount <= 10)))) {
                                        data.title = chmeta[i].title
                                        data.artist = chmeta[i].artist
                                        data.album = chmeta[i].album
                                        data.isUpdated = true
                                        if (data.updateCount) {
                                            data.updateCount = data.updateCount + 1
                                        } else {
                                            data.updateCount = 1;
                                        }
                                    }
                                } else {
                                    metadata[channelNumber].push(chmeta[i])
                                }
                            }
                            metadata[channelNumber] = metadata[channelNumber].sort((x, y) => (x.syncStart < y.syncStart) ? -1 : (y.syncStart > x.syncStart) ? 1 : 0)
                        } else {
                            metadata[channelNumber] = chmeta.sort((x, y) => (x.syncStart < y.syncStart) ? -1 : (y.syncStart > x.syncStart) ? 1 : 0)
                        }
                    }
                    console.log(`Pulled Metadata for ${channelNumber}`)
                } catch (e) {
                    console.error(e);
                    console.error("FAULT");
                }
            }
        }
        nowPlayingNotification();
    } catch (e) {
        console.error(e);
        console.error("FAULT");
    }
}
async function saveMetadata() {
    await new Promise(resolve => {
        try {
            for (let i in metadata) {
                metadata[i] = metadata[i].filter(e => e.syncStart >= moment().subtract(1, 'month').valueOf())
            }
            channelTimes.timetable = channelTimes.timetable.filter(e => e['time'] >= moment().subtract(1, 'month').valueOf())
        } catch (e) {
            console.error(e);
        }
        resolve(null);
    })
    await new Promise(resolve => {
        fs.writeFile(path.join(config.record_dir, `metadata.json`), JSON.stringify(metadata), () => {
            resolve(null)
        })
    })
    await new Promise(resolve => {
        fs.writeFile(path.join(config.record_dir, `accesstimes.json`), JSON.stringify(channelTimes), () => {
            resolve(null)
        })
    })
    return true;
}
async function publishMetaIcecast(nowPlaying, currentChannel) {
    if (config.icecase_meta) {
        const nowPlayingText = (() => {
            if (nowPlaying.isEpisode) {
                return `${nowPlaying.title.replace("[\\\\/:*?\"<>|]", "_")}`
            } else if (nowPlaying.isSong) {
                return `${nowPlaying.artist.replace("[\\\\/:*?\"<>|]", "_")} - ${nowPlaying.title.replace("[\\\\/:*?\"<>|]", "_")}`
            } else {
                return `${nowPlaying.title.replace("[\\\\/:*?\"<>|]", "_")} - ${nowPlaying.artist.replace("[\\\\/:*?\"<>|]", "_")}`
            }
        })()

        return new Promise(resolve => {
            request.get({
                url: config.icecase_meta + encodeURIComponent(nowPlayingText + ' // ' + config.channels[currentChannel.ch].name),
                timeout: 5000
            }, async function (err, res, body) { resolve(!err) })
        })
    }
}
async function publishMetadataFile(nowPlaying, currentChannel) {
    if (config.nowPlaying) {
        let nowPlayingData = [`Title: ${nowPlaying.title}`];
        if (!nowPlaying.isEpisode) {
            nowPlayingData.push(`Artist: ${nowPlaying.artist}`)
            if (nowPlaying.isSong) {
                nowPlayingData.push(`Album: ${nowPlaying.album}`)
            } else if (config.channels[currentChannel.ch].name) {
                nowPlayingData.push(`Album: ${config.channels[currentChannel.ch].name}`)
            }
        } else if (config.channels[currentChannel.ch].name) {
            nowPlayingData.push(`Album: ${config.channels[currentChannel.ch].name}`)
        }
        return new Promise(resolve => {
            fs.writeFile(path.join(config.record_dir, config.nowPlaying), nowPlayingData.join('\n').toString(), () => {
                resolve(null)
            })
        })
    }
}

async function bounceEventGUI(type, digitalchannel) {
    try {
        let eventsMeta = [];
        if (digitalchannel) {
            let events = await metadata[digitalchannel].filter(f => parseInt(f.duration.toString()) > 90 && ((new Date - f.syncStart) < (3 * 60 * 60000)) && ((type && parseInt(f.duration.toString()) < 15 * 60) || (!type && parseInt(f.duration.toString()) > 15 * 60))).map(e => {
                return {
                    ...e,
                    ch: digitalchannel
                }
            })
            eventsMeta.push(...events)
        } else {
            const lastIndex = channelTimes.timetable.length - 1
            for (let c in channelTimes.timetable) {
                let events = await metadata[channelTimes.timetable[parseInt(c)].ch].filter(f => parseInt(f.duration.toString()) > 90 && (parseInt(c) === 0 || (f.syncStart >= (channelTimes.timetable[parseInt(c)].time - (5 * 60000)))) && (parseInt(c) === lastIndex || (parseInt(c) !== lastIndex && f.syncStart <= channelTimes.timetable[parseInt(c) + 1].time)) && ((type && parseInt(f.duration.toString()) < 15 * 60) || (!type && parseInt(f.duration.toString()) > 15 * 60))).map(e => {
                    return {
                        ...e,
                        ch: channelTimes.timetable[parseInt(c)].ch
                    }
                })
                eventsMeta.push(...events)
            }
            if (eventsMeta.length === 0)
                return false
        }
        eventsMeta = eventsMeta.reverse().slice(0, 250).reverse()
        const eventSearch = await new Promise(resolve => {
            const listmeta = eventsMeta.reverse().map(e => {
                const duplicate = (eventsMeta.filter(f => (e.filename && f.filename && e.filename === f.filename) || (f.title === e.title && ((f.artist && e.artist && f.artist === e.artist) || (!f.artist && !e.artist)))).length > 1)
                const name = (() => {
                    if (e.filename) {
                        return e.filename
                    } else if (e.isEpisode) {
                        return `${e.title.replace(/[^\w\s]/gi, '')}`
                    } else if (e.isSong) {
                        return `${e.artist.replace(/[^\w\s]/gi, '')} - ${e.title.replace(/[^\w\s]/gi, '')}`
                    } else {
                        return `${e.title.replace(/[^\w\s]/gi, '')} - ${e.artist.replace(/[^\w\s]/gi, '')}`
                    }
                })()
                let exsists = false
                try {
                    exsists = fs.existsSync(path.join(config.record_dir, `Extracted_${e.syncStart}.mp3`))
                } catch (err) { }
                return `"[📡${e.ch} 📅${moment.utc(e.syncStart).local().format("MMM D HH:mm")}] ${(e.isEpisode) ? '🔶' : ''}${(exsists) ? '💿' : '〰'} ${name} ${(duplicate) ? '🔂 ' : '' }(${msToTime(parseInt(e.duration.toString()) * 1000).split('.')[0]})"`
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
                    return `${eventItem.title.replace(/[^\w\s]/gi, '')}`
                } else if (eventItem.isSong) {
                    return `${eventItem.artist.replace(/[^\w\s]/gi, '')} - ${eventItem.title.replace(/[^\w\s]/gi, '')}`
                } else {
                    return `${eventItem.title.replace(/[^\w\s]/gi, '')} - ${eventItem.artist.replace(/[^\w\s]/gi, '')}`
                }
            })()
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
async function registerBounce(addTime, channelNumber) {
    const currentChannel = channelTimes.timetable.slice(-1).pop()
    channelTimes.pending.push({
        ch: (channelNumber) ? channelNumber : currentChannel.ch,
        time: moment().valueOf() + (addTime * 60000),
        done: false
    })
    await new Promise(resolve => {
        const list = `display notification "💿 This event will be bounced on completion" with title "📻 ${(config.channels[currentChannel.ch].name) ? config.channels[currentChannel.ch].name : "SiriusXM"}"`
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
async function processPendingBounces() {
    try {
        for (let i in channelTimes.pending) {
            let pendingEvent = channelTimes.pending[i]
            const events = metadata[pendingEvent.ch].filter(e => !e.isSong && e.syncStart < pendingEvent.time)
            let thisEvent = events[findClosest(events.map(f => moment.utc(f.syncStart).local()), pendingEvent.time + 60000)]
            console.log(pendingEvent.time)
            console.log(thisEvent)
            if (thisEvent.duration && parseInt(thisEvent.duration.toString()) > 0 && thisEvent.syncEnd <= moment().valueOf() + 60000) {
                thisEvent.filename = (() => {
                    if (thisEvent.filename) {
                        return thisEvent.filename
                    } else if (thisEvent.isEpisode) {
                        return `${thisEvent.title.replace(/[^\w\s]/gi, '')}`
                    } else if (thisEvent.isSong) {
                        return `${thisEvent.artist.replace(/[^\w\s]/gi, '')} - ${thisEvent.title.replace(/[^\w\s]/gi, '')}`
                    } else {
                        return `${thisEvent.title.replace(/[^\w\s]/gi, '')} - ${thisEvent.artist.replace(/[^\w\s]/gi, '')}`
                    }
                })()
                if (thisEvent.ch)
                    thisEvent.channelId = config.channels[thisEvent.ch].id
                await bounceEventFile([thisEvent])
                pendingEvent.done = true
            }
        }
        channelTimes.pending = channelTimes.pending.filter(e => e.done === false)
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
async function bounceEventFile(eventsToParse, options) {
    const analogRecFiles = fs.readdirSync(config.record_dir).filter(e => e.startsWith(config.record_prefix) && e.endsWith(".mp3")).map(e => {
        return {
            date: moment(e.replace(config.record_prefix, '').split('.')[0] + '', "YYYYMMDD-HHmmss"),
            file: e
        }
    });
    const analogRecTimes = analogRecFiles.map(e => e.date.valueOf());
    let digitalRecFiles = [];
    let digitalRecTimes = [];

    for (let index in eventsToParse) {
        if (parseInt(index) === 0)
            console.log(`PROGRESS:0`)
        const eventItem = eventsToParse[index]

        console.log(eventItem)
        if (parseInt(eventItem.duration.toString()) > 0) {
            const trueTime = moment.utc(eventItem.syncStart).local();
            if (eventItem.channelId) {
                digitalRecFiles = fs.readdirSync(config.record_dir).filter(e => e.startsWith(`${config.digital_record_prefix}_${eventItem.channelId}_`) && e.endsWith(".mp3")).map(e => {
                    return {
                        date: moment(parseInt(e.split('_').pop().split('.')[0])),
                        file: e
                    }
                });
                digitalRecTimes = digitalRecFiles.map(e => e.date.valueOf());
            } else {
                digitalRecFiles = [];
                digitalRecTimes = [];
            }
            const fileDestination = path.join(config.record_dir, `Extracted_${eventItem.syncStart}.mp3`)
            const eventFilename = `${eventItem.filename.trim()} (${moment(eventItem.syncStart).format("YYYY-MM-DD HHmm")})${config.record_format}`

            let generateAnalogFile = false;
            let analogStartFile = findClosest(analogRecTimes, trueTime.valueOf()) - 1
            if (analogStartFile < 0)
                analogStartFile = 0
            const analogEndFile = findClosest(analogRecTimes, eventItem.syncEnd)
            const analogFileItems = analogRecFiles.slice(analogStartFile, analogEndFile + 1)
            const analogFileList = analogFileItems.map(e => e.file).join('|')
            if ((trueTime.valueOf() + (parseInt(eventItem.delay.toString()) * 1000)) > digitalFileItems[0].date.valueOf()) {
                const analogStartTime = msToTime(Math.abs(trueTime.valueOf() - analogFileItems[0].date.valueOf()))
                const analogEndTime = msToTime((parseInt(eventItem.duration.toString()) * 1000) + 10000)
                console.log(`${analogStartTime} | ${analogEndTime}`)
                generateAnalogFile = await new Promise(function (resolve) {
                    console.log(`Ripping Analog File "${eventItem.filename.trim()}"...`)
                    const ffmpeg = ['/usr/local/bin/ffmpeg', '-hide_banner', '-y', '-i', `concat:"${analogFileList}"`, '-ss', analogStartTime, '-t', analogEndTime, `Extracted_${eventItem.syncStart}.mp3`]
                    exec(ffmpeg.join(' '), {
                        cwd: config.record_dir,
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
                            resolve(true)
                        }
                    });
                })
            } else {
                console.error("Analog Recordings are not available for this time frame! Canceled")
            }

            let generateDigitalFile = false;
            let digitalStartFile = findClosest(digitalRecTimes, trueTime.valueOf() + (parseInt(eventItem.delay.toString()) * 1000)) - 1
            if (digitalStartFile < 0)
                digitalStartFile = 0
            const digitalEndFile = findClosest(digitalRecTimes, eventItem.syncEnd + (parseInt(eventItem.delay.toString()) * 1000))
            const digitalFileItems = digitalRecFiles.slice(digitalStartFile, digitalEndFile)
            const digitalFileList = digitalFileItems.map(e => e.file).join('|')
            if ((trueTime.valueOf() + (parseInt(eventItem.delay.toString()) * 1000)) > digitalFileItems[0].date.valueOf()) {
                const digitalStartTime = msToTime(Math.abs((trueTime.valueOf() + (parseInt(eventItem.delay.toString()) * 1000)) - digitalFileItems[0].date.valueOf()))
                const digitalEndTime = msToTime((parseInt(eventItem.duration.toString()) * 1000) + 10000)
                console.log(`${digitalStartTime} | ${digitalEndTime}`)
                generateDigitalFile = await new Promise(function (resolve) {
                    console.log(`Ripping Digital File "${eventItem.filename.trim()}"...`)
                    const ffmpeg = ['/usr/local/bin/ffmpeg', '-hide_banner', '-y', '-i', `concat:"${digitalFileList}"`, '-ss', digitalStartTime, '-t', digitalEndTime, `Digital_Extracted_${eventItem.syncStart}.mp3`]
                    exec(ffmpeg.join(' '), {
                        cwd: config.record_dir,
                        encoding: 'utf8'
                    }, (err, stdout, stderr) => {
                        if (err) {
                            console.error(`Digital Extraction failed: FFMPEG reported a error!`)
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
            } else {
                console.error("Digital Recordings are not available for this time frame! Canceled")
            }

            if (generateAnalogFile && fs.existsSync(fileDestination)) {
                try {
                    if (config.backup_dir) {
                        await new Promise(resolve => {
                            exec(`cp "${fileDestination.toString()}" "${path.join(config.backup_dir, eventFilename).toString()}"`, (err, result) => {
                                if (err)
                                    console.error(err)
                                resolve((err))
                            })
                        })
                    }
                    if (config.upload_dir) {
                        await new Promise(resolve => {
                            exec(`cp "${fileDestination.toString()}" "${path.join(config.upload_dir, 'HOLD-' + eventFilename).toString()}"`, (err, result) => {
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
                    console.log(`Ripping complete for ${eventItem.filename.trim()}!`)
                    await new Promise(resolve => {
                        const list = `display notification "✅ ${eventItem.filename.trim().split('.')[0]} was successful" with title "💿 Bouncer" sound name "Glass"`
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
            } else {
                console.error(`Extraction failed: File was not generated correctly`)
            }
            console.log(`PROGRESS:${(((parseInt(index) + 1) / eventsToParse.length) * 100).toFixed()}`)
            if (parseInt(index) + 1 === eventsToParse.length)
                console.log('PROGRESS:100')
        }
    }
}

async function nowPlayingNotification(forceUpdate) {
    const currentChannel = channelTimes.timetable.slice(-1).pop()
    const nowPlaying = metadata[currentChannel.ch].slice(-1).pop()
    /*console.log(nowPlaying)
    console.log(nowPlayingGUID)*/
    if (nowPlayingGUID !== nowPlaying.guid || nowPlaying.isUpdated || forceUpdate) {
        nowPlayingGUID = nowPlaying.guid
        nowPlaying.isUpdated = false
        const eventText = (() => {
            if (nowPlaying.filename) {
                return nowPlaying.filename
            } else if (nowPlaying.isEpisode) {
                return `${nowPlaying.title.replace(/[^\w\s]/gi, '')}`
            } else if (nowPlaying.isSong) {
                return `${nowPlaying.artist.replace(/[^\w\s]/gi, '')} - ${nowPlaying.title.replace(/[^\w\s]/gi, '')}`
            } else {
                return `${nowPlaying.title.replace(/[^\w\s]/gi, '')} - ${nowPlaying.artist.replace(/[^\w\s]/gi, '')}`
            }
        })()
        console.log(`Now Playing: Channel ${currentChannel.ch} - ${eventText}`)
        await new Promise(resolve => {
            const list = `display notification "${(nowPlaying.isUpdated) ? '📝 ' : '🆕 '}${eventText} @ ${moment(nowPlaying.syncStart).format("HH:mm:ss")}" with title "📻 ${(config.channels[currentChannel.ch].name) ? config.channels[currentChannel.ch].name : "SiriusXM"}"`
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
        publishMetaIcecast(nowPlaying, currentChannel);
        publishMetadataFile(nowPlaying, currentChannel);
        searchForEvents(nowPlaying, currentChannel);
    }
}
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
                        return `${e.title.replace(/[^\w\s]/gi, '')}`
                    } else if (e.isSong) {
                        return `${e.artist.replace(/[^\w\s]/gi, '')} - ${e.title.replace(/[^\w\s]/gi, '')}`
                    } else {
                        return `${e.title.replace(/[^\w\s]/gi, '')} - ${e.artist.replace(/[^\w\s]/gi, '')}`
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
                    return `${eventItem.title.replace(/[^\w\s]/gi, '')}`
                } else if (eventItem.isSong) {
                    return `${eventItem.artist.replace(/[^\w\s]/gi, '')} - ${eventItem.title.replace(/[^\w\s]/gi, '')}`
                } else {
                    return `${eventItem.title.replace(/[^\w\s]/gi, '')} - ${eventItem.artist.replace(/[^\w\s]/gi, '')}`
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

app.get("/tune/:channelNum", (req, res, next) => {
    if (req.params.channelNum) {
        console.log(`Tune event to channel ${req.params.channelNum}`)
        channelTimes.timetable.push({
            time: moment().valueOf(),
            ch: req.params.channelNum
        })
        if (config.channels[req.params.channelNum].updateOnTune) {
            updateMetadata();
        }
        res.status(200).send('OK')
    } else {
        res.status(400).send('MissingChannel')
    }
});
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
            case 'pend_bounce':
                registerBounce((req.query.add_time) ? parseInt(req.query.add_time) : 0, (req.query.ch) ? req.query.ch : undefined );
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
