/****************************************************************************
 * waveform.js
 * openacousticdevices.info
 * September 2021
 *****************************************************************************/

// Drawing canvas

const wavCanvas = document.getElementById('waveform-canvas');

/**
 * Draw the waveform plot
 * @param {number[]} data Absolute values of samples to be plotted. Either raw data or grouped into columns.
 * @param {number} yZoom Amount to zoom in the y axis
 * @param {function} callback Function called on completion
 */
function renderRawWaveform (pointData, callback) {

    const ctx = wavCanvas.getContext('2d');

    ctx.strokeStyle = '#004d99';
    ctx.lineWidth = 1;

    ctx.beginPath();

    const h = wavCanvas.height;

    ctx.moveTo(0, h / 2);

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

/**
 * Draw the waveform plot
 * @param {number[]} data Absolute values of samples to be plotted. Either raw data or grouped into columns.
 * @param {number} yZoom Amount to zoom in the y axis
 * @param {function} callback Function called on completion
 */
function renderWaveform (data, callback) {

    const w = wavCanvas.width;
    const h = wavCanvas.height;

    const ctx = wavCanvas.getContext('2d');

    const id = ctx.getImageData(0, 0, w, h);

    const pixels = id.data;

    for (let i = 0; i < w; i++) {

        const y0 = data[2 * i];
        const y1 = data[(2 * i) + 1];

        const max = (y0 > y1) ? y0 : y1;
        const min = (y0 > y1) ? y1 : y0;

        for (let j = min; j <= max; j++) {

            const index = j * (w * 4) + i * 4;

            pixels[index] = 0;
            pixels[index + 1] = 77;
            pixels[index + 2] = 153;
            pixels[index + 3] = 255;

        }

    }

    ctx.putImageData(id, 0, 0);

    callback();

}

/**
 * Draw waveform array, grouping samples into columns if more than MAX_RAW_PLOT_LENGTH are to be rendered
 * @param {number[]} samples Array of samples to be rendered
 * @param {number} offset Offset from start of sample array to start rendering
 * @param {number} length Number of samples to render
 * @param {number} yZoom Amount to zoom in plot on y axis
 * @param {function} callback Function called on completion
 */
function drawWaveform (samples, offset, length, yZoom, callback) {

    const w = wavCanvas.width;
    const h = wavCanvas.height;
    const halfH = h / 2;

    let multiplier = Math.pow(32767, -1);

    // Scale in y axis to apply zoom

    multiplier *= yZoom;

    // Scale to size of canvas

    multiplier *= halfH;

    // Flip y axis

    multiplier *= -1;

    const samplesPerPixel = Math.floor(length / w);

    // If one or fewer samples will be drawn per pixel

    if (samplesPerPixel <= 1) {

        console.log('Plotting raw sample data on waveform');

        const pointData = new Array(length * 2).fill(0);

        const width = w / length;

        // Just draw lines between points

        for (let i = 0; i < length; i++) {

            // Evenly distribute points along canvas

            const x = width * i;

            // Get the sample

            let y = samples[offset + i];

            // Scale data from -32767 to 32767, to -1 and 1, scale on y axis and then scale to canvas height

            y *= multiplier;

            // Calculate the actual pixel height

            y += halfH;

            // Add to data for rendering

            pointData[2 * i] = x;
            pointData[(2 * i) + 1] = y;

        }

        renderRawWaveform(pointData, callback);

    } else {

        console.log('Plotting max and min sample per pixel column on waveform');

        // x and y for 2 * w points per column (max and then min)

        const pointData = new Array(2 * w).fill(0);

        for (let i = 0; i < w; i++) {

            let max = 99999;
            let min = 99999;

            for (let j = -1; j < samplesPerPixel + 1; j++) {

                let index = (i * samplesPerPixel) + j;

                // Take the max and min of the samples within a pixel column, plus 1 sample either side

                index = (j < 0) ? index + 1 : index;
                index = (j >= samplesPerPixel) ? index - 1 : index;

                const sample = samples[offset + index];

                max = (sample > max || max === 99999) ? sample : max;
                min = (sample < min || min === 99999) ? sample : min;

            }

            // Scale the heights and then offset the pixel value so they're drawn from the centre

            const y0 = Math.round(max * multiplier) + halfH;
            const y1 = Math.round(min * multiplier) + halfH;

            // Add max and min to array for drawing

            pointData[2 * i] = y0;
            pointData[(2 * i) + 1] = y1;

        }

        renderWaveform(pointData, callback);

    }

}
