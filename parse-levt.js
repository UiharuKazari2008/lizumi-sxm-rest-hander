const cookies = require('./cookie.json')
const config = require('./config.json')
const request = require('request').defaults({ encoding: null });
const moment = require('moment');
const fs = require('fs');
const path = require("path");

let metadata = require(path.join(config.record_dir, `metadata.json`));
(async () => {
    try {
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
                const items = metadata[channelNumber];
                const times = metadata[channelNumber].map(e => e.syncStart);
                const eventItem = items[findClosest(times, recStartTime.valueOf())]
                const eventFilename = (() => {
                    if (eventItem.isEpisode) {
                        return `${eventItem.title.replace(/[^\w\s]/gi, '')} (${recStartTime.format("YYYY-MM-DD HHmm")})${config.record_format}`
                    } else if (eventItem.isSong) {
                        return `${eventItem.artist.replace(/[^\w\s]/gi, '')} - ${eventItem.title.replace(/[^\w\s]/gi, '')} (${recStartTime.format("YYYY-MM-DD HHmm")})${config.record_format}`
                    } else {
                        return `${eventItem.title.replace(/[^\w\s]/gi, '')} - ${eventItem.artist.replace(/[^\w\s]/gi, '')} (${recStartTime.format("YYYY-MM-DD HHmm")})${config.record_format}`
                    }
                })()

                if (fs.existsSync(path.join(config.record_dir, `${e}${config.record_format}`))) {
                    const stat = fs.statSync(path.join(config.record_dir, `${e}${config.record_format}`))
                    const now = new Date().getTime();
                    const endTime = new Date(stat.mtime).getTime() + 60000;
                    console.log(eventFilename)
                    if (now > endTime) {
                        try {
                            fs.copyFileSync(path.join(config.record_dir, `${e}${config.record_format}`).toString(), path.join(config.backup_dir, eventFilename).toString(), fs.constants.COPYFILE_FICLONE_FORCE)
                            fs.copyFileSync(path.join(config.record_dir, `${e}${config.record_format}`).toString(), path.join(config.upload_dir, eventFilename).toString(), fs.constants.COPYFILE_FICLONE_FORCE)
                            //fs.renameSync(path.join(config.record_dir, `${e}.levt`).toString(), path.join(config.record_dir, `${e}.completed-levt`).toString())
                        } catch (e) {
                            console.error(`${e} cant not be parsed because the file failed to be copied!`)
                        }
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

