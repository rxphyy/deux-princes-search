import { filterAndFormatSubtitles } from './subsFormatter.js';
import { saveItemToCollection, searchSubtitles, isVideoInCollection } from './dbManager.js';
import express from 'express';
import { exec } from 'child_process';
import path from 'path';
import axios from 'axios';
import fs from 'fs';

const __filename = new URL(import.meta.url).pathname;
const __dirname = path.dirname(__filename);

const ytDlpPath = path.join(__dirname, '/yt-dlp');


const app = express();
const port = process.env.PORT || 3001;

const server = app.listen(port, () => console.log(`App is listening on port ${port}!`));

app.get('/api/check', async (req, res) => {
  res.send(`Seems to be working fine 😉`)
});

app.get('/api/fetchVideoInfoAndSubs', async (req, res) => {
  var videoId = req.query.video;

  const command = `cd ${ytDlpPath.substring(1)} \
    && yt-dlp --skip-download --get-title --get-id --get-thumbnail --encoding utf-8 --extractor-args "youtube:lang=fr" https://youtube.com/watch?v=${videoId} \
    && yt-dlp --skip-download --write-auto-subs --sub-format best --convert-subs srt --sub-lang fr -o "${videoId}" https://youtube.com/watch?v=${videoId} \
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
          key: apiKey,
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
          await axios.get(`http://localhost:3001/api/fetchVideoInfoAndSubs?video=${video.videoId}`);
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