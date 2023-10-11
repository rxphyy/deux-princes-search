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
  res.json(`Seems to be working fine 😉`)
});



server.keepAliveTimeout = 120 * 1000;
server.headersTimeout = 120 * 1000;