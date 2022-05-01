# fairytails-downloader

Download fairytale in mp3 format from [Lahko noč, otroci](https://ziv-zav.rtvslo.si/lahko-noc-otroci). 

Run script:

```javascript
npm install
```

# Examples:

Download latest fairytale:

```javascript
node fairytails.js --latest
```

Download last 10 fairytales:

```javascript
node fairytails.js
```

Download last 15 fairytales (max is 50):

```javascript
node fairytails.js --last=15
```


All fairytails will be saved in **downloads** folder.