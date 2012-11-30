# petrucci

Redis event watcher for the exfm shuffle service

## Install

     npm install petrucci

## Testing

    git clone
    cd petrucci
    npm install
    mocha

## Use

Petrucci accepts a JSON-formatted POST body (containing a Shuffle token) at '/'.
Petrucci will subscribe to new songs of this playset type using Redis.
When a new batch of songs comes in for the subscribed playset, the new songs and the mapped tokens are POSTed to the Shuffle new_songs API route.

In testing, fauxfm is used to simulate the Shuffle new_songs API route, and when testing locally a Redis server must be running on 6379.
In production, the address for the Shuffle server is pulled from Junto config.

![Can you handle it?](http://www.dimarzio.com/sites/default/files/imagecache/player_page_image/player/JOHN_PETRUCCI_106_C_V1ld.jpg "Face!")

WARNING: Install jscoverage from homebrew or ubuntu, not NPM.