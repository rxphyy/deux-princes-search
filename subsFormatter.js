import fs from 'fs/promises';
import path from 'path';
import SrtParser from 'srt-parser-2';


const filterAndFormatSubtitles = async (subtitleFileName) => {
  try {
    const srtFilePath = path.join('yt-dlp', subtitleFileName);

    const srtContent = await fs.readFile(srtFilePath, 'utf-8');
    const parser = new SrtParser();
    const captions = parser.fromSrt(srtContent);

    const splitSubs = splitSubtitles(captions);
    const filteredSubs = removeSubtitleDoubles(splitSubs);

    return filteredSubs;
  } catch (error) {
    console.error('Error reading or parsing the SRT file:', error);
  }
};


const splitSubtitles = (subtitles) => {
  const splitSubtitles = [];

  for (const subtitle of subtitles) {
    // Split subtitles by line breaks
    const textLines = subtitle.text.split(/\r?\n|\r|\n/g);
    
    // Create separate subtitle objects for each line
    for (const text of textLines) {
      splitSubtitles.push({
        id: subtitle.id,
        startTime: subtitle.startTime,
        text,
      });
    }
  }

  return splitSubtitles;
}


const removeSubtitleDoubles = (subtitles) => {
  const filteredSubtitles = [];
  let prevSubtitle = null;

  for (const subtitle of subtitles) {
    if (!prevSubtitle || (subtitle.text !== prevSubtitle.text && prevSubtitle !== null)) {
      filteredSubtitles.push(subtitle);
    }
    prevSubtitle = subtitle;
  }

  return filteredSubtitles;
}


const parseXMLSubtitles = async (xmlData) => {
  const data = decodeHTMLEntities(xmlData);
  const subtitleRegex = /<text start="([\d.]+)" dur="([\d.]+)">([^<]+)<\/text>/g;
  const subtitles = [];
  
  let match;
  while ((match = subtitleRegex.exec(data))) {
    const startTime = new Date(match[1] * 1000).toISOString().substring(11, 8);
    const text = match[3];
    
    subtitles.push({ startTime, text });
  }

  return subtitles;
};

function decodeHTMLEntities(text) {
  const entities = [
    ['&amp;', '&'],
    ['&quot;', '"'],
    ['&#39;', "'"],
    ['&lt;', '<'],
    ['&gt;', '>'],
  ];

  for (const [entity, char] of entities) {
    const entityRegExp = new RegExp(entity, 'g');
    text = text.replace(entityRegExp, char);
  }

  return text;
}


export { filterAndFormatSubtitles, parseXMLSubtitles };