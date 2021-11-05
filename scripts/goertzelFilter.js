/****************************************************************************
 * goertzelFilter.js
 * openacousticdevices.info
 * October 2021
 *****************************************************************************/

const GOERTZEL_THRESHOLD_BUFFER_LENGTH = 16384;

// Drawing canvas

const goertzelPlotCanvas = document.getElementById('goertzel-canvas');

const GOERTZEL_PIXEL_WIDTH = goertzelPlotCanvas.width;
const GOERTZEL_PIXEL_HEIGHT = goertzelPlotCanvas.height;

const TWO_PI = 2.0 * Math.PI;

function applyGoertzelFilter (samples, sampleRate, freq, N, output) {

    console.log('Applying Goertzel filter at ' + freq + '.');

    // Generate Hamming filter

    const hammingValues = new Array(N);

    let hammingTotal = 0;

    for (let i = 0; i < N; i++) {

        hammingValues[i] = 0.54 - 0.46 * Math.cos(TWO_PI * i / (N - 1));
        hammingTotal += hammingValues[i];

    }

    const hammingMean = hammingTotal / N;

    // Apply filter

    const c = 2.0 * Math.cos(2.0 * Math.PI * freq / sampleRate);

    const maximum = N * 32768.0 * hammingMean / 2.0;
    const scaler = Math.pow(maximum, -1);

    let i = 0;
    let index = 0;

    let d1 = 0.0;
    let d2 = 0.0;

    let y;

    while (i < samples.length) {

        y = hammingValues[i % N] * samples[i] + c * d1 - d2;
        d2 = d1;
        d1 = y;

        if (i % N === N - 1) {

            const goertzelValue = Math.sqrt((d1 * d1) + (d2 * d2) - c * d1 * d2);

            d1 = 0.0;
            d2 = 0.0;

            output[index] = goertzelValue * scaler;

            index++;

        }

        i++;

    }

}

function drawGoertzelPlot (goertzelValues, windowLength, offset, length, callback) {

    const windowedLength = Math.floor(length / windowLength);
    const windowedOffset = Math.floor(offset / windowLength);

    const pointData = new Array((windowedLength * 2) + 2).fill(0);

    const width = GOERTZEL_PIXEL_WIDTH / windowedLength;

    // Just draw lines between points

    for (let i = 0; i < windowedLength + 1; i++) {

        // Evenly distribute points along canvas

        const x = width * i;

        // Get the sample

        const y = GOERTZEL_PIXEL_HEIGHT - (goertzelValues[windowedOffset + i] * GOERTZEL_PIXEL_HEIGHT);

        // Add to data for rendering

        pointData[2 * i] = x;
        pointData[(2 * i) + 1] = y;

    }

    const ctx = goertzelPlotCanvas.getContext('2d');

    ctx.strokeStyle = '#004d99';
    ctx.lineWidth = 1;

    ctx.beginPath();

    ctx.moveTo(0, GOERTZEL_PIXEL_HEIGHT);

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

function applyGoertzelThreshold (goertzelValues, threshold, windowLength, minTriggerDurationSamples, output) {

    // Convert minimum trigger duration buffers

    const minTriggerDurationBuffers = Math.ceil(minTriggerDurationSamples / GOERTZEL_THRESHOLD_BUFFER_LENGTH);

    let triggerDuration = 0;

    let aboveThreshold = false;

    let n = 0;

    let index = 0;

    let thresholdedValueCount = 0;

    const goertzelBufferLength = GOERTZEL_THRESHOLD_BUFFER_LENGTH / windowLength;

    while (index < goertzelValues.length) {

        const limit = Math.min(goertzelValues.length, index + goertzelBufferLength);

        while (index < limit) {

            if (Math.abs(goertzelValues[index]) > threshold) {

                aboveThreshold = true;

                triggerDuration = minTriggerDurationBuffers;

            }

            index++;

        }

        output[n] = aboveThreshold;

        n++;

        if (aboveThreshold) {

            if (triggerDuration > 1) {

                triggerDuration--;

            } else {

                aboveThreshold = false;

            }

        } else {

            thresholdedValueCount++;

        }

    }

    thresholdedValueCount *= goertzelBufferLength;

    thresholdedValueCount = Math.min(thresholdedValueCount, goertzelValues.length);

    return thresholdedValueCount;

}
