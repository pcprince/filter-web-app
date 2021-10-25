/****************************************************************************
 * goertzelFilter.js
 * openacousticdevices.info
 * October 2021
 *****************************************************************************/

// Drawing canvas

const goertzelCanvas = document.getElementById('waveform-canvas');

const GOERTZEL_PIXEL_WIDTH = goertzelCanvas.width;
const GOERTZEL_PIXEL_HEIGHT = goertzelCanvas.height;

function applyGoertzelFilter (samples, freq1, freq2, windowLength, output) {

    console.log('Applying Goertzel filter between ' + freq1 + ' and ' + freq2 + '.');

    let n = 0;
    let index = 0;

    let max = 0;

    while (index < samples.length) {

        if (n % windowLength === 0) {

            const goertzelValue = n % 5;

            max = (goertzelValue > max) ? goertzelValue : max;

            output[index] = goertzelValue;

            index++;

        }

        n++;

    }

}

function drawGoertzelPlot (goertzelValues, offset, length, callback) {

    const pointData = new Array((length * 2) + 2).fill(0);

    const width = GOERTZEL_PIXEL_WIDTH / length;

    // Just draw lines between points

    for (let i = 0; i < length + 1; i++) {

        // Evenly distribute points along canvas

        const x = width * i;

        // Get the sample

        const y = goertzelValues[offset + i];

        // Add to data for rendering

        pointData[2 * i] = x;
        pointData[(2 * i) + 1] = y;

    }

    const ctx = goertzelCanvas.getContext('2d');

    ctx.strokeStyle = '#004d99';
    ctx.lineWidth = 1;

    ctx.beginPath();

    ctx.moveTo(0, GOERTZEL_PIXEL_HEIGHT / 2);

    let prevX = -1;
    let prevY = -1;

    for (let i = 0; i < pointData.length; i += 2) {

        if (!(prevX === pointData[i] && prevY === pointData[i + 1])) {

            ctx.lineTo(pointData[i], pointData[i + 1]);

        }

        prevX = pointData[i];
        prevY = pointData[i + 1];

    }

    ctx.stroke();

    callback();

}

function applyGoertzelThreshold (goertzelValues, threshold, output) {

    

}
