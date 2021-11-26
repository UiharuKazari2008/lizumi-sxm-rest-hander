const config = require('./config.json')
const moment = require('moment');
const fs = require('fs');
const path = require("path");
const osascript = require('node-osascript');
const { spawn, exec } = require("child_process");
const cron = require('node-cron');
const db = require('better-sqlite3')(path.join(config.record_dir, "lizumi.db"));

(async () => {

})()
