# Song test set (item 14, part 6)

Hand-marked song structures, used by `npm run score:analysis` to measure the analysis: each song is
analysed twice, as EDM (the original analysis) and as its own genre, and scored against the marks.

One JSON file per song. Only timings and labels live here; the audio stays on your machine (the
`audio` path, usually under `public/audio/`, which is gitignored). Songs whose audio isn't there are
skipped.

```json
{
  "title": "Yellow", "artist": "Coldplay", "genre": "pop",
  "audio": "public/audio/pop/Yellow.mp3",
  "bpm": 86.8, "meter": 4,
  "sections": [
    { "start": 0, "label": "intro" },
    { "start": 85, "label": "chorus", "peak": true }
  ],
  "end": 266
}
```

- `genre`: `edm`, `pop`, `rap` or `bollywood`.
- `start`: seconds. Each section runs until the next one; the last until `end`.
- `label`: `intro`, `verse`, `pre-chorus`, `chorus`, `bridge`, `instrumental`, `drop`, `climax`,
  `breakdown`, `outro`.
- `peak`: whether the lights should treat it as a peak. Defaults to true for `chorus`, `drop` and
  `climax`; set it to false where the song's big moment is somewhere else (an EDM-style drop after
  the chorus).
- `moments` (rap, optional): `[{ "t": 83.2 }]`, where the beat cuts out and slams back in.

Aim for 3-5 songs per genre. Mark sections by ear (a DAW or `npm run song:bars` helps); within a
second or two is fine, the score allows 3 seconds.
