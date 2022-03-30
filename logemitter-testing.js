const { spawn, exec } = require("child_process");
const { EventEmitter } = require("events");

function adbCommand(device, commandArray) {
    return new Promise(function (resolve) {
        const adblaunch = [(config.adb_command) ? config.adb_command : 'adb', '-s', device, ...commandArray]
        exec(adblaunch.join(' '), {
            encoding: 'utf8',
            timeout: 10000
        }, (err, stdout, stderr) => {
            if (err) {
                console.error(stdout.toString().trim().split('\n').map(e => `${device}: ${e}`).join('\n'))
                console.error(err)
                resolve({
                    log: stdout.toString().split('\n').map(e => e.trim()).filter(e => e.length > 0 && e !== '').join('\n'),
                    error: true
                })
            } else {
                if (stderr.toString().length > 1)
                    console.error(stderr.toString().trim().split('\n').map(e => `${device}: ${e}`).join('\n'))
                console.log(stdout.toString().trim().split('\n').map(e => `${device}: ${e}`).join('\n'))
                resolve({
                    log: stdout.toString().split('\n').map(e => e.trim()).filter(e => e.length > 0 && e !== '').join('\n'),
                    error: false
                })
            }
        });
    })
}
// Start the Logcat
let logEmitter = new EventEmitter();

logEmitter.on('playing', () => {
    console.log(`Device is playing`)
})
logEmitter.on('interrupted', () => {
    console.log(`Device is stopped`)
})

function searchStringInArray (str, strArray) {
    for (let j=0; j<strArray.length; j++) {
        if (strArray[j].match(str)) return j;
    }
    return -1;
}

function adbLogStart(device) {
    let device_logs = '';
    const adblaunch = [...((device) ? ['-s', device]: []), "logcat"]
    const logWawtcher = spawn('adb', adblaunch, {
        encoding: 'utf8'
    });

    let playDelay = null
    let stopDelay = null

    logWawtcher.stdout.on('data', (data) => {
        if (data.toString().includes('onPlayStatusChanged(): state==')) {
            const eventType = data.toString().split("==").pop().toLowerCase().trim()
            //console.log(eventType)
            if (eventType === "playing") {
                clearTimeout(playDelay);
                playDelay = setTimeout(() => {
                    console.log("Playing")
                    logEmitter.emit('playing', null)
                }, 1000)
            } else if (eventType.startsWith("paused") || eventType === "stopped") {
                clearTimeout(stopDelay);
                stopDelay = setTimeout(() => {
                    console.log("Stopped")
                    logEmitter.emit('interrupted', null)
                }, 1500)
            }
        }
        if (data.toString().includes('com.sirius' || 'com.rom1v.sndcpy')) {
            device_logs += data.toString()
        }
    })
    logWawtcher.stderr.on('data', (data) => {
        if (data.toString().includes('com.sirius' || 'com.rom1v.sndcpy')) {
            //console.error(`${device} : ${data}`)
            device_logs += data.toString()
        }
    })
}
function checkPlayStatus(device) {
    const adblaunch = ['adb', ...((device) ? ['-s', device]: []), "shell dumpsys media_session"]
    exec(adblaunch.join(' '), {
        encoding: 'utf8'
    }, (err, stdout, stderr) => {
        if (err) {
            console.error(`${device} : ${err.message}`)
        } else {
            const log = stdout.toString().split('\r').join('').split('\n')
            const services = log.slice(searchStringInArray('  Sessions Stack', log))
                .filter(e => e.includes('package='))
                .map(e => e.split(' package=')[1])
            const status = log.slice(searchStringInArray('  Sessions Stack', log))
                .filter(e => e.trim().includes('state=PlaybackState'))
                .map((e,i) => {
                    let x = {}
                    x[services[i]] = (() => {
                        const playState = e.split('state=PlaybackState').pop().trim().slice(1,-1)
                            .split(', ').filter(e => e.startsWith('state='))[0].split('=')[1]
                        switch (playState) {
                            case "0":
                                // none
                                return "none"
                            case "1":
                                // stop
                                return "stopped"
                            case "2":
                                // pause
                                return "paused"
                            case "3":
                                // play
                                return "playing"
                            default:
                                // everything i dont care about
                                return "unknown"
                        }
                    })()
                    return x
                })
            console.log(status)
        }
    });
}

setInterval(() => {
    checkPlayStatus('CIAMSK79SOKFBIN7');
}, 1000)