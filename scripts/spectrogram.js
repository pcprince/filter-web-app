/****************************************************************************
 * spectrogram.js
 * openacousticdevices.info
 * June 2021
 *****************************************************************************/

/* global RFFT */

// 255 colours from Jet
const colours = ['#000083', '#000284', '#000485', '#000687', '#000888', '#000989', '#000b8a', '#000d8c', '#000f8d', '#00118e', '#00138f', '#001590', '#001792', '#001893', '#001a94', '#001c95', '#001e97', '#002098', '#002299', '#00249a', '#00269b', '#00279d', '#00299e', '#002b9f', '#002da0', '#002fa1', '#0031a3', '#0033a4', '#0035a5', '#0036a6', '#0038a8', '#003aa9', '#003caa', '#003fab', '#0042ad', '#0045ae', '#0048af', '#004bb1', '#004fb2', '#0152b3', '#0155b5', '#0158b6', '#015bb7', '#015eb9', '#0161ba', '#0164bc', '#0167bd', '#016abe', '#016ec0', '#0171c1', '#0174c2', '#0277c4', '#027ac5', '#027dc6', '#0280c8', '#0283c9', '#0286ca', '#0289cc', '#028ccd', '#0290ce', '#0293d0', '#0296d1', '#0299d2', '#029cd4', '#039fd5', '#03a2d7', '#03a5d8', '#03a8d9', '#03abdb', '#03afdc', '#03b2dd', '#03b5df', '#03b8e0', '#03bbe1', '#03bee3', '#03c1e4', '#03c4e5', '#04c7e7', '#04cae8', '#04cde9', '#04d1eb', '#04d4ec', '#04d7ed', '#04daef', '#04ddf0', '#04e0f2', '#04e3f3', '#04e6f4', '#04e9f6', '#05ecf7', '#05f0f8', '#05f3fa', '#05f6fb', '#05f9fc', '#05fcfe', '#05ffff', '#09fffb', '#0dfff7', '#11fff3', '#15ffef', '#19ffeb', '#1cffe7', '#20ffe3', '#24ffdf', '#28ffdb', '#2cffd7', '#30ffd3', '#34ffcf', '#38ffcb', '#3cffc7', '#40ffc3', '#44ffbf', '#47ffbb', '#4bffb7', '#4fffb3', '#53ffaf', '#57ffab', '#5bffa7', '#5fffa3', '#63ff9f', '#67ff9b', '#6bff97', '#6eff93', '#72ff8f', '#76ff8b', '#7aff87', '#7eff83', '#82ff80', '#86ff7c', '#8aff78', '#8eff74', '#92ff70', '#96ff6c', '#99ff68', '#9dff64', '#a1ff60', '#a5ff5c', '#a9ff58', '#adff54', '#b1ff50', '#b5ff4c', '#b9ff48', '#bdff44', '#c1ff40', '#c4ff3c', '#c8ff38', '#ccff34', '#d0ff30', '#d4ff2c', '#d8ff28', '#dcff24', '#e0ff20', '#e4ff1c', '#e8ff18', '#ebff14', '#efff10', '#f3ff0c', '#f7ff08', '#fbff04', '#ffff00', '#fffb00', '#fff700', '#fff300', '#ffef00', '#ffeb00', '#ffe700', '#fee300', '#fedf00', '#fedb00', '#fed700', '#fed200', '#fece00', '#feca00', '#fec600', '#fec200', '#febe00', '#feba00', '#feb600', '#fdb200', '#fdae00', '#fdaa00', '#fda600', '#fda200', '#fd9e00', '#fd9a00', '#fd9600', '#fd9200', '#fd8e00', '#fd8a00', '#fd8600', '#fd8200', '#fc7d00', '#fc7900', '#fc7500', '#fc7100', '#fc6d00', '#fc6900', '#fc6500', '#fc6100', '#fc5d00', '#fc5900', '#fc5500', '#fc5100', '#fc4d00', '#fb4900', '#fb4500', '#fb4100', '#fb3d00', '#fb3900', '#fb3500', '#fb3100', '#fb2d00', '#fb2800', '#fb2400', '#fb2000', '#fb1c00', '#fa1800', '#fa1400', '#fa1000', '#fa0c00', '#fa0800', '#fa0400', '#fa0000', '#f60000', '#f20000', '#ef0000', '#eb0000', '#e70000', '#e30000', '#df0000', '#dc0000', '#d80000', '#d40000', '#d00000', '#cc0000', '#c80000', '#c50000', '#c10000', '#bd0000', '#b90000', '#b50000', '#b20000', '#ae0000', '#aa0000', '#a60000', '#a20000', '#9f0000', '#9b0000', '#970000', '#930000', '#8f0000', '#8b0000', '#880000', '#840000', '#800000'];

function scaleAcrossRange (x, max, min) {

    return (x - min) / (max - min);

}

function median (values) {

    values.sort((a, b) => {

        return a - b;

    });

    const half = Math.floor(values.length / 2);

    if (values.length % 2) {

        return values[half];

    }

    return (values[half - 1] + values[half]) / 2.0;

}

function medianFilter (array) {

    const filteredArray = [];

    for (let i = 1; i < array.length - 1; i++) {

        const filteredRow = [];

        for (let j = 1; j < array[i].length - 1; j++) {

            const values = [];
            values.push(array[i - 1][j], array[i][j], array[i + 1][j]);
            values.push(array[i - 1][j - 1], array[i][j - 1], array[i + 1][j - 1]);
            values.push(array[i - 1][j + 1], array[i][j + 1], array[i + 1][j + 1]);

            filteredRow.push(median(values));

        }

        filteredArray.push(filteredRow);

    }

    return filteredArray;

}

function calculateSpectrogramFrames (samples, sampleRate) {

    // If sample count > 60 seconds at 48 kHz, drop the spectrogram quality
    const nfft = (samples.length > 2880000) ? 128 : 512;
    const frameLength = 0.1 * sampleRate;
    const frameStep = 0.005 * sampleRate;

    let sampleArray = Array.from(samples);

    // Pad signal to make sure that all frames have equal number of samples without truncating any samples from the original signal
    const numFrames = Math.ceil((sampleArray.length - frameLength) / frameStep);
    const paddedArrayLength = numFrames * frameStep + frameLength;
    sampleArray = sampleArray.concat(new Array(paddedArrayLength - sampleArray.length).fill(0));

    const frames = [];

    for (let i = 0; i < numFrames; i++) {

        const frameStart = i * frameStep;
        const frame = [];

        for (let j = 0; j < frameLength; j++) {

            frame.push(sampleArray[j + frameStart]);

        }

        frames.push(frame);

    }

    let spectrumFrames = [];

    for (let m = 0; m < frames.length; m++) {

        // Apply FFT
        const fft = new RFFT(nfft, sampleRate);
        fft.forward(frames[m]);

        const spectrum = [];

        for (let n = 0; n < fft.trans.length; n++) {

            if (fft.trans[n] !== 0) {

                spectrum.push(Math.log(Math.abs(fft.trans[n])));

            } else {

                // Prevent log(0) = -inf
                spectrum.push(0);

            }

        }

        spectrumFrames.push(spectrum);

    }

    // Apply median filter
    spectrumFrames = medianFilter(spectrumFrames);

    return spectrumFrames;

}

function drawSpectrogram (spectrumFrames, canvas, callback) {

    let maxValue = 0;
    let minValue = 0;

    // Calculate range of filtered values to scale colours between
    for (let a = 0; a < spectrumFrames.length; a++) {

        maxValue = Math.max(Math.max.apply(null, spectrumFrames[a]), maxValue);
        minValue = Math.min(Math.min.apply(null, spectrumFrames[a]), minValue);

    }

    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Save context so it can be restored to original scale once spectrogram has been drawn
    ctx.save();

    // Scale drawing context to fill canvas
    const specWidth = spectrumFrames.length;
    const specHeight = spectrumFrames[0].length / 2;

    ctx.scale((canvas.width / specWidth), canvas.height / specHeight);

    for (let o = 0; o < spectrumFrames.length; o++) {

        // Ignore half of spectrogram above Nyquist frequency as it is redundant a reflects values below
        for (let p = spectrumFrames[0].length / 2; p < spectrumFrames[0].length; p++) {

            // Scale values between 0 - 255 to match colour map
            const scaledValue = Math.round(255 * scaleAcrossRange(spectrumFrames[o][p], maxValue, minValue));

            ctx.fillStyle = colours[scaledValue];
            ctx.fillRect(o, p - spectrumFrames[0].length / 2, 1, 1);

        }

    }

    // Restore default scaling
    ctx.restore();

    callback();

}
