#!/usr/bin/env liquidsoap

enable_replaygain_metadata()

base_url = "http://localhost:8000"

def json_post (path, data) =
  def send() =
    ignore(http.post("#{base_url}/#{path}", headers=[
      ("Content-type", "application/json")
    ], data=json_of(data)))
    (-1.)
  end

  add_timeout(0., send)
end

default = input.http(id="default","http://wwoz-sc.streamguys1.com/wwoz-hi.mp3")

def f(_) =
  [("juke_radio_url", "")]
end

default = map_metadata(f, default)

def get_next () =
  let (status, _, url) = http.get("#{base_url}/get-next")
  let (_, code, _) = status

  if code == 200 and url != "" then
    json_post("pending-song", [("url",url)])
    [request.create("annotate:juke_radio_url=\"#{url}\":youtube-dl:#{url}")]
  else
    []
  end
end

requests = request.dynamic(id="requests", get_next)

requests = amplify(1.,override="replay_gain", requests)

requests = crossfade(smart=true, requests)

radio = fallback(track_sensitive=false,[requests, default])

def now_playing(m) =
  juke_radio_url = m["juke_radio_url"]

  if juke_radio_url == "" then
    ignore(server.execute("default.start"))
  else
    ignore(server.execute("default.stop"))
  end

  json_post("is-playing", [("url",juke_radio_url)])
end

radio = on_metadata(now_playing, radio)

radio = mksafe(radio)

aac_lofi = %ffmpeg(format="mpegts",
                   codec="aac",
                   channels=2,
                   ar=44100,
                   b="32k")

aac_midfi = %ffmpeg(format="mpegts",
                   codec="aac",
                   channels=2,
                   ar=44100,
                   b="96k")

aac_hifi = %ffmpeg(format="mpegts",
                   codec="aac",
                   channels=2,
                   ar=44100,
                   b="192k")

streams_info = [("aac_lofi",(40000,"mp4a.40.29","ts")),
                ("aac_midfi",(110000,"mp4a.40.2","ts")),
                ("aac_hifi",(220000,"mp4a.40.2","ts"))]
                
streams = [("aac_lofi",aac_lofi), 
           ("aac_midfi", aac_midfi), 
           ("aac_hifi", aac_hifi)]
                
def segment_name(~position,~extname,stream_name) =
  timestamp = int_of_float(gettimeofday())
  duration = 2
  "#{stream_name}_#{duration}_#{timestamp}_#{position}.#{extname}"
end             

output.file.hls(playlist="radio.m3u8",
                segment_duration=2.0,
                segments=5,
                segments_overhead=5,
                segment_name=segment_name,
                streams_info=streams_info,
                persist=true,
                persist_at="/tmp/juke-join.sav",
                "/home/ubuntu/juke-join-radio/public/hls",
                streams,
                radio)
