const config = require('./config.json')
const moment = require('moment');
const fs = require('fs');
const path = require("path");
const osascript = require('node-osascript');
const { spawn, exec } = require("child_process");
const cron = require('node-cron');

let cookies = require("./cookie.json");
let metadata = {};

(async () => {
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

    async function updateMetadata() {
        try {
            if (fs.existsSync(path.join(config.record_dir, `metadata.json`)))
                metadata = require(path.join(config.record_dir, `metadata.json`))
            function parseJson(_json) {
                try {
                    // Check if messages and successful response
                    if (_json['ModuleListResponse']['messages'].length > 0 && _json['ModuleListResponse']['messages'][0]['message'].toLowerCase() === 'successful') {
                        const json = _json['ModuleListResponse']['moduleList']['modules'][0]['moduleResponse']['liveChannelData']['markerLists'].filter(e => e['layer'] === 'cut')[0]['markers']
                        // For each track that is longer then 65 Seconds
                        let items = json.filter(e => (e.duration >= 65 || !e.duration)).map(e => {
                            // Get localized timecode
                            const time = moment(e['time'])
                            // Format to Lizumi Meta Format v2
                            return {
                                guid: e.assetGUID,
                                syncStart: time.valueOf(),
                                syncEnd: time.add(e.duration, "seconds").valueOf(),
                                duration: e.duration.toFixed(0),

                                title: e.cut.title,
                                artist: e.cut.artists.map(f => f.name).join('/'),
                                album: (e.cut.album) ? e.cut.album.title : undefined,
                                isSong: (e.cut.cutContentType === "Song"),
                                isEpisode: false
                            }
                        })
                        // Append Missing Episodes that are not registering as cuts
                        const episodes = _json['ModuleListResponse']['moduleList']['modules'][0]['moduleResponse']['liveChannelData']['markerLists'].filter(e => e['layer'] === 'episode')[0]['markers'].filter(e => !e['episode']['show']['isPlaceholderShow'] && !(e.time - items.filter(f => !f.isSong)[findClosest(items.filter(f => !f.isSong).map(f => f.syncStart), e.time - 60000)].syncStart < 900000))
                        if (episodes.length > 0) {
                            items.push(...episodes.map(e => {
                                const time = moment(e['time'])
                                return {
                                    guid: e.assetGUID,
                                    syncStart: time.valueOf(),
                                    syncEnd: time.add(e.duration, "seconds").valueOf(),
                                    duration: e.duration.toFixed(0),

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
            await Promise.all(['51', '52'].map(async channelNumber => {
                try {
                    const chmeta = await new Promise(resolve => {
                        const timestamp = new moment().utc().subtract(8, "hours").valueOf()
                        const channelURL = `https://player.siriusxm.com/rest/v4/experience/modules/tune/now-playing-live?channelId=${channelNumber}&adsEligible=true&hls_output_mode=none&fbSXMBroadcast=false&marker_mode=all_separate_cue_points&ccRequestType=AUDIO_VIDEO&result-template=radio&time=${timestamp}`
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
                } catch (e) {
                    console.error(e);
                    console.error("FAULT");
                }
            }))
            await new Promise(resolve => {
                fs.writeFile(path.join(config.record_dir, `metadata.json`), JSON.stringify(metadata), () => {
                    resolve(null)
                })
            })
            //console.log(metadata['52'].slice(-4))

            if (config.icecase_meta) {
                const nowPlaying = metadata['52'].pop()
                const nowPlayingText = (() => {
                    if (nowPlaying.isEpisode) {
                        return `${nowPlaying.title.replace("[\\\\/:*?\"<>|]", "_")}`
                    } else if (nowPlaying.isSong) {
                        return `${nowPlaying.artist.replace("[\\\\/:*?\"<>|]", "_")} - ${nowPlaying.title.replace("[\\\\/:*?\"<>|]", "_")}`
                    } else {
                        return `${nowPlaying.title.replace("[\\\\/:*?\"<>|]", "_")} - ${nowPlaying.artist.replace("[\\\\/:*?\"<>|]", "_")}`
                    }
                })()

                request.get({
                    url: config.icecase_meta + encodeURIComponent('CH52: ' + nowPlayingText),
                    timeout: 5000
                }, async function (err, res, body) {

                })
            }
        } catch (e) {
            console.error(e);
            console.error("FAULT");
        }
    }
    async function editMetadataGUI() {
        try {
            const channelNumber = await new Promise(resolve => {
                const listmeta = Object.keys(metadata).map(e => '"' + e + '"')
                const list = `choose from list {${listmeta.join(',')}} with title "Search for Recording" with prompt "Select Channel for CUE list:" default items ${listmeta.pop()} empty selection allowed false`
                const childProcess = osascript.execute(list, function (err, result, raw) {
                    if (err) return console.error(err)
                    resolve(result[0])
                    clearTimeout(childKiller);
                });
                const childKiller = setTimeout(function () {
                    childProcess.stdin.pause();
                    childProcess.kill();
                    resolve(null);
                }, 90000)
            })
            if (channelNumber) {
                console.log(`Selected Channel ${channelNumber}`)
                const eventsMeta = metadata[channelNumber].filter(e => e.duration >= 600 && !e.isSong).reverse()
                const eventSearch = await new Promise(resolve => {
                    const listmeta = eventsMeta.map(e => {
                        const name = (() => {
                            if (e.isEpisode) {
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
                        return `"[${moment.utc(e.syncStart).local().format("MMM D HH:mm")}${(e.isEpisode) ? '🔶' : '🟢'}] ${(exsists) ? '✅' : '⏸'} ${name} (${msToTime(e.duration * 1000).split('.')[0]})"`
                    })
                    const list = `choose from list {${listmeta.join(',')}} with title "Modify Metadata" with prompt "Select Event to modify:" default items ${listmeta[0]} multiple selections allowed true empty selection allowed false`
                    const childProcess = osascript.execute(list, function (err, result, raw) {
                        if (err) return console.error(err)
                        console.log(result)
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
                        resolve(null);
                    }, 90000)
                })
                for (let eventItem of eventsToParse) {
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

            }
        } catch (e) {
            console.error(`ALERT:FAULT - Bounce Event|${e.message}`)
            console.error(e);
        }
    }

    async function bounceEventGUI() {
        try {
            const channelNumber = await new Promise(resolve => {
                const listmeta = Object.keys(metadata).map(e => '"' + e + '"')
                const list = `choose from list {${listmeta.join(',')}} with title "Modify Metadata" with prompt "Select Channel for CUE list:" default items ${listmeta.pop()} empty selection allowed false`
                const childProcess = osascript.execute(list, function (err, result, raw) {
                    if (err) return console.error(err)
                    resolve(result[0])
                    clearTimeout(childKiller);
                });
                const childKiller = setTimeout(function () {
                    childProcess.stdin.pause();
                    childProcess.kill();
                    resolve(null);
                }, 90000)
            })
            if (channelNumber) {
                console.log(`Selected Channel ${channelNumber}`)
                const eventsMeta = metadata[channelNumber].filter(e => e.duration >= 600 && !e.isSong).reverse()


                const eventSearch = await new Promise(resolve => {
                    const listmeta = eventsMeta.map(e => {
                        const name = (() => {
                            if (e.isEpisode) {
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
                        return `"[${moment.utc(e.syncStart).local().format("MMM D HH:mm")}${(e.isEpisode) ? '🔶' : '🟢'}] ${(exsists) ? '✅' : '⏸'} ${name} (${msToTime(e.duration * 1000).split('.')[0]})"`
                    })
                    const list = `choose from list {${listmeta.join(',')}} with title "Search for Recording" with prompt "Select Event to save:" default items ${listmeta[0]} multiple selections allowed true empty selection allowed false`
                    const childProcess = osascript.execute(list, function (err, result, raw) {
                        if (err) return console.error(err)
                        console.log(result)
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
                        resolve(null);
                    }, 90000)
                })

                const eventsToParse = eventSearch.map(e => eventsMeta[e]);
                for (let eventItem of eventsToParse) {
                    const _eventFilename = (() => {
                        if (eventItem.isEpisode) {
                            return `${eventItem.title.replace(/[^\w\s]/gi, '')}`
                        } else if (eventItem.isSong) {
                            return `${eventItem.artist.replace(/[^\w\s]/gi, '')} - ${eventItem.title.replace(/[^\w\s]/gi, '')}`
                        } else {
                            return `${eventItem.title.replace(/[^\w\s]/gi, '')} - ${eventItem.artist.replace(/[^\w\s]/gi, '')}`
                        }
                    })()
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
            }
        } catch (e) {
            console.error(`ALERT:FAULT - Edit Metadata|${e.message}`)
            console.error(e);
        }
    }
    async function bounceEventFile(eventsToParse, options) {
        const fileTimes = fs.readdirSync(config.record_dir).filter(e => e.startsWith(config.record_prefix) && e.endsWith(".mp3")).map(e => {
            return {
                date: moment(e.replace(config.record_prefix, '').split('.')[0] + '', "YYYYMMDD-HHmmss"),
                file: e
            }
        });
        for (let index in eventsToParse) {
            if (parseInt(index) === 0)
                console.log(`PROGRESS:0`)
            const eventItem = eventsToParse[index]
            if (eventItem.duration > 0) {
                const trueTime = moment.utc(eventItem.syncStart).local();
                let startFile = findClosest(fileTimes.map(e => e.date.valueOf()), trueTime.valueOf()) - 1
                if (startFile < 0)
                    startFile = 0
                const endFile = findClosest(fileTimes.map(e => e.date.valueOf()), eventItem.syncEnd)
                const fileItems = fileTimes.slice(startFile, endFile + 1)
                const fileList = fileItems.map(e => e.file).join('|')
                const fileStart = msToTime(Math.abs(trueTime.valueOf() - fileItems[0].date.valueOf()))
                const fileEnd = msToTime((eventItem.duration * 1000) + 10000)
                const fileDestination = path.join(config.record_dir, `Extracted_${eventItem.syncStart}.mp3`)
                const eventFilename = `${eventItem.filename.trim()} (${moment(eventItem.syncStart).format("YYYY-MM-DD HHmm")})${config.record_format}`

                //console.log(`Found Requested Event! "${eventFilename}"...`)
                console.log(`${fileStart} | ${fileEnd}`)
                const generateFile = await new Promise(function (resolve) {
                    console.log(`Ripping "${eventItem.filename.trim()}"...`)
                    const ffmpeg = ['/usr/local/bin/ffmpeg', '-hide_banner', '-y', '-i', `concat:"${fileList}"`, '-ss', fileStart, '-t', fileEnd, `Extracted_${eventItem.syncStart}.mp3`]
                    exec(ffmpeg.join(' '), {
                        cwd: config.record_dir,
                        encoding: 'utf8'
                    }, (err, stdout, stderr) => {
                        if (err) {
                            console.error(`Extraction failed: FFMPEG reported a error!`)
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

                if (generateFile && fs.existsSync(fileDestination)) {
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

    if (!cookies.authenticate) {
        console.error(`ALERT:FAULT - Authentication|Unable to start authentication because the cookie data is missing!`)
    } else {

    }
})()
