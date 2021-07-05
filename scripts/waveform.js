/****************************************************************************
 * waveform.js
 * openacousticdevices.info
 * June 2021
 *****************************************************************************/

function drawLineSegment (ctx, x, y, width, isEven) {

    ctx.lineWidth = 0.5;
    ctx.strokeStyle = '#075a9e';
    ctx.beginPath();
    y = isEven ? y : -y;
    ctx.moveTo(x, 0);
    ctx.lineTo(x + width / 2, y);
    ctx.lineTo(x + width, 0);
    ctx.stroke();

}

function drawWaveform (samples, canvas, callback) {

    const blockCount = 50000;
    const blockSize = Math.floor(samples.length / blockCount);

    const filteredData = [];

    for (let i = 0; i < blockCount; i++) {

        const blockStart = blockSize * i;
        let sum = 0;

        for (let j = 0; j < blockSize; j++) {

            sum += Math.abs(samples[blockStart + j]);

        }

        filteredData.push(sum / blockSize);

    }

    // Scale data from -32767 to 32767, to -1 and 1
    const multiplier = Math.pow(32767, -1);
    const normalisedData = filteredData.map(n => n * multiplier);

    const padding = 50;

    const ctx = canvas.getContext('2d');

    // Reset context transformations
    canvas.width = canvas.width;

    // ctx.scale(zoom, 1.0);
    ctx.translate(0, canvas.height / 2); // Set Y = 0 to be in the middle of the canvas

    const width = canvas.width / normalisedData.length;

    for (let i = 0; i < normalisedData.length; i++) {

        const x = width * i;

        let height = normalisedData[i] * canvas.height - padding;

        if (height < 0) {

            height = 0;

        } else if (height > canvas.height / 2) {

            height = height > canvas.height / 2;

        }

        drawLineSegment(ctx, x, height, width, (i + 1) % 2);

    }

    callback();

}
