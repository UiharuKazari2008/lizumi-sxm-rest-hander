const cookies = require('./cookie.json')
const request = require('request').defaults({ encoding: null });
const moment = require('moment');
const json = require('/Volumes/SiriusXM/metadata.json');
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
try {
    const items = json['52'].filter(e => !e.isSong).sort((x, y) => (x.syncStart < y.syncStart) ? -1 : (y.syncStart > x.syncStart) ? 1 : 0)

    console.log(items.slice(-8))
    // Get latest track ID
    /*const nowPlaying = items.sort((x, y) => (x.syncStart < y.syncStart) ? -1 : (y.syncStart > x.syncStart) ? 1 : 0).pop()
    console.log(nowPlaying)
    if (nowPlaying.isEpisode) {
        console.log(`${nowPlaying.title.replace("[\\\\/:*?\"<>|]", "_")}`)
    } else if (nowPlaying.isSong) {
        console.log(`${nowPlaying.artist.replace("[\\\\/:*?\"<>|]", "_")} - ${nowPlaying.title.replace("[\\\\/:*?\"<>|]", "_")}`)
    } else {
        console.log(`${nowPlaying.title.replace("[\\\\/:*?\"<>|]", "_")} - ${nowPlaying.artist.replace("[\\\\/:*?\"<>|]", "_")}`)
    }*/
    const times = items.map(e => e.syncStart);
    const eventItem = items[findClosest(times, moment('20211123-220016', 'YYYYMMDD-HHmmss').valueOf() + 1200000)]
    console.log(eventItem)
} catch (e) {
    console.error(e.message);
    console.log("FAULT");
}

