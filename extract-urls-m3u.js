const fs = require('fs');
const config = require('./config.json')
const moment = require("moment");

const data = fs.readFileSync('./9472.m3u8').toString();

let aacdata = {};
const channelNumber = '9472'

if (!aacdata[channelNumber]) {
    aacdata[channelNumber] = {
        key: null,
        urls: []
    }
}

const m3udata = data.split('\n')

aacdata[channelNumber].key = m3udata.filter(e => e.startsWith('#EXT-X-KEY')).map(e => e.split(':').pop().replace('URI="', `URI="http://${config.sxmclient_host}/`)).pop()
const currentTimes = aacdata[channelNumber].urls.map(e => e.streamTime)
const urls = m3udata.filter(e => e.startsWith('AAC_Data')).map(e => {
    let _res = {
        url: `http://${config.sxmclient_host}/${e}`
    }
    try {
        _res.streamTime = moment(m3udata[m3udata.indexOf(e) - 2].split('PROGRAM-DATE-TIME:').pop()).valueOf()
    } catch (e) { console.error(e) }
    try {
        _res.duration = parseInt(m3udata[m3udata.indexOf(e) - 1].split('EXTINF:').pop())
    } catch (e) { console.error(e) }

    return _res
}).filter(e => currentTimes.indexOf(e.streamTime) === -1)


aacdata[channelNumber].urls.push(...urls)
aacdata[channelNumber].urls.filter(e => e.streamTime >= moment().subtract(3, 'hours').valueOf())

console.log(aacdata[channelNumber])
console.log(moment(aacdata[channelNumber].urls.pop().streamTime).subtract(1, 'hour').valueOf() - Date.now())
