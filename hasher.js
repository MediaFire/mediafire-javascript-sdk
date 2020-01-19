importScripts('sha256.js');

var fileHasher;
var units;
var hashes = [];
var bytesHashed = 0;

function reset() {
    fileHasher = null;
    units = null;
    hashes = [];
    bytesHashed = 0;
}

onmessage = function (evt) {
    // Streaming setup (number of units expected)
    if(typeof evt.data === "number") {
        // Reset hasher
        reset();
        // Setup new file
        units = evt.data;
        fileHasher = new asmCrypto.SHA256.init();
    } else if(fileHasher) {

        // Append data for full hash
        fileHasher.process(evt.data);

        // Increment bytes hashed for progress
        bytesHashed += evt.data.byteLength;

        // Hash and save unit
        hashes.push(asmCrypto.SHA256.hex(evt.data));

        // Remove reference
        delete evt.data;

        // We are finished
        if(hashes.length >= units) {
            // Send 100% progress
            postMessage({id: 'progress', content: bytesHashed});
            // Send all hashes back
            postMessage({id: 'success', content: {
                full: asmCrypto.bytes_to_hex(fileHasher.finish().result),
                units: hashes
            }});
            // Reset hasher
            reset();
            // Progress update
        } else {
            postMessage({id: 'progress', content: bytesHashed});
        }
    }
};