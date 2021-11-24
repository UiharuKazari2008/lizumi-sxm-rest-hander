const cookies = require('./cookie.json')
const request = require('request').defaults({ encoding: null });
const moment = require('moment');

try {
    let channelNumber = "52"
    const timestamp = new moment().utc().subtract(6, "hours").valueOf()
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
        } else {
            const _json = JSON.parse(body);
            // Check if messages and successful response
            if (_json['ModuleListResponse']['messages'].length > 0 && _json['ModuleListResponse']['messages'][0]['message'].toLowerCase() === 'successful') {
                // Dig for CUE markers
                const json = _json['ModuleListResponse']['moduleList']['modules'][0]['moduleResponse']['liveChannelData']['markerLists'].filter(e => e['layer'] === 'cut')[0]['markers']
                // For each track that is longer then 65 Seconds
                let items = json.filter(e => (e.duration >= 65 || !e.duration)).map(e => {
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
                        isSong: (e.cut.cutContentType === "Song"),
                        isEpisode: false
                    }
                })

                // Is Episode Airing
                const episodes = _json['ModuleListResponse']['moduleList']['modules'][0]['moduleResponse']['liveChannelData']['markerLists'].filter(e => e['layer'] === 'episode')[0]['markers'].filter(e => !e['episode']['show']['isPlaceholderShow'] && !(e.time - items.filter(f => !f.isSong)[findClosest(items.filter(f => !f.isSong).map(f => f.syncStart), e.time - 60000)].syncStart < 900000))
                if (episodes.length > 0) {
                    items.push(...episodes.map(e => {
                        const time = moment(e['time'])
                        return {
                            guid: e.assetGUID,
                            fileSearch: time.format("YYYYMMDD-hhmmss"),
                            duration: e.duration.toFixed(0),
                            syncStart: time.valueOf(),
                            syncEnd: time.add(e.duration, "seconds").valueOf(),

                            title: e['episode']['longTitle'],
                            isSong: false,
                            isEpisode: true
                        }
                    }))
                }

                // Get latest track ID
                const nowPlaying = items.sort((x, y) => (x.syncStart < y.syncStart) ? -1 : (y.syncStart > x.syncStart) ? 1 : 0).pop()
                console.log(nowPlaying)
                if (nowPlaying.isEpisode) {
                    console.log(`${nowPlaying.title.replace("[\\\\/:*?\"<>|]", "_")}`)
                } else if (nowPlaying.isSong) {
                    console.log(`${nowPlaying.artist.replace("[\\\\/:*?\"<>|]", "_")} - ${nowPlaying.title.replace("[\\\\/:*?\"<>|]", "_")}`)
                } else {
                    console.log(`${nowPlaying.title.replace("[\\\\/:*?\"<>|]", "_")} - ${nowPlaying.artist.replace("[\\\\/:*?\"<>|]", "_")}`)
                }
            } else {
                console.log("FAULT");
            }
        }
    })
} catch (e) {
    console.error(e.message);
    console.log("FAULT");
}
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
