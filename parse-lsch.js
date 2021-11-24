const config = require('./config.json')
const moment = require('moment');
const fs = require('fs');
const path = require("path");

let metadata = require(path.join(config.record_dir, `metadata.json`));
const {spawn, exec} = require("child_process");
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

        const eventsToParse = fs.readdirSync(config.record_dir).filter(e => e.startsWith(config.record_prefix) && e.endsWith(".lsch")).map(e => e.replace(".lsch", ''));
        const fileTimes = fs.readdirSync(config.record_dir).filter(e => e.startsWith(config.record_prefix) && e.endsWith(".mp3")).map(e => {
            return {
                date: moment(e.replace(config.record_prefix, '').split('.')[0] + '', "YYYYMMDD-HHmmss"),
                file: e
            }
        });
        eventsToParse.map(async e => {
            const recStartTime = moment(e.replace(config.record_prefix, '') + '', "YYYYMMDD-HHmmss")
            if (recStartTime.isValid()) {
                let channelNumber = fs.readFileSync(path.join(config.record_dir, `${e}.lsch`), 'utf8').trim();
                if (channelNumber.length < 1)
                    channelNumber = '52'
                const items = metadata[channelNumber];
                const times = metadata[channelNumber].map(e => e.syncStart);
                const eventItem = items[findClosest(times, recStartTime.valueOf() + 1200000)]
                if (eventItem.duration > 0) {
                    const startFile = findClosest(fileTimes.map(e => e.date.valueOf()), eventItem.syncStart)
                    const endFile = findClosest(fileTimes.map(e => e.date.valueOf()), eventItem.syncEnd)
                    let allFilesReady
                    if (endFile + 1 === fileTimes.length && config.record_split_script) {
                        allFilesReady = await new Promise(function (resolve) {
                            exec(['osascript', config.record_split_script].join(' '), { cwd: config.record_dir, encoding: 'utf8' }, (err, stdout, stderr) => {
                                if (err) {
                                    console.error(`Extraction failed ${e}: Unable to split file!`)
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
                        allFilesReady = true
                    }
                    if (allFilesReady) {
                        const fileItems = fileTimes.slice(startFile, endFile + 1)
                        const fileList = fileItems.map(e => e.file).join('|')
                        const fileStart = msToTime(moment(eventItem.syncStart) - fileItems[0].date.valueOf())
                        const fileEnd = msToTime((eventItem.duration * 1000) + 10000)
                        const fileDestination = path.join(config.record_dir, `Extracted_${eventItem.syncStart}.mp3`)
                        const eventFilename = (() => {
                            if (eventItem.isEpisode) {
                                return `${eventItem.title.replace(/[^\w\s]/gi, '')} (${recStartTime.format("YYYY-MM-DD HHmm")})${config.record_format}`
                            } else if (eventItem.isSong) {
                                return `${eventItem.artist.replace(/[^\w\s]/gi, '')} - ${eventItem.title.replace(/[^\w\s]/gi, '')} (${recStartTime.format("YYYY-MM-DD HHmm")})${config.record_format}`
                            } else {
                                return `${eventItem.title.replace(/[^\w\s]/gi, '')} - ${eventItem.artist.replace(/[^\w\s]/gi, '')} (${recStartTime.format("YYYY-MM-DD HHmm")})${config.record_format}`
                            }
                        })()

                        console.log(`Found Requested Event! CH${channelNumber} "${eventFilename}"...`)
                        console.log(`${fileStart} | ${fileEnd}`)
                        const generateFile = await new Promise(function (resolve) {
                            const ffmpeg = ['ffmpeg', '-hide_banner', '-y', '-i', `concat:"${fileList}"`, '-ss', fileStart, '-t', fileEnd, `Extracted_${eventItem.syncStart}.mp3`]
                            exec(ffmpeg.join(' '), {
                                cwd: config.record_dir,
                                encoding: 'utf8'
                            }, (err, stdout, stderr) => {
                                if (err) {
                                    console.error(`Extraction failed ${e}: FFMPEG reported a error!`)
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
                                fs.copyFileSync(fileDestination.toString(), path.join(config.backup_dir, eventFilename).toString())
                                fs.copyFileSync(fileDestination.toString(), path.join(config.upload_dir, 'HOLD-' + eventFilename).toString())
                                fs.renameSync(path.join(config.upload_dir, 'HOLD-' + eventFilename).toString(), path.join(config.upload_dir, eventFilename).toString())
                                fs.renameSync(path.join(config.record_dir, `${e}.lsch`).toString(), path.join(config.record_dir, `${e}.completed-lsch`).toString())
                                console.log(`Extraction complete!`)
                            } catch (e) {
                                console.error(`Extraction failed ${e}: cant not be parsed because the file failed to be copied!`)
                            }
                        } else {
                            console.error(`Extraction failed ${e}: cant not be parsed because the file does not exists!`)
                        }
                    } else {
                        console.error(`Extraction failed ${e}: cant not be parsed because not all files are ready!`)
                    }
                }
            } else {
                console.error(`Extraction failed ${e}: cant not be parsed because the date is invalid!`)
            }
        })

    } catch (e) {
        console.error(e);
        console.error("FAULT");
    }
})()

