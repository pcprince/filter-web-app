/****************************************************************************
 * exportVideo.js
 * openacousticdevices.info
 * July 2022
 *****************************************************************************/

// TODO: Disable button in cases where it would run out of memory

/* global Worker, Blob, webkitURL */

function convertDataURIToBinary (dataURI) {

    const base64 = dataURI.replace(/^data[^,]+,/, '');
    const raw = window.atob(base64);
    const rawLength = raw.length;

    const array = new Uint8Array(new ArrayBuffer(rawLength));

    for (let i = 0; i < rawLength; i++) {

        array[i] = raw.charCodeAt(i);

    }

    return array;

}

function done (output, name) {

    const url = webkitURL.createObjectURL(output);

    // Download the file

    const link = document.createElement('a');
    link.download = name;
    link.href = url;
    link.click();
    link.remove();

}

function finaliseVideo (imageData, audioData, length, fileName, callback) {

    const videoName = fileName.substring(0, fileName.length - 4) + '_EXPORT.mp4';

    const worker = new Worker('/scripts/external/ffmpeg-worker-mp4.js');

    worker.onmessage = (e) => {

        const msg = e.data;

        let blob;

        let succeeded;

        switch (msg.type) {

        case 'ready':

            console.log('Ready, processing video');

            worker.postMessage({
                type: 'run',
                TOTAL_MEMORY: 256 * 1024 * 1024,
                MEMFS: [audioData, imageData],
                arguments: [
                    '-loop', '1',
                    '-y',
                    '-r', '1',
                    '-i', 'IMG.JPG',
                    '-i', 'AUDIO.WAV',
                    '-c:v', 'libx264',
                    '-preset', 'ultrafast',
                    '-rc-lookahead', '2',
                    '-c:a', 'aac',
                    '-b:a', '192k',
                    '-pix_fmt', 'yuv420p',
                    '-t', length.toString() + 'ms',
                    'out.mp4'
                ]
            });

            break;

        case 'stdout':
        case 'stderr':

            console.log(msg.data);
            break;

        case 'exit':

            succeeded = msg.data === 0;
            callback(succeeded);

            break;

        case 'done':

            // Export mp4

            console.log('Saving video');

            blob = new Blob([msg.data.MEMFS[0].data], {type: 'video/mp4'});
            done(blob, videoName);

            break;

        }

    };

}

function exportVideo (imageCanvas, audioArray, length, fileName, callback) {

    const mimeType = 'image/jpeg';
    const imageString = imageCanvas.toDataURL(mimeType, 1);
    const imageArray = convertDataURIToBinary(imageString);

    const imageData = {
        name: 'IMG.JPG',
        data: imageArray
    };

    const audioData = {
        name: 'AUDIO.WAV',
        data: audioArray
    };

    finaliseVideo(imageData, audioData, length, fileName, callback);

}
