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


export { filterAndFormatSubtitles };