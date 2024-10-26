// Logging System
const config = require('./config.json');
const colors = require('colors');
const sleep = (waitTimeInMs) => new Promise(resolve => setTimeout(resolve, waitTimeInMs));
const WebSocket = require('ws');
const pm2 = require('pm2');
const os = require('os');
const pidusage = require('pidusage');
let logServerConn;
let logServerisConnected = false;
let unsentLogs = {};
let rollingIndex = 0;
let remoteLogger = false;
let flushTimeout;

const isPm2 = process.env.hasOwnProperty('PM2_HOME');
function bytesToMB(bytes) {
    return parseFloat((bytes / (1024 * 1024)).toFixed(2)); // Convert to MB and round to 2 decimals
}
function calculatePercentage(used, total) {
    return parseFloat(((used / total) * 100).toFixed(2)); // Round to 2 decimals
}
let metricsRunner;

module.exports = function (facility, subclient) {
    let module = {};

    async function reportMetrics() {
        try {
            // Get process metrics
            const stats = await pidusage(process.pid);
            const processCpuPercent = parseFloat(stats.cpu.toFixed(2));
            const processMemoryMB = bytesToMB(stats.memory);
            const processUptime = parseInt(process.uptime().toFixed(0));

            // System memory metrics
            const totalMemory = os.totalmem();
            const freeMemory = os.freemem();
            const usedMemory = totalMemory - freeMemory;
            const totalMemoryMB = bytesToMB(totalMemory);
            const freeMemoryMB = bytesToMB(freeMemory);
            const usedMemoryMB = bytesToMB(usedMemory);
            const memoryUsagePercent = calculatePercentage(usedMemory, totalMemory);

            const systemUptime = parseInt(os.uptime().toFixed(0));

            // Prepare data for sending
            const metrics = {
                isPm2,
                pm_id: process.env.pm_id,
                instance: process.env.NODE_APP_INSTANCE,
                name: (process.env.name || facility || 'default-process'),
                server: config.host_name,
                process: {
                    cpu: processCpuPercent,  // CPU percentage as a raw number
                    memoryUsed: processMemoryMB,  // Memory in MB
                    uptimeSeconds: processUptime  // Uptime in seconds
                },
                system: {
                    memory: {
                        total: totalMemoryMB,   // Total memory in MB
                        used: usedMemoryMB,     // Used memory in MB
                        free: freeMemoryMB,     // Free memory in MB
                        usagePercent: memoryUsagePercent  // Memory usage percentage
                    },
                    uptimeSeconds: systemUptime  // System uptime in seconds
                },
                time: new Date().valueOf()
            };
            // Send metrics to the log server
            if (logServerConn && logServerConn.readyState === WebSocket.OPEN) {
                logServerConn.send(JSON.stringify({ metrics }));
            }
            clearTimeout(metricsRunner);
            metricsRunner = setTimeout(reportMetrics, 30000)
        } catch (err) {
            console.error('Error reporting metrics:', err);
        }
    }
    function connectToWebSocket(serverUrl) {
        logServerConn = new WebSocket(serverUrl);

        logServerConn.onopen = () => {
            console.log('[LogServer] Connected to the server');
            logServerisConnected = true;
            clearTimeout(flushTimeout);
            flushTimeout = setTimeout(flushUnsentLogs, 5000);
        };
        logServerConn.onmessage = (event) => { handleIncomingMessage(event); };
        logServerConn.onclose = () => {
            logServerisConnected = false;
            reconnectToWebSocket(serverUrl);
        };
        logServerConn.onerror = (error) => {
            logServerisConnected = false;
            logServerConn.close();
        };
    }
    function reconnectToWebSocket(serverUrl) {
        //console.log('[LogServer] Attempting to reconnect...');
        setTimeout(() => {
            connectToWebSocket(serverUrl);
        }, 1000); // Reconnect attempt after 1 second
    }
    function handleIncomingMessage(event) {
        try {
            const data = JSON.parse(event.data);
            if (data.ack) {
                delete unsentLogs[data.id];
            } else if (data.control) {
                const { action, processName } = data.control;
                if (isPm2) {
                    pm2.connect((err) => {
                        if (err) {
                            sendLog("PM2", `Error connecting to PM2: ${err.message}`, 'error');
                            return;
                        }
                        if (action === 'start') {
                            pm2.stop(processName || process.env.name, (err) => {
                                if (err) console.error(`Failed to stop ${processName || process.env.name}:`, err);
                                else console.log(`Stopped ${processName || process.env.name} via PM2`);
                            });
                        } else if (action === 'stop') {
                            pm2.stop(processName || process.env.name, (err) => {
                                if (err) console.error(`Failed to stop ${processName || process.env.name}:`, err);
                                else console.log(`Stopped ${processName || process.env.name} via PM2`);
                            });
                        } else if (action === 'restart') {
                            pm2.restart(processName || process.env.name, (err) => {
                                if (err) console.error(`Failed to restart ${processName || process.env.name}:`, err);
                                else console.log(`Restarted ${processName || process.env.name} via PM2`);
                            });
                        }
                    });
                } else {
                    if (action === 'restart') {
                        process.exit(-55);
                    }
                }
            } else {
                console.log(data);
            }
        } catch (error) {
            console.error('[LogServer] Error parsing message:', error);
        }
    }
    function sendLog(proccess, text, level = 'debug', object, object2, color, no_ack = false) {
        const logId = generateLogId();
        const logEntry = {
            id: logId,
            message: text,
            level,
            time: new Date().valueOf(),
            server_name: config.host_name,
            name: facility,
            color,
            proccess,
            ack: !no_ack,
            extended: {
                object,
                object2
            }
        };
        if (!no_ack)
            unsentLogs[logId] = logEntry;
        if (logServerisConnected && logServerConn.readyState === WebSocket.OPEN)
            logServerConn.send(JSON.stringify(logEntry));
    }

    if (config.log_server) {
        remoteLogger = true
        connectToWebSocket('ws://' + config.log_server);
        if (!subclient) {
            reportMetrics();
            sendLog('Init', `Forwarding logs to Othinus Server`, 'debug');
            console.log(`[${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}][Init] Forwarding logs to Othinus Server - ${facility}`.gray);
        }
    }
    function flushUnsentLogs() {
        if (logServerisConnected && logServerConn.readyState === WebSocket.OPEN) {
            for (const logId in unsentLogs) {
                try {
                    logServerConn.send(JSON.stringify(unsentLogs[logId]));
                } catch (error) {
                    console.error(`[LogServer] Failed to send log ${logId}:`, error);
                    break; // Stop flushing if sending fails
                }
            }
        }
    }
    function generateLogId() {
        // Increment rolling index and reset if it exceeds 9999
        rollingIndex = (rollingIndex + 1) % 10000;
        return `${Date.now()}-${rollingIndex}`;
    }

    module.printLine = async function printLine(proccess, text, level, object, object2, no_ack = false) {
        let logObject = {}
        let logString =  `${text}`
        if (typeof object !== 'undefined' || (object && object !== null)) {
            if ( (typeof (object) === 'string' || typeof (object) === 'number' || object instanceof String) ) {
                logString += ` : ${object}`
            } else if (typeof(object) === 'object') {
                logObject = Object.assign({}, logObject, object)
                if (object.hasOwnProperty('message')) {
                    logString += ` : ${object.message}`
                } else if (object.hasOwnProperty('sqlMessage')) {
                    logString += ` : ${object.sqlMessage}`
                }
            }
        }
        if (typeof object2 !== 'undefined' || (object2 && object2 !== null)) {
            if (typeof(object2) === 'string' || typeof(object2) === 'number' || object2 instanceof String) {
                logObject.extraMessage = object2.toString()
            } else if (typeof(object2) === 'object') {
                logObject = Object.assign({}, logObject, object2)
                if (object2.hasOwnProperty('itemFileData')) {
                    delete logObject.itemFileData
                    logObject.itemFileData = object2.itemFileData.length
                } else if (object.hasOwnProperty('itemFileArray')) {
                    delete logObject.itemFileArray
                }
            }
        }
        if (level === "warn" || level === "warning") {
            if (remoteLogger)
                sendLog(proccess, logString, 'warning', logObject);
            console.log(`[${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}][${proccess}] ${text}`.black.bgYellow)
            if (!text.toLowerCase().includes('block') && config.log_objects) {
                console.error(logObject)
            }
        } else if (level === "error" || level === "err") {
            if (remoteLogger)
                sendLog(proccess, logString, 'error', logObject);
            console.log(`[${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}][${proccess}] ${text}`.black.bgRed)
            if (object)
                console.error(object)
            if (object2)
                console.error(object2)
        } else if (level === "critical" || level === "crit") {
            if (remoteLogger)
                sendLog(proccess, logString, 'critical', logObject);``
            console.log(`[${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}][${proccess}] ${text}`.bgMagenta)
            if (object)
                console.error(object)
            if (object2)
                console.error(object2)
        } else if (level === "alert") {
            if (remoteLogger)
                sendLog(proccess, logString, 'alert', logObject);
            console.log(`[${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}][${proccess}] ${text}`.red)
            console.log(logObject)
        } else if (level === "emergency") {
            if (remoteLogger)
                sendLog(proccess, logString, 'emergency', logObject);
            console.log(`[${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}][${proccess}] ${text}`.bgMagenta)
            if (object)
                console.error(object)
            if (object2)
                console.error(object2)
            sleep(250).then(() => {
                process.exit(4);
            })
        } else if (level === "notice") {
            console.log(`[${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}][${proccess}] ${text}`.green)
            if (remoteLogger)
                sendLog(proccess, logString, 'notice', logObject);
            if (config.log_objects) { console.log(logObject) }
        } else if (level === "debug") {
            if (proccess.includes("Express")) {
                if (remoteLogger)
                    sendLog(proccess, logString, 'debug', logObject, undefined, "express-orange");
                console.log(`[${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}][${proccess}] ${text}`.yellow)
            } else {
                if (remoteLogger)
                    sendLog(proccess, logString, 'debug', logObject);
                console.log(`[${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}][${proccess}] ${text}`.gray)
            }
            if (config.log_objects) { console.log(logObject) }
        } else if (level === "info") {
            if (text.includes("Sent message to ") || text.includes("Connected to Kanmi Exchange as ")) {
                if (remoteLogger)
                    sendLog(proccess, logString, 'info', logObject, undefined, 'gray');
                console.log(`[${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}][${proccess}] ${text}`.gray)
            } else if (text.includes('New Media Tweet in')) {
                if (remoteLogger)
                    sendLog(proccess, logString, 'info', logObject, undefined, 'green');
                console.log(`[${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}][${proccess}] ${text}`.black.bgGreen)
            } else if (text.includes('New Text Tweet in')) {
                if (remoteLogger)
                    sendLog(proccess, logString, 'info', logObject, undefined, 'green');
                console.log(`[${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}][${proccess}] ${text}`.black.bgGreen)
            } else {
                if (remoteLogger)
                    sendLog(proccess, logString, 'info', logObject);
                console.log(`[${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}][${proccess}] ${text}`.cyan.bgBlack)
            }
            if (config.log_objects) { console.log(logObject) }
        } else {
            if (remoteLogger)
                sendLog(proccess, logString, 'debug', logObject);
            if (config.log_objects) { console.log(logObject) }
            console.log(`[${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}][${proccess}] ${text}`)
        }
    }

    process.on('uncaughtException', function(err) {
        console.log(err)
        console.log(`[${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}][uncaughtException] ${err.message}`.bgRed);
        if (remoteLogger)
            sendLog('uncaughtException', `${err.message}`, 'critical');
    });

    return module;
};
