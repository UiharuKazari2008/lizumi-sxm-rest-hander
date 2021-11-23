const cookies = require('./cookie.json')
const config = require('./config.json')
const request = require('request').defaults({ encoding: null });
const moment = require('moment');
const fs = require('fs');
const path = require("path");

let metadata = {};
(async () => {
    try {
        await Promise.all(['51','52'].map(async channelNumber => {
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
                            try {
                                const _json = JSON.parse(body);
                                // Check if messages and successful response
                                if (_json['ModuleListResponse']['messages'].length > 0 && _json['ModuleListResponse']['messages'][0]['message'].toLowerCase() === 'successful') {
                                    // Dig for CUE markers
                                    const json = _json['ModuleListResponse']['moduleList']['modules'][0]['moduleResponse']['liveChannelData']['markerLists'].filter(e => e['layer'] === 'cut')[0]['markers']
                                    // For each track that is longer then 65 Seconds
                                    const times = json.filter(e => e.duration >= 65).map(e => moment(e['time']).valueOf())
                                    const items = json.filter(e => e.duration >= 65 || !e.duration ).map(e => {
                                        // Get localized timecode
                                        const time = moment(e['time'])
                                        // Format to Lizumi Meta Format v2
                                        return {
                                            guid: e.assetGUID,
                                            fileSearch: time.format("YYYYMMDD-hhmmss"),
                                            duration: e.duration.toFixed(0),
                                            syncStart: time.valueOf(),
                                            syncEnd: time.add(e.duration, "seconds").valueOf(),

                                            title: e.cut.title,
                                            artist: e.cut.artists.map(f => f.name).join('/'),
                                            album: (e.cut.album) ? e.cut.album.title : undefined,
                                            isSong: (e.cut.cutContentType === "Song")
                                        }
                                    })
                                    resolve({ times, items })
                                } else {
                                    console.log("FAULT: XM did not give a successful API response");
                                    resolve(false);
                                }
                            } catch (e) {
                                console.error(e.message);
                                console.log("FAULT");
                                resolve(false);
                            }
                        }
                    })
                })
                if (chmeta)
                    metadata[channelNumber] = chmeta;
                console.log(`Got Metadata for CH ${channelNumber}`)
            } catch (e) {
                console.error(e.message);
                console.error("FAULT");
            }
        }))
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

        const eventsToParse = fs.readdirSync(config.record_dir).filter(e => e.startsWith(config.record_prefix) && e.endsWith(".levt")).map(e => e.replace(".levt", ''));
        eventsToParse.map(e => {
            const recStartTime = moment(e.replace(config.record_prefix, '') + '', "YYYYMMDD-HHmmss")
            if (recStartTime.isValid()) {
                let channelNumber = fs.readFileSync(path.join(config.record_dir, `${e}.levt`), 'utf8').trim();
                if (channelNumber.length < 1)
                    channelNumber = '52'
                const items = metadata[channelNumber]['items'];
                const times = metadata[channelNumber]['times'];
                const eventItem = items[findClosest(times, recStartTime.valueOf())]
                const eventFilename = `${eventItem.title.replace("[\\\\/:*?\"<>|]", "_")} - ${eventItem.artist.replace("[\\\\/:*?\"<>|]", "_")} (${recStartTime.format("YYYY-MM-DD HH:mm")})${config.record_format}`
                console.log(eventFilename)

                if (fs.existsSync(path.join(config.record_dir, `${e}${config.record_format}`))) {
                    try {
                        fs.copyFileSync(path.join(config.record_dir, `${e}${config.record_format}`), path.join(config.backup_dir, eventFilename))
                        fs.copyFileSync(path.join(config.record_dir, `${e}${config.record_format}`), path.join(config.upload_dir, eventFilename))
                        fs.unlinkSync(fs.existsSync(path.join(config.record_dir, `${e}.levt`)))
                    } catch (e) {
                        console.error(`${e} cant not be parsed because the file failed to be copied!`)
                    }
                } else {
                    console.error(`${e} cant not be parsed because the file does not exists!`)
                }
            } else {
                console.error(`${e} cant not be parsed because the date is invalid!`)
            }
        })

    } catch (e) {
        console.error(e);
        console.error("FAULT");
    }
})()

