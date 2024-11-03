(async () => {
    let config = require('./config.json')
    // {
    //   "record_dir": "/Users/kaz/Music/SiriusXM/",
    //   "upload_dir": "/Users/kaz/Workspace/kanmi/upload/Recordings/",
    //   "extract_format": "mp3",
    //   "notifications": {
    //     "alert": "https://discord.com/api/webhooks/xxx/xxxx",
    //     "info": "https://discord.com/api/webhooks/xxx/xxxx",
    //     "error": "https://discord.com/api/webhooks/xxx/xxxx"
    //   },
    //   "schedule": {
    //     "Evening": {
    //       "tune_cron": "00 18 * * *",
    //       "ch": "53",
    //       "switch_source": true
    //     },
    //     "Day": {
    //       "tune_cron": "00 08 * * *",
    //       "ch": "52",
    //       "switch_source": true
    //     },
    //     "MidDay": {
    //       "tune_cron": "00 15 * * *",
    //       "ch": "736",
    //       "switch_source": true
    //     },
    //     "Friday": {
    //       "tune_cron": "00 16 * * 5",
    //       "ch": "53",
    //       "switch_source": true
    //     }
    //   },
    //   "autosearch_terms": [
    //     {
    //       "search": "Wavelength",
    //       "channel": 53,
    //       "switch_source": false,
    //       "allow_live": true,
    //       "tuneToChannel": true,
    //       "notify": true,
    //       "destination": "/Users/kaz/Workspace/kanmi/upload/RecEvents"
    //     },
    //     {
    //       "search": "PhoenixRadio",
    //       "channel": 53,
    //       "dayOfWeek": "Mon",
    //       "switch_source": false,
    //       "allow_live": true,
    //       "tuneToChannel": true
    //     }
    //   ],
    //   "satellite_radios": {
    //     "sat": {
    //       "priority": 11,
    //       "name": "Satellite",
    //       "lock_on_events": true,
    //       "record_prefix": "SXM_SAT1_",
    //       "record_date_format": "YYYYMMDD-HHmmss",
    //       "airfoil_source": {
    //         "name": "SiriusXM Satellite Radio",
    //         "conditions": ["tune","record"]
    //       }
    //     }
    //   },
    //   "live_extract": false,
    //   "adb_command": "/Users/kaz/android-sdk-macosx/platform-tools/adb",
    //   "remote_connections": [
    //     "192.168.100.00:5671",
    //     "192.168.100.00:5673"
    //   ],
    //   "digital_radios": {
    //     "stream-1": {
    //       "priority": 1,
    //       "serial": "192.168.100.00:5671",
    //       "name": "Digital 1",
    //       "record_only": true,
    //       "stop_after_record": true,
    //       "airfoil_source": false
    //     },
    //     "stream-2": {
    //       "priority": 2,
    //       "serial": "192.168.100.00:5673",
    //       "name": "Digital 2",
    //       "stop_after_record": true,
    //       "airfoil_source": {
    //         "name": "SiriusXM Digital Radio",
    //         "conditions": ["tune","record"],
    //         "return_source": "SiriusXM Satellite Radio"
    //       }
    //     }
    //   },
    //   "audio_inputs": {
    //     "minidisc": {
    //       "name": "MiniDisc Recorder",
    //       "airfoil_source": {
    //         "name": "MiniDisc Deck"
    //       },
    //       "always_active": true,
    //       "actions": {
    //         "power" : "http://192.168.100.00:3001/button-minidisc-controller-1?event=single-press",
    //         "play" : "http://192.168.100.00:3001/button-minidisc-controller-1?event=double-press",
    //         "stop" : "http://192.168.100.00:3001/button-minidisc-controller-1?event=long-press",
    //         "pause" : "http://192.168.100.00:3001/button-minidisc-controller-2?event=single-press",
    //         "next" : "http://192.168.100.00:3001/button-minidisc-controller-2?event=double-press",
    //         "prev" : "http://192.168.100.00:3001/button-minidisc-controller-2?event=long-press",
    //         "repeat" : "http://192.168.100.00:3001/button-minidisc-controller-3?event=single-press",
    //         "shuffle" : "http://192.168.100.00:3001/button-minidisc-controller-3?event=double-press",
    //         "mscan" : "http://192.168.100.00:3001/button-minidisc-controller-3?event=long-press",
    //         "record" : "http://192.168.100.00:3001/button-minidisc-controller-4?event=single-press",
    //         "scroll" : "http://192.168.100.00:3001/button-minidisc-controller-4?event=double-press"
    //       }
    //     }
    //   },
    //   "rooms": {
    //     "Bedroom": ["Bedroom HomePod", "[Display] Bedroom", "Bedroom TV", "Workstation PC"],
    //     "Studio": ["[Display] Studio", "MacBook Pro"],
    //     "Bathroom": ["Bathroom Speaker"]
    //   },
    //   "channels": {
    //     "52": {
    //       "id": "thebeat",
    //       "tuneUrl": {
    //         "sat": "http://192.168.100.00:3001/button-streamdeck1?event=double-press"
    //       }
    //     },
    //     "53": {
    //       "id": "9472",
    //       "tuneUrl": {
    //         "sat": "http://192.168.100.00:3001/button-streamdeck1?event=single-press"
    //       }
    //     },
    //     "736": {
    //       "id": "9527"
    //     },
    //     "55": {
    //       "id": "chill",
    //       "tuneUrl": {
    //         "sat": "http://192.168.100.00:3001/button-streamdeck1?event=long-press"
    //       }
    //     },
    //     "10": {
    //       "id": "8363",
    //       "updateOnTune": true,
    //       "tuneUrl": {
    //         "sat": "http://192.168.100.00:3001/button-streamdeck2?event=single-press"
    //       }
    //     },
    //     "11": {
    //       "id": "9556",
    //       "updateOnTune": true,
    //       "tuneUrl": {
    //         "sat": "http://192.168.100.00:3001/button-streamdeck2?event=double-press"
    //       }
    //     },
    //     "99": {
    //       "id": "rawdog",
    //       "updateOnTune": true,
    //       "tuneUrl": {
    //         "sat": "http://192.168.100.00:3001/button-streamdeck2?event=long-press"
    //       }
    //     },
    //     "704": {
    //       "updateOnTune": true,
    //       "tuneUrl": {
    //         "sat": "http://192.168.100.00:3001/button-streamdeck5?event=single-press"
    //       }
    //     },
    //     "46": {"updateOnTune": true},
    //     "2": {"updateOnTune": true},
    //     "341": {},
    //     "735": {
    //        "id": "9526"
    //     },
    //     "5": {"updateOnTune": true}
    //   },
    //   "ignoredWords": [],
    //   "refreshMetadataInterval": 60000
    // }
    let auth = require("./auth.json");
    // {
    //   "username": "",
    //   "password": ""
    // }

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
    const FormData = require('form-data');
    const sleep = (waitTimeInMs) => new Promise(resolve => setTimeout(resolve, waitTimeInMs));
    const { printLine } = require('./log')("LizumiSXM");

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
    let watchdog_tuners = {};
    let adblog_tuners = new Map();
    let device_logs = {};
    let audio_servers = new Map();
    let nowPlayingGUID = {};
    let digitalAvailable = false
    let satelliteAvailable = false
    let jobQueue = {};
    let activeQueue = {};
    let eventListCache = [];
    let sentNotificatons = [];
    let tunedEvents = [];
    let completed = [];
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
        if (!l.fast_trigger && !((m.duration && m.duration > 15 * 60) || (!m.duration && (Date.now() - m.syncStart)) > 15 * 60000))
            return false
        if (l.fast_trigger && !((m.duration && m.duration > 60) || (!m.duration && (Date.now() - m.syncStart)) > 60000))
            return false
        if (l.channel && l.channel.toString() !== getChannelbyId(m.channelId).number.toString())
            return false
        if (l.duration && (m.duration < l.duration || (Date.now() - moment.utc(m.syncStart).local().valueOf() / 1000) < l.duration))
            return false
        if (l.dayOfWeek && moment.utc(m.syncStart).local().add(20, 'minutes').format('ddd').toLowerCase() !== l.dayOfWeek.toLowerCase())
            return false
        if (l.beforeHour && moment.utc(m.syncStart).local().hours() > l.beforeHour)
            return false
        if (l.afterHour && moment.utc(m.syncStart).local().hours() < l.afterHour)
            return false
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

    // SiriusXM OAuth 2.0 Flow
    // Honestly this is pretty lit, no more cookies just login like normal! Thanks XM!
    const defaultHeaders = {
        'Accept': 'application/json; charset=utf-8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Baggage': 'sentry-environment=prod,sentry-release=release-sxm-player-7.0',
        'Content-Type': 'application/json; charset=UTF-8',
        'Dnt': '1',
        'Origin': 'https://www.siriusxm.com',
        'Referer': 'https://www.siriusxm.com/',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Microsoft Edge";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"macOS"',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-site',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
        'X-Sxm-Clock': '[0,0]',
        'X-Sxm-Platform': 'browser',
        'X-Sxm-Tenant': 'sxm',
    };
    let deviceSession = null;
    let accountSession = null;

    // Prepare Device
    async function generateDevice() {
        deviceSession = await new Promise(resolve => {
            const deviceGen = `https://api.edge-gateway.siriusxm.com/device/v1/devices`
            request.post({
                url: deviceGen,
                headers: {
                    ...defaultHeaders
                },
                json: {
                    "devicePlatform": "web-desktop",
                    "deviceAttributes": {
                        "browser": {
                            "browserVersion":"120.0.0.0",
                            "browser":"Edge",
                            "userAgent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
                            "sdk":"web",
                            "app":"web",
                            "sdkVersion":"120.0.0.0",
                            "appVersion":"120.0.0.0"
                        }
                    }
                }
            }, async function (err, res, body) {
                if (err) {
                    printLine("XMAPIFetch", `Getting Device Data: ${err.message}`, 'error');
                    resolve(false);
                } else {
                    resolve(body);
                }
            })
        })
        return deviceSession.grant
    }
    // Prepare Anonymous Session
    async function generateAnonymousSession() {
        accountSession = await new Promise(resolve => {
            const deviceGen = `https://api.edge-gateway.siriusxm.com/session/v1/sessions/anonymous`
            request.post({
                url: deviceGen,
                headers: {
                    ...defaultHeaders,
                    "Authorization": `Bearer ${deviceSession.grant}`
                },
                json: true
            }, async function (err, res, body) {
                if (err) {
                    printLine("XMAPIFetch", `Getting Anonymous Session Data: ${err.message}`, 'error');
                    resolve(false);
                } else {
                    resolve(body);
                }
            })
        })
        return accountSession
    }
    // Get Account Auth Types
    async function queryAccount() {
        const accountQuery = await new Promise(resolve => {
            const deviceGen = `https://api.edge-gateway.siriusxm.com/identity/v1/identities/status?handle=${auth.username}`
            request.get({
                url: deviceGen,
                headers: {
                    ...defaultHeaders,
                    "Authorization": `Bearer ${accountSession.accessToken}`
                },
                json: true
            }, async function (err, res, body) {
                if (err) {
                    printLine("XMAPIFetch", `Getting Account Data: ${err.message}`, 'error');
                    resolve(false);
                } else {
                    resolve(body);
                }
            })
        })
        return accountQuery;
    }
    // Login with Password
    async function passwordLogin() {
        accountSession = await new Promise(resolve => {
            const deviceGen = `https://api.edge-gateway.siriusxm.com/identity/v1/identities/authenticate/password`
            request.post({
                url: deviceGen,
                headers: {
                    ...defaultHeaders,
                    "Authorization": `Bearer ${accountSession.accessToken}`
                },
                json: {
                    handle: auth.username,
                    password: auth.password
                }
            }, async function (err, res, body) {
                if (err) {
                    printLine("XMAPIFetch", `Getting Login Response: ${err.message}`, 'error');
                    resolve(false);
                } else {
                    resolve(body);
                }
            })
        })
        return accountSession
    }
    // Login with Password
    async function finalizeLogin() {
        accountSession = await new Promise(resolve => {
            const deviceGen = `https://api.edge-gateway.siriusxm.com/session/v1/sessions/authenticated`
            request.post({
                url: deviceGen,
                headers: {
                    ...defaultHeaders,
                    "Authorization": `Bearer ${accountSession.grant}`
                },
                json: true
            }, async function (err, res, body) {
                if (err) {
                    printLine("XMAPIFetch", `Getting Login Response: ${err.message}`, 'error');
                    resolve(false);
                } else {
                    resolve(body);
                }
            })
        })
        return accountSession
    }
    // Login Flow to Full Bearer
    async function loginToAccount() {
        const _device = await generateDevice();
        if (!_device) {
            return false;
        }
        const _anon = await generateAnonymousSession();
        if (!_anon) {
            return false;
        }
        const _account = await queryAccount();
        if (!_account.hasPassword) {
            return false;
        }
        const _password = await passwordLogin();
        if (!_password) {
            return false;
        }
        return await finalizeLogin();
    }
    async function checkLogin() {
        if (moment(accountSession.accessTokenExpiresAt).valueOf() - Date.now() <= 300000) {
            const _anon = await generateAnonymousSession();
            if (!_anon) {
                return false;
            }
            const _account = await queryAccount();
            if (!_account.hasPassword) {
                return false;
            }
            const _password = await passwordLogin();
            if (!_password) {
                return false;
            }
            return await finalizeLogin();
        }
    }

    // Metadata Retrieval and Parsing

    // Query Search Results
    const allChannelsEntity = ''
    async function searchResults(entity) {
        // https://api.edge-gateway.siriusxm.com/relationship/v1/container/all-channels?useCuratedContext=false&entityType=curated-grouping&entityId=403ab6a5-d3c9-4c2a-a722-a94a6a5fd056&offset=0&size=100&setStyle=small_list
        const c = await new Promise(resolve => {
            const searchURL = `https://api.edge-gateway.siriusxm.com/relationship/v1/container/all-channels?useCuratedContext=false&entityType=curated-grouping&entityId=${entity}&offset=0&size=1000&setStyle=small_list`
            request.get({
                url: searchURL,
                headers: {
                    ...defaultHeaders,
                    "Authorization": `Bearer ${accountSession.accessToken}`
                },
                json: true
            }, async function (err, res, body) {
                if (err) {
                    printLine("XMAPIFetch", `Getting Login Response: ${err.message}`, 'error');
                    resolve(false);
                } else {
                    resolve(body);
                }
            })
        })
        console.log(c)
        if (c && c.container && c.container.sets && c.container.sets.length === 1)
            return c.container.sets[0].items.filter(e => e.decorations.unentitled === false);
        return false;
    }
    // Get All Metadata For Channels
    async function initializeChannels() {
        try {
            const allChannels = await searchResults(allChannelsEntity);
            function parseJson() {
                try {
                    // Check if messages and successful response
                    if (allChannels.length > 0) {
                        let chItems = {}
                        allChannels.map(e => {
                            let image = undefined;
                            if (e.entity.images.logo) {
                                const k = Object.keys(e.entity.images.logo)[0];
                                image = e.entity.images.logo[k].default.url;
                            } else if (e.entity.images.tile) {
                                const k = Object.keys(e.entity.images.tile).pop();
                                image = e.entity.images.tile[k].default.url;
                            }
                            const data = {
                                number: e.decorations.channelNumber.toString(),
                                channelGuid: e.entity.id,
                                name: e.entity.texts.title.default,
                                description: e.entity.texts.description.default,
                                color: e.decorations.hexcode.dark,
                                image,
                                lookaround: e.decorations.lookaroundChannelId,
                            }
                            chItems[data.number] = data
                        })
                        return chItems
                    } else {
                        printLine("XMAPIFetch", ` Did not get any Entitled channels`, 'critical');
                        return false;
                    }
                } catch (e) {
                    printLine("XMAPIFetch", `Failed to parse initialization data: ${e.message}`, 'error');
                    return false;
                }
            }
            if (allChannels) {
                channelsAvailable = parseJson();
                printLine("XMAPIFetch", `${Object.keys(channelsAvailable).length} Channels are Available`, 'debug');
                return true
            } else {
                printLine("XMAPIFetch", `Failed to initialise the application base metadata from SiriusXM`, 'critical');
                return false
            }
        } catch (e) {
            printLine("XMAPIFetch", `Failed to pull metadata: ${e.message}`, 'critical');
        }
    }
    // Update Metadata for Channels
    // All Channels will be updated every minute unless "updateOnTune: true" is set (2x slower than the real web app lol)
    // In that case the metadata is only pulled if the channel is active on a tunner
    async function updateMetadata() {
        try {
            function parseJson(_json) {
                try {
                    // Check if messages and successful response
                    if (_json.episodes && _json.items) {
                        const delay = 0;
                        // For each track that is longer then 65 Seconds
                        let items = _json.items.filter(e => (parseInt(e.duration.toString()) >= (65 * 1000) || !e.duration)).map(e => {
                            // Get localized timecode
                            const time = moment(e['timestamp'])
                            // Format to Lizumi Meta Format v2
                            return {
                                guid: e.id,
                                syncStart: time.valueOf(),
                                syncEnd: time.add((parseInt(e.duration.toString()) / 1000), "seconds").valueOf(),
                                duration: (parseInt(e.duration.toString()) / 1000),
                                delay,

                                title: e.name,
                                artist: e.artistName,
                                album: (e.albumName) ? e.albumName : undefined,
                                isSong: ((parseInt(e.duration.toString()) / 1000) <= 900),
                                isEpisode: false
                            }
                        })
                        // Append Missing Episodes that are not registering as cuts
                        const episodes = _json.episodes.filter(e => !(items.filter(f => !f.isSong)[findClosest(items.filter(f => !f.isSong).map(f => f.syncStart), (moment(e['startTimestamp']).valueOf()) - 60000)] && (moment(e['startTimestamp']).valueOf()) - items.filter(f => !f.isSong)[findClosest(items.filter(f => !f.isSong).map(f => f.syncStart), (moment(e['startTimestamp']).valueOf()) - 60000)].syncStart < 900000))
                        if (episodes.length > 0) {
                            items.push(...episodes.map(e => {
                                const time = moment(e['startTimestamp'])
                                return {
                                    guid: e.id,
                                    syncStart: time.valueOf(),
                                    syncEnd: time.add((parseInt(e.duration.toString()) / 1000), "seconds").valueOf(),
                                    duration: (parseInt(e.duration.toString()) / 1000),
                                    delay,

                                    title: e.name,
                                    isSong: false,
                                    isEpisode: true
                                }
                            }))
                        }
                        //const times = itemsSorted.map(e => e['syncStart'])
                        return items
                    } else {
                        printLine("XMAPIFetch", `XM did not give a valid API response`, 'error');
                        return false;
                    }
                } catch (e) {
                    printLine("XMAPIFetch", `Failed to parse metadata: ${e.message}`, 'error');
                    return false;
                }
            }
            const activeChannels = [...new Set(listTuners().filter(e => e.activeCh))]
            const channelsToUpdate = listChannels().channels.filter(e => (!e.updateOnTune || (e.updateOnTune && e.id && activeChannels.filter(f => f.activeCh.ch === e.id && !f.activeCh.hasOwnProperty("end")).length > 0)))

            for (const channelInfo of channelsToUpdate) {
                try {
                    const id = (channelInfo.id) ? channelInfo.id : channelInfo.number
                    const channel_metadata = await new Promise(resolve => {
                        const timestamp = new moment().utc().subtract(8, "hours")
                        const channelURL = `https://api.edge-gateway.siriusxm.com/playback/play/v1/liveUpdate`
                        request.post({
                            url: channelURL,
                            headers: {
                                ...defaultHeaders,
                                "Authorization": `Bearer ${accountSession.accessToken}`
                            },
                            json: {
                                channelId: channelInfo.channelGuid,
                                endTimestamp: timestamp.toISOString(),
                                startTimestamp: (new moment().utc()).toISOString()
                            }
                        }, async function (err, res, body) {
                            if (err) {
                                printLine("XMAPIFetch", `Failed updating metadata for channel ${channelInfo.number}: ${err.message}`, 'error');
                                resolve(false);
                            } else {
                                await sleep(1000);
                                try {
                                    resolve(parseJson(body));
                                } catch (e) {
                                    console.log(body);
                                    resolve(false);
                                }
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
                    printLine("XMAPIFetch", `Failed to pull metadata: ${e.message}`, 'error');
                }
            }
            await cacheEventsValidated()
            if (config.nowPlaying)
                await nowPlayingNotification();
            await searchEvents();
            setTimeout(processPendingBounces, 2500);
        } catch (e) {
            printLine("XMAPIFetch", `Failed Updating Metadata: ${e.message}`, 'error');
        }
    }
    // Sync metadata and timetables to disk
    async function saveMetadata() {
        // Clean out old metadata
        await new Promise(resolve => {
            try {
                // Delete metadata thats older then a month
                for (let i in metadata) {
                    metadata[i] = metadata[i].filter(e => (!e.isSong && e.syncStart >= moment().subtract(1, 'week').valueOf()) || (e.isSong && e.syncStart >= moment().subtract(1, 'day').valueOf()))
                }
                // Delete tune times that are older then a month
                for (let k of Object.keys(channelTimes.timetable)) {
                    const newtable = channelTimes.timetable[k].filter(e => e['time'] >= moment().subtract(1, 'week').valueOf())
                    if (newtable.length > 0)
                        channelTimes.timetable[k] = newtable
                }
                channelTimes.completed.splice(0, channelTimes.completed.length - 100)
            } catch (e) {
                printLine("Metadata", `Failed to save metadata: ${e.message}`, 'error');
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
                printLine("NowPlaying", `${t.name}:${t.activeCh.ch} - ${eventText}`, 'alert');
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
            let adblaunch = [(config.adb_command) ? config.adb_command : 'adb']
            if (device) {
                adblaunch.push('-s')
                adblaunch.push(device)
            }
            adblaunch.push(...commandArray)
            exec(adblaunch.join(' '), {
                encoding: 'utf8',
                timeout: (noTimeout) ? undefined : 10000
            }, (err, stdout, stderr) => {
                if (err) {
                    printLine("AndroidComm", `${stdout.toString().trim().split('\n').map(e => `${device}: ${e}`).join('\n')}`, 'error');
                    resolve({
                        log: stdout.toString().split('\n').map(e => e.trim()).filter(e => e.length > 0 && e !== '').join('\n'),
                        error: true
                    })
                } else {
                    if (stderr.toString().length > 1)
                        printLine("AndroidComm", `${stderr.toString().trim().split('\n').map(e => `${device}: ${e}`).join('\n')}`, 'error');
                    //console.log(stdout.toString().trim().split('\n').map(e => `${device}: ${e}`).join('\n'))
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
                printLine("AndroidLogcat", `${device} : ${data}`, 'error');
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
                    printLine("AndroidPlayState", `${device.serial} : ${err.message}`, 'error');
                    resolve(false)
                } else {
                    const log = stdout.toString().split('\r').join('').split('\n')
                    const sessionStackIndex = searchStringInArray('Sessions Stack', log)
                    const services = log.slice(sessionStackIndex)
                        .filter(e => e.includes('package='))
                        .map(e => e.split(' package=')[1])
                    const sessionResult = log.slice(sessionStackIndex)
                        .filter(e => e.includes('state=PlaybackState'))
                        .map((e,i) => {
                            return {
                                x: services[i],
                                y: (() => {
                                    const playState = e.split('state=PlaybackState').pop().trim().slice(1,-1)
                                        .split(', ').filter(e => e.startsWith('state='))[0].split('=')[1]
                                    switch (playState) {
                                        case "3": // play
                                            return true
                                        case "0": // none
                                        case "1": // stop
                                        case "2": // pause
                                        default: // everything i dont care about
                                            return false
                                    }
                                })()
                            }
                        })
                        .filter(e => e.x === 'com.sirius').map(e => e.y)
                    resolve((sessionResult.length === 0) ? false : sessionResult[0])
                }
            });
        })
    }
    // Send Notification to Discord
    async function sendDiscord(channel, name, content, guid, deviceScreenshot, delay) {
        try {
            if (config.notifications && config.notifications[channel] && (!guid || guid && sentNotificatons.indexOf(guid) === -1)) {
                let attachemnt = false;
                if (deviceScreenshot) {
                    attachemnt = await new Promise(async (resolve) => {
                        try {
                            if (delay)
                                await sleep(delay);
                            await adbCommand(deviceScreenshot, ["shell", "screencap", "-p", "/sdcard/screen.png"]);
                            await adbCommand(deviceScreenshot, ["pull", "/sdcard/screen.png", `${deviceScreenshot}.png`]);
                            await adbCommand(deviceScreenshot, ["shell", "rm", "/sdcard/screen.png"]);
                            resolve(`${deviceScreenshot}.png`);
                        } catch (err) {
                            printLine("Discord", `${err.message}`, 'error');
                            resolve(false);
                        }
                    })
                }
                const res = await new Promise(resolve => {
                    if (attachemnt) {
                        let data = new FormData();
                        data.append('payload_json', JSON.stringify({
                            "username": name,
                            "content": content
                        }))
                        data.append('file', fs.createReadStream(`${deviceScreenshot}.png`))
                        data.submit(config.notifications[channel], (err, res) => {
                            if (!err) {
                                resolve(!err)
                            } else {
                                printLine("Discord", `${err.message}`, 'error');
                                resolve(false)
                            }
                            console.log(res.toString());
                            fs.unlinkSync(`${deviceScreenshot}.png`);
                        })
                    } else {
                        request.post({
                            url: config.notifications[channel],
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                "username": name,
                                "content": content
                            }),
                            timeout: 5000
                        }, async function (err, resReq, body) {
                            if (!err) {
                                resolve(!err)
                            } else {
                                printLine("Discord", `${err.message}`, 'error');
                                resolve(false)
                            }
                        })
                    }

                });
                if (res && guid) {
                    sentNotificatons.push(guid)
                }
            }
        } catch (e) {
            printLine("Discord", `Failed to send discord message: ${e.message}`, 'error');
        }
    }

    // Channel Searching and Retrieval

    // List All Channels, Numbers, and IDs
    // numbers and ids are indexed to channels for lookups
    // channels has number added to reference the channel numbers
    function listChannels() {
        const c = Object.keys(config.channels).map(e => {
            try {
                return {
                    number: e + '',
                    ...config.channels[e],
                    ...channelsAvailable[e],
                    imageUrl: channelsAvailable[e].image,
                    image: channelsImages[channelsAvailable[e].id]
                }
            } catch (err) {
                printLine("ChannelData", `Failed to load channel data: ${err.message}`, 'error', channelsAvailable[e]);
                console.error(e, channelsAvailable[e])
                return false
            }
        }).filter(e => !!e)
        const cn = c.map(e => e.number)
        const id = c.map(e => e.id || e.number.toString())
        return {
            channels: c,
            numbers: cn,
            ids: id
        }
    }
    // Get Channel by Number
    function getChannelbyNumber(number) {
        const channels = listChannels()
        const index = channels.numbers.indexOf(number + '')
        return (index !== -1) ? channels.channels[index] : false
    }
    // Get Channel by ID
    function getChannelbyId(id) {
        const channels = listChannels()
        const index = channels.ids.indexOf(id + '')
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
                    locked: locked_tuners.has(e) || (Object.keys(activeQueue).indexOf(`REC-${e}`) !== -1)
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
    // List all virtual devices aka dumb audio inputs
    function listInputs() {
        // name
        // airfoil_source
        return Object.entries(config.audio_inputs).map(e => {
            return {
                id: e[0],
                ...e[1],
            }
        })
    }
    // Get tuner by id
    function getTuner(id) {
        const t = listTuners().filter(e => e.id === id)
        return (t && t.length > 0) ? t.slice(-1).pop() : false
    }
    // Get virtual device by id
    function getInput(id) {
        const t = listInputs().filter(e => e.id === id)
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
    function availableTuners(channel, preferDigital, onlyDigital) {
        const ch = getChannelbyId(channel)
        function sortPriority(arrayItemA, arrayItemB) {
            if (arrayItemA.priority < arrayItemB.priority)
                return -1
            if (arrayItemA.priority > arrayItemB.priority)
                return 1
            return 0
        }
        return listTuners(onlyDigital)
            .map(e => {
                return {
                    ...e,
                    priority: (preferDigital && ((!e.digital && preferDigital) || (e.digital && !preferDigital))) ? e.priority + 1000 : e.priority
                }
            })
            .sort(sortPriority)
            .filter(e =>
                !e.locked &&
                (e.digital || (!e.digital && ch && ch.tuneUrl && ch.tuneUrl[e.id])) &&
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
                length: (jobQueue[e].length && jobQueue[e].length <= 1) ? 0 : jobQueue[e].length,
                id: e
            }
        }).sort(sortcb)[0].id
    }

    // Event Searching and Formatting

    // Get Latest Event for a channel
    function nowPlaying(channel) {
        const ch = getChannelbyNumber(channel)
        return {
            ...metadata[channel].slice(-1).pop(),
            ...ch
        }
    }
    // List all events for a channel that are after start time
    function listEvents(channel, time, after) {
        return listEventsValidated(undefined, undefined, undefined).filter(e => e.channelId === channel && !e.isSong && (!after && e.syncStart < time || after && e.syncStart > time - 300000))
    }
    // Get specific event by uuid
    function getEvent(channel, guid) {
        let events = [];
        const dt = listTuners(true)
        if (channel && getChannelbyId(channel)) {
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
                            if (f.artist) {
                                return `${cleanText(f.artist)} - ${cleanText(f.title)}`
                            }
                            return `${cleanText(f.title)}`
                        } else {
                            if (f.artist) {
                                return `${cleanText(f.title)} - ${cleanText(f.artist)}`
                            }
                            return `${cleanText(f.title)}`
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
                                    if (f.artist) {
                                        return `${cleanText(f.artist)} - ${cleanText(f.title)}`
                                    }
                                    return `${cleanText(f.title)}`
                                } else {
                                    if (f.artist) {
                                        return `${cleanText(f.title)} - ${cleanText(f.artist)}`
                                    }
                                    return `${cleanText(f.title)}`
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
            .filter(e => getTuner(e).hasOwnProperty('record_prefix'))
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
                                        if (!f.duration && f.isEpisode) {
                                            f.duration = 1
                                        } else if ((!f.duration || f.duration === 1 || f.duration === "0") && (i !== a.length - 1) && (a[i + 1] && a[i + 1].syncStart && !a[i + 1].isEpisode)) {
                                            f.syncEnd = a[i + 1].syncStart
                                            f.duration = parseInt(((f.syncEnd - f.syncStart) / 1000).toFixed(0)) + 1
                                        } else  if ((!f.duration || f.duration === 1 || f.duration === "0") && (i !== a.length - 1) && (a[i + 2] && a[i + 2].syncStart && !a[i + 2].isEpisode)) {
                                            f.syncEnd = a[i + 2].syncStart
                                            f.duration = parseInt(((f.syncEnd - f.syncStart) / 1000).toFixed(0)) + 1
                                        } else if ((!f.duration || f.duration === 0 || f.duration === "0") && (i !== a.length - 1) && Math.abs(f.syncEnd - f.syncStart) > 2) {
                                            f.duration = 1
                                        } else if ((!f.duration || f.duration === 0 || f.duration === "0") && (i !== a.length - 1) && f.syncEnd - f.syncStart > 2) {
                                            f.duration = 1
                                        }
                                        if (!f.filename) {
                                            f.filename = (() => {
                                                if (f.isEpisode) {
                                                    return `${cleanText(f.title)}`
                                                } else if (f.isSong) {
                                                    if (f.artist) {
                                                        return `${cleanText(f.artist)} - ${cleanText(f.title)}`
                                                    }
                                                    return `${cleanText(f.title)}`
                                                } else {
                                                    if (f.artist) {
                                                        return `${cleanText(f.title)} - ${cleanText(f.artist)}`
                                                    }
                                                    return `${cleanText(f.title)}`
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
                    const channelConfig = getChannelbyId(k)
                    metadata[k]
                        .slice(0)
                        .filter((f,i,a) =>
                            // If not already attached to a tuner
                            guidMap.indexOf(f.guid) === -1 &&
                            // If Event is less then 4 Hours old
                            (moment.utc(f.syncStart).local().valueOf() >= (Date.now() - ((config.max_rewind) ? config.max_rewind : sxmMaxRewind)))
                        ).map((f, i, a) => {
                        if (!f.duration && f.isEpisode) {
                            f.duration = 1
                        } else if ((!f.duration || f.duration === 0 || f.duration === "0") && (i !== a.length - 1) && (a[i + 1].syncStart && (!a[i + 1].isEpisode || (a[i + 1].isEpisode && (i - (a.length - 1)) > 4)))) {
                            f.syncEnd = a[i + 1].syncStart - 1
                            f.duration = parseInt(((f.syncEnd - f.syncStart) / 1000).toFixed(0)) + 1
                        } else if ((!f.duration || f.duration === 0 || f.duration === "0") && (i !== a.length - 1) && Math.abs(f.syncEnd - f.syncStart) > 2) {
                            f.duration = 1
                        } else if (i === a.length - 1 && !isActive && (!channelConfig || (channelConfig && channelConfig.updateOnTune))) {
                            f.duration = 1
                        }
                        if (!f.filename) {
                            f.filename = (() => {
                                if (f.isEpisode) {
                                    return `${cleanText(f.title)}`
                                } else if (f.isSong) {
                                    if (f.artist) {
                                        return `${cleanText(f.artist)} - ${cleanText(f.title)}`
                                    }
                                    return `${cleanText(f.title)}`
                                } else {
                                    if (f.artist) {
                                        return `${cleanText(f.title)} - ${cleanText(f.artist)}`
                                    }
                                    return `${cleanText(f.title)}`
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
            const active = activeJob.filter(q => e.guid && (q.id === e.guid)).map(q => q.k)[0]
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
                    printLine("PendingBounce", `Pending Request Expired: ${pendingEvent.time} was not found with in 4 hours`, 'notice', pendingEvent);
                    pendingEvent.done = true
                    pendingEvent.inprogress = false
                    sendDiscord('error', 'SiriusXM', `❌ The pending request from ${moment.utc(pendingEvent.time).local().format('MMM D HH:mm"')} has expired!`)
                } else if (thisEvent.guid && channelTimes.pending.filter(e => e.guid && e.guid === thisEvent.guid && (e.time + 6000) <= Date.now()).map(e => e.guid).length > 1) {
                    printLine("PendingBounce", `Duplicate Event Registered: ${pendingEvent.time} matches a existing bounce GUID`, 'warn');
                    pendingEvent.done = true
                    pendingEvent.inprogress = false
                } else if (thisEvent.duration && parseInt(thisEvent.duration.toString()) > 1 && thisEvent.syncEnd <= (moment().valueOf() + 5 * 60000)) {
                    const tuner = (thisEvent.tunerId) ? getTuner(thisEvent.tunerId) : undefined

                    if (!pendingEvent.failedRec && (moment.utc(thisEvent.syncStart).local().valueOf() >= (Date.now() - ((config.max_rewind) ? config.max_rewind : sxmMaxRewind))) && digitalAvailable && !config.disable_digital_extract) {
                        // If not failed event, less then 3 hours old, not directed to a specifc tuner, digital recorder ready, and enabled
                        printLine("PendingBounce", `The event "${thisEvent.filename}" is now concluded and will be recorded digitally`, 'alert', {
                            metadata: {
                                channelId: pendingEvent.ch,
                                ...thisEvent
                            },
                            destination: pendingEvent.destination,
                            switch_source: (pendingEvent.switch_source) ? pendingEvent.switch_source : false,
                            index: true
                        });
                        sendDiscord('info', 'SiriusXM', `✅ The event "${thisEvent.filename}" is now concluded and will be recorded digitally`)
                        pendingEvent.guid = thisEvent.guid;
                        pendingEvent.liveRec = true
                        pendingEvent.done = true
                        pendingEvent.inprogress = true
                        queueDigitalRecording({
                            metadata: {
                                channelId: pendingEvent.ch,
                                ...thisEvent
                            },
                            destination: pendingEvent.destination,
                            switch_source: (pendingEvent.switch_source) ? pendingEvent.switch_source : false,
                            index: true
                        })
                    } else if (tuner && (!pendingEvent.digitalOnly || (pendingEvent.digitalOnly && pendingEvent.failedRec)) && tuner.hasOwnProperty("record_prefix")) {
                        // If specific tuner is set, not set to require digital or has failed to extract via digital
                        printLine("PendingBounce", `The event "${thisEvent.filename}" is now concluded and will be cut from the satellite recordings`, 'alert', {
                            metadata: {
                                channelId: pendingEvent.ch,
                                ...thisEvent,
                                tuner: tuner
                            },
                            destination: pendingEvent.destination,
                            index: true
                        });
                        sendDiscord('info', 'SiriusXM', `✅ The event "${thisEvent.filename}" is now concluded and will be cut from the satellite recordings`)
                        pendingEvent.guid = thisEvent.guid;
                        pendingEvent.done = true
                        pendingEvent.inprogress = true
                        queueRecordingExtraction({
                            metadata: {
                                channelId: pendingEvent.ch,
                                ...thisEvent,
                                tuner: tuner
                            },
                            destination: pendingEvent.destination,
                            index: true
                        })
                    }
                } else if ((Math.abs(Date.now() - parseInt(thisEvent.syncStart.toString())) >= (((thisEvent.delay) + 60) * 1000)) && (pendingEvent.digitalOnly || pendingEvent.live || config.live_extract)) {
                    // Event is 5 min past its start (accounting for digital delay), digital only event or live extract is enabled
                    printLine("PendingBounce", `The event ${thisEvent.filename} will be recorded digitally live, Not waiting for end marker!`, 'alert', {
                        metadata: {
                            channelId: pendingEvent.ch,
                            ...thisEvent
                        },
                        destination: pendingEvent.destination,
                        switch_source: (pendingEvent.switch_source) ? pendingEvent.switch_source : false,
                        index: true
                    });
                    sendDiscord('info', 'SiriusXM', `✅ The event "${thisEvent.filename}" will be extracted live`)
                    pendingEvent.guid = thisEvent.guid;
                    pendingEvent.liveRec = true
                    pendingEvent.done = true
                    pendingEvent.inprogress = true
                    queueDigitalRecording({
                        metadata: {
                            channelId: pendingEvent.ch,
                            ...thisEvent
                        },
                        destination: pendingEvent.destination,
                        switch_source: (pendingEvent.switch_source) ? pendingEvent.switch_source : false,
                        index: true
                    })
                }
                return pendingEvent
            })
            inp.push(...channelTimes.pending.filter(e => !((e.done === false && (e.time + 6000) <= Date.now()))))
            channelTimes.pending = inp.filter(e => e.done === false || e.inprogress === true)
        } catch (err) {
            printLine("PendingBounce", `Error processing pending requests: ${err.message}`, 'error');
        }
    }
    // Generate Cron Schedules for events
    function registerSchedule() {
        Object.keys(config.schedule).forEach(k => {
            const e = config.schedule[k]
            if (e.record_cron) {
                if (cron.validate(e.record_cron)) {
                    let channelId = (e.channelId) ? e.channelId : undefined
                    if (e.ch)
                        channelId = getChannelbyNumber(e.ch).id

                    printLine("Schedule", `Record Schedule ${k} @ ${e.record_cron} was created! `, "debug")
                    cron.schedule(e.record_cron, () => {
                        printLine("Schedule", `Automated Record for ${k}`, "debug")
                        registerBounce({
                            channel: channelId,
                            tuner: (e.rec_tuner) ? getTuner(e.rec_tuner) : undefined,
                            allow_events: (e.allow_events) ? e.allow_events : undefined,
                            digitalOnly: (e.digitalOnly) ? e.digitalOnly : undefined,
                            addTime: 0,
                            restrict: (e.restrict) ? e.restrict : undefined,
                            destination: (e.destination) ? e.destination : undefined,
                            switch_source: (e.hasOwnProperty("switch_source")) ? e.switch_source : false
                        })
                    })
                } else {
                    printLine("Schedule", `${e.record_cron} is not a valid cron string`, "error")
                }
            }

            if (e.tune_cron) {
                if (cron.validate(e.tune_cron)) {
                    let channelId = (e.channelId) ? e.channelId : undefined
                    if (e.ch)
                        channelId = getChannelbyNumber(e.ch).id

                    if (!e.hasOwnProperty('restrict') || (e.hasOwnProperty('restrict') && !e.restrict_applys_to_tune)) {
                        printLine("Schedule", `Direct Tuning Schedule ${k} @ ${e.tune_cron} was created! `, "debug")
                        cron.schedule(e.tune_cron, () => {
                            printLine("Schedule", `Automated Tuning for ${k}`, "debug")
                            tuneToChannel({
                                channelId: channelId,
                                tuner: (e.hasOwnProperty("tune_tuner")) ? e.tune_tuner : undefined
                            })
                        })
                    } else {
                        printLine("Schedule", `Search Tuning Schedule ${k} @ ${e.tune_cron} was created! `, "debug")
                        cron.schedule(e.tune_cron, () => {
                            let i = -1
                            function search() {
                                i++
                                if (!e.restrict || !e.restrict_applys_to_tune || (e.restrict && e.restrict_applys_to_tune && isWantedEvent(e.restrict, findEvent(channelId, Date.now())))) {
                                    printLine("Schedule", `Automated Tuning for ${k}`, "debug")
                                    tuneToChannel({
                                        channelId: channelId,
                                        tuner: (e.hasOwnProperty("tune_tuner")) ? e.tune_tuner : undefined
                                    })
                                } else if (i < ((e.tune_search_retrys) ? e.tune_search_retrys : 15) && e.tune_search) {
                                    printLine("Schedule", `Event ${k} has not started, trying again in a minute...`, "warn")
                                    setTimeout(search, 60000)
                                } else {
                                    printLine("Schedule", `Event ${k} was not found, giving up!`, "notice")
                                }
                            }
                            search()
                        })
                    }

                } else {
                    printLine("Schedule", `${e.tune_cron} is not a valid cron string`, "error")
                }
            }
        })
    }
    // Keyword Search for Events
    function searchEvents() {
        const events = listEventsValidated(true, undefined, 15)
        const all = listEventsValidated(false, undefined, 25)
        config.autosearch_terms.map(f => {
            if (f.notify) {
                all.filter(e => sentNotificatons.indexOf(e.guid) === -1 && channelTimes.completed.indexOf(e.guid) === -1 && isWantedEvent(f, e)).map(e => {
                    const channelData = getChannelbyId(e.channelId);
                    sendDiscord('alert', (channelData) ? channelData.name : 'SiriusXM', `🆕 ${e.filename}`, e.guid)
                })
            }
            if (!f.onlyTune) {
                events.filter(e => channelTimes.completed && channelTimes.completed.indexOf(e.guid) === -1 && isWantedEvent(f, e)).map(e => {
                    printLine("SearchEvents", `Found Record Event ${e.filename} ${e.guid} - ${e.duration}`, 'info')
                    channelTimes.completed.push(e.guid)
                    channelTimes.pending.push({
                        ch: e.channelId,
                        guid: e.guid,
                        time: e.syncStart + 10,
                        tuner: undefined,
                        tunerId: e.tunerId,
                        digitalOnly: (f.digitalOnly),
                        live: (f.allow_live),
                        allow_events: (f.allow_events),
                        destination: (f.destination) ? f.destination : undefined,
                        switch_source: (f.switch_source) ? f.switch_source : false,
                        automatic: true,
                        inprogress: false,
                        done: false,
                    })
                })
            }
            if (f.tuneToChannel) {
                all.filter(e => channelTimes.completed.indexOf(e.guid) === -1 && tunedEvents.indexOf(e.guid) === -1 && isWantedEvent({fast_trigger: true, ...f}, e)).map(e => {
                    printLine("SearchEvents", `Found Tune Event ${e.filename} ${e.guid} - ${e.duration}`, "info")
                    tuneToChannel({
                        channelId: e.channelId,
                        tuner: (f.tuneToChannel !== true) ? e.tuneToChannel : undefined
                    })
                    if (f.onlyTune)
                        channelTimes.completed.push(e.guid)
                    tunedEvents.push(e.guid);
                })
            }
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
                destination: (options.destination) ? options.destination : undefined,
                switch_source: (options.switch_source) ? options.switch_source : false,
                inprogress: false,
                done: false,
            }
            channelTimes.pending.push(pendEvent)
            printLine("RegisterBounce", `Pending Bounce registered!`, "info", pendEvent);
            // Add new notification service
            saveMetadata();
            return pendEvent
        } else {
            printLine("RegisterBounce", "Missing Required data to register a pending Extraction", "error", options)
            return false
        }
    }

    // Set AirFoil Interface
    async function setAirOutput(tuner, release) {
        return await new Promise(async (resolve) => {
            const input = (release && tuner.airfoil_source !== undefined && tuner.airfoil_source.return_source) ? tuner.airfoil_source.return_source : tuner.airfoil_source.name
            const currentSource = await getAirOutput()
            const currentTuner = listTuners().filter(e => e.airfoil_source && e.airfoil_source.name && e.airfoil_source.name === currentSource.trim())[0]

            if (!release && currentTuner !== undefined && currentTuner.airfoil_source !== undefined && currentTuner.airfoil_source.auto_release && currentTuner.airfoil_source.name !== tuner.airfoil_source.name) {
                if (currentTuner.locked) {
                    printLine("SetAirOutput", `Last tuner is currently locked`, 'error')
                } else {
                    printLine("SetAirOutput", `Last tuner is not in use anymore, starting timeout...`, "warn")
                    watchdog_tuners[currentTuner.id].timeout_sources = setTimeout(() => {
                        deTuneTuner(currentTuner, false, true)
                        watchdog_tuners[currentTuner.id].timeout_sources = null;
                    }, (typeof currentTuner.airfoil_source.auto_release === "number" && currentTuner.airfoil_source.auto_release >= 5000) ? currentTuner.airfoil_source.auto_release : 30000)
                }
            } else if (!release && tuner.airfoil_source !== undefined && tuner.airfoil_source.auto_release && watchdog_tuners[tuner.id].timeout_sources) {
                printLine("SetAirOutput", `Tuner regained focus, stopping timeout`, "debug")
                clearTimeout(watchdog_tuners[tuner.id].timeout_sources)
                watchdog_tuners[tuner.id].timeout_sources = null;
            }

            const list = `tell application "Airfoil" to set current audio source to first device source whose name is "${input}"`
            const childProcess = osascript.execute(list, function (err, result, raw) {
                if (err)
                    printLine("SetAirOutput", err.message, "error")
                printLine("SetAirOutput", `airOutput: Set audio source to ${input}`, "debug")
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
                clearTimeout(childKiller);
                let devices = {};
                result[0].map((e,i) => {
                    devices[e] = result[1][i]
                })
                resolve(devices);
            });
            const childKiller = setTimeout(function () {
                childProcess.stdin.pause();
                childProcess.kill();
                resolve({});
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
                rooms[e]['active'] = rooms[e]['speakers'].filter(f => f.state).length > 0
            })
            return rooms
        }
        return false;
    }
    // Set Airfoil Speakers States
    async function setAirSpeakers(room, device, action) {
        const roomConfig = await inflateRoomConfig();
        if (roomConfig[room] !== undefined) {
            let response = [];
            let deviceToUse = roomConfig[room].speakers[device]
            if (action !== 'leave' && action !== 'remove') {
                if (!deviceToUse)
                    return `The speaker #${device} in room "${room}" does not exist`
                response.push(await new Promise(resolve => {
                    const list = `tell application "Airfoil" to connect to (first speaker whose name is "${deviceToUse.name}")`
                    const childProcess = osascript.execute(list, function (err, result, raw) {
                        clearTimeout(childKiller);
                        if (err) {
                            console.error(err)
                            resolve(`Connection Failed: "${deviceToUse.name}"@"${room}"`);
                        } else {
                            resolve(`Connected: "${deviceToUse.name}"@"${room}"`);
                        }
                    });
                    const childKiller = setTimeout(function () {
                        childProcess.stdin.pause();
                        childProcess.kill();
                        resolve(`Connection Timeout: "${deviceToUse.name}"@"${room}"`);
                    }, 10000)
                }))
            }
            if (action !== 'add') {
                roomConfig[room].speakers.filter(e => e.state === true && (action === 'leave' || (action === 'remove' && e.name === deviceToUse.name) || (action === 'swap' && e.name !== deviceToUse.name))).map(async e => {
                    response.push(await new Promise(resolve => {
                        const list = `tell application "Airfoil" to disconnect from (first speaker whose name is "${e.name}")`
                        const childProcess = osascript.execute(list, function (err, result, raw) {
                            clearTimeout(childKiller);
                            if (err) {
                                console.error(err)
                                resolve(`Disconnect Failed: "${e.name}"@"${room}"`);
                            } else {
                                resolve(`Disconnected: "${e.name}"@"${room}"`);
                            }
                        });
                        const childKiller = setTimeout(function () {
                            childProcess.stdin.pause();
                            childProcess.kill();
                            resolve(`Disconnect Timeout: "${e.name}"@"${room}"`);
                        }, 10000)
                    }))
                })
            }
            return response.join('\n')
        }
        return `The "${room}" does not exist`
    }

    // Job Queues

    // Queue a recorded event extraction and start the processor if inactive
    function queueRecordingExtraction(jobOptions) {
        jobQueue['extract'].push(jobOptions)
        printLine("PendingExtract", `Extraction Job #${jobQueue['extract'].length} Queued`, 'debug')
        //console.log(jobOptions)
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
            printLine("ExtractQ", `Extract: Last Job Result ${(completed)} - ${jobQueue['extract'].length} jobs left`, "debug")
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
        printLine("PendingDub", `Record Job #${jobQueue[best_recorder].length} Queued for ${best_recorder}`, "debug")
        //console.log(jobOptions)
        if (!activeQueue[best_recorder])
            startRecQueue(best_recorder)
    }
    // Process all pending digital recordings as FIFO
    async function startRecQueue(q) {
        if (!locked_tuners.has(q.slice(4))) {
            activeQueue[q] = true
            const tuner = getTuner(q.slice(4))
            while (jobQueue[q].length !== 0 && !locked_tuners.has(q.slice(4))) {
                const job = jobQueue[q][0]
                let i = (job.retry) ? job.retry : -1
                i++
                jobQueue[q][0].retry = i
                if (i <= 3 && moment.utc(job.metadata.syncStart).local().valueOf() >= (Date.now() - ((config.max_rewind) ? config.max_rewind : sxmMaxRewind))) {
                    const completed = await recordDigitalEvent(job, tuner)
                    if (completed)
                        await jobQueue[q].shift()
                    printLine("DubQ", `${q.slice(4)}: Last Job Result "${(completed)}" - ${jobQueue[q].length} jobs left`, "debug")
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
                    printLine("DubQ", `${q.slice(4)}: Last Job Result "Time Expired for this Job" - ${jobQueue[q].length} jobs left`, "notice")
                    sendDiscord('error', 'SiriusXM', `❌ The job "${job.metadata.filename}" has expired due to no longer being able to record`)
                }
            }
            delete activeQueue[q]
            if (tuner.hasOwnProperty('stop_after_record') && !tuner.stop_after_record && !locked_tuners.has(q.slice(4))) {
                reTuneTuner(tuner)
            }
            return true
        } else {
            printLine("DubQ",`Record/${q.slice(4)}: Unable to start the job queue because the tuner is locked!`, "notice")
            sendDiscord('error', 'SiriusXM', `❌ Unable to start the job queue because the tuner is locked!`)
        }
    }

    // Digital Tuner Controls and Recorders

    // Wait for device to connect and prepare device
    async function initDigitalRecorder(device) {
        locked_tuners.set(device.id, true)
        if (device.remote) {
            printLine("TunerInit", `Connecting to remote device ${device.serial}...`, "debug")
            await adbCommand(undefined, ["connect", device.serial])
            await sleep (1000);
        } else {
            printLine("TunerInit", `Searching for digital tuner "${device.name}":${device.serial}...\nPlease connect the device via USB if not already`, "debug");
        }
        await adbCommand(device.serial, ["wait-for-device"], true)
        printLine("TunerInit",`Tuner "${device.name}":${device.serial} was connected! Please Wait for initialization...\n!!!! DO NOT TOUCH DEVICE !!!!`, "debug");
        const socketready = await startAudioDevice(device);
        if (socketready) {
            printLine("TunerInit",`Tuner "${device.name}":${device.serial} is now ready!`, "alert")
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
            printLine("TunerInit", `Tuner "${device.name}":${device.serial} has been locked out because the audio interface did not open!`, 'critical')
            sendDiscord('error', 'SiriusXM', `❌ Tuner "${device.name}":${device.serial} has been locked out because the audio interface did not open!`)
        }
    }
    // Start TCP Audio Server and Pipeline
    async function startAudioClient(device) {
        printLine("AudioSocket", `${device.id}: (6/6) Starting Audio Pipeline TCP ${device.localAudioPort} => TCP ${device.audioPort}...`, "debug")
        const audioServer = audio_servers.get(device.id)
        if (audioServer.hasOwnProperty("passTrough")) {
            const passTrough = audioServer.passTrough
            let player = new net.Socket()
            async function connectDevice(port) {
                player = net.connect(port, "127.0.0.1", function () {
                    printLine("AudioSocket", `Connected to device audio tcp://127.0.0.1:${port}`, 'debug')
                });
                player.on("data", (data) => passTrough.push(data));
                player.on('close', function () {
                    printLine("AudioSocket", 'Device Audio Disconnect', 'debug');
                    setTimeout(() => {
                        connectDevice(port, true)
                    }, 5000)
                });
                player.on('error', function (err) {
                    printLine("AudioSocket", err.message, "error");
                });
            }
            connectDevice(device.localAudioPort)
            return true
        } else {
            printLine("AudioSocket", 'No Audio Server is running!', 'debug')
            return false
        }
    }
    // Connect Device to TCP Audio Server Pipeline
    async function createAudioServer(device) {
        return new Promise((resolve => {
            printLine("AudioServer", `${device.id}: (5/6) Starting Audio Relay @ TCP ${device.audioPort}...`, "debug")
            const passTrough = new stream.PassThrough({
                highWaterMark: 2000000
            });
            const audioServer = net.createServer(function (client) {
                printLine("AudioServer", `TAS/${device.id}: Audio Client Connected ${client.localAddress} => ${client.remotePort}`, "debug");
                passTrough.pipe(client)
                client.on('error', function (err) {
                    if (err.message === 'read ECONNRESET') {
                        audioServer.getConnections(function (err, count) {
                            if (!err) {
                                printLine("AudioServer", `TAS/${device.id}: Audio Client Disconnected - There are ${count} connections now.`, "debug");
                            } else {
                                printLine("AudioServer", err.message, 'error')
                            }
                        });
                    } else {
                        printLine("AudioServer", `TAS/${device.id}: Audio Server Error: ${err.message}`, "error");
                    }
                })
            });
            audioServer.listen(device.audioPort, function () {
                const serverInfo = audioServer.address();
                const serverInfoJson = JSON.stringify(serverInfo);
                printLine("AudioServer", `TCP server listen on port : ${serverInfoJson.port}`, "debug");
                audioServer.on('close', function () {
                    printLine("AudioServer", 'TCP Audio Socket Closed', "debug");
                });
                audioServer.on('error', function (error) {
                    printLine("AudioServer", err.message, "error");
                });
            });
            audio_servers.set(device.id, {audioServer, passTrough})
            resolve(true)
        }))
    }
    // Start the USB Audio Interface
    async function startAudioDevice(device) {
        return await new Promise(async (resolve, reject) => {
            printLine("AudioSetup", `Setting up USB Audio Interface for "${device.name}"...`, "debug")
            async function start() {
                printLine("AudioSetup", `${device.id}: (1/6) Installing USB Interface...`, "debug")
                await adbCommand(device.serial, ["install", "-t", "-r", "-g", "app-release.apk"], true)
                printLine("AudioSetup", `${device.id}: (2/6) Enabling Audio Recording Permissions...`, "debug")
                await adbCommand(device.serial, ["shell", "appops", "set", "com.rom1v.sndcpy", "PROJECT_MEDIA", "allow"])
                printLine("AudioSetup", `${device.id}: (3/6) Connecting Local Device Socket @ TCP ${device.localAudioPort}...`, "debug")
                await adbCommand(device.serial, ["forward", `tcp:${device.localAudioPort}`, "localabstract:sndcpy"])
                printLine("AudioSetup", `${device.id}: (4/6) Connecting Local Audio Socket @ TCP ${device.audioPort}...`, "debug")
                await adbCommand(device.serial, ["forward", `tcp:${device.audioPort}`, "localabstract:sndcpy_play"])
                printLine("AudioSetup", `${device.id}: (5/6) Starting Audio Interface...`, "debug")
                await adbCommand(device.serial, ["shell", "am", "kill", "com.rom1v.sndcpy"])
                await adbCommand(device.serial, ["shell", "am", "start", "com.rom1v.sndcpy/.MainActivity", "--ei", "SAMPLE_RATE", "44100", "--ei", "BUFFER_SIZE_TYPE", "3"])
                printLine("AudioSetup", `${device.id}: Ready`, "debug")
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
                    printLine("DigitalDub", `Record/${tuner.id}: Using physical audio interface "${tuner.audio_interface.join(' ')}"`, "warn")
                    return tuner.audio_interface
                }
                return ["-f", "s16le", "-ar", "48k", "-ac", "2", "-i", `tcp://localhost:${tuner.localAudioPort}`]
            })()
            if (!input) {
                printLine("DigitalDub", `Record/${tuner.id}: No Audio Interface is available for ${tuner.id}`, "error")
                resolve(false)
            } else {
                printLine("DigitalDub", `Record/${tuner.id}: Started Digital Dubbing Event "${event.filename}"...`, "info")
                sendDiscord('info', 'SiriusXM', `📼 Started Digital Dubbing Event "${event.filename}" using "${tuner.name}"...`, undefined, tuner.serial, 5000)
                try {
                    clearInterval(watchdog_tuners[tuner.id].watchdog)
                    watchdog_tuners[tuner.id].watchdog = null
                    const startTime = Date.now()
                    const ffmpeg = ['-hide_banner', '-stats_period', '300', '-y', ...input, ...((time) ? ['-t', time] : []), '-b:a', '320k', `Extracted_${event.guid}.mp3`]
                    printLine("DigitalDub", ffmpeg.join(' '), 'debug')
                    const recorder = spawn(((config.ffmpeg_exec) ? config.ffmpeg_exec : '/usr/local/bin/ffmpeg'), ffmpeg, {
                        cwd: (tuner.record_dir) ? tuner.record_dir : config.record_dir,
                        encoding: 'utf8'
                    })

                    recorder.stdout.on('data', (data) => { printLine("DigitalDub", data.toString().split('\n').map((line) => `Record/${tuner.id}: ` + line).join('\n'), "debug") })
                    recorder.stderr.on('data', (data) => { printLine("DigitalDub", data.toString().split('\n').map((line) => `Record/${tuner.id}: ` + line).join('\n'), "debug") });
                    recorder.on('close', (code, signal) => {
                        const completedFile = path.join((tuner.record_dir) ? tuner.record_dir : config.record_dir, `Extracted_${event.guid}.${(config.extract_format) ? config.extract_format : 'mp3'}`)
                        if (code !== 0) {
                            printLine("DigitalDub", `Record/${tuner.id}: Digital dubbing failed: FFMPEG reported a error!`, "error")
                            resolve(false)
                        } else {
                            printLine("DigitalDub", `Record/${tuner.id}: Completed!`, "debug")
                            clearTimeout(stopwatch)
                            clearInterval(controller)
                            clearInterval(watchdog)

                            if (!activeQueue[`REC-${tuner.id}`] || activeQueue[`REC-${tuner.id}`].closed || fault) {
                                sendDiscord('error', 'SiriusXM', `❌ ${tuner.name} Failed Digital Dubbing of "${event.filename}"`, undefined, tuner.serial)
                            } else {
                                sendDiscord('info', 'SiriusXM', `✅ ${tuner.name} Completed Digital Dubbing of "${event.filename}"`)
                            }
                            resolve((!activeQueue[`REC-${tuner.id}`] || activeQueue[`REC-${tuner.id}`].closed || fault) ? false : fs.existsSync(completedFile) && fs.statSync(completedFile).size > 1000000)
                        }
                        locked_tuners.delete(tuner.id)
                    })

                    let watchdogi = 0
                    watchdog = setInterval(async () => {
                        const state = await checkPlayStatus(tuner)
                        if (!state) {
                            watchdogi = watchdogi + 1
                            //printLine("DigitalDub", `Record/${tuner.id}: Device Audio Session not found or responding!`, "warn")
                        } else {
                            watchdogi = 0
                        }
                        if (watchdogi >= 4) {
                            printLine("DigitalDub", `Record/${tuner.id}: Fault Detected with tuner - Device has unexpectedly stopped playing audio! Job Failed`, "critical")
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
                        printLine("DigitalDub", `Record/${tuner.id}: This is a live event and has no duration, watching for closure`, "warn")
                        controller = setInterval(() => {
                            const eventData = getEvent(event.channelId, event.guid)
                            if (!activeQueue[`REC-${tuner.id}`] || activeQueue[`REC-${tuner.id}`].closed) {
                                clearInterval(controller)
                            } else if (eventData && eventData.duration && parseInt(eventData.duration.toString()) > 1) {
                                const termTime = Math.abs((Date.now() - startTime) - (parseInt(eventData.duration.toString()) * 1000)) + (((eventData.isEpisode) ? 300 : 10) * 1000)
                                printLine("DigitalDub", `Event ${event.guid} concluded with duration ${(eventData.duration / 60).toFixed(0)}m, Starting Termination Timer for ${((termTime / 1000) / 60).toFixed(0)}m`, "info")
                                sendDiscord('info', 'SiriusXM', `⏲ Event "${event.filename}" concluded with duration ${(eventData.duration / 60).toFixed(0)}m, Starting Termination Timer for ${((termTime / 1000) / 60).toFixed(0)}m`)
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
                    printLine("DigitalDub", e.message, "error");
                    resolve(false)
                }
            }
        })
    }
    // Return to the home screen after a timeout of inactivity
    function startDeviceTimeout(device) {
        if (device.timeout) {
            watchdog_tuners[device.id].tuner_timeout = setTimeout(async() => {
                // adb shell am force-stop com.sirius
                // adb shell am start -a android.intent.action.MAIN -c android.intent.category.HOME
                await adbCommand(device.serial, ["shell", "am", "start", "-a", "android.intent.action.MAIN", '-c', 'android.intent.category.HOME'])
            }, device.timeout)
        }
    }

    // Channel Tuning Functions

    // Tune to Channel on specific Tuner or the best available one
    async function tuneToChannel(options) {
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
                    printLine("Tuner", `Request to tune "${tn[0].name}" to channel ${channel.name}`, "debug")
                    return _tuneToChannel(tn[0], channel, tn[1])
                } else {
                    printLine("Tuner", `Request available tuner to channel ${channel.name}`, "debug")
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
                printLine("Tuner", response, "error")
                return false
            }
        } else {
            if (options.res)
                options.res.status(404).send('Channel not found')
            printLine("Tuner", "Channel not found", "error")
            return false
        }
    }
    // End the tuners timeline for the active channel
    async function deTuneTuner(tuner, force, noOutputSet) {
        if (force || (!activeQueue[`REC-${tuner.id}`] && !locked_tuners.has(tuner.id))) {
            if (tuner.digital) {
                clearInterval(watchdog_tuners[tuner.id].watchdog)
                clearInterval(watchdog_tuners[tuner.id].player_controller);
                watchdog_tuners[tuner.id].player_controller = null;
                clearTimeout(watchdog_tuners[tuner.id].player_stopwatch);
                watchdog_tuners[tuner.id].player_stopwatch = null;
            }
            if (!noOutputSet && !force && tuner.airfoil_source !== undefined && tuner.airfoil_source && tuner.airfoil_source.return_source)
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
            if (tuner.digital) {
                watchdog_tuners[tuner.id].player_start = null;
                watchdog_tuners[tuner.id].player_guid = null;
                watchdog_tuners[tuner.id].watchdog = null
            }
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
        printLine("Tuner", `Tune/${device.id}: Tuning Device to channel ${channel} @ ${moment.utc(time).local().format("YYYY-MM-DD HHmm")}...`, "debug");
        if (watchdog_tuners[device.id].tuner_timeout)
            clearInterval(watchdog_tuners[device.id].tuner_timeout)
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
                                ok(state)
                            }, 500)
                        })
                        if (i >= 60) {
                            printLine("Tuner", `Tune/${device.id}: Device did not start playing within the required timeout!`, "error")
                            break
                        }
                    }
                } else {
                    console.error(`Tune/${device.id}: Did not receive expected response from device active manager`)
                }
                if (!tuneReady)
                    printLine("Tuner", `Tune/${device.id}: Device failed to tune to ${channel}!`, "error")
                if (k >= 3) {
                    printLine("Tuner", `Tune/${device.id}: Device tuning reties exhausted, giving up!`, "error")
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
        printLine("Tuner", `Releasing Device ${device.serial}...`, "debug");
        return await adbCommand(device.serial, ['shell', 'input', 'keyevent', '86']);
        return await adbCommand(device.serial, ['shell', 'input', 'keyevent', 'KEYCODE_HOME']);
    }
    // Automatically deturns a tuner if playback is stopped
    async function digitalTunerWatcher(device) {
        let watchdogi = 0
        const timer = setInterval(async () => {
            if (watchdog_tuners[device.id].watchdog !== null) {
                const state = await checkPlayStatus(device)
                if (!state) {
                    watchdogi = watchdogi + 1
                    //printLine("Tuner",`Player/${device.id}: Device Audio Session not found!`, "warn")
                } else {
                    watchdogi = 0
                }
                if (watchdogi >= 4) {
                    printLine("Tuner", `Player/${device.id}: Tuner is no longer available and will be detuned`, "critical")
                    deTuneTuner(device)
                }
            } else {
                clearInterval(timer)
            }
        }, 60000)
        watchdog_tuners[device.id].watchdog = timer
    }
    // Watches device for the loss of port forwarding
    async function deviceWatcher(device) {
        watchdog_tuners[device.id].connectivity = setInterval(async () => {
            const portlist = await adbCommand(device.serial, ['forward', '--list'])
            if (!portlist.ok || !portlist.log.includes(`localabstract:sndcpy`)) {
                printLine("Tuner", `Player/${device.id}: Device has lost audio connectivity with the server, attempting to reconfigure...`, "critical")
                await initDigitalRecorder(device)
            }
        }, 30000)
    }

    // Job Workers

    // Record an event on a digital tuner
    async function recordDigitalEvent(job, tuner) {
        printLine("DigitalDub", `Record/${tuner.id}: Preparing for digital dubbing...`, "debug")
        let eventItem = getEvent(job.metadata.channelId, job.metadata.guid)
        if (!eventItem)
            eventItem = job.metadata
        adbLogStart(tuner.serial)
        await deTuneTuner(tuner, true)
        locked_tuners.set(tuner.id, true)
        if (await tuneDigitalChannel(eventItem.channelId, eventItem.syncStart, tuner)) {
            const isLiveRecord = !(eventItem.duration && parseInt(eventItem.duration.toString()) > 1 && eventItem.syncStart < (Date.now() - (30 * 60000)))
            if (tuner.airfoil_source !== undefined && tuner.airfoil_source && job.switch_source && tuner.airfoil_source.conditions.indexOf((isLiveRecord) ? 'live_record' : 'record') !== -1)
                setAirOutput(tuner, false)
            const time = (() => {
                if (eventItem.duration && parseInt(eventItem.duration.toString()) > 1 && tuner.audio_interface)
                    return parseInt(eventItem.duration.toString()) + ((eventItem.isEpisode) ? 300 : 10)
                if (eventItem.duration && parseInt(eventItem.duration.toString()) > 1)
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
                    printLine("DigitalDub", `Failed to write tags: ${e.message}`, "error")
                }
                const eventData = getEvent(eventItem.channelId, eventItem.guid)
                await postExtraction(path.join((tuner.record_dir) ? tuner.record_dir : config.record_dir, `Extracted_${eventItem.guid}.${(config.extract_format) ? config.extract_format : 'mp3'}`), `${(eventData) ? eventData.filename.trim() : eventItem.filename.trim()} (${moment(eventItem.syncStart).format("YYYY-MM-DD HHmm")}).${(config.extract_format) ? config.extract_format : 'mp3'}`, job.destination)
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
                    printLine("DigitalDub", `Record/${tuner.id}: Failed job should be picked up by the recording extractor (if available)`, "error")
                    channelTimes.pending[index].inprogress = false
                    channelTimes.pending[index].liveRec = false
                    channelTimes.pending[index].done = false
                    channelTimes.pending[index].failedRec = true
                }
            }
            return recording;
        } else {
            printLine("DigitalDub", `Record/${tuner.id}: Failed to tune to channel, Canceled!`, "critical")
            if (job.index) {
                printLine("DigitalDub", `Record/${tuner.id}: Failed job should be picked up by the recording extractor (if available)`, "error")
                const index = channelTimes.pending.map(e => e.guid).indexOf(eventItem.guid)
                channelTimes.pending[index].inprogress = false
                channelTimes.pending[index].liveRec = false
                channelTimes.pending[index].done = false
                channelTimes.pending[index].failedRec = true
            }
        }
        return false
    }
    // Record an event on a digital tuner
    async function playDigitalEvent(event, tuner) {
        printLine("DigitalPlayer", `Player/${tuner.id}: Preparing for digital playback...`, "debug")
        let eventItem = getEvent(event.channelId, event.guid)
        if (!eventItem)
            eventItem = event.metadata
        await deTuneTuner(tuner, true)
        if (await tuneDigitalChannel(eventItem.channelId, eventItem.syncStart, tuner)) {
            if (tuner.airfoil_source !== undefined && tuner.airfoil_source && tuner.airfoil_source.conditions.indexOf('tune') !== -1)
                await setAirOutput(tuner, false)
            digitalTunerWatcher(tuner);
            const startTime = Date.now();
            watchdog_tuners[tuner.id].player_guid = event.guid
            watchdog_tuners[tuner.id].player_start = startTime;
            function setTimer(eventData) {
                const termTime = Math.abs((Date.now() - startTime) - (parseInt(eventData.duration.toString()) * 1000)) + (((eventData.isEpisode) ? 300 : 10) * 1000)
                printLine("DigitalPlayer", `Player ${event.guid} concluded with duration ${(eventData.duration / 60).toFixed(0)}m, Starting Stop Timer for ${((termTime / 1000) / 60).toFixed(0)}m`, "info");
                watchdog_tuners[tuner.id].player_stopwatch = setTimeout(async () => {
                    deTuneTuner(tuner);
                }, termTime);
                clearInterval(watchdog_tuners[tuner.id].player_controller)
                watchdog_tuners[tuner.id].player_controller = null
            }

            if (event && event.duration && parseInt(event.duration.toString()) > 1) {
                setTimer(event);
            } else {
                watchdog_tuners[tuner.id].player_controller = setInterval(() => {
                    const eventData = getEvent(event.channelId, event.guid)
                    if (!(watchdog_tuners[tuner.id].player_controller)) {
                        clearInterval(watchdog_tuners[tuner.id].player_controller)
                    } else if (eventData && eventData.duration && parseInt(eventData.duration.toString()) > 1) {
                        setTimer(event);
                    }
                }, 60000);
            }
            return true;
        } else {
            printLine("DigitalPlayer", `Player/${tuner.id}: Failed to tune to channel, Canceled!`, "error")
        }
        return false
    }
    // Extract Recorded Event from a persistent tuner
    async function extractRecordedEvent(job) {
        try {
            printLine("FileSplicer", `Extract: Preparing for recording extraction...`, "debug")
            const eventItem = job.metadata
            const recFiles = fs.readdirSync((eventItem.tuner.record_dir) ? eventItem.tuner.record_dir : config.record_dir).filter(e => e.startsWith(eventItem.tuner.record_prefix) && e.endsWith(".mp3")).map(e => {
                return {
                    date: moment(e.replace(eventItem.tuner.record_prefix, '').split('.')[0] + '', (eventItem.tuner.record_date_format) ? eventItem.tuner.record_date_format : "YYYYMMDD-HHmmss"),
                    file: e
                }
            });
            const recTimeIndex = recFiles.map(e => e.date.valueOf());

            if (parseInt(eventItem.duration.toString()) > 1) {
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
                        printLine("FileSplicer", `Extract: Trimming Live Recording File "${eventItem.filename.trim()}" @ ${startTrim}-${endTrim} ...`, "info")
                        const ffmpeg = [(config.ffmpeg_exec) ? config.ffmpeg_exec : '/usr/local/bin/ffmpeg', '-hide_banner', '-y', '-i', `concat:"${eventFiles.map(e => e.file).join('|')}"`, '-ss', startTrim, '-t', endTrim, `Extracted_${eventItem.guid}.${(config.extract_format) ? config.extract_format : 'mp3'}`]
                        exec(ffmpeg.join(' '), {
                            cwd: (eventItem.tuner.record_dir) ? eventItem.tuner.record_dir : config.record_dir,
                            encoding: 'utf8'
                        }, (err, stdout, stderr) => {
                            if (err) {
                                printLine("FileSplicer", `Extract: FFMPEG reported a error!: ${err.message}`, "error");
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
                    printLine("FileSplicer", "Extract: Recordings are not available for this time frame! Canceled", "notice")
                }

                if (trimEventFile && fs.existsSync(trimEventFile.toString())) {
                    printLine("FileSplicer", `Extract: Extraction complete for ${eventFilename.trim()}!`, "alert")
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
                        printLine("FileSplicer", `Failed to write tags: ${e.message}`, "error")
                    }
                    await postExtraction(trimEventFile, eventFilename, job.destination);
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
                    printLine("FileSplicer", `Extraction failed: File was not generated correctly`, "critical")
                    if (job.index) {
                        const index = channelTimes.pending.map(e => e.guid).indexOf(eventItem.guid)
                        channelTimes.pending[index].inprogress = false
                        channelTimes.pending[index].liveRec = false
                        channelTimes.pending[index].done = false
                    }
                    return false
                }
            } else {
                printLine("FileSplicer", `Extract: This event has not concluded, unable to proceed!`, "warn")
                return false
            }
        } catch (e) {
            printLine("FileSplicer", `Extraction Failed: ${e.message}`, "critical")
        }
    }
    // Move extracted files to the upload and backup folder
    async function postExtraction(extractedFile, eventFilename, destination) {
        const upload_dir = (destination) ? destination : config.upload_dir
        const backup_dir = config.backup_dir

        try {
            if (backup_dir) {
                await new Promise(resolve => {
                    printLine("PostExtract", `Copying Backup File ... "${eventFilename}"`, "debug")
                    exec(`cp "${extractedFile.toString()}" "${path.join(backup_dir, eventFilename).toString()}"`, (err, result) => {
                        if (err)
                            printLine("PostExtract", err.message, "error");
                        resolve((err))
                    })
                })
            }
            if (upload_dir) {
                printLine("PostExtract", `Copying File for Upload ... "${eventFilename}"`, "debug")
                await new Promise(resolve => {
                    exec(`cp "${extractedFile.toString()}" "${path.join(upload_dir, 'HOLD-' + eventFilename).toString()}"`, (err, result) => {
                        if (err)
                            printLine("PostExtract", err.message, "error");
                        resolve((err))
                    })
                })
                await new Promise(resolve => {
                    exec(`mv "${path.join(upload_dir, 'HOLD-' + eventFilename).toString()}" "${path.join(upload_dir, eventFilename).toString()}"`, (err, result) => {
                        if (err)
                            printLine("PostExtract", err.message, "error");
                        resolve((err))
                    })
                })
            }
            new Promise(resolve => {
                const list = `display notification "✅ ${eventFilename.trim().split('.')[0]} was successful" with title "💿 Bouncer" sound name "Glass"`
                const childProcess = osascript.execute(list, function (err, result, raw) {
                    resolve(null);
                    if (err) return printLine("PostExtract", err.message, "error");
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
            printLine("PostExtract", `Post Processing Failed: cant not be parsed because the file failed to be copied!`, "critical");
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
    app.get("/play/:channelNum/:eventId", async (req, res, next) => {
        const event = getEvent(req.params.channelNum, req.params.eventId);
        if (event) {
            const channel = getChannelbyId(event.channelId)
            const tuner = availableTuners(channel.number, true, true)[0];
            if (tuner) {
                playDigitalEvent(event, tuner);
                res.status(200).send(`Starting playback of event`)
            } else {
                res.status(500).send(`No tuner is available!`)
            }
        } else {
            res.status(404).send(`Event was not found!`)
        }
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
        if (t && t.airfoil_source && t.airfoil_source.name && ((t.activeCh && !t.activeCh.hasOwnProperty('end')) || (t.digital && (await checkPlayStatus(t)) === true))) {
            await setAirOutput(t, false)
            res.status(200).send("OK")
        } else {
            res.status(404).send("Tuner not found")
        }
    })
    app.get("/direct_source/:id", async (req, res, next) => {
        const t = getInput(req.params.id)
        if (t && t.airfoil_source && t.airfoil_source.name) {
            await setAirOutput(t, false)
            res.status(200).send("OK")
        } else {
            res.status(404).send("Input not found")
        }
    })
    app.get("/direct_action/:id/:action", async (req, res, next) => {
        const t = getInput(req.params.id)
        if (t && t.actions && t.actions[req.params.action]) {
            await webRequest(t.actions[req.params.action])
            res.status(200).send("OK")
        } else {
            res.status(404).send("Action or Input not found")
        }
    })
    app.get("/output/:action/:zone/:index", async (req, res, next) => {
        res.status(200).send(await setAirSpeakers(req.params.zone, parseInt(req.params.index), req.params.action));
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
                                printLine("pendingAPI", `${req.query.guid} job is currently active and will be cancelled`, "warn")
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
                            printLine("pendingAPI", `Cleared ${jobQueue[k].length - clearedPendJobs.length} Jobs from Pending Jobs`, "alert")
                            jobQueue[k] = clearedPendJobs
                            return true
                        }
                        return false
                    }).filter(e => e === true).length
                    const clearPending = (() => {
                        const clearedPending = channelTimes.pending.filter(e => !e.guid || (e.guid && e.guid !== req.query.guid))
                        if (clearedPending.length !== channelTimes.pending.length) {
                            printLine("pendingAPI", `Cleared ${channelTimes.pending.length - clearedPending.length} Jobs from Pending Queue`, "alert")
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
                            destination: pendingJob.destination,
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
                        duration: (req.query.duration) ? parseInt(req.query.duration) : undefined,
                        ...req.body
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
    app.get("/configure/setup/:tuner", async (req, res, next) => {
        if (req.params.tuner) {
            const t = getTuner(req.params.tuner)
            if (t) {
                if (t.digital) {
                    res.status(200).send("Operation inprogress");
                    await initDigitalRecorder(t)
                    sendDiscord('info', 'SiriusXM', `${t.name} is ready!`, undefined, t.serial);
                    startRecQueue("REC-" + t.id)
                } else {
                    res.status(400).send('No Digital Tuner was found')
                }
            } else {
                res.status(400).send('Invalid Tuner ID')
            }
        } else {
            res.status(400).send('Missing Tuner ID')
        }
    });
    app.get("/configure/reboot/:tuner", async (req, res, next) => {
        if (req.params.tuner) {
            const t = getTuner(req.params.tuner)
            if (t) {
                if (t.digital) {
                    locked_tuners.set(t.id, true);
                    await adbCommand(t.serial, ["reboot"])
                    res.status(200).send("Device Restarted, Operation inprogress");
                    setTimeout(async () => {
                        await initDigitalRecorder(t);
                        sendDiscord('info', 'SiriusXM', `${t.name} is ready!`, undefined, t.serial);
                        startRecQueue("REC-" + t.id);
                    }, t.boot_time || 300000)
                } else {
                    res.status(400).send('No Digital Tuner was found')
                }
            } else {
                res.status(400).send('Invalid Tuner ID')
            }
        } else {
            res.status(400).send('Missing Tuner ID')
        }
    });
    app.get("/configure/lock/:tuner", async (req, res, next) => {
        if (req.params.tuner) {
            const t = getTuner(req.params.tuner)
            if (t) {
                locked_tuners.set(t.id, true)
                res.status(200).send("Device Disabled");
            } else {
                res.status(400).send('Invalid Tuner ID')
            }
        } else {
            res.status(400).send('Missing Tuner ID')
        }
    });
    app.get("/configure/unlock/:tuner", async (req, res, next) => {
        if (req.params.tuner) {
            const t = getTuner(req.params.tuner)
            if (t) {
                locked_tuners.delete(t.id);
                if (t.digital)
                    startRecQueue("REC-" + t.id);
                res.status(200).send("Device Enabled");
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
                    destination: pendingJob.destination,
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
                case 'activeRooms':
                    res.status(200).json((await inflateRoomConfig()).map(e => { return `${e.name} : ${e.active}`}))
                    break;
                case 'channels':
                    res.status(200).json(listChannels().channels.map(e => {
                        let supportedDevices = (e.tuneUrl) ? Object.keys(e.tuneUrl) : []
                        return {
                            number: parseInt(e.number),
                            name: e.name,
                            id: e.id,
                            description: e.description,
                            color: null,
                            imageUrl: null,
                            image: null,
                            supportedDevices
                        }
                    }))
                    break;
                case 'metadata':
                    res.status(200).json(metadata)
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
                                destination: pendingJob.destination,
                                switch_source: (pendingJob.switch_source) ? pendingJob.switch_source : true,
                                isRequested: pendingJob.index
                            })
                        })
                    })
                    const results = {
                        activeJob: activeJobs,
                        pendingJobs: pendingJobs,
                        requestedJobs: channelTimes.pending,
                        completed,
                        tunedEvents
                    }
                    res.status(200).json(results)
                    break;
                case 'devices':
                    const source = await getAirOutput()
                    const inputs = listInputs().map(e => {
                        return {
                            id: e.id,
                            name: e.name,
                            active: (e.airfoil_source && e.airfoil_source.name === source),
                            always_active: (e.always_active),
                            actions: (e.actions) ? e.actions : undefined
                        }
                    })
                    const tuners = listTuners().map(e => {
                        const meta = (e.activeCh && !e.activeCh.hasOwnProperty("end")) ? nowPlaying(e.activeCh.ch) : (e.digital && watchdog_tuners[e.id] && watchdog_tuners[e.id].player_guid) ? getEvent(undefined, watchdog_tuners[e.id].player_guid) : false
                        const activeJob = activeJobs.filter(j => j.queue.slice(4) === e.id)
                        const channelMeta = (activeJob.length > 0) ? activeJob.map(j => getEvent(undefined, j.guid))[0] : (meta) ? meta : false
                        return {
                            id: e.id,
                            name: e.name,
                            channel: (() => {
                                if (channelMeta.channelId) {
                                    const ch = getChannelbyId(channelMeta.channelId)
                                    return {
                                        id: ch.id,
                                        name: ch.name,
                                        number: ch.number,
                                        description: ch.description,
                                        color: null,
                                        imageUrl: null,
                                        image: null,
                                    }
                                }
                                if (!meta)
                                    return false
                                const ch = getChannelbyId(e.activeCh.ch)
                                return {
                                    id: ch.id,
                                    name: ch.name,
                                    number: ch.number,
                                    description: ch.description,
                                    color: null,
                                    imageUrl: null,
                                    image: null
                                }
                            })(),
                            digital: e.digital,
                            active: (e.airfoil_source && e.airfoil_source.name === source),
                            locked: e.locked,
                            record_only: e.record_only,
                            working: (activeJob.length > 0) ? {
                                guid: activeJob[0].guid,
                                jobCount: jobQueue[activeJob[0].queue].length,
                                startTime: activeJob[0].start,
                                elapsedTime: Math.abs(Date.now() - activeJob[0].start),
                                duration: (!channelMeta) ? false : (channelMeta.duration && channelMeta.duration > 1) ? (channelMeta.duration && (parseInt(channelMeta.duration.toString()) * 1000) + (((channelMeta.isEpisode) ? 300 : 10) * 1000)) : false,
                                timeLeft: (!channelMeta) ? false :  (channelMeta.duration && channelMeta.duration > 1) ? Math.abs((Date.now() - activeJob[0].start) - (parseInt(channelMeta.duration.toString()) * 1000)) + (((channelMeta.isEpisode) ? 300 : 10) * 1000) : false
                            } : false,
                            player: (e.digital && watchdog_tuners[e.id] && watchdog_tuners[e.id].player_guid) ? {
                                guid: watchdog_tuners[e.id].player_guid,
                                startTime: watchdog_tuners[e.id].player_start,
                                elapsedTime: Math.abs(Date.now() - watchdog_tuners[e.id].player_start),
                                duration: (!channelMeta) ? false : (channelMeta.duration && channelMeta.duration > 1) ? (channelMeta.duration && (parseInt(channelMeta.duration.toString()) * 1000) + (((channelMeta.isEpisode) ? 300 : 10) * 1000)) : false,
                                timeLeft: (!channelMeta) ? false :  (channelMeta.duration && channelMeta.duration > 1) ? Math.abs((Date.now() - watchdog_tuners[e.id].player_start) - (parseInt(channelMeta.duration.toString()) * 1000)) + (((channelMeta.isEpisode) ? 300 : 10) * 1000) : false
                            } : false,
                            history: !!(!e.record_only || e.record_prefix),
                            nowPlaying: (() => {
                                if (!channelMeta)
                                    return false
                                let list = [];
                                if (channelMeta.artist)
                                    list.push(channelMeta.artist)
                                if (channelMeta.title)
                                    list.push(channelMeta.title)
                                return {
                                    guid: channelMeta.guid,
                                    song: channelMeta.isSong,
                                    episode: channelMeta.isEpisode,
                                    text: list
                                }
                            })()
                        }
                    })
                    res.json({tuners, inputs});
                    break;
                case 'homepage':
                    const activeSource = await getAirOutput()
                    const tunerList = [getTuner(req.query.device)].map(e => {
                        const meta = (e.activeCh && !e.activeCh.hasOwnProperty("end")) ? nowPlaying(e.activeCh.ch) : (e.digital && watchdog_tuners[e.id] && watchdog_tuners[e.id].player_guid) ? getEvent(undefined, watchdog_tuners[e.id].player_guid) : false
                        const activeJob = activeJobs.filter(j => j.queue.slice(4) === e.id)
                        const channelMeta = (activeJob.length > 0) ? activeJob.map(j => getEvent(undefined, j.guid))[0] : (meta) ? meta : false
                        const percent = (() => {
                            if (e.digital && watchdog_tuners[e.id] && watchdog_tuners[e.id].player_guid && channelMeta && channelMeta.duration && channelMeta.duration > 1) {
                                return (Math.abs(Date.now() - watchdog_tuners[e.id].player_start) / (channelMeta.duration && (parseInt(channelMeta.duration.toString()) * 1000) + (((channelMeta.isEpisode) ? 300 : 10) * 1000))) * 100
                            }
                            if (activeJob.length > 0 && channelMeta && channelMeta.duration && channelMeta.duration > 1) {
                                return (Math.abs(Date.now() - activeJob[0].start) / (channelMeta.duration && (parseInt(channelMeta.duration.toString()) * 1000) + (((channelMeta.isEpisode) ? 300 : 10) * 1000))) * 100
                            }
                        })()
                        return {
                            id: e.id,
                            name: e.name,
                            channel: (() => {
                                if (channelMeta.channelId) {
                                    const ch = getChannelbyId(channelMeta.channelId)
                                    return `${ch.number} - ${ch.name}`
                                }
                                if (!meta)
                                    return "---"
                                const ch = getChannelbyId(e.activeCh.ch)
                                return `${ch.number} - ${ch.name}`
                            })(),
                            percent,
                            state: (e.digital && watchdog_tuners[e.id] && watchdog_tuners[e.id].player_guid) ? "Playing" : (e.airfoil_source && e.airfoil_source.name === activeSource) ? "Active" : (activeJob.length > 0) ? 'Recording (' + jobQueue[activeJob[0].queue].length + ')' : (e.locked) ? "Locked" : "Standby",
                            nowPlaying: (() => {
                                if (!channelMeta)
                                    return "---"
                                let list = [];
                                if (channelMeta.artist)
                                    list.push(channelMeta.artist)
                                if (channelMeta.title)
                                    list.push(channelMeta.title)
                                let text = list.join(' - ');
                                if (percent > 0)
                                    text += ` (${percent.toFixed()}%)`
                                return text
                            })()
                        }
                    })
                    res.json(tunerList[0]);
                    break;
                case 'config':
                    res.status(200).json(config)
                    break;
                default:
                    res.status(400).send("Unknown Request")
                    break;
            }
        } catch (err) {
            printLine("statusAPI", err.message, "error");
            res.status(500).send(err.message);
        }
    })

    if (!auth.username || !auth.password) {
        printLine("Init", `Authentication: Unable to start authentication because the cookie data is missing!`, "critical")
    } else {
        if (!(await loginToAccount())) {
            printLine("Init", `Failed to login to SXM!`, "critical");
            process.exit(0);
        } else {
            printLine("Init", "Account Login OK", "debug", accountSession);
        }
        await adbCommand(undefined, ["kill-server"])
        await initializeChannels();
        printLine("Init", `Channels Ready`, "debug", {
            ...listChannels()
        })
        const tun = listTuners()

        printLine("Init", "Settings up recorder queues...", "debug")
        for (let t of tun) {
            if (t.digital) {
                await initDigitalRecorder(t);
                //deviceWatcher(t)
                watchdog_tuners[t.id] = {
                    watchdog: null,
                    connectivity: null,
                    tuner_timeout: null,
                    player_start: null,
                    player_guid: null,
                    player_stopwatch: null,
                    player_controller: null,
                    timeout_sources: null
                };
            }
            if (!channelTimes.timetable[t.id])
                channelTimes.timetable[t.id] = []
        }
        if (tun.filter(e => e.digital).length > 0)
            digitalAvailable = true
        if (tun.filter(e => !e.digital).length > 0)
            satelliteAvailable = true

        await updateMetadata();
        registerSchedule();
        cron.schedule("* * * * *", async () => {
            updateMetadata();
        });
        cron.schedule("*/5 * * * *", async () => {
            saveMetadata()
        });

        if (channelTimes.queues && channelTimes.queues.length > 0) {
            jobQueue['extract'] = [];
            for (const a of channelTimes.queues) {
                printLine("Init", `Recovering Queue "${a.k}"...`, "debug")
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

        printLine("Init", `Devices Ready`, "debug", {
            ...tun
        })
        console.error(`Job Queues Ready`, "debug", {
            ...jobQueue
        })
        app.listen((config.listenPort) ? config.listenPort : 9080, async () => {
            printLine("Init", "Server running", "debug");
        });

        inflateRoomConfig();

        /*for (let k of Object.keys(channelsAvailable)) {
            // 'https://imgsrv-sxm-prod-device.streaming.siriusxm.com/'
            // {"key":"aem/d5/d54196330c8019cd91015f71ddd899c5_1699375386.jpeg","edits":[{"format":{"type":"jpeg"}},{"resize":{"width":600,"height":600}}]}
            if (channelsAvailable[k].image) {
                const image = await new Promise(resolve => {
                    let url = 'https://imgsrv-sxm-prod-device.streaming.siriusxm.com/';
                    let reqImage = {
                        "key": channelsAvailable[k].image,
                        "edits":[
                            {
                                "format":{
                                    "type":"jpeg"
                                }
                            },
                            {
                                "resize":{
                                    "width":600,
                                    "height":600
                                }
                            }
                        ]
                    }
                    url += Buffer.from(JSON.stringify(reqImage)).toString('base64');
                    request.get({
                        url,
                        headers: {
                            'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*!/!*;q=0.8,application/signed-exchange;v=b3;q=0.9',
                            'accept-language': 'en-US,en;q=0.9',
                            'cache-control': 'max-age=0',
                            'sec-ch-ua': '"Chromium";v="92", " Not A;Brand";v="99", "Microsoft Edge";v="92"',
                            'sec-ch-ua-mobile': '?0',
                            'sec-fetch-dest': 'document',
                            'sec-fetch-mode': 'navigate',
                            'sec-fetch-site': 'none',
                            'sec-fetch-user': '?1',
                            'referer': "https://siriusxm.com/",
                            'upgrade-insecure-requests': '1',
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36 Edg/92.0.902.73',
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
        console.log("Images Loaded OK")*/

        setInterval(checkLogin, 60000)
    }
})()
