const cookies = require('./cookie.json')
const config = require('./config.json')
const request = require('request').defaults({ encoding: null });
const moment = require('moment');
const fs = require('fs');
const path = require("path");

let metadata = {};
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
(async () => {
    try {
        if (fs.existsSync(path.join(config.record_dir, `metadata.json`))) {
            metadata = require(path.join(config.record_dir, `metadata.json`))
        }
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
                    console.log("FAULT: XM did not give a successful API response");
                    return false;
                }
            } catch (e) {
                console.error(e.message);
                console.log("FAULT");
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
})()
