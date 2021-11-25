const config = require('./config.json')
const moment = require('moment');
const fs = require('fs');
const path = require("path");
const osascript = require('node-osascript');

let metadata = require(path.join(config.record_dir, `metadata.json`));
const {spawn, exec} = require("child_process");
(async () => {
    try {
        const findClosest = (arr, num) => {
            const creds = arr.reduce((acc, val, ind) => {
                let {diff, index} = acc;
                const difference = Math.abs(val - num);
                if (difference < diff) {
                    diff = difference;
                    index = ind;
                }
                return {diff, index};
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
            const eventsMeta = metadata[channelNumber].filter(e => e.duration >= 600 && !e.isSong).reverse()
            const fileTimes = fs.readdirSync(config.record_dir).filter(e => e.startsWith(config.record_prefix) && e.endsWith(".mp3")).map(e => {
                return {
                    date: moment(e.replace(config.record_prefix, '').split('.')[0] + '', "YYYYMMDD-HHmmss"),
                    file: e
                }
            });

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
                    return `"[${moment(e.syncStart).format("MMM D HH:mm")}${(e.isEpisode) ? '🔶' : '✅'}] ${name} (${msToTime(e.duration * 1000).split('.')[0]})"`
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
            eventsToParse.map(async eventItem => {
                if (eventItem.duration > 0) {
                    let startFile = findClosest(fileTimes.map(e => e.date.valueOf()), eventItem.syncStart) - 1
                    if (startFile < 0)
                        startFile = 0
                    const endFile = findClosest(fileTimes.map(e => e.date.valueOf()), eventItem.syncEnd)
                    const fileItems = fileTimes.slice(startFile, endFile + 1)
                    const fileList = fileItems.map(e => e.file).join('|')
                    const fileStart = msToTime(Math.abs(moment(eventItem.syncStart) - fileItems[0].date.valueOf()))
                    const fileEnd = msToTime((eventItem.duration * 1000) + 10000)
                    const fileDestination = path.join(config.record_dir, `Extracted_${eventItem.syncStart}.mp3`)
                    const _eventFilename = (() => {
                        if (eventItem.isEpisode) {
                            return `${eventItem.title.replace(/[^\w\s]/gi, '')} (${moment(eventItem.syncStart).format("YYYY-MM-DD HHmm")})${config.record_format}`
                        } else if (eventItem.isSong) {
                            return `${eventItem.artist.replace(/[^\w\s]/gi, '')} - ${eventItem.title.replace(/[^\w\s]/gi, '')} (${moment(eventItem.syncStart).format("YYYY-MM-DD HHmm")})${config.record_format}`
                        } else {
                            return `${eventItem.title.replace(/[^\w\s]/gi, '')} - ${eventItem.artist.replace(/[^\w\s]/gi, '')} (${moment(eventItem.syncStart).format("YYYY-MM-DD HHmm")})${config.record_format}`
                        }
                    })()
                    const eventFilename = await new Promise(resolve => {
                        const dialog = [
                            `set dialogResult to (display dialog "Filename" default answer "${_eventFilename}" buttons {"Keep", "Update"} default button 2 giving up after 300)`,
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
                        }, 90000)
                    })

                    console.log(`Found Requested Event! "${eventFilename}"...`)
                    console.log(`${fileStart} | ${fileEnd}`)
                    const generateFile = await new Promise(function (resolve) {
                        const ffmpeg = ['ffmpeg', '-hide_banner', '-y', '-i', `concat:"${fileList}"`, '-ss', fileStart, '-t', fileEnd, `Extracted_${eventItem.syncStart}.mp3`]
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
                                    exec(`cp ${fileDestination.toString()} ${path.join(config.backup_dir, eventFilename).toString()}`, (err, result) => {
                                        if (err)
                                            console.error(err)
                                        resolve((err))
                                    })
                                })
                            }
                            if (config.upload_dir) {
                                await new Promise(resolve => {
                                    exec(`cp ${fileDestination.toString()} ${path.join(config.upload_dir, 'HOLD-' + eventFilename).toString()}`, (err, result) => {
                                        if (err)
                                            console.error(err)
                                        resolve((err))
                                    })
                                })
                                await new Promise(resolve => {
                                    exec(`mv ${path.join(config.upload_dir, 'HOLD-' + eventFilename).toString()} ${path.join(config.upload_dir, eventFilename).toString()}`, (err, result) => {
                                        if (err)
                                            console.error(err)
                                        resolve((err))
                                    })
                                })
                            }
                            if (eventItem.file) {
                                fs.renameSync(path.join(config.record_dir, `${eventItem.file}.lsch`).toString(), path.join(config.record_dir, `${eventItem.file}.completed-lsch`).toString())
                            }
                            console.log(`Extraction complete!`)
                        } catch (e) {
                            console.error(`Extraction failed: cant not be parsed because the file failed to be copied!`)
                        }
                    } else {
                        console.error(`Extraction failed: cant not be parsed because the file does not exists!`)
                    }
                }
            })
        }

    } catch (e) {
        console.error(e);
        console.error("FAULT");
    }
})()

