# node-petrucci

Redis event watcher

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


WARNING: Install jscoverage from homebrew or ubuntu, not NPM.