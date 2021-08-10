/****************************************************************************
 * index.js
 * openacousticdevices.info
 * June 2021
 *****************************************************************************/

/* global calculateSpectrogramFrames, drawSpectrogram, drawWaveform, Slider, readWav, designLowPassFilter, designHighPassFilter, designBandPassFilter, createFilter, LOW_PASS_FILTER, BAND_PASS_FILTER, HIGH_PASS_FILTER, applyFilter, applyAmplitudeThreshold */

// TODO: Add file size comparison

// Use these values to fill in the axis labels before samples have been loaded

const FILLER_SAMPLE_COUNT = 1440000;
const FILLER_SAMPLE_RATE = 48000;

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
const zoomInput = document.getElementById('zoom-input');

const panLeftButton = document.getElementById('pan-left-button');
const panRightButton = document.getElementById('pan-right-button');
const panInput = document.getElementById('pan-input');

// Plot navigation variables

let zoom = 1.0;
const ZOOM_INCREMENT = 2.0;
const MAX_ZOOM = 128.0;

let offset = 0.0;
const OFFSET_INCREMENT = 1.0;

// Zoom drag variables

let isDragging = false;
let dragStartX = 0;

// Spectrogram canvases

const spectrogramDragCanvas = document.getElementById('spectrogram-drag-canvas'); // Canvas layer where zoom overlay is drawn
const spectrogramThresholdCanvas = document.getElementById('spectrogram-threshold-canvas'); // Canvas layer where amplitude thresholded periods are drawn
const spectrogramCanvas = document.getElementById('spectrogram-canvas'); // Canvas layer where spectrogram is drawn

const waveformDragCanvas = document.getElementById('waveform-drag-canvas'); // Canvas layer where zoom overlay is drawn
const waveformThresholdCanvas = document.getElementById('waveform-threshold-canvas'); // Canvas layer where amplitude thresholded periods are drawn
const waveformCanvas = document.getElementById('waveform-canvas'); // Canvas layer where waveform is drawn

const timeLabelCanvas = document.getElementById('time-label-canvas');
const timeAxisHeadingCanvas = document.getElementById('time-axis-heading-canvas');

// Create staging canvas for labels which can be reused so labels still match after panning

const prepLabelCanvas = document.createElement('canvas');
prepLabelCanvas.width = timeLabelCanvas.width * 30;
prepLabelCanvas.height = timeLabelCanvas.height;

// Y axis label canvases

const spectrogramLabelCanvas = document.getElementById('spectrogram-label-canvas');
const Y_LABEL_COUNT = 4;
const waveformLabelCanvas = document.getElementById('waveform-label-canvas');

// File variables

let fileHandler;
let unfilteredSamples;
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

const resetButton = document.getElementById('reset-button');
const exportButton = document.getElementById('export-button');

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

/**
 * Convert selected amplitude threshold from current scale raw slider value to amplitude
 * @returns Amplitude threshold value
 */
function getAmplitudeThreshold () {

    return convertAmplitudeThreshold(amplitudeThresholdingSlider.getValue() / amplitudeThresholdingSlider.getAttribute('max')).amplitude;

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

/**
 * Update UI when amplitude threshold scale is changed
 */
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

/**
 * Handle a change to the amplitude threshold status/value
 */
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

/**
 * Fill in the y axis labels for the two plots and their shared x axis labels
 */
function drawAxisLabels () {

    // FIXME: Fix label font being blurry (https://www.w3schools.com/graphics/svg_text.asp)

    const font = '10px';

    // Draw x axis labels

    const xCtx = prepLabelCanvas.getContext('2d');

    xCtx.clearRect(0, 0, prepLabelCanvas.width, prepLabelCanvas.height);

    let label = 0;
    const totalLength = (sampleCount !== 0) ? sampleCount / sampleRate : FILLER_SAMPLE_COUNT / FILLER_SAMPLE_RATE;

    // Widen gap between labels as more audio is viewable to prevent squashed labels
    const displayedTime = totalLength / zoom;
    let labelIncrement = 0.25;
    labelIncrement = (displayedTime > 2) ? 0.5 : labelIncrement;
    labelIncrement = (displayedTime > 5) ? 1 : labelIncrement;
    labelIncrement = (displayedTime > 10) ? 2 : labelIncrement;
    labelIncrement = (displayedTime > 30) ? 5 : labelIncrement;

    // So the centre of the text can be the label location, there's a small amount of padding around the label canvas
    const padding = (timeLabelCanvas.width - waveformCanvas.width) / 2;

    while (label <= totalLength) {

        // If there's 2 characters, label width is doubled
        const labelWidth = xCtx.measureText(label).width;

        // Convert the time to a pixel value, then take into account the label width and the padding to position correctly
        const x = timeToPixel(label) + padding - (labelWidth / 2);

        xCtx.font = font;
        xCtx.fillText(label, x, 15);

        label += labelIncrement;

    }

    // Draw y axis labels for spectrogram

    const ySpecCtx = spectrogramLabelCanvas.getContext('2d');

    ySpecCtx.clearRect(0, 0, spectrogramLabelCanvas.width, spectrogramLabelCanvas.height);

    ySpecCtx.font = font;
    ySpecCtx.textBaseline = 'middle';

    const ySpecLabelIncrement = (sampleCount !== 0) ? sampleRate / 2 / Y_LABEL_COUNT : 48000 / Y_LABEL_COUNT;
    const ySpecIncrement = spectrogramLabelCanvas.height / Y_LABEL_COUNT;

    for (let i = 0; i <= Y_LABEL_COUNT; i++) {

        const labelText = (i * ySpecLabelIncrement / 1000) + 'kHz';

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

    yWaveformCtx.font = font;
    yWaveformCtx.textBaseline = 'middle';

    let waveformLabelTexts = [];

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

/**
 * Add axis heading to plots
 */
function drawAxisHeadings () {

    const xCtx = timeAxisHeadingCanvas.getContext('2d');

    xCtx.clearRect(0, 0, timeAxisHeadingCanvas.width, timeAxisHeadingCanvas.height);

    xCtx.font = '10px monospace';
    xCtx.textBaseline = 'middle';

    const labelText = 'Time (seconds)';
    const textWidth = xCtx.measureText(labelText).width;
    xCtx.fillText(labelText, (timeAxisHeadingCanvas.width - textWidth) / 2, timeAxisHeadingCanvas.height / 2);

}

/**
 * Clear a canvas of its contents and reset all transformations
 * @param {object} canvas The canvas to be cleared
 */
function resetCanvas (canvas) {

    // Setting the width/height of a canvas in any way wipes it clean and resets the context's transformations
    canvas.width = canvas.width;

}

/**
 * Update zoom input with current zoom level and enable/disable zoom in/out buttons if appropriate
 */
function updateZoomUI () {

    if (sampleCount === 0) {

        zoomInButton.disabled = true;
        zoomOutButton.disabled = true;
        zoomInput.disabled = true;
        return;

    }

    if (zoom <= 1.0) {

        zoomOutButton.disabled = true;

    } else {

        zoomOutButton.disabled = false;

    }

    if (zoom >= MAX_ZOOM) {

        zoomInButton.disabled = true;

    } else {

        zoomInButton.disabled = false;

    }

    zoomInput.disabled = false;

    zoomInput.value = zoom.toFixed(1);

}

/**
 * Enable/disable pan buttons when appropriate
 */
function updatePanUI () {

    if (sampleCount === 0) {

        panLeftButton.disabled = true;
        panRightButton.disabled = true;
        panInput.disabled = true;
        return;

    }

    if (offset >= 0) {

        panRightButton.disabled = true;

    } else {

        panRightButton.disabled = false;

    }

    panInput.disabled = false;

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

    panInput.value = Math.abs(offset).toFixed(1);

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

/**
 * Draw a loading message to the given canvas
 * @param {object} canvas The canvas to be cleared and display the loading message
 */
function drawLoadingImage (canvas) {

    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    resetCanvas(canvas);

    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.fillText('Loading...', w / 2, h / 2);

}

/**
 * Draw loading message on spectrogram and waveform canvases
 */
function drawLoadingImages () {

    resetCanvas(spectrogramCanvas);
    drawLoadingImage(spectrogramThresholdCanvas);
    resetCanvas(waveformCanvas);
    drawLoadingImage(waveformThresholdCanvas);

}

/**
 * Copy the x axis labels to the canvas, offset to the current pan location
 */
function copyLabelsToCanvas () {

    const ctx = timeLabelCanvas.getContext('2d');
    const w = timeLabelCanvas.width;
    const h = timeLabelCanvas.height;

    resetCanvas(timeLabelCanvas);

    ctx.clearRect(0, 0, w, h);

    const pixelOffset = timeToPixel(offset);

    ctx.drawImage(prepLabelCanvas, pixelOffset, 0);

}

/**
 * Draw spectrogram and waveform plots
 */
function drawPlots (samples) {

    drawSpectrogram(processedSpectrumFrames, spectrumMin, spectrumMax, async () => {

        resetCanvas(spectrogramThresholdCanvas);

        const totalLength = sampleCount / sampleRate;
        const displayedTime = totalLength / zoom;

        const sampleStart = Math.floor(Math.abs(offset) * sampleRate);
        let sampleEnd = Math.floor((Math.abs(offset) + displayedTime) * sampleRate);

        // Gap at the end of the plot in samples
        let gapLength = sampleEnd - sampleCount;
        gapLength = gapLength < 0 ? 0 : gapLength;

        sampleEnd = sampleEnd > sampleCount ? sampleCount : sampleEnd;

        // TODO: Add amplitude threshold as lines on the waveform plot

        console.log('Drawing waveform');
        drawWaveform(samples.slice(sampleStart, sampleEnd), gapLength, () => {

            resetCanvas(waveformThresholdCanvas);

            if (amplitudeThresholdingCheckbox.checked) {

                drawThresholdedPeriods();

            }

            drawAxisLabels();
            copyLabelsToCanvas();

            drawing = false;

            zoomInButton.disabled = false;
            zoomOutButton.disabled = false;
            zoomInput.disabled = false;
            updateZoomUI();
            panLeftButton.disabled = false;
            panRightButton.disabled = false;
            panInput.disabled = false;
            updatePanUI();

            filterCheckbox.disabled = false;
            filterCheckboxLabel.style.color = '';
            updateFilterUI();

            amplitudeThresholdingCheckbox.disabled = false;
            amplitudeThresholdingCheckboxLabel.style.color = '';
            updateAmplitudeThresholdingUI();

            resetButton.disabled = false;
            exportButton.disabled = false;

        });

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
 * Temporarily disable UI then calculate spectrogram frames
 * @param {number[]} samples Samples to be processed
 * @param {number} sampleRate Sample rate of samples
 */
function processContents (samples, sampleRate) {

    drawing = true;

    // Disable UI

    zoomInButton.disabled = true;
    zoomOutButton.disabled = true;
    zoomInput.disabled = true;
    panLeftButton.disabled = true;
    panRightButton.disabled = true;
    panInput.disabled = true;

    filterCheckbox.disabled = true;
    filterCheckboxLabel.style.color = 'grey';
    updateFilterUI();

    amplitudeThresholdingCheckbox.disabled = true;
    amplitudeThresholdingCheckboxLabel.style.color = 'grey';
    updateAmplitudeThresholdingUI();

    resetButton.disabled = true;
    exportButton.disabled = true;

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

        }

        drawPlots(samples);

    }, 100);

}

/**
 * Reset zoom/pan settings
 */
function resetTransformations () {

    zoom = 1.0;
    offset = 0;
    updatePanUI();
    updateZoomUI();

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
 * Pan plot to the left
 */
function panLeft () {

    if (sampleCount !== 0 && !drawing) {

        const newOffset = Math.ceil(offset - OFFSET_INCREMENT);

        offset = newOffset;

        removeEndGap();

        setTimeout(() => {

            updatePlots(false);

        }, 100);

        updatePanUI();

    }

}

/**
 * Pan plot to the right
 */
function panRight () {

    if (sampleCount !== 0 && !drawing) {

        const newOffset = Math.floor(offset + OFFSET_INCREMENT);

        if (newOffset <= 0) {

            offset = newOffset;

            setTimeout(() => {

                updatePlots(false);

            }, 100);

        }

        updatePanUI();

    }

}

/**
 * Zoom plot in
 */
function zoomIn () {

    if (sampleCount !== 0 && !drawing) {

        let newZoom = Math.round(zoom * ZOOM_INCREMENT);

        newZoom = Math.pow(2, Math.round(Math.log(newZoom) / Math.log(2)));

        if (newZoom <= MAX_ZOOM) {

            zoom = newZoom;

            setTimeout(() => {

                updatePlots(false);

            }, 10);

            updateZoomUI();
            updatePanUI();

        }

    }

}

/**
 * Zoom plot out
 */
function zoomOut () {

    // FIXME: Zooming out sometimes doesn't effect waveform

    if (sampleCount !== 0 && !drawing) {

        let newZoom = Math.round(zoom / ZOOM_INCREMENT);

        newZoom = Math.pow(2, Math.round(Math.log(newZoom) / Math.log(2)));

        if (newZoom >= 1.0) {

            zoom = newZoom;

            removeEndGap();

            setTimeout(() => {

                updatePlots(false);

            }, 10);

        } else {

            zoom = 1.0;

        }

        updateZoomUI();
        updatePanUI();

    }

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

    if (!filterCheckbox.checked && !amplitudeThresholdingCheckbox.checked) {

        processContents(unfilteredSamples, sampleRate);

        return;

    }

    let filteredSamples = [];

    // Apply low/band/high pass filter

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

    // Apply amplitude threshold

    if (amplitudeThresholdingCheckbox.checked) {

        const threshold = getAmplitudeThreshold();
        const minimumTriggerDurationSecs = MINIMUM_TRIGGER_DURATIONS[getSelectedRadioValue('amplitude-thresholding-duration-radio')];
        const minimumTriggerDurationSamples = minimumTriggerDurationSecs * sampleRate;

        console.log('Applying amplitude threshold');
        console.log('Threshold:', threshold);
        console.log('Minimum trigger duration: %i (%i samples)', minimumTriggerDurationSecs, minimumTriggerDurationSamples);

        thresholdPeriods = applyAmplitudeThreshold(filteredSamples, threshold, minimumTriggerDurationSamples);

    }

    // Generate spectrogram frames then draw plots

    processContents(filteredSamples, sampleRate);

}

/**
 * Read the contents of the file given by the current filehandler
 * @returns Samples read from file
 */
async function readFromFile () {

    console.log('Reading samples');

    const result = await readWav(fileHandler);

    if (!result.success) {

        console.error('Failed to read file');

        errorDisplay.style.display = '';
        errorText.innerHTML = result.error;

        if (result.error === 'Could not read input file.') {

            errorText.innerHTML += '<br>';
            errorText.innerHTML += 'For more information, <u><a href="#faqs" style="color: white;">click here</a></u>.';

        }

        // Clear plots

        resetCanvas(spectrogramThresholdCanvas);
        resetCanvas(spectrogramCanvas);
        resetCanvas(waveformThresholdCanvas);
        resetCanvas(waveformCanvas);

        return;

    }

    errorDisplay.style.display = 'none';

    sampleRate = result.header.wavFormat.samplesPerSecond;
    sampleCount = result.samples.length;

    const lengthSecs = sampleCount / sampleRate;

    console.log('Loaded ' + sampleCount + ' samples at a sample rate of ' + sampleRate + ' Hz (' + lengthSecs + ' seconds)');

    return result.samples;

}

/**
 * Handle a new file being selected
 */
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

        fileLabel.innerText = 'No .WAV files selected.';
        return;

    }

    resetTransformations();

    fileHandler = fileHandler[0];

    fileLabel.innerText = fileHandler.name;

    drawLoadingImages();

    // Disable UI whilst loading samples and processing

    filterCheckbox.checked = false;
    amplitudeThresholdingCheckbox.checked = false;

    zoomInButton.disabled = true;
    zoomOutButton.disabled = true;
    zoomInput.disabled = true;
    panLeftButton.disabled = true;
    panRightButton.disabled = true;
    panInput.disabled = true;

    filterCheckbox.disabled = true;
    filterCheckboxLabel.style.color = 'grey';
    updateFilterUI();

    amplitudeThresholdingCheckbox.disabled = true;
    amplitudeThresholdingCheckboxLabel.style.color = 'grey';
    updateAmplitudeThresholdingUI();

    resetButton.disabled = true;
    exportButton.disabled = true;

    // Read samples

    unfilteredSamples = await readFromFile();

    // If no samples can be read, return

    if (!unfilteredSamples) {

        return;

    }

    thresholdPeriods = [];

    // Reset values used to calculate colour map

    spectrumMin = 0.0;
    spectrumMax = 0.0;

    // Update UI elements which change when a file at a new sample rate is loaded

    sampleRateChange();

    // Generate spectrogram frames and draw plots

    processContents(unfilteredSamples, sampleRate);

});

/**
 * Handle the manual zoom input value changing
 */
zoomInput.addEventListener('change', () => {

    let newZoom = parseFloat(zoomInput.value);

    // If input is invalid, reset to previous value

    if (isNaN(newZoom)) {

        zoomInput.value = zoom.toFixed(1);
        return;

    }

    // Bound zoom to between x1 and max zoom level

    newZoom = (newZoom > MAX_ZOOM) ? MAX_ZOOM : newZoom;
    newZoom = (newZoom < 1.0) ? 1.0 : newZoom;

    zoom = newZoom;

    // If zoom results in a gap at the end of the plot, alter offset to remove it

    removeEndGap();

    // Process and redraw plots

    setTimeout(() => {

        updatePlots(false);

    }, 10);

    // Update UI

    updateZoomUI();
    updatePanUI();

});

/**
 * Handle manual pan input value changing
 */
panInput.addEventListener('change', () => {

    const oldOffset = offset;

    let newOffset = parseFloat(panInput.value);

    // If input is invalid, reset to previous value

    if (isNaN(newOffset)) {

        panInput.value = Math.abs(offset).toFixed(1);
        return;

    }

    // Bound offset to between 0.0 and the length of the file

    const lengthSecs = sampleCount / sampleRate;

    newOffset = (newOffset < 0.0) ? 0.0 : newOffset;
    newOffset = (newOffset > lengthSecs) ? lengthSecs : newOffset;

    offset = -1.0 * newOffset;

    // If pan results in a gap at the end of the plot, alter offset to remove it

    removeEndGap();

    // If the calculations have resulted in no change in the actual offset, don't bother redrawing everything

    if (offset === oldOffset) {

        panInput.value = Math.abs(offset).toFixed(1);
        return;

    }

    // Process and redraw plots

    setTimeout(() => {

        updatePlots(false);

    }, 10);

    // Update UI

    updateZoomUI();
    updatePanUI();

});

/**
 * Handle start of a zoom drag event
 * @param {event} e Drag event
 */
function handleMouseDown (e) {

    // If samples have been loaded and drawing a plot isn't currently underway

    if (sampleCount !== 0 && !drawing) {

        const canvas = e.target;
        const rect = canvas.getBoundingClientRect();

        // Update drag start location

        dragStartX = e.clientX - rect.left;

        isDragging = true;

    }

}

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
 * Handle the mouse movement when a drag is underway, drawing the area to both plots to show what will be zoomed in on
 * @param {event} e Drag event
 */
function handleMouseMove (e) {

    // If dragging has started, samples are available and a plot is not currently being drawn

    if (isDragging && sampleCount !== 0 && !drawing) {

        const canvas = e.target;

        const rect = canvas.getBoundingClientRect();
        const dragCurrentX = e.clientX - rect.left;

        // Draw zoom areas on each canvas

        drawZoomOverlay(spectrogramDragCanvas, dragCurrentX);
        drawZoomOverlay(waveformDragCanvas, dragCurrentX);

    }

}

/**
 * Handle the end of a zoom drag
 * @param {event} e Drag event
 */
function handleMouseUp (e) {

    // If dragging has started, samples are available and a plot is not currently being drawn

    if (isDragging && sampleCount !== 0 && !drawing) {

        const canvas = e.target;

        isDragging = false;

        // Get end of zoom drag

        const rect = canvas.getBoundingClientRect();
        const dragEndX = Math.max(0, e.clientX - rect.left);

        // Clear zoom overlay canvases

        const specCtx = spectrogramDragCanvas.getContext('2d');
        specCtx.clearRect(0, 0, spectrogramDragCanvas.width, spectrogramDragCanvas.height);
        const wavCtx = waveformDragCanvas.getContext('2d');
        wavCtx.clearRect(0, 0, waveformDragCanvas.width, waveformDragCanvas.height);

        // Calculate new zoom value

        let newZoom = zoom / (Math.abs(dragStartX - dragEndX) / canvas.width);
        newZoom = (newZoom > MAX_ZOOM) ? MAX_ZOOM : newZoom;

        // Calculate new offset value

        const totalLength = sampleCount / sampleRate;
        const displayedTime = totalLength / zoom;

        const dragLeft = Math.min(dragStartX, dragEndX);

        const newOffset = offset + (-1 * displayedTime * dragLeft / canvas.width);

        // Set new zoom/offset values

        zoom = newZoom;
        offset = newOffset;

        // Redraw plots

        setTimeout(() => {

            updatePlots(false);

        }, 10);

        updateZoomUI();
        updatePanUI();

    }

}

// Assign drag listeners to both spectrogram and waveform overlay canvases to allow a zoom drag on either

spectrogramDragCanvas.addEventListener('mousedown', handleMouseDown);
spectrogramDragCanvas.addEventListener('mousemove', handleMouseMove);
spectrogramDragCanvas.addEventListener('mouseout', handleMouseUp);
spectrogramDragCanvas.addEventListener('mouseup', handleMouseUp);

waveformDragCanvas.addEventListener('mousedown', handleMouseDown);
waveformDragCanvas.addEventListener('mousemove', handleMouseMove);
waveformDragCanvas.addEventListener('mouseout', handleMouseUp);
waveformDragCanvas.addEventListener('mouseup', handleMouseUp);

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

/**
 * Add listener which reacts to the low/band/high pass filter being enabled/disabled
 */
filterCheckbox.addEventListener('change', () => {

    updateFilterUI();
    updateFilterSliders();
    updateFilterLabel();

});

/**
 * Add filter radio button listeners
 */
for (let i = 0; i < filterRadioButtons.length; i++) {

    filterRadioButtons[i].addEventListener('change', function () {

        updateFilterUI();
        updateFilterSliders();
        updateFilterLabel();

    });

}

/**
 * Add listener which reacts to amplitude threshold being enabled/disabled
 */
amplitudeThresholdingCheckbox.addEventListener('change', updateAmplitudeThresholdingUI);
updateAmplitudeThresholdingUI();

/**
 * Add amplitude threshold scale listeners
 */
for (let i = 0; i < amplitudeThresholdingScaleRadioButtons.length; i++) {

    amplitudeThresholdingScaleRadioButtons[i].addEventListener('change', function () {

        amplitudeThresholdingScaleIndex = getSelectedRadioValue('amplitude-thresholding-scale-radio');

        updateAmplitudeThresholdingScale();

        drawAxisLabels();

    });

}

/**
 * Add listener which updates the amplitude threshold information label when the slider value is changed
 */
amplitudeThresholdingSlider.on('change', updateAmplitudeThresholdingLabel);

function updatePlotsAndResetColourMap () {

    updatePlots(true);

}

/**
 * Add update plot listeners, applying low/band/high pass filter and amplitude threshold if selected
 */
filterCheckbox.addEventListener('change', updatePlotsAndResetColourMap);
filterRadioButtons[0].addEventListener('change', updatePlotsAndResetColourMap);
filterRadioButtons[1].addEventListener('change', updatePlotsAndResetColourMap);
filterRadioButtons[2].addEventListener('change', updatePlotsAndResetColourMap);
bandPassFilterSlider.on('slideStop', updatePlotsAndResetColourMap);
lowPassFilterSlider.on('slideStop', updatePlotsAndResetColourMap);
highPassFilterSlider.on('slideStop', updatePlotsAndResetColourMap);
amplitudeThresholdingCheckbox.addEventListener('change', updatePlotsAndResetColourMap);
amplitudeThresholdingSlider.on('slideStop', updatePlotsAndResetColourMap);
amplitudeThresholdingRadioButtons[0].addEventListener('change', updatePlotsAndResetColourMap);
amplitudeThresholdingRadioButtons[1].addEventListener('change', updatePlotsAndResetColourMap);
amplitudeThresholdingRadioButtons[2].addEventListener('change', updatePlotsAndResetColourMap);
amplitudeThresholdingRadioButtons[3].addEventListener('change', updatePlotsAndResetColourMap);
amplitudeThresholdingRadioButtons[4].addEventListener('change', updatePlotsAndResetColourMap);
amplitudeThresholdingRadioButtons[5].addEventListener('change', updatePlotsAndResetColourMap);
amplitudeThresholdingRadioButtons[6].addEventListener('change', updatePlotsAndResetColourMap);
amplitudeThresholdingRadioButtons[7].addEventListener('change', updatePlotsAndResetColourMap);
amplitudeThresholdingScaleRadioButtons[0].addEventListener('change', updatePlotsAndResetColourMap);
amplitudeThresholdingScaleRadioButtons[1].addEventListener('change', updatePlotsAndResetColourMap);
amplitudeThresholdingScaleRadioButtons[2].addEventListener('change', updatePlotsAndResetColourMap);

/**
 * Add reset button listener, removing filter and amplitude threshold, setting zoom to x1.0 and offset to 0
 */
resetButton.addEventListener('click', () => {

    filterCheckbox.checked = false;
    updateFilterUI();
    amplitudeThresholdingCheckbox.checked = false;
    updateAmplitudeThresholdingUI();

    resetTransformations();
    sampleRateChange();
    updatePlots(true);

});

/**
 * Add filter slider listeners which update the information label
 */
bandPassFilterSlider.on('change', updateFilterLabel);
lowPassFilterSlider.on('change', updateFilterLabel);
highPassFilterSlider.on('change', updateFilterLabel);

/**
 * Add zoom and pan control to buttons
 */
zoomInButton.addEventListener('click', zoomIn);
zoomOutButton.addEventListener('click', zoomOut);

panLeftButton.addEventListener('click', panLeft);
panRightButton.addEventListener('click', panRight);

/** Add export functionality */
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

    const minimumTriggerDuration = getSelectedRadioValue('amplitude-thresholding-duration-radio');

    const filterTypes = ['low', 'band', 'high'];
    const amplitudeThresholdScales = ['percentage', '16bit', 'decibel'];

    const amplitudeThresholdValues = convertAmplitudeThreshold(amplitudeThresholdingSlider.getValue() / amplitudeThresholdingSlider.getAttribute('max'));

    let amplitudeThreshold = 0;

    switch (amplitudeThresholdingScaleIndex) {

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
        amplitudeThresholdingEnabled: amplitudeThresholdingCheckbox.checked,
        amplitudeThreshold: amplitudeThreshold,
        minimumAmplitudeThresholdDuration: minimumTriggerDuration,
        amplitudeThresholdingScale: amplitudeThresholdScales[amplitudeThresholdingScaleIndex]
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
 * Start zoom and offset level on default values
 */
resetTransformations();

/**
 * Add filler axis labels
 */
drawAxisLabels();
drawAxisHeadings();
copyLabelsToCanvas();

/**
 * Prepare filter UI
 */
filterCheckbox.checked = false;
updateFilterUI();
updateFilterLabel();

// Display error if current browser is not Chrome

const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);

if (!isChrome) {

    browserErrorDisplay.style.display = '';
    fileButton.disabled = true;

}
