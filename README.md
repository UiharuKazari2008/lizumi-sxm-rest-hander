# SXM Commander Server for SiriusXM
Device Manager and Automated Recorder for SiriusXM.

![image](https://github.com/user-attachments/assets/3af0c012-afe1-4bf8-abc2-eb9e831bb7b5)


# NOTICE
This is very early in a public release things may break or not work and may not be happy with any configuration errors<br>
The project name on github will be updated in due time

## Possible issue in future
Currently the previous android app is in use to record and play audio, the newer version of the app has been obvusated from easy decompiling (doable just not in my score of care). What i do need is the santax for the new notification intent to launch the app to the channel and timecode so if you find it open a issue 

## Features
* Allows remote tuning of radio from API
* Radio Prioritisation for tuning based on priority and locks
* Tracks what radio is tuned to what channel
* Extracts recordings from radios (Requires external allways running recorder, see below)
* Records Events and Songs 100% digitally via an android tuner device (see below)
* Manages AirFoil Audio Sources when changing radios
* Manages AirFoil Speakers for multi-room distribution of audio.
* Automatically extract or record events by keyword, cron, or manual API call (see below)
* Handles file naming
* Can manage multiple satellite and digital radios at the same time.
* Handles metadata from SiriusXM API

## Requirements
* macOS or Linux (UIs are macOS Only at this time and will be moved completely to REST and an Android App very soon)
* Satellite Radio or Dedicated Android Device / Emulator via USB (Automatic Wireless is soon, At this time you have to set up Wireless ADB)
  * Very little testing has been done with an emulator and I can not really give to many promises
* Valid SiriusXM Login and Subscription (1 streaming account per android device)
* Storage for extracted recording
* ffmpeg
* adb

### Other Requirements
These are required to fully use the application
* AirFoil
  * Automated Source Switching and Output/Room management
* Audio Hijack
  * Automated Recording for Satellite Radios
  * You can use any other method as long as your files are saved in a way they can be parsed
  
## Setup
### Hardware Configuration
#### Satellite Radios
NOTE: Your method for setting the channels on the radios via IR is currently not a part of this project, What ever you have should be able to handle a GET request to a URL you define for each channel. Later once I have the time I will work out a option with a ESP based IR transmiter but for now I use Logi Harmony for mine. Most people will prefer Digital recorders so...
1. Connect your radio to your server via a audio interface of your choice.
2. Setup a AudioHijack session to record that input and automatically split files at some time
   1. The recorder should include the date and time in the file name. Default expected is "YYYYMMDD-HHmmss"
   2. Example Filename would be `SXM_SAT_1_LIVE_YYYYMMDD-HHmmss.mp3`
   3. I will provide a example AudioHijack session Later
   4. If you want to use ffmpeg (have fun on mac) or something else then thats still out of scope at this time

#### Digital Radios
![image](https://github.com/user-attachments/assets/f2a4ad2a-e65b-421b-9423-27ae33da9fce)

I currently use the AVD thats part of the android SDK(Android Studio), i used to recommend the TCL A3 phone as a good baseline device as its $40 (at this time) but the batteries will expand and destroy the phone after a year...<br>
Your device must be running Android 10+
1. Disable all apps and system apps that are not required
2. Enable Do Not Disturb mode
3. Mute all system sounds and notifications
4. Connect device via USB or if emulator connect via network if remotely
5. Install the SiriusXM App
6. Login and verify its functionality

##### Startup Scrupt for Emulators on Mac
```shell
killall socat
/Users/kazari/Library/Android/sdk/emulator/emulator -list-avds
echo "Starting Recorder 1..."
nohup /Users/kazari/Library/Android/sdk/emulator/emulator -avd Lizumi-Recorder-1 -noaudio -no-snapshot -port 5670 &
sleep 5
echo "Opening Ports..."
nohup socat TCP-LISTEN:5670,fork,reuseaddr TCP4:127.0.0.1:5670 &
nohup socat TCP-LISTEN:5671,fork,reuseaddr TCP4:127.0.0.1:5671 &
sleep 30
echo "Starting Recorder 2..."
nohup /Users/kazari/Library/Android/sdk/emulator/emulator -avd Lizumi-Recorder-2 -no-snapshot -port 5672 &
sleep 5
echo "Opening Ports..."
nohup socat TCP-LISTEN:5672,fork,reuseaddr TCP4:127.0.0.1:5672 &
nohup socat TCP-LISTEN:5673,fork,reuseaddr TCP4:127.0.0.1:5673 &
```

### Software Configuration
1. Install NodeJS and PM2
2. `git clone https://github.com/UiharuKazari2008/lizumi-sxm-rest-hander`
3. Setup Configuration and Auth File (below)
4. `pm2 start server.js`

### Authentication File
Your account login to SiriusXM, This uses the new OAuth2 Login proccess that was enforced a while ago. Very much loved cause it makes things much simpler then the cookie way. 
```json
{
  "username": "",
  "password": ""
}
```

### Configuration File
|key|value|description|
|---|---|---|
|record_dir|String|Default working directory and where continuously recorder radios store there recordings|
|upload_dir|String|Default working directory to move completed recordings and extractions|
|backup_dir|String|Default directory that recordings and extractions are also sent for backup|
|extract_format|String|FFMPEG supported file format for recorded and extracted files|
|adb_command|String|ADB Command Path|
|ffmpeg_exec|String|FFMPEG Command Path|
|refreshMetadataInterval|Integer (Milliseconds)|Time between metadata pulls|
|channels|Array (Object)|Channels for tuneing and metadata|
|ignoredWords|Array (String)|List of terms that should be used as trigger to request manual metadata edits (not implemented yet/broken)|
|autosearch_terms|Array (Object)|Keywords to search for for automatic recording|
|schedule|Array (Object)|Automated events for recording or tuneing|

#### Channels
|key|value|description|
|---|---|---|
|record_dir|String|Default working directory and where continuously recorder radios store there recordings|
|upload_dir|String|Default working directory to move completed recordings and extractions|
|backup_dir|String|Default directory that recordings and extractions are also sent for backup|
|extract_format|String|FFMPEG supported file format for recorded and extracted files|
|adb_command|String|ADB Command Path|
|ffmpeg_exec|String|FFMPEG Command Path|
|refreshMetadataInterval|Integer (Milliseconds)|Time between metadata pulls|
|channels|Array (Object)|Channels for tuneing and metadata|
|ignoredWords|Array (String)|List of terms that should be used as trigger to request manual metadata edits (not implemented yet/broken)|
|autosearch_terms|Array (Object)|Keywords to search for for automatic recording|
|schedule|Array (Object)|Automated events for recording or tuneing|
