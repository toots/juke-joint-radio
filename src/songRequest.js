const twilio = require('twilio');
const youtubedl = require('youtube-dl');

const twilioSid = process.env.TWILIO_SID;
const twillioAuthToken = process.TWILIO_AUTH_TOKEN;

twilio(twilioSid, twillioAuthToken);
const MessagingResponse = twilio.twiml.MessagingResponse;

let nowPlaying = null; 
let pendingSongs = [];
let queuedSongs = [];

const getSongInfo = (request) => new Promise((resolve, reject) => {
  const r = /^http/.test(request) ? request : `ytsearch:${request}`;

  youtubedl.getInfo(r, (err, info) =>
    err ? reject(err) : resolve({
      id: info.id,
      name: info.fulltitle,
      duration: info.duration,
      url: info.webpage_url
    })
  )
});

module.exports.nowPlaying = () => nowPlaying;
module.exports.pendingSongs = () => pendingSongs;
module.exports.queuedSongs = () => queuedSongs;

module.exports.getNext = (req, res) => {
  if (queuedSongs.length === 0) return res.end('');

  const next = queuedSongs[0];
  queuedSongs = queuedSongs.slice(1);
  pendingSongs.push(next);

  res.end(next.id);
};

module.exports.isPlaying = (req, res) => {
  if (!req.body) return;

  const { id } = req.body;

  if (!id) {
    nowPlaying = null;
    return res.end('no id..');;
  }

  const playing = pendingSongs.find(({id: songId}) => id === songId);
  
  if (!playing) return res.end('no such song!');

  pendingSongs = pendingSongs.filter(({id: songId}) => id !== songId);
  nowPlaying = playing;

  res.end('Thanks mate!');
};

module.exports.songRequest = async (req, res, next) => {
  try {
    const twiml = new MessagingResponse();
    const url = req.body.Body;

    const song = await getSongInfo(url);

    queuedSongs.push(song);

    twiml.message(`Request well received!\nSong queued: ${song.name} from ${song.url}`);

    res.set('Content-Type', 'text/xml');

    res.status(200).send(twiml.toString());
  } catch (err) {
    next(err);
  }
};
