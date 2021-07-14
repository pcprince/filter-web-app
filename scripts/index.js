/****************************************************************************
 * index.js
 * openacousticdevices.info
 * June 2021
 *****************************************************************************/

/* global calculateSpectrogramFrames, drawSpectrogram, drawWaveform, Slider, readWav, designLowPassFilter, designHighPassFilter, designBandPassFilter, createFilter, LOW_PASS_FILTER, BAND_PASS_FILTER, HIGH_PASS_FILTER, applyFilter, applyAmplitudeThreshold */

// Use these values to fill in the axis labels before samples have been loaded

const FILLER_SAMPLE_COUNT = 1440000;
const FILLER_SAMPLE_RATE = 48000;

// Approximately 30 seconds at 384 kHz

const MAX_FILE_SIZE = 24117248;

// Error display elements

const browserErrorDisplay = document.getElementById('browser-error-display');
const errorDisplay = document.getElementById('error-display');
const errorText = document.getElementById('error-text');

// File selection elements

const fileButton = document.getElementById('file-button');
const fileLabel = document.getElementById('file-label');

// Plot navigation buttons

const zoomInButton = document.getElementById('zoom-in-button');
const zoomOutButton = document.getElementById('zoom-out-button');
const zoomSpan = document.getElementById('zoom-span');

const panLeftButton = document.getElementById('pan-left-button');
const panRightButton = document.getElementById('pan-right-button');

// Plot navigation variables

let zoom = 1.0;
const zoomIncrement = 0.5;
const zoomMax = 5.0;

let offset = 0;
const offsetIncrement = 1;

// Plot canvases

const spectrogramOverlayCanvas = document.getElementById('spectrogram-overlay-canvas');
const spectrogramCanvas = document.getElementById('spectrogram-canvas');
const waveformOverlayCanvas = document.getElementById('waveform-overlay-canvas');
const waveformCanvas = document.getElementById('waveform-canvas');
const timeLabelCanvas = document.getElementById('time-label-canvas');

// Create staging canvas for labels which can be reused so labels still match after panning

const prepLabelCanvas = document.createElement('canvas');
prepLabelCanvas.width = timeLabelCanvas.width * zoomMax;
prepLabelCanvas.height = timeLabelCanvas.height;

const spectrogramLabelCanvas = document.getElementById('spectrogram-label-canvas');
const Y_LABEL_COUNT = 4;
const waveformLabelCanvas = document.getElementById('waveform-label-canvas');

// File variables

let fileHandler;
let sampleCount = 0;
let sampleRate, processedSpectrumFrames;

// Drawing/processing flag

let drawing = false;

// Setting used to draw current plots

let previousSettings = {
    filterEnabled: false,
    filterIndex: 1,
    amplitudeThresholdEnabled: false,
    minimumTriggerDuration: 0,
    amplitudeThresholdScale: 0,
    amplitudeThreshold: 0
};

// Filter elements

const filterTypeLabel = document.getElementById('filter-type-label');
const filterRadioButtons = document.getElementsByName('filter-radio');
const filterRadioLabels = document.getElementsByName('filter-radio-label');

const highPassRow = document.getElementById('high-pass-row');
const lowPassRow = document.getElementById('low-pass-row');
const bandPassRow = document.getElementById('band-pass-row');

const bandPassMaxLabel = document.getElementById('band-pass-filter-max-label');
const bandPassMinLabel = document.getElementById('band-pass-filter-min-label');
const lowPassMaxLabel = document.getElementById('low-pass-filter-max-label');
const lowPassMinLabel = document.getElementById('low-pass-filter-min-label');
const highPassMaxLabel = document.getElementById('high-pass-filter-max-label');
const highPassMinLabel = document.getElementById('high-pass-min-label');

const filterCheckboxLabel = document.getElementById('filter-checkbox-label');
const filterCheckbox = document.getElementById('filter-checkbox');
const highPassFilterSlider = new Slider('#high-pass-filter-slider', {});
const lowPassFilterSlider = new Slider('#low-pass-filter-slider', {});
const bandPassFilterSlider = new Slider('#band-pass-filter-slider', {});

const filterLabel = document.getElementById('filter-label');

let previousSelectionType = 1;

const FILTER_SLIDER_STEPS = {8000: 100, 16000: 100, 32000: 100, 48000: 100, 96000: 200, 192000: 500, 250000: 500, 384000: 1000};

// Amplitude thresholding elements

const amplitudeThresholdingMaxLabel = document.getElementById('amplitude-thresholding-max-label');
const amplitudeThresholdingMinLabel = document.getElementById('amplitude-thresholding-min-label');

const amplitudeThresholdingCheckboxLabel = document.getElementById('amplitude-thresholding-checkbox-label');
const amplitudeThresholdingCheckbox = document.getElementById('amplitude-thresholding-checkbox');
const amplitudeThresholdingSlider = new Slider('#amplitude-thresholding-slider', {});
const amplitudeThresholdingLabel = document.getElementById('amplitude-thresholding-label');
const amplitudeThresholdingDurationTable = document.getElementById('amplitude-thresholding-duration-table');
const amplitudeThresholdingRadioButtons = document.getElementsByName('amplitude-thresholding-duration-radio');
const amplitudeThresholdingScaleLabel = document.getElementById('amplitude-thresholding-scale-label');
const amplitudeThresholdingScaleRadioButtons = document.getElementsByName('amplitude-thresholding-scale-radio');
const amplitudeThresholdScaleTable = document.getElementById('amplitude-threshold-scale-table');

// Non-linear amplitude threshold values to map to slider scale

const VALID_AMPLITUDE_VALUES = [0, 1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 88, 96, 104, 112, 120, 128, 144, 160, 176, 192, 208, 224, 240, 256, 288, 320, 352, 384, 416, 448, 480, 512, 576, 640, 704, 768, 832, 896, 960, 1024, 1152, 1280, 1408, 1536, 1664, 1792, 1920, 2048, 2304, 2560, 2816, 3072, 3328, 3584, 3840, 4096, 4608, 5120, 5632, 6144, 6656, 7168, 7680, 8192, 9216, 10240, 11264, 12288, 13312, 14336, 15360, 16384, 18432, 20480, 22528, 24576, 26624, 28672, 30720, 32768];

// Minimum trigger duration values

const MINIMUM_TRIGGER_DURATIONS = [0, 1, 2, 5, 10, 15, 30, 60];

// Amplitude thresholding scale enums

let amplitudeThresholdingScaleIndex = 0;
const AMPLITUDE_THRESHOLD_SCALE_PERCENTAGE = 0;
const AMPLITUDE_THRESHOLD_SCALE_16BIT = 1;
const AMPLITUDE_THRESHOLD_SCALE_DECIBEL = 2;

// All possible slider values

const THRESHOLD_PERCENTAGE_SLIDER_VALUES = [];
const THRESHOLD_16BIT_SLIDER_VALUES = [];
const THRESHOLD_DECIBEL_SLIDER_VALUES = [];

// Blocks in pixel space representing audio below the threshold

let thresholdPeriods = [];

// Populate slider value lists with valid values

const sliderMin = amplitudeThresholdingSlider.getAttribute('min');
const sliderMax = amplitudeThresholdingSlider.getAttribute('max');
const sliderStep = amplitudeThresholdingSlider.getAttribute('step');

for (let sIndex = sliderMin; sIndex <= sliderMax; sIndex += sliderStep) {

    const rawSlider = (sIndex / sliderMax);

    const amplitudeThresholdValues = convertAmplitudeThreshold(rawSlider);

    THRESHOLD_PERCENTAGE_SLIDER_VALUES.push(parseFloat(amplitudeThresholdValues.percentage));
    THRESHOLD_16BIT_SLIDER_VALUES.push(amplitudeThresholdValues.amplitude);
    THRESHOLD_DECIBEL_SLIDER_VALUES.push(amplitudeThresholdValues.decibels);

}

// Other UI

const updateButton = document.getElementById('update-button');
const resetButton = document.getElementById('reset-button');

function getSelectedRadioValue (radioName) {

    return parseInt(document.querySelector('input[name="' + radioName + '"]:checked').value, 10);

}

/* Set the high-pass filter values to given value */

function setHighPassSliderValue (value) {

    highPassFilterSlider.setValue(value);

}

/* Set the low-pass filter values to given value */

function setLowPassSliderValue (value) {

    lowPassFilterSlider.setValue(value);

}

/* Set the band-pass filter values to 2 given values */

function setBandPass (lowerSliderValue, higherSliderValue) {

    lowerSliderValue = (lowerSliderValue === -1) ? 0 : lowerSliderValue;
    higherSliderValue = (higherSliderValue === -1) ? bandPassFilterSlider.getAttribute('max') : higherSliderValue;

    bandPassFilterSlider.setValue([lowerSliderValue, higherSliderValue]);

}

/* When sample rate changes, so does the slider step. Update values to match the corresponding step */

function roundToSliderStep (value, step) {

    return Math.round(value / step) * step;

}

function sampleRateChange () {

    // Update labels to reflect new sample rate

    const maxFreq = sampleRate / 2;

    const labelText = (maxFreq / 1000) + 'kHz';

    lowPassMaxLabel.textContent = labelText;
    highPassMaxLabel.textContent = labelText;
    bandPassMaxLabel.textContent = labelText;

    highPassFilterSlider.setAttribute('max', maxFreq);
    lowPassFilterSlider.setAttribute('max', maxFreq);
    bandPassFilterSlider.setAttribute('max', maxFreq);

    const filterSliderStep = FILTER_SLIDER_STEPS[sampleRate];

    highPassFilterSlider.setAttribute('step', filterSliderStep);
    lowPassFilterSlider.setAttribute('step', filterSliderStep);
    bandPassFilterSlider.setAttribute('step', filterSliderStep);

    const newLowPassFreq = maxFreq / 4;
    const newHighPassFreq = 3 * maxFreq / 4;

    setBandPass(roundToSliderStep(Math.max(newHighPassFreq, newLowPassFreq), filterSliderStep), roundToSliderStep(Math.min(newHighPassFreq, newLowPassFreq), filterSliderStep));
    setLowPassSliderValue(roundToSliderStep(newLowPassFreq, filterSliderStep));
    setHighPassSliderValue(roundToSliderStep(newHighPassFreq, filterSliderStep));

}

function updateFilterUI () {

    const filterIndex = getSelectedRadioValue('filter-radio');

    switch (filterIndex) {

    case LOW_PASS_FILTER:
        lowPassRow.style.display = 'flex';
        highPassRow.style.display = 'none';
        bandPassRow.style.display = 'none';
        break;
    case HIGH_PASS_FILTER:
        lowPassRow.style.display = 'none';
        highPassRow.style.display = 'flex';
        bandPassRow.style.display = 'none';
        break;
    case BAND_PASS_FILTER:
        lowPassRow.style.display = 'none';
        highPassRow.style.display = 'none';
        bandPassRow.style.display = 'flex';
        break;

    }

    if (filterCheckbox.checked && !filterCheckbox.disabled) {

        filterTypeLabel.style.color = '';

        for (let i = 0; i < filterRadioButtons.length; i++) {

            filterRadioButtons[i].style.color = '';
            filterRadioButtons[i].disabled = false;
            filterRadioLabels[i].style.color = '';

        }

        bandPassFilterSlider.enable();
        lowPassFilterSlider.enable();
        highPassFilterSlider.enable();
        bandPassMaxLabel.style.color = '';
        bandPassMinLabel.style.color = '';
        lowPassMaxLabel.style.color = '';
        lowPassMinLabel.style.color = '';
        highPassMaxLabel.style.color = '';
        highPassMinLabel.style.color = '';

        filterLabel.style.color = '';

    } else {

        filterTypeLabel.style.color = 'grey';

        for (let i = 0; i < filterRadioButtons.length; i++) {

            filterRadioButtons[i].style.color = 'grey';
            filterRadioButtons[i].disabled = true;
            filterRadioLabels[i].style.color = 'grey';

        }

        bandPassFilterSlider.disable();
        lowPassFilterSlider.disable();
        highPassFilterSlider.disable();
        bandPassMaxLabel.style.color = 'grey';
        bandPassMinLabel.style.color = 'grey';
        lowPassMaxLabel.style.color = 'grey';
        lowPassMinLabel.style.color = 'grey';
        highPassMaxLabel.style.color = 'grey';
        highPassMinLabel.style.color = 'grey';

        filterLabel.style.color = 'grey';

        // If the UI is disabled because app is drawing, rather than manually disabled, don't rewrite the label

        if (!filterCheckbox.disabled) {

            filterLabel.textContent = 'Recordings will not be filtered.';

        }

    }

}

function getAmplitudeThreshold () {

    return convertAmplitudeThreshold(amplitudeThresholdingSlider.getValue() / amplitudeThresholdingSlider.getAttribute('max')).amplitude;

}

function formatPercentage (mantissa, exponent) {

    let response = '';

    if (exponent < 0) {

        response += '0.0000'.substring(0, 1 - exponent);

    }

    response += mantissa;

    for (let i = 0; i < exponent; i += 1) response += '0';

    return response;

}

function convertAmplitudeThreshold (rawSlider) {

    let exponent, mantissa, validAmplitude;

    const rawLog = (100 * rawSlider - 100);

    /* Decibels */

    const decibelValue = 2 * Math.round(rawLog / 2);

    /* Percentage */

    exponent = 2 + Math.floor(rawLog / 20.0);
    mantissa = Math.round(Math.pow(10, rawLog / 20.0 - exponent + 2));

    if (mantissa === 10) {

        mantissa = 1;
        exponent += 1;

    }

    const percentageString = formatPercentage(mantissa, exponent);

    /* 16-bit */

    const rawAmplitude = Math.round(32768 * Math.pow(10, rawLog / 20));

    for (let i = 0; i < VALID_AMPLITUDE_VALUES.length; i++) {

        if (rawAmplitude <= VALID_AMPLITUDE_VALUES[i]) {

            validAmplitude = VALID_AMPLITUDE_VALUES[i];
            break;

        }

    }

    return {
        decibels: decibelValue,
        percentageExponent: exponent,
        percentageMantissa: mantissa,
        percentage: percentageString,
        amplitude: validAmplitude
    };

}

function updateAmplitudeThresholdingLabel () {

    const amplitudeThreshold = convertAmplitudeThreshold(amplitudeThresholdingSlider.getValue() / amplitudeThresholdingSlider.getAttribute('max'));

    amplitudeThresholdingLabel.textContent = 'Amplitude threshold of ';

    switch (amplitudeThresholdingScaleIndex) {

    case AMPLITUDE_THRESHOLD_SCALE_PERCENTAGE:

        amplitudeThresholdingLabel.textContent += amplitudeThreshold.percentage + '%';
        break;

    case AMPLITUDE_THRESHOLD_SCALE_16BIT:

        amplitudeThresholdingLabel.textContent += amplitudeThreshold.amplitude;
        break;

    case AMPLITUDE_THRESHOLD_SCALE_DECIBEL:

        amplitudeThresholdingLabel.textContent += amplitudeThreshold.decibels + ' dB';
        break;

    }

    amplitudeThresholdingLabel.textContent += ' will be used when generating T.WAV files.';

}

function updateAmplitudeThresholdingScale () {

    updateAmplitudeThresholdingLabel();

    switch (amplitudeThresholdingScaleIndex) {

    case AMPLITUDE_THRESHOLD_SCALE_PERCENTAGE:
        amplitudeThresholdingMinLabel.innerHTML = '0.001%';
        amplitudeThresholdingMaxLabel.innerHTML = '100%';
        break;

    case AMPLITUDE_THRESHOLD_SCALE_16BIT:
        amplitudeThresholdingMinLabel.innerHTML = '0';
        amplitudeThresholdingMaxLabel.innerHTML = '32768';
        break;

    case AMPLITUDE_THRESHOLD_SCALE_DECIBEL:
        amplitudeThresholdingMinLabel.innerHTML = '-100 dB';
        amplitudeThresholdingMaxLabel.innerHTML = '0 dB';
        break;

    }

}

function updateAmplitudeThresholdingUI () {

    if (amplitudeThresholdingCheckbox.checked && !amplitudeThresholdingCheckbox.disabled) {

        amplitudeThresholdingSlider.enable();
        amplitudeThresholdingMaxLabel.style.color = '';
        amplitudeThresholdingMinLabel.style.color = '';

        amplitudeThresholdingLabel.style.color = '';
        updateAmplitudeThresholdingLabel();

        amplitudeThresholdingDurationTable.style.color = '';

        for (let i = 0; i < amplitudeThresholdingRadioButtons.length; i++) {

            amplitudeThresholdingRadioButtons[i].disabled = false;

        }

        amplitudeThresholdingScaleLabel.style.color = '';
        amplitudeThresholdScaleTable.style.color = '';

        for (let i = 0; i < amplitudeThresholdingScaleRadioButtons.length; i++) {

            amplitudeThresholdingScaleRadioButtons[i].disabled = false;

        }

    } else {

        amplitudeThresholdingSlider.disable();
        amplitudeThresholdingMaxLabel.style.color = 'grey';
        amplitudeThresholdingMinLabel.style.color = 'grey';

        amplitudeThresholdingLabel.style.color = 'grey';

        // If the UI is disabled because app is drawing, rather than manually disabled, don't rewrite the label

        if (!amplitudeThresholdingCheckbox.disabled) {

            amplitudeThresholdingLabel.textContent = 'All audio will be written to a .WAV file.';

        }

        amplitudeThresholdingDurationTable.style.color = 'grey';

        for (let i = 0; i < amplitudeThresholdingRadioButtons.length; i++) {

            amplitudeThresholdingRadioButtons[i].disabled = true;

        }

        amplitudeThresholdingScaleLabel.style.color = 'grey';
        amplitudeThresholdScaleTable.style.color = 'grey';

        for (let i = 0; i < amplitudeThresholdingScaleRadioButtons.length; i++) {

            amplitudeThresholdingScaleRadioButtons[i].disabled = true;

        }

    }

}

function updateFilterLabel () {

    if (!filterCheckbox.checked) {

        return;

    }

    let currentBandPassLower, currentBandPassHigher, currentHighPass, currentLowPass;

    const filterIndex = getSelectedRadioValue('filter-radio');

    switch (filterIndex) {

    case HIGH_PASS_FILTER:
        currentHighPass = highPassFilterSlider.getValue() / 1000;
        filterLabel.textContent = 'Recordings will be filtered to frequencies above ' + currentHighPass.toFixed(1) + ' kHz.';
        break;
    case LOW_PASS_FILTER:
        currentLowPass = lowPassFilterSlider.getValue() / 1000;
        filterLabel.textContent = 'Recordings will be filtered to frequencies below ' + currentLowPass.toFixed(1) + ' kHz.';
        break;
    case BAND_PASS_FILTER:
        currentBandPassLower = Math.min(...bandPassFilterSlider.getValue()) / 1000;
        currentBandPassHigher = Math.max(...bandPassFilterSlider.getValue()) / 1000;
        filterLabel.textContent = 'Recordings will be filtered to frequencies between ' + currentBandPassLower.toFixed(1) + ' and ' + currentBandPassHigher.toFixed(1) + ' kHz.';
        break;

    }

}

function updateFilterSliders () {

    const newSelectionType = getSelectedRadioValue('filter-radio');

    if (previousSelectionType === LOW_PASS_FILTER) {

        if (newSelectionType === BAND_PASS_FILTER) {

            bandPassFilterSlider.setValue([0, lowPassFilterSlider.getValue()]);

        } else if (newSelectionType === HIGH_PASS_FILTER) {

            highPassFilterSlider.setValue(lowPassFilterSlider.getValue());

        }

    } else if (previousSelectionType === HIGH_PASS_FILTER) {

        if (newSelectionType === BAND_PASS_FILTER) {

            bandPassFilterSlider.setValue([highPassFilterSlider.getValue(), bandPassFilterSlider.getAttribute('max')]);

        } else if (newSelectionType === LOW_PASS_FILTER) {

            lowPassFilterSlider.setValue(highPassFilterSlider.getValue());

        }

    } else if (previousSelectionType === BAND_PASS_FILTER) {

        if (newSelectionType === LOW_PASS_FILTER) {

            lowPassFilterSlider.setValue(Math.max(...bandPassFilterSlider.getValue()));

        } else if (newSelectionType === HIGH_PASS_FILTER) {

            highPassFilterSlider.setValue(Math.min(...bandPassFilterSlider.getValue()));

        }

    }

    previousSelectionType = newSelectionType;

}

function timeToPixel (seconds) {

    const totalLength = (sampleCount !== 0) ? sampleCount / sampleRate : FILLER_SAMPLE_COUNT / FILLER_SAMPLE_RATE;
    const pixels = (seconds / totalLength) * spectrogramCanvas.width * zoom;

    return pixels;

}

function drawAxisLabels () {

    // Draw x axis labels

    const xCtx = prepLabelCanvas.getContext('2d');

    xCtx.clearRect(0, 0, prepLabelCanvas.width, prepLabelCanvas.height);

    let label = 0;
    const totalLength = (sampleCount !== 0) ? sampleCount / sampleRate : FILLER_SAMPLE_COUNT / FILLER_SAMPLE_RATE;

    // Widen gap between labels as more audio is viewable to prevent squashed labels
    const displayedTime = totalLength / zoom;
    let labelIncrement = 1;
    labelIncrement = (displayedTime > 10) ? 2 : labelIncrement;
    labelIncrement = (displayedTime > 30) ? 5 : labelIncrement;

    // So the centre of the text can be the label location, there's a small amount of padding around the label canvas
    const padding = (timeLabelCanvas.width - waveformCanvas.width) / 2;

    while (label <= totalLength) {

        // If there's 2 characters, label width is doubled
        const labelWidth = xCtx.measureText(label).width;

        // Convert the time to a pixel value, then take into account the label width and the padding to position correctly
        const x = timeToPixel(label) + padding - (labelWidth / 2);

        xCtx.font = '10px monospace';
        xCtx.fillText(label, x, 15);

        label += labelIncrement;

    }

    // Draw y axis labels for spectrogram

    const ySpecCtx = spectrogramLabelCanvas.getContext('2d');

    ySpecCtx.clearRect(0, 0, spectrogramLabelCanvas.width, spectrogramLabelCanvas.height);

    ySpecCtx.font = '10px monospace';
    ySpecCtx.textBaseline = 'middle';

    const ySpecLabelIncrement = (sampleCount !== 0) ? sampleRate / Y_LABEL_COUNT : 48000 / Y_LABEL_COUNT;
    const ySpecIncrement = spectrogramLabelCanvas.height / Y_LABEL_COUNT;

    for (let i = 0; i <= Y_LABEL_COUNT; i++) {

        const labelText = i * ySpecLabelIncrement / 1000;

        const x = spectrogramLabelCanvas.width - ySpecCtx.measureText(labelText.toString()).width - 5;

        let y = spectrogramLabelCanvas.height - (i * ySpecIncrement);

        if (i === 0) {

            y -= 5;

        }

        if (i === Y_LABEL_COUNT) {

            y += 5;

        }

        ySpecCtx.fillText(labelText, x, y);

    }

    // Draw y axis labels for waveform

    const yWaveformCtx = waveformLabelCanvas.getContext('2d');

    yWaveformCtx.clearRect(0, 0, waveformLabelCanvas.width, waveformLabelCanvas.height);

    yWaveformCtx.font = '10px monospace';
    yWaveformCtx.textBaseline = 'middle';

    let waveformLabelTexts = [];

    // for (let i = 1.0; i >= -1.0; i -= 0.25) {

    //     waveformLabelTexts.push(i);

    // }

    switch (amplitudeThresholdingScaleIndex) {

    case AMPLITUDE_THRESHOLD_SCALE_PERCENTAGE:

        waveformLabelTexts = ['100%', '75%', '50%', '25%', '0%', '25%', '50%', '75%', '100%'];
        break;

    case AMPLITUDE_THRESHOLD_SCALE_16BIT:

        waveformLabelTexts = [32768, 24576, 16384, 8192, 0, 8192, 16384, 24576, 32768];
        break;

    case AMPLITUDE_THRESHOLD_SCALE_DECIBEL:

        waveformLabelTexts = ['0 dB', '-100 db', '0 dB'];
        break;

    }

    const yWaveformIncrement = waveformLabelCanvas.height / (waveformLabelTexts.length - 1);

    for (let i = 0; i < waveformLabelTexts.length; i++) {

        const x = waveformLabelCanvas.width - yWaveformCtx.measureText(waveformLabelTexts[i].toString()).width - 5;

        let y = i * yWaveformIncrement;

        if (i === 0) {

            y += 5;

        }

        if (i === waveformLabelTexts.length - 1) {

            y -= 5;

        }

        yWaveformCtx.fillText(waveformLabelTexts[i], x, y);

    }

}

function resetCanvas (canvas, isWebGL) {

    // Setting the width/height of a canvas in any way wipes it clean and resets the context's transformations
    canvas.width = canvas.width;

    if (isWebGL) {

        /** @type {WebGLRenderingContext} */
        const gl = canvas.getContext('webgl');
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    } else {

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

    }

}

function updateZoomUI () {

    if (sampleCount === 0) {

        zoomInButton.disabled = true;
        zoomOutButton.disabled = true;
        return;

    }

    if (zoom <= 1.0) {

        zoomOutButton.disabled = true;

    } else {

        zoomOutButton.disabled = false;

    }

    if (zoom >= zoomMax) {

        zoomInButton.disabled = true;

    } else {

        zoomInButton.disabled = false;

    }

    zoomSpan.innerText = 'x' + zoom.toFixed(1);

}

function updatePanUI () {

    if (sampleCount === 0) {

        panLeftButton.disabled = true;
        panRightButton.disabled = true;
        return;

    }

    if (offset >= 0) {

        panRightButton.disabled = true;

    } else {

        panRightButton.disabled = false;

    }

    const totalLength = sampleCount / sampleRate;
    const displayedTime = totalLength / zoom;

    let sampleEnd = Math.floor((Math.abs(offset) + displayedTime) * sampleRate);

    // Gap at the end of the plot in samples
    const gapLength = sampleEnd - sampleCount;

    sampleEnd = sampleEnd > sampleCount ? sampleCount : sampleEnd;

    if (gapLength >= 0) {

        panLeftButton.disabled = true;

    } else {

        panLeftButton.disabled = false;

    }

}

function drawThresholdedPeriods () {

    const waveformCtx = waveformOverlayCanvas.getContext('2d');
    const waveformW = waveformOverlayCanvas.width;
    const waveformH = waveformOverlayCanvas.height;

    waveformCtx.clearRect(0, 0, waveformW, waveformH);

    const spectrogramCtx = spectrogramOverlayCanvas.getContext('2d');
    const spectrogramW = spectrogramCanvas.width;
    const spectrogramH = spectrogramCanvas.height;

    spectrogramCtx.clearRect(0, 0, spectrogramW, spectrogramH);

    const pixelOffset = Math.abs(timeToPixel(offset));

    // Reset scaling from zoom

    waveformCtx.resetTransform();

    waveformCtx.fillStyle = 'red';
    waveformCtx.globalAlpha = 0.5;

    spectrogramCtx.resetTransform();

    spectrogramCtx.fillStyle = 'grey';
    spectrogramCtx.globalAlpha = 0.75;

    for (let i = 0; i < thresholdPeriods.length; i++) {

        const startPixels = timeToPixel(thresholdPeriods[i].start / sampleRate);
        const lengthPixels = timeToPixel(thresholdPeriods[i].length / sampleRate);
        const endPixels = startPixels + lengthPixels;

        if (startPixels < pixelOffset && endPixels < pixelOffset) {

            continue;

        }

        let x = startPixels - pixelOffset;
        let w = lengthPixels;

        // If the offset has shifted the start point off the left of the plot, cut it off at 0

        if (x < 0) {

            w += x;
            x = 0;

        }

        // As plot cannot scroll right to block the right side, it's impossible for a block to exceed the width of the canvas

        waveformCtx.fillRect(x, 0, w, waveformH);
        spectrogramCtx.fillRect(x, 0, w, spectrogramH);

    }

}

function drawLoadingImage (canvas) {

    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    resetCanvas(canvas, false);

    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.fillText('Loading...', w / 2, h / 2);

}

function drawLoadingImages () {

    resetCanvas(spectrogramCanvas, true);
    drawLoadingImage(spectrogramOverlayCanvas);
    resetCanvas(waveformCanvas, true);
    drawLoadingImage(waveformOverlayCanvas);

}

function copyLabelsToCanvas () {

    const ctx = timeLabelCanvas.getContext('2d');
    const w = timeLabelCanvas.width;
    const h = timeLabelCanvas.height;

    resetCanvas(timeLabelCanvas, false);

    ctx.clearRect(0, 0, w, h);

    const pixelOffset = timeToPixel(offset);

    ctx.drawImage(prepLabelCanvas, pixelOffset, 0);

}

function drawPlots () {

    const pixelOffset = timeToPixel(offset);

    drawSpectrogram(processedSpectrumFrames, spectrogramCanvas, pixelOffset, zoom, async () => {

        const unfilteredSamples = await readFromFile();

        const totalLength = sampleCount / sampleRate;
        const displayedTime = totalLength / zoom;

        const sampleStart = Math.floor(Math.abs(offset) * sampleRate);
        let sampleEnd = Math.floor((Math.abs(offset) + displayedTime) * sampleRate);

        // Gap at the end of the plot in samples
        let gapLength = sampleEnd - sampleCount;
        gapLength = gapLength < 0 ? 0 : gapLength;

        sampleEnd = sampleEnd > sampleCount ? sampleCount : sampleEnd;

        console.log('Drawing waveform');
        drawWaveform(unfilteredSamples.slice(sampleStart, sampleEnd), waveformCanvas, gapLength, () => {

            if (amplitudeThresholdingCheckbox.checked) {

                drawThresholdedPeriods();

            }

            drawAxisLabels();
            copyLabelsToCanvas();

        });

    });

}

function getCurrentSettings () {

    const filterIndex = getSelectedRadioValue('filter-radio');
    let filterValue0 = 0;
    let filterValue1 = 0;

    switch (filterIndex) {

    case LOW_PASS_FILTER:
        filterValue0 = lowPassFilterSlider.getValue();
        break;
    case HIGH_PASS_FILTER:
        filterValue1 = highPassFilterSlider.getValue();
        break;
    case BAND_PASS_FILTER:
        filterValue0 = Math.min(...bandPassFilterSlider.getValue());
        filterValue1 = Math.max(...bandPassFilterSlider.getValue());
        break;

    }

    const minimumTriggerDuration = getSelectedRadioValue('amplitude-thresholding-duration-radio');
    const amplitudeThresholdScale = getSelectedRadioValue('amplitude-thresholding-scale-radio');

    return {
        filterEnabled: filterCheckbox.checked,
        filterIndex: filterIndex,
        filterValue0: filterValue0,
        filterValue1: filterValue1,
        amplitudeThresholdEnabled: amplitudeThresholdingCheckbox.checked,
        minimumTriggerDuration: minimumTriggerDuration,
        amplitudeThresholdScale: amplitudeThresholdScale,
        amplitudeThreshold: getAmplitudeThreshold()
    };

}

function updateSettingsRecord () {

    previousSettings = getCurrentSettings();

}

function settingsHaveChanged () {

    const currentSettings = getCurrentSettings();

    return (currentSettings.filterEnabled !== previousSettings.filterEnabled) ||
        (currentSettings.filterIndex !== previousSettings.filterIndex) ||
        (currentSettings.filterValue0 !== previousSettings.filterValue0) ||
        (currentSettings.filterValue1 !== previousSettings.filterValue1) ||
        (currentSettings.amplitudeThresholdEnabled !== previousSettings.amplitudeThresholdEnabled) ||
        (currentSettings.minimumTriggerDuration !== previousSettings.minimumTriggerDuration) ||
        (currentSettings.amplitudeThresholdScale !== previousSettings.amplitudeThresholdScale) ||
        (currentSettings.amplitudeThreshold !== previousSettings.amplitudeThreshold);

}

function processContents (samples, sampleRate) {

    drawing = true;

    zoomInButton.disabled = true;
    zoomOutButton.disabled = true;
    panLeftButton.disabled = true;
    panRightButton.disabled = true;

    filterCheckbox.disabled = true;
    filterCheckboxLabel.style.color = 'grey';
    updateFilterUI();

    amplitudeThresholdingCheckbox.disabled = true;
    amplitudeThresholdingCheckboxLabel.style.color = 'grey';
    updateAmplitudeThresholdingUI();

    updateButton.disabled = true;
    resetButton.disabled = true;

    setTimeout(() => {

        console.log('Calculating spectrogram frames');

        processedSpectrumFrames = calculateSpectrogramFrames(samples, sampleRate);

        const pixelOffset = timeToPixel(offset);

        console.log('Drawing spectrogram');
        drawSpectrogram(processedSpectrumFrames, spectrogramCanvas, pixelOffset, zoom, async () => {

            const unfilteredSamples = await readFromFile();

            resetCanvas(spectrogramOverlayCanvas, false);

            const totalLength = sampleCount / sampleRate;
            const displayedTime = totalLength / zoom;

            const sampleStart = Math.floor(Math.abs(offset) * sampleRate);
            let sampleEnd = Math.floor((Math.abs(offset) + displayedTime) * sampleRate);

            // Gap at the end of the plot in samples
            let overflow = sampleEnd - sampleCount;
            overflow = overflow < 0 ? 0 : overflow;

            sampleEnd = sampleEnd > sampleCount ? sampleCount : sampleEnd;

            console.log('Drawing waveform');
            drawWaveform(unfilteredSamples.slice(sampleStart, sampleEnd), waveformCanvas, overflow, () => {

                resetCanvas(waveformOverlayCanvas, false);

                if (amplitudeThresholdingCheckbox.checked) {

                    drawThresholdedPeriods();

                }

                console.log('Drawing axis labels');
                drawAxisLabels();
                copyLabelsToCanvas();

                drawing = false;

                zoomInButton.disabled = false;
                zoomOutButton.disabled = false;
                updateZoomUI();
                panLeftButton.disabled = false;
                panRightButton.disabled = false;
                updatePanUI();

                filterCheckbox.disabled = false;
                filterCheckboxLabel.style.color = '';
                updateFilterUI();

                amplitudeThresholdingCheckbox.disabled = false;
                amplitudeThresholdingCheckboxLabel.style.color = '';
                updateAmplitudeThresholdingUI();

                updateButton.disabled = false;
                resetButton.disabled = false;

                updateSettingsRecord();

            });

        });

    }, 100);

}

function resetTransformations () {

    zoom = 1.0;
    offset = 0;
    updatePanUI();
    updateZoomUI();

}

function panLeft () {

    if (sampleCount !== 0 && !drawing) {

        const totalLength = sampleCount / sampleRate;

        if (Math.abs(offset - offsetIncrement) <= totalLength) {

            offset -= offsetIncrement;

            setTimeout(() => {

                drawPlots();

            }, 100);

        }

        updatePanUI();

    }

}

function panRight () {

    if (sampleCount !== 0 && !drawing) {

        if (offset + offsetIncrement <= 0) {

            offset += offsetIncrement;

            setTimeout(() => {

                drawPlots();

            }, 100);

        }

        updatePanUI();

    }

}

function zoomIn () {

    if (sampleCount !== 0 && !drawing) {

        if (zoom < zoomMax) {

            zoom += zoomIncrement;

            setTimeout(() => {

                drawPlots();

            }, 10);

            updateZoomUI();
            updatePanUI();

        }

    }

}

function zoomOut () {

    if (sampleCount !== 0 && !drawing) {

        if (zoom - zoomIncrement >= 1.0) {

            zoom -= zoomIncrement;

            setTimeout(() => {

                drawPlots();

            }, 10);

        } else {

            zoom = 1.0;

        }

        updateZoomUI();
        updatePanUI();

    }

}

async function updatePlots () {

    if (!settingsHaveChanged()) {

        console.log('Settings haven\'t changed so plots weren\'t redrawn');
        return;

    }

    drawLoadingImages();

    const unfilteredSamples = await readFromFile();

    if (!filterCheckbox.checked && !amplitudeThresholdingCheckbox.checked) {

        processContents(unfilteredSamples, sampleRate);

        return;

    }

    let filteredSamples = [];

    if (filterCheckbox.checked) {

        let filterCoeffs;

        const filterIndex = getSelectedRadioValue('filter-radio');

        switch (filterIndex) {

        case LOW_PASS_FILTER:
            console.log('Applying low-pass filter');
            filterCoeffs = designLowPassFilter(sampleRate, lowPassFilterSlider.getValue());
            break;
        case HIGH_PASS_FILTER:
            console.log('Applying high-pass filter');
            filterCoeffs = designHighPassFilter(sampleRate, highPassFilterSlider.getValue());
            break;
        case BAND_PASS_FILTER:
            console.log('Applying band-pass filter');
            filterCoeffs = designBandPassFilter(sampleRate, Math.min(...bandPassFilterSlider.getValue()), Math.max(...bandPassFilterSlider.getValue()));
            break;

        }

        let filter = createFilter();

        filteredSamples = new Array(sampleCount);

        for (let i = 0; i < sampleCount; i++) {

            const response = applyFilter(unfilteredSamples[i], filter, filterCoeffs, filterIndex);

            filter = response.filter;
            filteredSamples[i] = response.filteredSample;

        }

    } else {

        filteredSamples = unfilteredSamples;

    }

    if (amplitudeThresholdingCheckbox.checked) {

        const threshold = getAmplitudeThreshold();
        const minimumTriggerDurationSecs = MINIMUM_TRIGGER_DURATIONS[getSelectedRadioValue('amplitude-thresholding-duration-radio')];
        const minimumTriggerDurationSamples = minimumTriggerDurationSecs * sampleRate;

        console.log('Applying amplitude threshold');
        console.log('Threshold:', threshold);
        console.log('Minimum trigger duration: %i (%i samples)', minimumTriggerDurationSecs, minimumTriggerDurationSamples);

        thresholdPeriods = applyAmplitudeThreshold(filteredSamples, threshold, minimumTriggerDurationSamples);

    }

    processContents(filteredSamples, sampleRate);

}

async function readFromFile () {

    console.log('Reading samples');

    const result = await readWav(fileHandler, MAX_FILE_SIZE);

    if (!result.success) {

        console.error('Failed to read file');

        errorDisplay.style.display = '';
        errorText.innerHTML = result.error;

        if (result.error === 'Could not read input file.') {

            errorText.innerHTML += '<br>';
            errorText.innerHTML += 'For more information, <u><a href="#faqs" style="color: white;">click here</a></u>.';

        }

        // Clear plots

        resetCanvas(spectrogramOverlayCanvas, false);
        resetCanvas(spectrogramCanvas, true);
        resetCanvas(waveformOverlayCanvas, false);
        resetCanvas(waveformCanvas, true);

        return;

    }

    sampleRate = result.header.wavFormat.samplesPerSecond;
    sampleCount = result.samples.length;
    return result.samples;

}

fileButton.addEventListener('click', async () => {

    const opts = {
        types: [
            {
                description: 'WAV files',
                accept: {
                    'audio/wav': ['.wav']
                }
            }
        ],
        excludeAcceptAllOption: true,
        multiple: false
    };

    try {

        fileHandler = await window.showOpenFilePicker(opts);

    } catch (error) {

        console.error('Request was aborted.');
        console.error(error);
        return;

    }

    if (!fileHandler) {

        fileLabel.innerText = 'No .WAV files selected.';
        return;

    }

    fileHandler = fileHandler[0];

    fileLabel.innerText = fileHandler.name;

    drawLoadingImages();

    // Disable UI whilst loading samples and processing

    filterCheckbox.checked = false;
    amplitudeThresholdingCheckbox.checked = false;

    zoomInButton.disabled = true;
    zoomOutButton.disabled = true;
    panLeftButton.disabled = true;
    panRightButton.disabled = true;

    filterCheckbox.disabled = true;
    filterCheckboxLabel.style.color = 'grey';
    updateFilterUI();

    amplitudeThresholdingCheckbox.disabled = true;
    amplitudeThresholdingCheckboxLabel.style.color = 'grey';
    updateAmplitudeThresholdingUI();

    updateButton.disabled = true;
    resetButton.disabled = true;

    // Read samples

    const unfilteredSamples = await readFromFile();

    thresholdPeriods = [];

    console.log('Loaded', sampleCount, 'samples at a sample rate of', sampleRate, 'Hz');

    sampleRateChange();

    processContents(unfilteredSamples, sampleRate);

});

document.addEventListener('keydown', (event) => {

    if (event.ctrlKey) {

        switch (event.key) {

        case 'ArrowRight':
            event.preventDefault();
            event.stopPropagation();
            panRight();
            break;

        case 'ArrowLeft':
            event.preventDefault();
            event.stopPropagation();
            panLeft();
            break;

        case 'ArrowUp':
            event.preventDefault();
            event.stopPropagation();
            zoomIn();
            break;

        case 'ArrowDown':
            event.preventDefault();
            event.stopPropagation();
            zoomOut();
            break;

        default:
            break;

        }

    }

});

filterCheckbox.addEventListener('change', () => {

    updateFilterUI();
    updateFilterSliders();
    updateFilterLabel();

});

// Add filter radio button listeners
for (let i = 0; i < filterRadioButtons.length; i++) {

    filterRadioButtons[i].addEventListener('change', function () {

        updateFilterUI();
        updateFilterSliders();
        updateFilterLabel();

    });

}

amplitudeThresholdingCheckbox.addEventListener('change', updateAmplitudeThresholdingUI);
updateAmplitudeThresholdingUI();

for (let i = 0; i < amplitudeThresholdingScaleRadioButtons.length; i++) {

    amplitudeThresholdingScaleRadioButtons[i].addEventListener('change', function () {

        amplitudeThresholdingScaleIndex = getSelectedRadioValue('amplitude-thresholding-scale-radio');

        updateAmplitudeThresholdingScale();

        drawAxisLabels();

    });

}

amplitudeThresholdingSlider.on('change', updateAmplitudeThresholdingLabel);

updateButton.addEventListener('click', updatePlots);
resetButton.addEventListener('click', () => {

    filterCheckbox.checked = false;
    updateFilterUI();
    amplitudeThresholdingCheckbox.checked = false;
    updateAmplitudeThresholdingUI();

    resetTransformations();
    sampleRateChange();
    updatePlots();

});

bandPassFilterSlider.on('change', updateFilterLabel);
lowPassFilterSlider.on('change', updateFilterLabel);
highPassFilterSlider.on('change', updateFilterLabel);

zoomInButton.addEventListener('click', zoomIn);
zoomOutButton.addEventListener('click', zoomOut);

panLeftButton.addEventListener('click', panLeft);
panRightButton.addEventListener('click', panRight);

resetTransformations();

drawAxisLabels();
copyLabelsToCanvas();

filterCheckbox.checked = false;
updateFilterUI();
updateFilterLabel();

const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);

if (!isChrome) {

    browserErrorDisplay.style.display = '';
    fileButton.disabled = true;

}
