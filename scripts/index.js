/****************************************************************************
 * index.js
 * openacousticdevices.info
 * June 2021
 *****************************************************************************/

/* global calculateSpectrogramFrames, drawSpectrogram, drawWaveform, Slider, readWav, designLowPassFilter, designHighPassFilter, designBandPassFilter, createFilter, LOW_PASS_FILTER, BAND_PASS_FILTER, HIGH_PASS_FILTER, applyFilter, applyAmplitudeThreshold, playAudio, stopAudio, getTimestamp */

// Use these values to fill in the axis labels before samples have been loaded

const FILLER_SAMPLE_RATE = 384000;
const FILLER_SAMPLE_COUNT = FILLER_SAMPLE_RATE * 60;

// Error display elements

const browserErrorDisplay = document.getElementById('browser-error-display');
const errorDisplay = document.getElementById('error-display');
const errorText = document.getElementById('error-text');

// File selection elements

const fileButton = document.getElementById('file-button');
const fileSpan = document.getElementById('file-span');
const trimmedSpan = document.getElementById('trimmed-span');
const exampleLink = document.getElementById('example-link');

// Plot navigation buttons

const homeButton = document.getElementById('home-button');

const zoomInButton = document.getElementById('zoom-in-button');
const zoomOutButton = document.getElementById('zoom-out-button');

const panLeftButton = document.getElementById('pan-left-button');
const panRightButton = document.getElementById('pan-right-button');

// Plot navigation variables

let zoom = 1.0;
const ZOOM_INCREMENT = 2.0;
const MIN_TIME_VIEW = 0.01;
let maxZoom = 128.0;

let offset = 0.0;

// Zoom drag variables

let isDragging = false;
let dragStartX = 0;

// Waveform y axis navigation buttons

const waveformHomeButton = document.getElementById('waveform-home-button');
const waveformZoomInButton = document.getElementById('waveform-zoom-in-button');
const waveformZoomOutButton = document.getElementById('waveform-zoom-out-button');

// Waveform vertical navigation variables

let waveformZoomY = 1.0;
const waveformZoomYIncrement = 2.0;
const MAX_ZOOM_Y = 256;

// Spectrogram canvases

const spectrogramPlaybackCanvas = document.getElementById('spectrogram-playback-canvas'); // Canvas layer where playback progress
const spectrogramDragCanvas = document.getElementById('spectrogram-drag-canvas'); // Canvas layer where zoom overlay is drawn
const spectrogramThresholdCanvas = document.getElementById('spectrogram-threshold-canvas'); // Canvas layer where amplitude thresholded periods are drawn
const spectrogramCanvas = document.getElementById('spectrogram-canvas'); // Canvas layer where spectrogram is drawn

const waveformPlaybackCanvas = document.getElementById('waveform-playback-canvas'); // Canvas layer where playback progress
const waveformDragCanvas = document.getElementById('waveform-drag-canvas'); // Canvas layer where zoom overlay is drawn
const waveformThresholdCanvas = document.getElementById('waveform-threshold-canvas'); // Canvas layer where amplitude thresholded periods are drawn
const waveformThresholdLineCanvas = document.getElementById('waveform-threshold-line-canvas'); // Canvas layer where amplitude threshold value lines are drawn
const waveformCanvas = document.getElementById('waveform-canvas'); // Canvas layer where waveform is drawn

const timeLabelSVG = document.getElementById('time-axis-label-svg');
const timeAxisHeadingSVG = document.getElementById('time-axis-heading-svg');

// Y axis label canvases

const spectrogramLabelSVG = document.getElementById('spectrogram-label-svg');
const Y_LABEL_COUNT = 4;
const waveformLabelSVG = document.getElementById('waveform-label-svg');

// File variables

let fileHandler;
let unfilteredSamples;
let filteredSamples;
let sampleCount = 0;
let sampleRate, processedSpectrumFrames;
let spectrumMin = 0;
let spectrumMax = 0;

// Drawing/processing flag

let drawing = false;

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

// Previous low/band/high pass filter type selected

let previousSelectionType = 1;

// Low/band/high pass filter slider spacing steps

const FILTER_SLIDER_STEPS = {8000: 100, 16000: 100, 32000: 100, 48000: 100, 96000: 200, 192000: 500, 250000: 500, 384000: 1000};

// Amplitude threshold elements

const amplitudethresholdMaxLabel = document.getElementById('amplitude-threshold-max-label');
const amplitudethresholdMinLabel = document.getElementById('amplitude-threshold-min-label');

const amplitudethresholdCheckboxLabel = document.getElementById('amplitude-threshold-checkbox-label');
const amplitudethresholdCheckbox = document.getElementById('amplitude-threshold-checkbox');
const amplitudethresholdSlider = new Slider('#amplitude-threshold-slider', {});
const amplitudethresholdLabel = document.getElementById('amplitude-threshold-label');
const amplitudethresholdDurationTable = document.getElementById('amplitude-threshold-duration-table');
const amplitudethresholdRadioButtons = document.getElementsByName('amplitude-threshold-duration-radio');

const amplitudeThresholdScaleSelect = document.getElementById('amplitude-threshold-scale-select');

// Non-linear amplitude threshold values to map to slider scale

const VALID_AMPLITUDE_VALUES = [0, 1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 88, 96, 104, 112, 120, 128, 144, 160, 176, 192, 208, 224, 240, 256, 288, 320, 352, 384, 416, 448, 480, 512, 576, 640, 704, 768, 832, 896, 960, 1024, 1152, 1280, 1408, 1536, 1664, 1792, 1920, 2048, 2304, 2560, 2816, 3072, 3328, 3584, 3840, 4096, 4608, 5120, 5632, 6144, 6656, 7168, 7680, 8192, 9216, 10240, 11264, 12288, 13312, 14336, 15360, 16384, 18432, 20480, 22528, 24576, 26624, 28672, 30720, 32768];

// Minimum trigger duration values

const MINIMUM_TRIGGER_DURATIONS = [0, 1, 2, 5, 10, 15, 30, 60];

// Amplitude threshold scale enums

let amplitudethresholdScaleIndex = 2;
const AMPLITUDE_THRESHOLD_SCALE_16BIT = 0;
const AMPLITUDE_THRESHOLD_SCALE_DECIBEL = 1;
const AMPLITUDE_THRESHOLD_SCALE_PERCENTAGE = 2;

// Blocks in pixel space representing audio below the threshold

let thresholdPeriods = [];

// Panel which states how much size reduction the amplitude threshold settings chosen will do

const lifeDisplayPanel = document.getElementById('life-display-panel');

// Other UI

const resetButton = document.getElementById('reset-button');
const exportButton = document.getElementById('export-button');

// Audio playback controls

const playButton = document.getElementById('play-button');
const playIcon = document.getElementById('play-icon');
const stopIcon = document.getElementById('stop-icon');

const playbackSpeedSlider = new Slider('#playback-speed-slider', {
    ticks_labels: ['x1/16', 'x1/8', 'x1/4', 'x1/2', 'x1', 'x2'],
    ticks: [0, 1, 2, 3, 4, 5],
    value: 4
});
const playbackRates = [0.0625, 0.125, 0.25, 0.5, 1.0, 2.0];

// Whether or not audio is currently playing

let playing = false;

// Timeout object which controls playback tracker animation frames

let animationTimer;

/**
 * Get index of radio button selected from a collection of radio buttons
 * @param {string} radioName Name assigned to the group of radio buttons
 * @returns Radio index
 */
function getSelectedRadioValue (radioName) {

    return parseInt(document.querySelector('input[name="' + radioName + '"]:checked').value, 10);

}

/**
 * Set the high-pass filter values to given value
 * @param {number} value New high-pass filter value
 */
function setHighPassSliderValue (value) {

    highPassFilterSlider.setValue(value);

}

/**
 * Set the low-pass filter values to given value
 * @param {number} value New low-pass filter value
 */
function setLowPassSliderValue (value) {

    lowPassFilterSlider.setValue(value);

}

/**
 * Set the band-pass filter values to 2 given values
 * @param {number} lowerSliderValue New lower band-pass filter value
 * @param {number} higherSliderValue New higher band-pass filter value
 */
function setBandPass (lowerSliderValue, higherSliderValue) {

    lowerSliderValue = (lowerSliderValue === -1) ? 0 : lowerSliderValue;
    higherSliderValue = (higherSliderValue === -1) ? bandPassFilterSlider.getAttribute('max') : higherSliderValue;

    bandPassFilterSlider.setValue([lowerSliderValue, higherSliderValue]);

}

/**
 * When sample rate changes, so does the slider step. Update values to match the corresponding step
 * @param {number} value Value returned by slider
 * @param {number} step Step value according to sample rate
 * @returns Closest step to given value
 */
function roundToSliderStep (value, step) {

    return Math.round(value / step) * step;

}

/**
 * Handle a change in the sample rate from loading a new file
 */
function sampleRateChange () {

    // Update labels to reflect new sample rate

    const maxFreq = sampleRate / 2;

    const labelText = (maxFreq / 1000) + 'kHz';

    lowPassMaxLabel.textContent = labelText;
    highPassMaxLabel.textContent = labelText;
    bandPassMaxLabel.textContent = labelText;

    // Update low/band/high pass filter ranges

    highPassFilterSlider.setAttribute('max', maxFreq);
    lowPassFilterSlider.setAttribute('max', maxFreq);
    bandPassFilterSlider.setAttribute('max', maxFreq);

    const filterSliderStep = FILTER_SLIDER_STEPS[sampleRate];

    highPassFilterSlider.setAttribute('step', filterSliderStep);
    lowPassFilterSlider.setAttribute('step', filterSliderStep);
    bandPassFilterSlider.setAttribute('step', filterSliderStep);

    // Set values to 1/4 and 3/4 of max value

    const newLowPassFreq = maxFreq / 4;
    const newHighPassFreq = 3 * maxFreq / 4;

    setBandPass(roundToSliderStep(Math.max(newHighPassFreq, newLowPassFreq), filterSliderStep), roundToSliderStep(Math.min(newHighPassFreq, newLowPassFreq), filterSliderStep));
    setLowPassSliderValue(roundToSliderStep(newLowPassFreq, filterSliderStep));
    setHighPassSliderValue(roundToSliderStep(newHighPassFreq, filterSliderStep));

}

/**
 * Display correct low/band/high pass filter UI
 */
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

/**
 * Convert raw slider to all possible amplitude threshold scales
 * @param {number} rawSlider Slider value
 * @returns Object containing value as a decibel, percentage, and amplitude
 */
function convertAmplitudeThreshold (rawSlider) {

    let exponent, mantissa, validAmplitude;

    const sliderMax = amplitudethresholdSlider.getAttribute('max');
    const scaledSlider = rawSlider / sliderMax;

    const rawLog = (100 * scaledSlider - 100);

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

/**
 * Convert selected amplitude threshold from current scale raw slider value to amplitude
 * @returns Amplitude threshold value
 */
function getAmplitudeThreshold () {

    return convertAmplitudeThreshold(amplitudethresholdSlider.getValue()).amplitude;

}

/**
 * Convert mantissa/exponent to human-readable percentage
 * @param {number} mantissa Amplitude threshold mantissa
 * @param {number} exponent Amplitude threshold exponent
 * @returns Percentage value
 */
function formatPercentage (mantissa, exponent) {

    let response = '';

    if (exponent < 0) {

        response += '0.0000'.substring(0, 1 - exponent);

    }

    response += mantissa;

    for (let i = 0; i < exponent; i += 1) response += '0';

    return response;

}

/**
 * Update the information label which displays the amplitude threshold in a given scale
 */
function updateAmplitudethresholdLabel () {

    const amplitudeThreshold = convertAmplitudeThreshold(amplitudethresholdSlider.getValue());

    amplitudethresholdLabel.textContent = 'Amplitude threshold of ';

    switch (amplitudethresholdScaleIndex) {

    case AMPLITUDE_THRESHOLD_SCALE_PERCENTAGE:

        amplitudethresholdLabel.textContent += amplitudeThreshold.percentage + '%';
        break;

    case AMPLITUDE_THRESHOLD_SCALE_16BIT:

        amplitudethresholdLabel.textContent += amplitudeThreshold.amplitude;
        break;

    case AMPLITUDE_THRESHOLD_SCALE_DECIBEL:

        amplitudethresholdLabel.textContent += amplitudeThreshold.decibels + ' dB';
        break;

    }

    amplitudethresholdLabel.textContent += ' will be used when generating T.WAV files.';

}

/**
 * Update UI when amplitude threshold scale is changed
 */
function updateAmplitudethresholdScale () {

    updateAmplitudethresholdLabel();

    switch (amplitudethresholdScaleIndex) {

    case AMPLITUDE_THRESHOLD_SCALE_PERCENTAGE:
        amplitudethresholdMinLabel.innerHTML = '0.001%';
        amplitudethresholdMaxLabel.innerHTML = '100%';
        break;

    case AMPLITUDE_THRESHOLD_SCALE_16BIT:
        amplitudethresholdMinLabel.innerHTML = '0';
        amplitudethresholdMaxLabel.innerHTML = '32768';
        break;

    case AMPLITUDE_THRESHOLD_SCALE_DECIBEL:
        amplitudethresholdMinLabel.innerHTML = '-100 dB';
        amplitudethresholdMaxLabel.innerHTML = '0 dB';
        break;

    }

}

/**
 * Handle a change to the amplitude threshold status/value
 */
function updateAmplitudethresholdUI () {

    if (amplitudethresholdCheckbox.checked && !amplitudethresholdCheckbox.disabled) {

        amplitudethresholdSlider.enable();
        amplitudethresholdMaxLabel.style.color = '';
        amplitudethresholdMinLabel.style.color = '';

        amplitudethresholdLabel.style.color = '';
        updateAmplitudethresholdLabel();

        amplitudethresholdDurationTable.style.color = '';

        for (let i = 0; i < amplitudethresholdRadioButtons.length; i++) {

            amplitudethresholdRadioButtons[i].disabled = false;

        }

    } else {

        amplitudethresholdSlider.disable();
        amplitudethresholdMaxLabel.style.color = 'grey';
        amplitudethresholdMinLabel.style.color = 'grey';

        amplitudethresholdLabel.style.color = 'grey';

        // If the UI is disabled because app is drawing, rather than manually disabled, don't rewrite the label

        if (!amplitudethresholdCheckbox.disabled) {

            amplitudethresholdLabel.textContent = 'All audio will be written to a .WAV file.';

        }

        amplitudethresholdDurationTable.style.color = 'grey';

        for (let i = 0; i < amplitudethresholdRadioButtons.length; i++) {

            amplitudethresholdRadioButtons[i].disabled = true;

        }

    }

}

/**
 * Update theinformation label which displays the low/band/high pass filter status
 */
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

/**
 * Make the filter values consistent across filter types when the type is changed
 */
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

/**
 * Convert a time in seconds to a pixel value on the screen, given the current zoom level
 * @param {number} seconds A length of time in seconds
 * @returns How many horizontal pixels on-screen portray this amount of time
 */
function timeToPixel (seconds) {

    const totalLength = (sampleCount !== 0) ? sampleCount / sampleRate : FILLER_SAMPLE_COUNT / FILLER_SAMPLE_RATE;
    const pixels = (seconds / totalLength) * spectrogramCanvas.width * zoom;

    return pixels;

}

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Draw text to an SVG holder
 * @param {Element} parent SVG element to be drawn to
 * @param {string} content Text to be written
 * @param {number} x x coordinate
 * @param {number} y y coordinate
 * @param {string} anchor What end of the text it should be anchored to. Possible values: start/middle/end
 */
function addSVGText (parent, content, x, y, anchor) {

    const textElement = document.createElementNS(SVG_NS, 'text');

    textElement.setAttributeNS(null, 'x', x);
    textElement.setAttributeNS(null, 'y', y);
    textElement.setAttributeNS(null, 'dominant-baseline', 'middle');
    textElement.setAttributeNS(null, 'text-anchor', anchor);
    textElement.setAttributeNS(null, 'font-size', '10px');

    textElement.textContent = content;

    parent.appendChild(textElement);

}

function addSVGLine (parent, x1, y1, x2, y2) {

    const lineElement = document.createElementNS(SVG_NS, 'line');

    lineElement.setAttributeNS(null, 'x1', x1);
    lineElement.setAttributeNS(null, 'y1', y1);
    lineElement.setAttributeNS(null, 'x2', x2);
    lineElement.setAttributeNS(null, 'y2', y2);
    lineElement.setAttributeNS(null, 'stroke', 'black');

    parent.appendChild(lineElement);

}

/**
 * Remove all SVG drawing elements from an SVG holder
 * @param {Element} parent SVG element containing labels to be cleared
 */
function clearSVG (parent) {

    while (parent.firstChild) {

        parent.removeChild(parent.lastChild);

    }

}

/**
 * Fill in the y axis labels for the two plots and their shared x axis labels
 */
function drawAxisLabels () {

    // Length of lines used to denote each axis division

    const xMarkerLength = 4;
    const yMarkerLength = 4;

    // Draw x axis labels

    clearSVG(timeLabelSVG);

    let label = 0;
    const totalLength = (sampleCount !== 0) ? sampleCount / sampleRate : FILLER_SAMPLE_COUNT / FILLER_SAMPLE_RATE;

    // Widen gap between labels as more audio is viewable to prevent squashed labels
    const displayedTime = totalLength / zoom;

    const displayedTimeAmounts = [0.01, 0.02, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 30];
    const labelIncrements = [0.0025, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5];

    let labelIncrement = labelIncrements[0];

    for (let i = 0; i < displayedTimeAmounts.length; i++) {

        if (displayedTime <= displayedTimeAmounts[i]) {

            break;

        }

        labelIncrement = labelIncrements[i];

    }

    // So the centre of the text can be the label location, there's a small amount of padding around the label canvas
    const padding = (timeLabelSVG.width.baseVal.value - waveformCanvas.width) / 2;

    while (label <= totalLength) {

        // Convert the time to a pixel value, then take into account the label width and the padding to position correctly
        const x = timeToPixel(label) + padding + timeToPixel(offset);

        if (x - padding < 0) {

            label += labelIncrement;
            continue;

        }

        if (x - padding > waveformCanvas.width) {

            break;

        }

        // Round to correct number of decimal places

        let decimalPlaces = (labelIncrement < 0.01) ? 3 : 2;
        decimalPlaces = (labelIncrement < 0.001) ? 4 : decimalPlaces;

        const labelText = label.toFixed(decimalPlaces);

        addSVGText(timeLabelSVG, labelText, x, 10, 'middle');
        addSVGLine(timeLabelSVG, x, 0, x, xMarkerLength);

        label += labelIncrement;

    }

    // Draw y axis labels for spectrogram

    clearSVG(spectrogramLabelSVG);

    const sampRate = (sampleCount !== 0) ? sampleRate : FILLER_SAMPLE_RATE;
    const ySpecLabelIncrement = sampRate / 2 / Y_LABEL_COUNT;
    const ySpecIncrement = spectrogramLabelSVG.height.baseVal.value / Y_LABEL_COUNT;

    const specLabelX = spectrogramLabelSVG.width.baseVal.value - 7;
    const specMarkerX = spectrogramLabelSVG.width.baseVal.value - yMarkerLength;

    // Draw top and bottom label markers

    addSVGLine(spectrogramLabelSVG, specMarkerX, 1, spectrogramLabelSVG.width.baseVal.value, 1);
    const endLabelY = spectrogramLabelSVG.height.baseVal.value - 2;
    addSVGLine(spectrogramLabelSVG, specMarkerX, endLabelY, spectrogramLabelSVG.width.baseVal.value, endLabelY);

    // Draw middle labels and markers

    for (let i = 0; i <= Y_LABEL_COUNT; i++) {

        const labelText = (i * ySpecLabelIncrement / 1000) + 'kHz';

        let y = spectrogramLabelSVG.height.baseVal.value - (i * ySpecIncrement);

        if (i === 0) {

            y -= 5;

        }

        if (i === Y_LABEL_COUNT) {

            y += 5;

        }

        addSVGText(spectrogramLabelSVG, labelText, specLabelX, y, 'end');

        if (i !== 0 && i !== Y_LABEL_COUNT) {

            addSVGLine(spectrogramLabelSVG, specMarkerX, y, spectrogramLabelSVG.width.baseVal.value, y);

        }

    }

    // Draw y axis labels for waveform

    clearSVG(waveformLabelSVG);

    let waveformLabelTexts = [];

    const percentageValues = [100, 75, 50, 25, 0, 25, 50, 75, 100];
    const a16bitValues = [32768, 24576, 16384, 8192, 0, 8192, 16384, 24576, 32768];
    const rawSliderValues = [1.0, 0.75, 0.5, 0.25, 0.0, 0.25, 0.5, 0.75, 1.0];

    switch (amplitudethresholdScaleIndex) {

    case AMPLITUDE_THRESHOLD_SCALE_PERCENTAGE:

        waveformLabelTexts = ['', '', '', '', '', '', '', '', ''];

        for (let i = 0; i < waveformLabelTexts.length; i++) {

            waveformLabelTexts[i] = (percentageValues[i] / waveformZoomY).toFixed(1) + '%';

        }

        break;

    case AMPLITUDE_THRESHOLD_SCALE_16BIT:

        waveformLabelTexts = ['', '', '', '', '', '', '', '', ''];

        for (let i = 0; i < waveformLabelTexts.length; i++) {

            waveformLabelTexts[i] = Math.round(a16bitValues[i] / waveformZoomY);

        }

        break;

    case AMPLITUDE_THRESHOLD_SCALE_DECIBEL:

        waveformLabelTexts = ['', '', '', '', '', '', '', '', ''];

        for (let i = 0; i < waveformLabelTexts.length; i++) {

            if (rawSliderValues[i] === 0.0) {

                continue;

            }

            const rawLog = 20 * Math.log10(rawSliderValues[i] / waveformZoomY);

            const decibelValue = 2 * Math.round(rawLog / 2);

            waveformLabelTexts[i] = decibelValue + 'dB';

        }

        break;

    }

    const canvasH = waveformLabelSVG.height.baseVal.value;

    const yWaveformIncrement = canvasH / (waveformLabelTexts.length - 1);

    const wavLabelX = waveformLabelSVG.width.baseVal.value - 7;
    const wavMarkerX = waveformLabelSVG.width.baseVal.value - yMarkerLength;

    // Draw middle labels and markers

    for (let i = 0; i < waveformLabelTexts.length; i++) {

        let markerY = Math.round(i * yWaveformIncrement);
        let labelY = markerY;

        labelY = (labelY === 0) ? labelY + 5 : labelY;
        labelY = (labelY === canvasH) ? labelY - 5 : labelY;

        addSVGText(waveformLabelSVG, waveformLabelTexts[i], wavLabelX, labelY, 'end');

        // Nudge markers slightly onto canvas so they're not cut off

        markerY = (markerY === 0) ? markerY + 1 : markerY;
        markerY = (markerY === canvasH) ? markerY - 1 : markerY;

        addSVGLine(waveformLabelSVG, wavMarkerX, markerY, waveformLabelSVG.width.baseVal.value, markerY);

    }

}

/**
 * Add axis heading to plots
 */
function drawAxisHeadings () {

    clearSVG(timeAxisHeadingSVG);

    addSVGText(timeAxisHeadingSVG, 'Time (seconds)', timeAxisHeadingSVG.width.baseVal.value / 2, 10, 'middle');

}

/**
 * Clear a canvas of its contents and reset all transformations
 * @param {object} canvas The canvas to be cleared
 */
function resetCanvas (canvas, isWebGL) {

    // Setting the width/height of a canvas in any way wipes it clean and resets the context's transformations
    // eslint-disable-next-line no-self-assign
    canvas.width = canvas.width;

    if (isWebGL) {

        /** @type {WebGLRenderingContext} */
        let gl = canvas.getContext('webgl', {preserveDrawingBuffer: true});

        if (!gl) {

            console.log('Loading experimental WebGL context');
            gl = canvas.getContext('experimental-webgl', {preserveDrawingBuffer: true});

        }

        if (!gl) {

            console.error('WebGL not supported by this browser');
            return;

        }

        gl.viewport(0, 0, canvas.width, canvas.height);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    }

}

/**
 * Update zoom input with current zoom level and enable/disable zoom in/out buttons if appropriate
 */
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

    if (zoom >= maxZoom) {

        zoomInButton.disabled = true;

    } else {

        zoomInButton.disabled = false;

    }

}

/**
 * Enable/disable pan buttons when appropriate
 */
function updatePanUI () {

    if (sampleCount === 0) {

        panRightButton.disabled = true;
        panLeftButton.disabled = true;
        return;

    }

    if (offset >= 0) {

        panLeftButton.disabled = true;

    } else {

        panLeftButton.disabled = false;

    }

    const totalLength = sampleCount / sampleRate;
    const displayedTime = totalLength / zoom;

    let sampleEnd = Math.floor((Math.abs(offset) + displayedTime) * sampleRate);

    // Gap at the end of the plot in samples
    const gapLength = sampleEnd - sampleCount;

    sampleEnd = sampleEnd > sampleCount ? sampleCount : sampleEnd;

    if (gapLength >= 0) {

        panRightButton.disabled = true;

    } else {

        panRightButton.disabled = false;

    }

}

function updateNavigationUI () {

    updateZoomUI();
    updatePanUI();

    // If clicking home would do nothing, disable the button

    homeButton.disabled = (zoom === 1 && offset === 0);

}

/**
 * Draw amplitude threshold value to its overlay layer
 */
function drawThresholdLines () {

    const thresholdCtx = waveformThresholdLineCanvas.getContext('2d');
    const w = waveformThresholdLineCanvas.width;
    const h = waveformThresholdLineCanvas.height;

    resetCanvas(waveformThresholdLineCanvas, false);

    thresholdCtx.strokeStyle = 'grey';
    thresholdCtx.lineWidth = 1;

    const amplitudeThreshold = getAmplitudeThreshold();

    const centre = h / 2;
    const offsetFromCentre = (amplitudeThreshold / 32768.0) * centre * waveformZoomY;
    const positiveY = centre - offsetFromCentre;
    const negativeY = centre + offsetFromCentre;

    thresholdCtx.moveTo(0, positiveY);
    thresholdCtx.lineTo(w, positiveY);
    thresholdCtx.stroke();

    thresholdCtx.moveTo(0, negativeY);
    thresholdCtx.lineTo(w, negativeY);
    thresholdCtx.stroke();

}

/**
 * Draw amplitude threshold periods to the overlay layer
 */
function drawThresholdedPeriods () {

    const waveformCtx = waveformThresholdCanvas.getContext('2d');
    const waveformW = waveformThresholdCanvas.width;
    const waveformH = waveformThresholdCanvas.height;

    waveformCtx.clearRect(0, 0, waveformW, waveformH);

    const spectrogramCtx = spectrogramThresholdCanvas.getContext('2d');
    const spectrogramW = spectrogramThresholdCanvas.width;
    const spectrogramH = spectrogramThresholdCanvas.height;

    spectrogramCtx.clearRect(0, 0, spectrogramW, spectrogramH);

    const pixelOffset = Math.abs(timeToPixel(offset));

    // Reset scaling from zoom

    waveformCtx.resetTransform();

    waveformCtx.fillStyle = 'lightgray';
    waveformCtx.globalAlpha = 0.75;

    spectrogramCtx.resetTransform();

    spectrogramCtx.fillStyle = 'white';
    spectrogramCtx.globalAlpha = 0.85;

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

/**
 * Draw a loading message to the given canvas
 * @param {object} canvas The canvas to be cleared and display the loading message
 */
function drawLoadingImage (canvas) {

    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.fillText('Loading...', w / 2, h / 2);

}

/**
 * Draw loading message on spectrogram and waveform canvases
 */
function drawLoadingImages () {

    resetCanvas(spectrogramCanvas, false);
    drawLoadingImage(spectrogramThresholdCanvas);
    resetCanvas(waveformCanvas, true);
    drawLoadingImage(waveformThresholdCanvas);

}

/**
 * Draw the waveform plot, its axis labels, and then re-enable all UI
 */
function drawWaveformPlotAndReenableUI (samples) {

    const displayedSampleCount = getDisplayedSampleCount();
    const startSample = Math.ceil(Math.abs(offset) * sampleRate);

    console.log('Drawing waveform');
    drawWaveform(samples, startSample, displayedSampleCount, waveformZoomY, () => {

        resetCanvas(waveformThresholdCanvas, false);
        resetCanvas(waveformThresholdLineCanvas, false);

        if (amplitudethresholdCheckbox.checked) {

            drawThresholdedPeriods();
            drawThresholdLines();

        }

        drawAxisLabels();

        drawing = false;

        updateNavigationUI();
        updateWaveformYUI();

        fileButton.disabled = false;

        filterCheckbox.disabled = false;
        filterCheckboxLabel.style.color = '';
        updateFilterUI();

        amplitudethresholdCheckbox.disabled = false;
        amplitudethresholdCheckboxLabel.style.color = '';
        updateAmplitudethresholdUI();

        resetButton.disabled = false;
        exportButton.disabled = false;

        playButton.disabled = false;
        playbackSpeedSlider.enable();

    });

}

/**
 * Draw spectrogram and waveform plots
 */
function drawPlots (samples) {

    drawSpectrogram(processedSpectrumFrames, spectrumMin, spectrumMax, async () => {

        resetCanvas(spectrogramThresholdCanvas, false);

        drawWaveformPlotAndReenableUI(samples);

        updateFileSizePanel();

    });

}

/**
 * Gets number of samples which will be displayed onscreen
 * @returns Sample count
 */
function getDisplayedSampleCount () {

    return Math.ceil(sampleCount / zoom);

}

/**
 * Turn off all UI elements so settings can't be changed during processing
 */
function disableUI () {

    fileButton.disabled = true;

    homeButton.disabled = true;
    zoomInButton.disabled = true;
    zoomOutButton.disabled = true;
    panRightButton.disabled = true;
    panLeftButton.disabled = true;

    filterCheckbox.disabled = true;
    filterCheckboxLabel.style.color = 'grey';
    updateFilterUI();

    amplitudethresholdCheckbox.disabled = true;
    amplitudethresholdCheckboxLabel.style.color = 'grey';
    updateAmplitudethresholdUI();

    resetButton.disabled = true;
    exportButton.disabled = true;

    playButton.disabled = true;
    playbackSpeedSlider.disable();

}

/**
 * Turn off just the UI which controls the waveform y axis zooming
 */
function disableWaveformYAxisUI () {

    waveformHomeButton.disabled = true;
    waveformZoomInButton.disabled = true;
    waveformZoomOutButton.disabled = true;

}

/**
 * Temporarily disable UI then calculate spectrogram frames
 * @param {number[]} samples Samples to be processed
 * @param {number} sampleRate Sample rate of samples
 */
function processContents (samples, sampleRate) {

    drawing = true;

    // Disable UI

    disableUI();

    // Wait short period to make sure UI is completely disabled before processing actually begins

    setTimeout(() => {

        // Calculate the subset of samples which should be processed

        const displayedSampleCount = getDisplayedSampleCount();

        console.log('Calculating spectrogram frames');

        const startSample = Math.abs(offset) * sampleRate;

        // Process spectrogram frames

        const result = calculateSpectrogramFrames(samples, startSample, displayedSampleCount);
        processedSpectrumFrames = result.frames;

        if (spectrumMin === 0.0 && spectrumMax === 0.0) {

            spectrumMin = result.min;
            spectrumMax = result.max;

            console.log('Resetting colour map. Min:', spectrumMin, 'Max:', spectrumMax);

        }

        drawPlots(samples);

    }, 100);

}

/**
 * Reset x axis zoom/pan settings
 */
function resetXTransformations () {

    zoom = 1.0;
    offset = 0;
    updateNavigationUI();

    homeButton.disabled = (sampleCount === 0);

}

/**
 * Reset all zoom/pan settings
 */
function resetTransformations () {

    resetXTransformations();
    waveformZoomY = 1.0;

}

/**
 * Shift plot along if zooming out at current location would create a gap at the end of the plot
 */
function removeEndGap () {

    const totalLength = sampleCount / sampleRate;

    const displayedTime = totalLength / zoom;

    const sampleEnd = Math.floor((Math.abs(offset) + displayedTime) * sampleRate);

    const gapLength = (sampleEnd - sampleCount) / sampleRate;

    if (gapLength > 0) {

        offset += gapLength;

    }

}

/**
 * Pan plot to the right
 */
function panRight () {

    if (sampleCount !== 0 && !drawing && !playing) {

        const offsetIncrement = getDisplayedSampleCount() / 2 / sampleRate;

        let newOffset = offset + offsetIncrement;

        newOffset = (Math.abs(newOffset) < 0.01) ? 0.0 : newOffset;

        offset = Math.min(newOffset, 0.0);

        setTimeout(() => {

            updatePlots(false);

        }, 100);

        updatePanUI();

    }

}

/**
 * Pan plot to the left
 */
function panLeft () {

    if (sampleCount !== 0 && !drawing && !playing) {

        const offsetIncrement = getDisplayedSampleCount() / 2 / sampleRate;

        const newOffset = offset - offsetIncrement;

        offset = newOffset;

        removeEndGap();

        setTimeout(() => {

            updatePlots(false);

        }, 100);

        updatePanUI();

    }

}

/**
 * Reset zoom level and pan offset
 */
function resetNavigation () {

    resetTransformations();
    sampleRateChange();
    updatePlots(false);

}

/**
 * Zoom plot in
 */
function zoomIn () {

    if (sampleCount !== 0 && !drawing && !playing) {

        let displayedSampleCount = getDisplayedSampleCount();
        const oldCentre = (Math.abs(offset) * sampleRate) + (displayedSampleCount / 2);

        let newZoom = Math.round(zoom * ZOOM_INCREMENT);

        newZoom = Math.pow(2, Math.round(Math.log(newZoom) / Math.log(2)));

        if (newZoom <= maxZoom) {

            zoom = newZoom;

            displayedSampleCount = getDisplayedSampleCount();
            const newCentre = (Math.abs(offset) * sampleRate) + (displayedSampleCount / 2);

            const diffSecs = (oldCentre - newCentre) / sampleRate;

            offset -= diffSecs;

            setTimeout(() => {

                updatePlots(false);

            }, 10);

            updateNavigationUI();

        }

    }

}

/**
 * Zoom plot out
 */
function zoomOut () {

    if (sampleCount !== 0 && !drawing && !playing) {

        let displayedSampleCount = getDisplayedSampleCount();
        const oldCentre = (Math.abs(offset) * sampleRate) + (displayedSampleCount / 2);

        let newZoom = Math.round(zoom / ZOOM_INCREMENT);

        newZoom = Math.pow(2, Math.round(Math.log(newZoom) / Math.log(2)));

        if (newZoom > 1.0) {

            zoom = newZoom;

            displayedSampleCount = getDisplayedSampleCount();
            const newCentre = (Math.abs(offset) * sampleRate) + (displayedSampleCount / 2);

            const diffSecs = (oldCentre - newCentre) / sampleRate;

            offset -= diffSecs;

            removeEndGap();

            updateNavigationUI();

        } else {

            resetXTransformations();

        }

        setTimeout(() => {

            updatePlots(false);

        }, 10);

    }

}

/**
 * Enable/disable waveform navigation buttons if current values are within limits
 */
function updateWaveformYUI () {

    if (sampleCount === 0) {

        waveformHomeButton.disabled = true;
        waveformZoomInButton.disabled = true;
        waveformZoomOutButton.disabled = true;
        return;

    }

    waveformHomeButton.disabled = (waveformZoomY / waveformZoomYIncrement < 1.0);
    waveformZoomInButton.disabled = (waveformZoomY * waveformZoomYIncrement > MAX_ZOOM_Y);
    waveformZoomOutButton.disabled = (waveformZoomY / waveformZoomYIncrement < 1.0);

}

/**
 * Zoom waveform in on y axis
 */
function zoomInWaveformY () {

    if (sampleCount !== 0 && !drawing && !playing) {

        const newZoom = waveformZoomY * waveformZoomYIncrement;

        if (newZoom <= MAX_ZOOM_Y) {

            waveformZoomY = newZoom;

            disableUI();

            // Redraw just the waveform plot

            if (!filteredSamples) {

                drawWaveformPlotAndReenableUI(unfilteredSamples);

            } else {

                drawWaveformPlotAndReenableUI(filteredSamples);

            }

            updateWaveformYUI();

        }

    }

}

/**
 * Zoom waveform out on y axis
 */
function zoomOutWaveformY () {

    if (sampleCount !== 0 && !drawing && !playing) {

        const newZoom = waveformZoomY / waveformZoomYIncrement;

        if (newZoom >= 1.0) {

            waveformZoomY = newZoom;

            disableUI();

            // Redraw just the waveform plot

            if (!filteredSamples) {

                drawWaveformPlotAndReenableUI(unfilteredSamples);

            } else {

                drawWaveformPlotAndReenableUI(filteredSamples);

            }

            updateWaveformYUI();

        }

    }

}

/**
 * Set y zoom level to default and redraw waveform plot
 */
function resetWaveformZoom () {

    waveformZoomY = 1.0;

    disableUI();

    // Redraw just the waveform plot

    if (!filteredSamples) {

        drawWaveformPlotAndReenableUI(unfilteredSamples);

    } else {

        drawWaveformPlotAndReenableUI(filteredSamples);

    }

    updateWaveformYUI();

}

/**
 * Apply filter and amplitude threshold if appropriate then redraw plots
 * @param {boolean} resetColourMap Whether or not to reset the stored max and min values used to calculate the colour map
 */
async function updatePlots (resetColourMap) {

    if (drawing || sampleCount === 0) {

        return;

    }

    if (resetColourMap) {

        spectrumMin = 0.0;
        spectrumMax = 0.0;

    }

    if (!filterCheckbox.checked && !amplitudethresholdCheckbox.checked) {

        processContents(unfilteredSamples, sampleRate);

        return;

    }

    filteredSamples = [];

    // Apply low/band/high pass filter

    if (filterCheckbox.checked) {

        let filterCoeffs;

        const filterIndex = getSelectedRadioValue('filter-radio');

        let bandPassFilterValue0, bandPassFilterValue1;

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
            bandPassFilterValue0 = Math.min(...bandPassFilterSlider.getValue());
            bandPassFilterValue1 = Math.max(...bandPassFilterSlider.getValue());
            filterCoeffs = designBandPassFilter(sampleRate, bandPassFilterValue0, bandPassFilterValue1);
            break;

        }

        let filter = createFilter();

        filteredSamples = new Array(sampleCount);

        for (let i = 0; i < sampleCount; i++) {

            // If the output of the filter is guaranteed to be 0 because the filter has a width of 0, don't bother calculating it

            if (filterIndex === BAND_PASS_FILTER && bandPassFilterValue0 === bandPassFilterValue1) {

                filteredSamples[i] = 0;

            } else {

                const response = applyFilter(unfilteredSamples[i], filter, filterCoeffs, filterIndex);

                filter = response.filter;
                filteredSamples[i] = response.filteredSample;

            }

        }

    } else {

        filteredSamples = unfilteredSamples;

    }

    // Apply amplitude threshold

    if (amplitudethresholdCheckbox.checked) {

        const threshold = getAmplitudeThreshold();
        const minimumTriggerDurationSecs = MINIMUM_TRIGGER_DURATIONS[getSelectedRadioValue('amplitude-threshold-duration-radio')];
        const minimumTriggerDurationSamples = minimumTriggerDurationSecs * sampleRate;

        console.log('Applying amplitude threshold');
        console.log('Threshold:', threshold);
        console.log('Minimum trigger duration: %i (%i samples)', minimumTriggerDurationSecs, minimumTriggerDurationSamples);

        thresholdPeriods = applyAmplitudeThreshold(filteredSamples, threshold, minimumTriggerDurationSamples);

    }

    // Generate spectrogram frames then draw plots

    processContents(filteredSamples, sampleRate);

}

function processReadResult (result, callback) {

    if (!result.success) {

        console.error('Failed to read file');

        errorDisplay.style.display = '';
        errorText.innerHTML = result.error;

        if (result.error === 'Could not read input file.') {

            errorText.innerHTML += '<br>';
            errorText.innerHTML += 'For more information, <u><a href="#faqs" style="color: white;">click here</a></u>.';

        }

        // Clear plots

        resetCanvas(spectrogramThresholdCanvas, false);
        resetCanvas(spectrogramCanvas, false);
        resetCanvas(waveformThresholdCanvas, false);
        resetCanvas(waveformCanvas, true);

        callback();

    }

    errorDisplay.style.display = 'none';

    sampleRate = result.header.wavFormat.samplesPerSecond;
    sampleCount = result.samples.length;

    const lengthSecs = sampleCount / sampleRate;

    console.log('Loaded ' + sampleCount + ' samples at a sample rate of ' + sampleRate + ' Hz (' + lengthSecs + ' seconds)');

    // If file has been trimmed, display warning

    trimmedSpan.style.display = result.trimmed ? '' : 'none';

    callback(result.samples);

}

/**
 * Read the contents of the file given by the current filehandler
 * @returns Samples read from file
 */
async function readFromFile (isExampleFile, callback) {

    console.log('Reading samples');

    let result;

    if (isExampleFile) {

        const req = new XMLHttpRequest();

        req.open('GET', './assets/example.WAV', true);
        req.responseType = 'arraybuffer';

        req.onload = function (e) {

            if (e) {

                console.error(e);
                return;

            }

            const arrayBuffer = req.response; // Note: not oReq.responseText
            console.log(arrayBuffer);
            result = readWavContents(arrayBuffer);

            processReadResult(result, callback);

        };

        req.send(null);

    } else {

        if (!fileHandler) {

            console.error('No filehandler!');
            return [];

        }

        result = await readWav(fileHandler);

        processReadResult(result, callback);

    }

}

function updateMaxZoom () {

    const minSampleView = MIN_TIME_VIEW * sampleRate;

    let newMaxZoom = sampleCount / minSampleView;

    newMaxZoom = Math.pow(2, Math.floor(Math.log(newMaxZoom) / Math.log(2)));

    maxZoom = newMaxZoom;

}

/**
 * Add unit to file size
 * @param {number} fileSize File size in bytes
 * @returns String with correct unit
 */
function formatFileSize (fileSize) {

    fileSize = Math.round(fileSize / 1000);

    return fileSize + ' kB';

}

/**
 * Update panel with estimate of file size
 */
function updateFileSizePanel () {

    const totalSeconds = unfilteredSamples.length / sampleRate;
    const totalFileSize = sampleRate * 2 * totalSeconds;

    if (amplitudethresholdCheckbox.checked) {

        let thresholdedSamples = 0;

        for (let i = 0; i < thresholdPeriods.length; i++) {

            thresholdedSamples += thresholdPeriods[i].length;

        }

        const thresholdedSeconds = thresholdedSamples / sampleRate;

        const thresholdedFileSize = sampleRate * 2 * (totalSeconds - thresholdedSeconds);

        const percentageReduction = 100.0 - (thresholdedFileSize / totalFileSize * 100.0);

        lifeDisplayPanel.innerHTML = 'Original file size: ' + formatFileSize(totalFileSize) + '. Thresholded file size: ' + formatFileSize(thresholdedFileSize) + '.<br>';
        lifeDisplayPanel.innerHTML += 'Current amplitude threshold settings would reduce file size by ' + percentageReduction.toFixed(1) + '%.';

    } else {

        lifeDisplayPanel.innerHTML = 'File size: ' + formatFileSize(totalFileSize) + '.<br>';
        lifeDisplayPanel.innerHTML += 'Enable amplitude thresholding to estimate file size reduction.';

    }

}

// /**
//  * Write 10 seconds of audio to a text file
//  * @param {numer[]} samples Samples to be written to text file
//  */
// function samplesToFile (samples) {

//     const content = 'data:text/plain;charset=utf-8,' + samples.slice(0, sampleRate * 10);

//     const encodedUri = encodeURI(content);

//     // Create hidden <a> tag to apply download to

//     const link = document.createElement('a');

//     link.setAttribute('href', encodedUri);
//     link.setAttribute('download', 'samples.txt');
//     document.body.appendChild(link);

//     // Click link

//     link.click();

// }

async function loadFile (isExampleFile) {

    if (isExampleFile) {

        console.log('Loading example file');

        fileSpan.innerText = 'example.WAV';

    } else {

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

        // Display file picker

        try {

            fileHandler = await window.showOpenFilePicker(opts);

        } catch (error) {

            console.error('Request was aborted.');
            console.error(error);
            return;

        }

        // If no file was selected, return

        if (!fileHandler) {

            fileSpan.innerText = 'No .WAV files selected.';
            return;

        }

        fileHandler = fileHandler[0];

        fileSpan.innerText = fileHandler.name;

    }

    // Read samples

    unfilteredSamples = await readFromFile(isExampleFile, () => {

        resetTransformations();

        resetCanvas(waveformThresholdLineCanvas, false);

        drawLoadingImages();

        // Disable UI whilst loading samples and processing

        filterCheckbox.checked = false;
        amplitudethresholdCheckbox.checked = false;

        homeButton.disabled = true;
        zoomInButton.disabled = true;
        zoomOutButton.disabled = true;
        panRightButton.disabled = true;
        panLeftButton.disabled = true;

        filterCheckbox.disabled = true;
        filterCheckboxLabel.style.color = 'grey';
        updateFilterUI();

        amplitudethresholdCheckbox.disabled = true;
        amplitudethresholdCheckboxLabel.style.color = 'grey';
        updateAmplitudethresholdUI();

        resetButton.disabled = true;
        exportButton.disabled = true;

        // If no samples can be read, return

        if (!unfilteredSamples) {

            return;

        }

        // Reset thresholded periods

        thresholdPeriods = [];

        // Work out what the maximum zoom level should be

        updateMaxZoom();

        // Reset values used to calculate colour map

        spectrumMin = 0.0;
        spectrumMax = 0.0;

        // Update UI elements which change when a file at a new sample rate is loaded

        sampleRateChange();

        // Generate spectrogram frames and draw plots

        processContents(unfilteredSamples, sampleRate);

    });

}

// Handle a new file being selected

fileButton.addEventListener('click', () => {

    loadFile(false);

});

exampleLink.addEventListener('click', () => {

    loadFile(true);

});

/**
 * Handle start of a zoom drag event
 * @param {event} e Drag event
 */
function handleMouseDown (e) {

    // If it's not a left click, ignore it

    if (e.button !== 0) {

        return;

    }

    // If samples have been loaded and drawing a plot isn't currently underway

    if (sampleCount !== 0 && !drawing && !playing) {

        const canvas = e.target;
        const rect = canvas.getBoundingClientRect();

        // Update drag start location

        dragStartX = e.clientX - rect.left;

        isDragging = true;

    }

}

// Assign listeners to both spectrogram and waveform overlay canvases to allow a zoom drag to start on either

spectrogramDragCanvas.addEventListener('mousedown', handleMouseDown);
waveformDragCanvas.addEventListener('mousedown', handleMouseDown);

/**
 * Draw the alpha-ed overlay rectangle to the given canvas
 * @param {object} canvas Canvas being drawn to
 * @param {number} dragCurrentX The end of the drag area
 */
function drawZoomOverlay (canvas, dragCurrentX) {

    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw a light grey box with a black outline

    ctx.fillStyle = 'lightgrey';
    ctx.globalAlpha = 0.5;
    ctx.fillRect(dragStartX, 0, dragCurrentX - dragStartX, canvas.height);

    ctx.fillStyle = 'black';
    ctx.strokeRect(dragStartX, 0, dragCurrentX - dragStartX, canvas.height);

}

/**
 * If drag is in process, update drag UI
 * @param {number} dragCurrentX Current mouse location
 */
function handleMouseMove (dragCurrentX) {

    // If dragging has started, samples are available and a plot is not currently being drawn

    if (isDragging && sampleCount !== 0 && !drawing && !playing) {

        // Draw zoom areas on each canvas

        drawZoomOverlay(spectrogramDragCanvas, dragCurrentX);
        drawZoomOverlay(waveformDragCanvas, dragCurrentX);

    }

}

/**
 * End dragging action
 * @param {number} dragEndX Location where mouse was lifted
 */
function handleMouseUp (dragEndX) {

    // If dragging has started, samples are available and a plot is not currently being drawn

    if (isDragging && sampleCount !== 0 && !drawing && !playing) {

        isDragging = false;

        if (dragEndX === dragStartX) {

            return;

        }

        console.log(dragStartX, dragEndX);

        // Clear zoom overlay canvases

        const specCtx = spectrogramDragCanvas.getContext('2d');
        specCtx.clearRect(0, 0, spectrogramDragCanvas.width, spectrogramDragCanvas.height);
        const wavCtx = waveformDragCanvas.getContext('2d');
        wavCtx.clearRect(0, 0, waveformDragCanvas.width, waveformDragCanvas.height);

        // Calculate new zoom value

        let newZoom = zoom / (Math.abs(dragStartX - dragEndX) / spectrogramDragCanvas.width);

        const totalLength = sampleCount / sampleRate;
        const displayedTime = totalLength / zoom;

        const dragLeft = Math.min(dragStartX, dragEndX);
        const dragRight = Math.max(dragStartX, dragEndX);

        let newOffset;

        if (newZoom <= maxZoom) {

            // Calculate new offset value

            newOffset = offset + (-1 * displayedTime * dragLeft / spectrogramDragCanvas.width);

        } else {

            // Don't zoom any further, just centre plot on selected centre

            newZoom = zoom;

            const dragDiff = dragRight - dragLeft;
            const dragCentre = dragLeft + (dragDiff / 2);
            const centredOffset = (displayedTime * dragCentre / spectrogramDragCanvas.width) - (displayedTime / 2);

            newOffset = offset + (-1 * centredOffset);

        }

        // Set new zoom/offset values

        zoom = newZoom;
        offset = newOffset;

        removeEndGap();

        // Redraw plots

        setTimeout(() => {

            updatePlots(false);

        }, 10);

        updateNavigationUI();

    }

}

// Handle mouse events anywhere on the page

document.addEventListener('mouseup', (e) => {

    // If it's not a left click, ignore it

    if (e.button !== 0 || !isDragging) {

        return;

    }

    const w = spectrogramDragCanvas.width;

    // Get end of zoom drag

    const rect = spectrogramDragCanvas.getBoundingClientRect();
    let dragEndX = Math.min(w, Math.max(0, e.clientX - rect.left));

    dragEndX = (dragEndX < 0) ? 0 : dragEndX;
    dragEndX = (dragEndX > w) ? w : dragEndX;

    handleMouseUp(dragEndX);

});

document.addEventListener('mousemove', (e) => {

    if (!isDragging) {

        return;

    }

    const rect = spectrogramDragCanvas.getBoundingClientRect();
    const dragCurrentX = e.clientX - rect.left;

    handleMouseMove(dragCurrentX);

});

/**
 * Add keyboard controls to page
 * ctrl + up/down       : Zoom in/out
 * ctrl + left/right    : Pan left/right
 */
document.addEventListener('keydown', (event) => {

    if (event.ctrlKey) {

        switch (event.key) {

        case 'ArrowRight':
            event.preventDefault();
            event.stopPropagation();
            panLeft();
            break;

        case 'ArrowLeft':
            event.preventDefault();
            event.stopPropagation();
            panRight();
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

// Add listener which reacts to the low/band/high pass filter being enabled/disabled

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

// Add listener which reacts to amplitude threshold being enabled/disabled

amplitudethresholdCheckbox.addEventListener('change', updateAmplitudethresholdUI);
updateAmplitudethresholdUI();

// Add amplitude threshold scale listener

amplitudeThresholdScaleSelect.addEventListener('change', function () {

    amplitudethresholdScaleIndex = parseInt(amplitudeThresholdScaleSelect.value);

    updateAmplitudethresholdScale();

    drawAxisLabels();

});

/**
 * Add listener which updates the amplitude threshold information label when the slider value is changed
 */
amplitudethresholdSlider.on('change', updateAmplitudethresholdLabel);

// Add listener which updates the position of the lines on the waveform plot as the amplitude threshold slider moves

amplitudethresholdSlider.on('change', drawThresholdLines);

/**
 * Run updatePlots function without refreshing the colour map
 */
function updatePlotsWithoutChangingColourMap () {

    updatePlots(false);

}

// Add update plot listeners, applying low/band/high pass filter and amplitude threshold if selected
filterCheckbox.addEventListener('change', updatePlotsWithoutChangingColourMap);
filterRadioButtons[0].addEventListener('change', updatePlotsWithoutChangingColourMap);
filterRadioButtons[1].addEventListener('change', updatePlotsWithoutChangingColourMap);
filterRadioButtons[2].addEventListener('change', updatePlotsWithoutChangingColourMap);
bandPassFilterSlider.on('slideStop', updatePlotsWithoutChangingColourMap);
lowPassFilterSlider.on('slideStop', updatePlotsWithoutChangingColourMap);
highPassFilterSlider.on('slideStop', updatePlotsWithoutChangingColourMap);

amplitudethresholdCheckbox.addEventListener('change', () => {

    updatePlots(false);

    // Draw or clear the amplitude threshold lines

    if (amplitudethresholdCheckbox.checked) {

        drawThresholdLines();

    } else {

        resetCanvas(waveformThresholdLineCanvas, false);

    }

});

amplitudethresholdSlider.on('slideStop', updatePlotsWithoutChangingColourMap);
amplitudethresholdRadioButtons[0].addEventListener('change', updatePlotsWithoutChangingColourMap);
amplitudethresholdRadioButtons[1].addEventListener('change', updatePlotsWithoutChangingColourMap);
amplitudethresholdRadioButtons[2].addEventListener('change', updatePlotsWithoutChangingColourMap);
amplitudethresholdRadioButtons[3].addEventListener('change', updatePlotsWithoutChangingColourMap);
amplitudethresholdRadioButtons[4].addEventListener('change', updatePlotsWithoutChangingColourMap);
amplitudethresholdRadioButtons[5].addEventListener('change', updatePlotsWithoutChangingColourMap);
amplitudethresholdRadioButtons[6].addEventListener('change', updatePlotsWithoutChangingColourMap);
amplitudethresholdRadioButtons[7].addEventListener('change', updatePlotsWithoutChangingColourMap);

// Add reset button listener, removing filter and amplitude threshold, setting zoom to x1.0 and offset to 0

resetButton.addEventListener('click', () => {

    filterCheckbox.checked = false;
    updateFilterUI();
    amplitudethresholdCheckbox.checked = false;
    updateAmplitudethresholdUI();

    sampleRateChange();
    updatePlots(true);

});

// Add filter slider listeners which update the information label

bandPassFilterSlider.on('change', updateFilterLabel);
lowPassFilterSlider.on('change', updateFilterLabel);
highPassFilterSlider.on('change', updateFilterLabel);

// Add home, zoom and pan control to buttons

homeButton.addEventListener('click', resetNavigation);

zoomInButton.addEventListener('click', zoomIn);
zoomOutButton.addEventListener('click', zoomOut);

panLeftButton.addEventListener('click', panRight);
panRightButton.addEventListener('click', panLeft);

// Add navigation control for waveform y axis

waveformHomeButton.addEventListener('click', resetWaveformZoom);

waveformZoomInButton.addEventListener('click', zoomInWaveformY);
waveformZoomOutButton.addEventListener('click', zoomOutWaveformY);

// Add export functionality

exportButton.addEventListener('click', () => {

    const filterIndex = getSelectedRadioValue('filter-radio');
    let filterValue0 = 0;
    let filterValue1 = 0;

    switch (filterIndex) {

    case LOW_PASS_FILTER:
        filterValue1 = lowPassFilterSlider.getValue();
        break;
    case HIGH_PASS_FILTER:
        filterValue0 = highPassFilterSlider.getValue();
        break;
    case BAND_PASS_FILTER:
        filterValue0 = Math.min(...bandPassFilterSlider.getValue());
        filterValue1 = Math.max(...bandPassFilterSlider.getValue());
        break;

    }

    const minimumTriggerDuration = getSelectedRadioValue('amplitude-threshold-duration-radio');

    const filterTypes = ['low', 'band', 'high'];
    const amplitudeThresholdScales = ['percentage', '16bit', 'decibel'];

    const amplitudeThresholdValues = convertAmplitudeThreshold(amplitudethresholdSlider.getValue());

    let amplitudeThreshold = 0;

    switch (amplitudethresholdScaleIndex) {

    case AMPLITUDE_THRESHOLD_SCALE_PERCENTAGE:

        amplitudeThreshold = parseFloat(amplitudeThresholdValues.percentage);
        break;

    case AMPLITUDE_THRESHOLD_SCALE_16BIT:

        amplitudeThreshold = amplitudeThresholdValues.amplitude;
        break;

    case AMPLITUDE_THRESHOLD_SCALE_DECIBEL:

        amplitudeThreshold = amplitudeThresholdValues.decibels;
        break;

    }

    const settings = {
        webApp: true,
        sampleRate: sampleRate,
        passFiltersEnabled: filterCheckbox.checked,
        filterType: filterTypes[filterIndex],
        lowerFilter: filterValue0,
        higherFilter: filterValue1,
        amplitudethresholdEnabled: amplitudethresholdCheckbox.checked,
        amplitudeThreshold: amplitudeThreshold,
        minimumAmplitudeThresholdDuration: minimumTriggerDuration,
        amplitudethresholdScale: amplitudeThresholdScales[amplitudethresholdScaleIndex]
    };

    const content = 'data:text/json;charset=utf-8,' + JSON.stringify(settings);

    const encodedUri = encodeURI(content);

    // Create hidden <a> tag to apply download to

    const link = document.createElement('a');

    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'audiomoth_filter.config');
    document.body.appendChild(link);

    // Click link

    link.click();

});

/**
 * Get playback rate value from slider
 * @returns Rate to play audio at
 */
function getPlaybackRate () {

    return playbackRates[playbackSpeedSlider.getValue()];

}

/**
 * Draw a line which shows how far through a recording the playback is
 */
function playAnimation () {

    const playbackRate = getPlaybackRate();

    const displayedSampleCount = getDisplayedSampleCount();
    const displayedTime = displayedSampleCount / sampleRate;
    const progress = getTimestamp() / displayedTime * playbackRate;

    // Draw on waveform canvas

    const waveformCtx = waveformPlaybackCanvas.getContext('2d');
    const waveformW = waveformPlaybackCanvas.width;
    const waveformH = waveformPlaybackCanvas.height;

    const x = progress * waveformW;

    resetCanvas(waveformPlaybackCanvas, false);

    waveformCtx.strokeStyle = 'red';
    waveformCtx.lineWidth = 1;

    waveformCtx.moveTo(x, 0);
    waveformCtx.lineTo(x, waveformH);
    waveformCtx.stroke();

    // Draw on spectrogram canvas

    const spectrogramCtx = spectrogramPlaybackCanvas.getContext('2d');
    const spectrogramH = spectrogramPlaybackCanvas.height;

    resetCanvas(spectrogramPlaybackCanvas, false);

    spectrogramCtx.strokeStyle = 'red';
    spectrogramCtx.lineWidth = 1;

    spectrogramCtx.moveTo(x, 0);
    spectrogramCtx.lineTo(x, spectrogramH);
    spectrogramCtx.stroke();

    // Set timer for next update

    animationTimer = setTimeout(playAnimation, 50);

}

/**
 * Event called when playback is either manually stopped or finishes
 */
function stopEvent () {

    // Reenable UI

    fileButton.disabled = false;

    filterCheckbox.disabled = false;
    filterCheckboxLabel.style.color = '';
    updateFilterUI();

    amplitudethresholdCheckbox.disabled = false;
    amplitudethresholdCheckboxLabel.style.color = '';
    updateAmplitudethresholdUI();

    resetButton.disabled = false;
    exportButton.disabled = false;

    playButton.disabled = false;
    playbackSpeedSlider.enable();

    updateWaveformYUI();
    updateNavigationUI();

    // Switch from stop icon to play icon

    playIcon.style.display = '';
    stopIcon.style.display = 'none';

    // Switch colour of button

    playButton.classList.remove('btn-danger');
    playButton.classList.add('btn-success');

    // Clear canvases

    resetCanvas(waveformPlaybackCanvas, false);
    resetCanvas(spectrogramPlaybackCanvas, false);

    // Update playing status

    playing = false;

    // Stop animation loop

    clearTimeout(animationTimer);

}

// Play audio button

playButton.addEventListener('click', () => {

    if (playing) {

        // If already playing, stop

        stopAudio();

    } else {

        // Otherwise, disable UI then play

        disableUI();
        disableWaveformYAxisUI();
        playButton.disabled = false;
        playbackSpeedSlider.enable();

        // Switch from play icon to stop icon

        playIcon.style.display = 'none';
        stopIcon.style.display = '';

        // Switch play button colour

        playButton.classList.remove('btn-success');
        playButton.classList.add('btn-danger');

        // Update playing status

        playing = true;

        // Get currently displayed samples to play

        const samples = filteredSamples || unfilteredSamples;

        const displayedSampleCount = getDisplayedSampleCount();
        const startSample = Math.ceil(Math.abs(offset) * sampleRate);

        // Play the samples

        const playbackRate = getPlaybackRate();

        playAudio(samples, startSample, displayedSampleCount, sampleRate, playbackRate, stopEvent);

        // Start animation loop

        playAnimation();

    }

});

// Start zoom and offset level on default values

resetTransformations();

// Add filler axis labels

drawAxisLabels();
drawAxisHeadings();

// Prepare filter UI

filterCheckbox.checked = false;
amplitudeThresholdScaleSelect.value = '2';
updateFilterUI();
updateFilterLabel();

// Display error if current browser is not Chrome

const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);

if (!isChrome) {

    browserErrorDisplay.style.display = '';
    fileButton.disabled = true;

}
