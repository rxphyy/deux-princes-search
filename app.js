import { parseXMLSubtitles } from './subsFormatter.js';
import { saveItemToCollection, isVideoInCollection, searchSubtitles } from './dbManager.js';
import express from 'express';
import path from 'path';
import axios from 'axios';
import cors from 'cors';
import { serverRefreshJob, databaseRefreshJob } from './cron.js';

import https from 'https';
import ytdl from 'ytdl-core';

serverRefreshJob.start();
databaseRefreshJob.start();


const __filename = new URL(import.meta.url).pathname;
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());

const server = app.listen(port, () => console.log(`App is listening on port ${port}!`));

app.get('/api/check', async (req, res) => {
  res.send(`Seems to be working fine 😉`)
});

app.get('/api/fetchMatchingCaptions', async (req, res) => {
  var search = req.query.search;
  searchSubtitles(search)
    .then((result) => {
      res.json(result)
    })
    .catch((error) => {
      console.error('Error:', error);
    });
});

app.get('/api/createNewDbRecord', async (req, res) => {
  const videoId = req.query.video;
  const videoURL = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    const info = await ytdl.getInfo(videoURL);
    const title = info.videoDetails.title;
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
          await axios.get(process.env.CREATE_NEW_RECORD_URL + `?video=${video.videoId}`);
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