import { parseXMLSubtitles, filterAndFormatSubtitles } from './subsFormatter.js';
import { saveItemToCollection, searchSubtitles, isVideoInCollection } from './dbManager.js';
import express from 'express';
import { exec } from 'child_process';
import path from 'path';
import axios from 'axios';
import fs from 'fs';
import cors from 'cors';

import https from 'https';
import ytdl from 'ytdl-core';


const __filename = new URL(import.meta.url).pathname;
const __dirname = path.dirname(__filename);

const ytDlpPath = path.join(__dirname, '/yt-dlp');


const app = express();
const port = process.env.PORT || 3001;

app.use(cors());

const server = app.listen(port, () => console.log(`App is listening on port ${port}!`));

app.get('/api/check', async (req, res) => {
  res.send(`Seems to be working fine 😉`)
});

app.get('/api/testYtdlCore', async (req, res) => {
  const videoId = req.query.video;
  const videoURL = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    const info = await ytdl.getInfo(videoURL);
    const title = info.videoDetails.title;
    console.log(info.videoDetails.thumbnails);
    const thumbnailUrl = info.videoDetails.thumbnails[info.videoDetails.thumbnails.length-1].url;

    const format = 'xml';

    console.log(`Fetching data for episode '${title}'...`);

    const subtitles = info.player_response.captions.playerCaptionsTracklistRenderer.captionTracks

    if (subtitles && subtitles.length) {
      const track = subtitles.find(t => t.languageCode === 'fr');
      if (track) {
        console.log('Retrieving captions:', track.name.simpleText);
        
        const output = path.resolve(__dirname, `${info.videoDetails.videoId}.${track.languageCode}.${format}`).substring(3);
        
        console.log('Saving to', output);
        https.get(`${track.baseUrl}&fmt=${format !== 'xml' ? format : ''}`, async res => {
          let vttData = '';

          res.on('data', chunk => {
            vttData += chunk;
          });

          res.on('end', async () => {
            const subs = await parseXMLSubtitles(vttData);
            const output = ({
              videoId: videoId,
              videoTitle: title,
              thumbnailUrl: thumbnailUrl,
              captions: subs
            });

            await saveItemToCollection('subtitles', output)
          });
        })
      } else {
        console.log('Could not find captions for', lang);
      }
    } else {
      console.log('No captions found for this video');
    }

    console.log(`Added '${title}' to the database.`);
    res.json(`Added '${title}' to the database.`);
  } catch (error) {
    console.error('Error fetching video info and subtitles:', error);
    res.status(500).json({ error: 'Error fetching video info and subtitles' });
  }
});


app.get('/api/fetchVideoInfoAndSubs', async (req, res) => {
  var videoId = req.query.video;

  const command = `cd yt-dlp \
    && yt-dlp.exe --skip-download --get-title --get-id --get-thumbnail --encoding utf-8 --extractor-args "youtube:lang=fr" https://youtube.com/watch?v=${videoId} \
    && yt-dlp.exe --skip-download --write-auto-subs --sub-format best --convert-subs srt --sub-lang fr -o "${videoId}" https://youtube.com/watch?v=${videoId} \
    && rm -f ${ytDlpPath}/*.vtt`;

  exec(command, async (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing command: ${error}`);
      res.status(500).json({ error: 'Command execution failed' });
      return;
    }

    const lines = stdout.trim().split('\n');

    const title = lines[0].trim();
    const videoId = lines[1].trim();
    const thumbnailUrl = lines[2].trim();

    console.log(`Fetching data for episode '${title}'...`);

    const subs = await filterAndFormatSubtitles(videoId + '.fr.srt');
    console.log(`Found ${subs.length} subtitle items.`);

    await saveItemToCollection('subtitles', {
      videoId: videoId,
      videoTitle: title,
      thumbnailUrl: thumbnailUrl,
      captions: subs
    })

    console.log(`Added '${title}' to the database.`);

    // Delete the .srt file
    fs.unlink(`./yt-dlp/${videoId}.fr.srt`, (err) => {
      if (err) 
        console.error(`Error deleting file: ${err}`);
    });

    console.log(`Finished fetching episode data.`);
    res.json(stdout)
  });
});


app.get('/api/fetchMatchingCaptions', async (req, res) => {
  var search = req.query.search;

  searchSubtitles(search)
    .then((result) => {
      console.log('Matching subtitles:', result);
      res.json(result)
    })
    .catch((error) => {
      console.error('Error:', error);
    });
});


app.get('/api/updateCaptionsDbRecords', async (req, res) => {
  console.log('Updating database records...');
  try {
    const playlistId = 'PLBeZasrZ8WgFWEaZADycG4SqaVynvM4ty';
    const apiKey = process.env.YOUTUBE_API_KEY;
    let nextPageToken = '';

    setTimeout(() => {}, 1000);

    do {
      const response = await axios.get(`https://www.googleapis.com/youtube/v3/playlistItems`, {
        params: {
          part: 'snippet',
          maxResults: 100,
          playlistId: playlistId,
          key: 'AIzaSyAVkfl2nT8yhlACQQJWqElHTm_hVvurbDg',
          pageToken: nextPageToken
        },
      });

      const data = response.data;
      const playlistVideos = data.items.map(item => ({
        videoId: item.snippet.resourceId.videoId,
        videoTitle: item.snippet.title,
      }));

      await Promise.all(playlistVideos.map(async (video) => {
        if (!(await isVideoInCollection(video.videoId, 'subtitles'))) {
          await axios.get(`http://testtest-5uol.onrender.com/api/testYtdlCore?video=${video.videoId}`);
        }
      }));

      // Set the nextPageToken for the next iteration
      nextPageToken = data.nextPageToken;
    } while (nextPageToken);

    res.json(`Added videos to the db.`);
    console.log(`Added videos to the db.`);
  } catch (error) {
    console.error('Error fetching playlist videos:', error);
    res.status(500).json({ error: 'Error fetching playlist videos' });
  }
});


server.keepAliveTimeout = 120 * 1000;
server.headersTimeout = 120 * 1000;