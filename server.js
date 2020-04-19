const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const { Liquid } = require('liquidjs');

const app = express();
const  engine = new Liquid();

const {
  nowPlaying,
  pendingSongs,
  queuedSongs,
  getNext,
  isPlaying,
  songRequest
} = require("./src/songRequest"); 


const port = process.env.PORT || 8000;

app.use(cors());

app.use(express.urlencoded({
  extended: false
}));

app.use(express.static('public'));

app.use(express.json());

app.engine('liquid', engine.express());
app.set('views', './views');
app.set('view engine', 'liquid');

app.post('/song-request', songRequest);
app.post('/is-playing', isPlaying);
app.get('/get-next', getNext);

const templatePayload = () => {
  const playing = nowPlaying();

  return {
    nowPlaying: playing ? playing.name : 'no song queued, playing default stream',
    pending: pendingSongs(),
    queued: queuedSongs()
  };
};

app.get('/', (req, res) => res.render('index', templatePayload()));
app.get('/now-playing', (req, res) => res.render('now-playing', templatePayload()));
app.get('/queued', (req, res) => res.render('queued', templatePayload()));

app.listen(port, () =>
  console.log('CORS-enabled web server listening on port ' + port)
);
