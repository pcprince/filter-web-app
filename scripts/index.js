/****************************************************************************
 * index.js
 * openacousticdevices.info
 * June 2021
 *****************************************************************************/

/* global calculateSpectrogramFrames, drawSpectrogram, drawWaveform, Slider, readWav, applyLowPassFilter, applyHighPassFilter, applyBandPassFilter, LOW_PASS_FILTER, BAND_PASS_FILTER, HIGH_PASS_FILTER, applyAmplitudeThreshold, playAudio, stopAudio, getTimestamp, XMLHttpRequest, readWavContents, PLAYBACK_MODE_SKIP, PLAYBACK_MODE_ALL, AMPLITUDE_THRESHOLD_BUFFER_LENGTH, createAudioContext, applyGoertzelFilter, drawGoertzelPlot, applyGoertzelThreshold, GOERTZEL_THRESHOLD_BUFFER_LENGTH, generateHammingValues */

// Use these values to fill in the axis labels before samples have been loaded

const FILLER_SAMPLE_RATE = 384000;
const FILLER_SAMPLE_COUNT = FILLER_SAMPLE_RATE * 60;

// Error display elements

const browserErrorDisplay = document.getElementById('browser-error-display');
const errorDisplay = document.getElementById('error-display');
const errorText = document.getElementById('error-text');
const ERROR_DISPLAY_TIME = 3000;

// File selection elements

const fileSelectionTitleDiv = document.getElementById('file-selection-title-div');
const fileButton = document.getElementById('file-button');
const disabledFileButton = document.getElementById('disabled-file-button');
const fileSpan = document.getElementById('file-span');
const trimmedSpan = document.getElementById('trimmed-span');

// Example file variables

const exampleLinks = [document.getElementById('example-link1'), document.getElementById('example-link2'), document.getElementById('example-link3')];
const examplePaths = ['./assets/BAT.WAV', './assets/SWEEP.WAV', './assets/METRONOME.WAV'];
const exampleNames = ['Bat', 'Frequency sweep', 'Metronome'];
const exampleResultObjects = {};

// Plot navigation buttons

const homeButton = document.getElementById('home-button');

const zoomInButton = document.getElementById('zoom-in-button');
const zoomOutButton = document.getElementById('zoom-out-button');

const panLeftButton = document.getElementById('pan-left-button');
const panRightButton = document.getElementById('pan-right-button');

// Minimum amount of time which can be viewed on the plot

const MIN_TIME_VIEW = 0.01;

// Minimum amount of time which can be viewed, in samples using the current sample rate

let minDisplayLength = FILLER_SAMPLE_COUNT;

// Multiplier for zooming in and out. Zoom out = current number of displayed samples * ZOOM_MULTIPLIER

const ZOOM_MULTIPLIER = 2;

// Current number of samples displayed on screen

let displayLength = FILLER_SAMPLE_COUNT;

// Offset within the sample set for displayed samples

let offset = 0;

// Zoom drag variables

let isDragging = false;
let dragStartX = 0;

// Waveform y axis navigation buttons

const waveformHomeButton = document.getElementById('waveform-home-button');
const waveformZoomInButton = document.getElementById('waveform-zoom-in-button');
const waveformZoomOutButton = document.getElementById('waveform-zoom-out-button');

// Vertical navigation variable

let waveformZoomYIndex = 0;
let goertzelZoomYIndex = 0;

const MAX_ZOOM_Y_INDEX = 8;

// Spectrogram canvases

const spectrogramPlaybackCanvas = document.getElementById('spectrogram-playback-canvas'); // Canvas layer where playback progress
const spectrogramDragCanvas = document.getElementById('spectrogram-drag-canvas'); // Canvas layer where zoom overlay is drawn
const spectrogramGoertzelCanvas = document.getElementById('spectrogram-goertzel-canvas'); // Canvas layer where Goertzel thresholded periods are drawn
const spectrogramThresholdCanvas = document.getElementById('spectrogram-threshold-canvas'); // Canvas layer where amplitude thresholded periods are drawn
const spectrogramCanvas = document.getElementById('spectrogram-canvas'); // Canvas layer where spectrogram is drawn
const spectrogramLoadingSVG = document.getElementById('spectrogram-loading-svg');

const waveformHolder = document.getElementById('waveform-holder');
const waveformPlaybackCanvas = document.getElementById('waveform-playback-canvas'); // Canvas layer where playback progress
const waveformDragCanvas = document.getElementById('waveform-drag-canvas'); // Canvas layer where zoom overlay is drawn
const waveformThresholdCanvas = document.getElementById('waveform-threshold-canvas'); // Canvas layer where amplitude thresholded periods are drawn
const waveformThresholdLineCanvas = document.getElementById('waveform-threshold-line-canvas'); // Canvas layer where amplitude threshold value lines are drawn
const waveformCanvas = document.getElementById('waveform-canvas'); // Canvas layer where waveform is drawn
const waveformLoadingSVG = document.getElementById('waveform-loading-svg');

const goertzelCanvasHolder = document.getElementById('goertzel-canvas-holder');
const goertzelPlaybackCanvas = document.getElementById('goertzel-playback-canvas'); // Canvas layer where playback progress
const goertzelDragCanvas = document.getElementById('goertzel-drag-canvas'); // Canvas layer where zoom overlay is drawn
const goertzelThresholdCanvas = document.getElementById('goertzel-threshold-canvas'); // Canvas layer where Goertzel thresholded periods are drawn
const goertzelThresholdLineCanvas = document.getElementById('goertzel-threshold-line-canvas'); // Canvas layer where Goertzel thresholded periods are drawn
const goertzelCanvas = document.getElementById('goertzel-canvas'); // Canvas layer where Goertzel response is drawn
const goertzelLoadingSVG = document.getElementById('goertzel-loading-svg');

const timeLabelSVG = document.getElementById('time-axis-label-svg');
const timeAxisHeadingSVG = document.getElementById('time-axis-heading-svg');

// Y axis label canvases

const Y_LABEL_COUNT = 4;
const spectrogramLabelSVG = document.getElementById('spectrogram-label-svg');
const waveformLabelSVG = document.getElementById('waveform-label-svg');
const goertzelLabelSVG = document.getElementById('goertzel-label-svg');

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

const filterHolder = document.getElementById('filter-holder');

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

const highPassFilterSliderHolder = document.getElementById('high-pass-filter-slider-holder');
const lowPassFilterSliderHolder = document.getElementById('low-pass-filter-slider-holder');
const bandPassFilterSliderHolder = document.getElementById('band-pass-filter-slider-holder');

const highPassFilterSlider = new Slider('#high-pass-filter-slider', {});
const lowPassFilterSlider = new Slider('#low-pass-filter-slider', {});
const bandPassFilterSlider = new Slider('#band-pass-filter-slider', {});

const filterLabel = document.getElementById('filter-label');

// Have the filter settings been changed at all?

let filterChanged = false;

// Previous low/band/high pass filter type selected

let previousSelectionType = 1;

// Low/band/high pass filter slider spacing steps

const FILTER_SLIDER_STEPS = {8000: 100, 16000: 100, 32000: 100, 48000: 100, 96000: 200, 192000: 500, 250000: 500, 384000: 1000};

// Threshold type elements

const thresholdTypeLabel = document.getElementById('threshold-type-label');
const thresholdTypeRadioButtons = document.getElementsByName('threshold-type-radio');
const thresholdTypeTable = document.getElementById('threshold-type-table');

const THRESHOLD_TYPE_NONE = 0;
const THRESHOLD_TYPE_AMPLITUDE = 1;
const THRESHOLD_TYPE_GOERTZEL = 2;

const thresholdHolder = document.getElementById('threshold-holder');
const amplitudeThresholdHolder = document.getElementById('amplitude-threshold-holder');
const goertzelFilterThresholdHolder = document.getElementById('goertzel-filter-threshold-holder');
const thresholdLabel = document.getElementById('threshold-label');

// Amplitude threshold elements

const amplitudeThresholdMaxLabel = document.getElementById('amplitude-threshold-max-label');
const amplitudeThresholdMinLabel = document.getElementById('amplitude-threshold-min-label');

const amplitudeThresholdSliderHolder = document.getElementById('amplitude-threshold-slider-holder');
const amplitudeThresholdSlider = new Slider('#amplitude-threshold-slider', {});
const amplitudeThresholdDurationTable = document.getElementById('amplitude-threshold-duration-table');
const amplitudeThresholdRadioButtons = document.getElementsByName('amplitude-threshold-duration-radio');

const amplitudeThresholdScaleSelect = document.getElementById('amplitude-threshold-scale-select');

// Non-linear amplitude threshold values to map to slider scale

const VALID_AMPLITUDE_VALUES = [0, 1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 88, 96, 104, 112, 120, 128, 144, 160, 176, 192, 208, 224, 240, 256, 288, 320, 352, 384, 416, 448, 480, 512, 576, 640, 704, 768, 832, 896, 960, 1024, 1152, 1280, 1408, 1536, 1664, 1792, 1920, 2048, 2304, 2560, 2816, 3072, 3328, 3584, 3840, 4096, 4608, 5120, 5632, 6144, 6656, 7168, 7680, 8192, 9216, 10240, 11264, 12288, 13312, 14336, 15360, 16384, 18432, 20480, 22528, 24576, 26624, 28672, 30720, 32768];

// Minimum trigger duration values

const MINIMUM_TRIGGER_DURATIONS = [0, 1, 2, 5, 10, 15, 30, 60];

// Amplitude threshold scale enums

let amplitudeThresholdScaleIndex = 0;
const AMPLITUDE_THRESHOLD_SCALE_PERCENTAGE = 0;
const AMPLITUDE_THRESHOLD_SCALE_16BIT = 1;
const AMPLITUDE_THRESHOLD_SCALE_DECIBEL = 2;
let prevAmplitudeThresholdScaleIndex = 0;

// Goertzel filter UI

const GOERTZEL_FILTER_WINDOW_LENGTHS = [16, 32, 64, 128, 256, 512, 1024];

const goertzelFilterSlider = new Slider('#goertzel-filter-slider', {});
const goertzelFilterMaxLabel = document.getElementById('goertzel-filter-max-label');
const goertzelFilterMinLabel = document.getElementById('goertzel-filter-min-label');
const goertzelFilterSliderHolder = document.getElementById('goertzel-filter-slider-holder');
const goertzelFilterWindowTable = document.getElementById('goertzel-filter-window-table');
const goertzelFilterWindowRadioButtons = document.getElementsByName('goertzel-filter-window-radio');
const goertzelThresholdSliderHolder = document.getElementById('goertzel-threshold-slider-holder');
const goertzelThresholdSlider = new Slider('#goertzel-threshold-slider', {});
const goertzelThresholdMaxLabel = document.getElementById('goertzel-threshold-max-label');
const goertzelThresholdMinLabel = document.getElementById('goertzel-threshold-min-label');
const goertzelDurationTable = document.getElementById('goertzel-duration-table');
const goertzelDurationRadioButtons = document.getElementsByName('goertzel-duration-radio');

// Array of Goertzel responses

let goertzelValues = [];

// Boolean array equal length to sample count. Is sample over threshold

let samplesAboveThreshold;
let samplesAboveGoertzelThreshold;
let thresholdedValueCount = 0;

// Panel which states how much size reduction the amplitude threshold settings chosen will do

const sizeInformationPanel = document.getElementById('size-information-panel');

// Other UI

const resetButton = document.getElementById('reset-button');
const exportButton = document.getElementById('export-button');

// Audio playback controls

const playButton = document.getElementById('play-button');
const playIcon = document.getElementById('play-icon');
const stopIcon = document.getElementById('stop-icon');

const playbackSpeedDiv = document.getElementById('playback-speed-div');
const playbackSpeedSlider = new Slider('#playback-speed-slider', {
    ticks_labels: ['x1/16', 'x1/8', 'x1/4', 'x1/2', 'x1', 'x2'],
    ticks: [0, 1, 2, 3, 4, 5],
    value: 4
});
const playbackRates = [0.0625, 0.125, 0.25, 0.5, 1.0, 2.0];

const playbackModeSelect = document.getElementById('playback-mode-select');
const playbackModeOptionAll = document.getElementById('playback-mode-option-all');
const playbackModeOptionMute = document.getElementById('playback-mode-option-mute');
const playbackModeOptionSkip = document.getElementById('playback-mode-option-skip');

// Whether or not audio is currently playing

let playing = false;

// Whether or not playback was stopped but a button press or the audio finishing

let manuallyStopped = false;

// Time taken for initial render, used to work out if future renders should disable the UI

let initialRenderCompletionTime = 0;

// If task (rendering/playback) is longer than this, disable buttons whilst playing

const DISABLE_BUTTON_BUSY_LENGTH = 0.5;

// Timeout object which controls playback tracker animation frames

let animationTimer;

// List of coordinates used when playback mode skips thresholded samples

let skippingXCoords = [];

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
 * @param {boolean} resetValues Whether or not to reset the configuration to default
 */
function sampleRateChange (resetValues) {

    // Update labels to reflect new sample rate

    const maxFreq = getSampleRate() / 2;

    const labelText = (maxFreq / 1000) + 'kHz';

    lowPassMaxLabel.textContent = labelText;
    highPassMaxLabel.textContent = labelText;
    bandPassMaxLabel.textContent = labelText;
    goertzelFilterMaxLabel.textContent = labelText;

    // Update low/band/high pass filter ranges

    highPassFilterSlider.setAttribute('max', maxFreq);
    lowPassFilterSlider.setAttribute('max', maxFreq);
    bandPassFilterSlider.setAttribute('max', maxFreq);
    goertzelFilterSlider.setAttribute('max', maxFreq);

    const filterSliderStep = FILTER_SLIDER_STEPS[getSampleRate()];

    highPassFilterSlider.setAttribute('step', filterSliderStep);
    lowPassFilterSlider.setAttribute('step', filterSliderStep);
    bandPassFilterSlider.setAttribute('step', filterSliderStep);
    goertzelFilterSlider.setAttribute('step', filterSliderStep);

    if (resetValues) {

        // Set values to 1/4 and 3/4 of max value
        const newLowPassFreq = maxFreq / 4;
        const newHighPassFreq = 3 * maxFreq / 4;

        setBandPass(roundToSliderStep(Math.max(newHighPassFreq, newLowPassFreq), filterSliderStep), roundToSliderStep(Math.min(newHighPassFreq, newLowPassFreq), filterSliderStep));
        setLowPassSliderValue(roundToSliderStep(newLowPassFreq, filterSliderStep));
        setHighPassSliderValue(roundToSliderStep(newHighPassFreq, filterSliderStep));

        goertzelFilterSlider.setValue(maxFreq / 2);

    }

}

/**
 * Disable playback slider and change CSS to display disabled cursor on hover
 * @param {Object} slider Slider to be disabled
 * @param {Element} div Div element which contains it
 */
function disableSlider (slider, div) {

    slider.disable();

    const children = div.getElementsByTagName('*');

    for (let i = 0; i < children.length; i++) {

        if (children[i].style) {

            children[i].style.cursor = 'not-allowed';

        }

    }

}

/**
 * Enable playback slider and reset CSS cursor
 * @param {Object} slider Slider to be enabled
 * @param {Element} div Div element which contains it
 */
function enableSlider (slider, div) {

    slider.enable();

    const children = div.getElementsByTagName('*');

    for (let i = 0; i < children.length; i++) {

        if (children[i].style) {

            children[i].style.cursor = '';

        }

    }

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

    if (filterCheckbox.checked && sampleCount !== 0 && !drawing && !playing) {

        filterTypeLabel.style.color = '';

        for (let i = 0; i < filterRadioButtons.length; i++) {

            filterRadioButtons[i].style.color = '';
            filterRadioButtons[i].disabled = false;
            filterRadioLabels[i].style.color = '';

        }

        enableSlider(bandPassFilterSlider, bandPassFilterSliderHolder);
        enableSlider(lowPassFilterSlider, lowPassFilterSliderHolder);
        enableSlider(highPassFilterSlider, highPassFilterSliderHolder);
        bandPassMaxLabel.style.color = '';
        bandPassMinLabel.style.color = '';
        lowPassMaxLabel.style.color = '';
        lowPassMinLabel.style.color = '';
        highPassMaxLabel.style.color = '';
        highPassMinLabel.style.color = '';

        filterLabel.style.color = '';

    } else {

        filterTypeLabel.style.color = '#D3D3D3';

        for (let i = 0; i < filterRadioButtons.length; i++) {

            filterRadioButtons[i].style.color = '#D3D3D3';
            filterRadioButtons[i].disabled = true;
            filterRadioLabels[i].style.color = '#D3D3D3';

        }

        disableSlider(bandPassFilterSlider, bandPassFilterSliderHolder);
        disableSlider(lowPassFilterSlider, lowPassFilterSliderHolder);
        disableSlider(highPassFilterSlider, highPassFilterSliderHolder);
        bandPassMaxLabel.style.color = '#D3D3D3';
        bandPassMinLabel.style.color = '#D3D3D3';
        lowPassMaxLabel.style.color = '#D3D3D3';
        lowPassMinLabel.style.color = '#D3D3D3';
        highPassMaxLabel.style.color = '#D3D3D3';
        highPassMinLabel.style.color = '#D3D3D3';

        filterLabel.style.color = '#D3D3D3';

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
function convertThreshold (rawSlider) {

    let exponent, mantissa, validAmplitude;

    const sliderMax = amplitudeThresholdSlider.getAttribute('max');
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

    return convertThreshold(amplitudeThresholdSlider.getValue());

}

/**
 * Convert selected frequency threshold from current scale raw slider value to amplitude
 * @returns Frequency threshold value
 */
function getGoertzelThreshold () {

    let threshold = parseFloat(convertThreshold(goertzelThresholdSlider.getValue()).percentage);

    threshold /= 100.0;

    return threshold;

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
 * Get value of current threshold type (THRESHOLD_TYPE_NONE, THRESHOLD_TYPE_AMPLITUDE, THRESHOLD_TYPE_GOERTZEL)
 */
function getThresholdTypeIndex () {

    return getSelectedRadioValue('threshold-type-radio');

}

/**
 * Update the information label which displays the threshold information
 */
function updateThresholdLabel () {

    const thresholdTypeIndex = getThresholdTypeIndex();

    if (thresholdTypeIndex === THRESHOLD_TYPE_AMPLITUDE) {

        thresholdLabel.style.color = '';

        const amplitudeThreshold = convertThreshold(amplitudeThresholdSlider.getValue());

        thresholdLabel.textContent = 'Threshold of ';

        switch (amplitudeThresholdScaleIndex) {

        case AMPLITUDE_THRESHOLD_SCALE_PERCENTAGE:

            thresholdLabel.textContent += amplitudeThreshold.percentage + '%';
            break;

        case AMPLITUDE_THRESHOLD_SCALE_16BIT:

            thresholdLabel.textContent += amplitudeThreshold.amplitude;
            break;

        case AMPLITUDE_THRESHOLD_SCALE_DECIBEL:

            thresholdLabel.textContent += amplitudeThreshold.decibels + ' dB';
            break;

        }

        thresholdLabel.textContent += ' will be used when generating T.WAV files.';

    } else if (thresholdTypeIndex === THRESHOLD_TYPE_GOERTZEL) {

        const goertzelFrequency = goertzelFilterSlider.getValue() / 1000;
        const goertzelThresholdPercentage = convertThreshold(goertzelThresholdSlider.getValue()).percentage;

        thresholdLabel.style.color = '';

        thresholdLabel.textContent = 'Threshold of ';
        thresholdLabel.textContent += goertzelThresholdPercentage + '%';
        thresholdLabel.textContent += ' at ' + goertzelFrequency.toFixed(1) + ' kHz';
        thresholdLabel.textContent += ' will be used when generating T.WAV files.';

    } else {

        thresholdLabel.style.color = '#D3D3D3';

        thresholdLabel.textContent = 'All audio will be written to a WAV file.';

    }

}

/**
 * Update UI when amplitude threshold scale is changed
 */
function updateAmplitudethresholdScale () {

    updateThresholdLabel();

    switch (amplitudeThresholdScaleIndex) {

    case AMPLITUDE_THRESHOLD_SCALE_PERCENTAGE:
        amplitudeThresholdMinLabel.innerHTML = '0.001%';
        amplitudeThresholdMaxLabel.innerHTML = '100%';
        break;

    case AMPLITUDE_THRESHOLD_SCALE_16BIT:
        amplitudeThresholdMinLabel.innerHTML = '0';
        amplitudeThresholdMaxLabel.innerHTML = '32768';
        break;

    case AMPLITUDE_THRESHOLD_SCALE_DECIBEL:
        amplitudeThresholdMinLabel.innerHTML = '-100 dB';
        amplitudeThresholdMaxLabel.innerHTML = '0 dB';
        break;

    }

}

/**
 * Update UI based on which threshold type is selected
 */
function updateThresholdTypeUI () {

    const thresholdTypeIndex = getThresholdTypeIndex();

    if (sampleCount !== 0 && !drawing && !playing) {

        thresholdTypeLabel.style.color = '';

        thresholdTypeTable.style.color = '';

        for (let i = 0; i < thresholdTypeRadioButtons.length; i++) {

            thresholdTypeRadioButtons[i].disabled = false;

        }

        if (thresholdTypeIndex === THRESHOLD_TYPE_AMPLITUDE || thresholdTypeIndex === THRESHOLD_TYPE_GOERTZEL) {

            playbackModeOptionMute.disabled = false;
            playbackModeOptionSkip.disabled = false;

        } else {

            playbackModeOptionMute.disabled = true;
            playbackModeOptionSkip.disabled = true;

        }

    } else {

        thresholdTypeLabel.style.color = '#D3D3D3';

        thresholdTypeTable.style.color = '#D3D3D3';

        for (let i = 0; i < thresholdTypeRadioButtons.length; i++) {

            thresholdTypeRadioButtons[i].disabled = true;

        }

        playbackModeOptionMute.disabled = true;
        playbackModeOptionSkip.disabled = true;

    }

    switch (thresholdTypeIndex) {

    case THRESHOLD_TYPE_NONE:

        amplitudeThresholdHolder.style.display = 'none';
        goertzelFilterThresholdHolder.style.display = 'none';
        goertzelCanvasHolder.style.display = 'none';
        spectrogramGoertzelCanvas.style.display = 'none';

        thresholdHolder.style.display = 'none';

        waveformHolder.style.display = '';

        filterHolder.style.display = '';

        break;

    case THRESHOLD_TYPE_AMPLITUDE:

        amplitudeThresholdHolder.style.display = '';
        goertzelFilterThresholdHolder.style.display = 'none';
        goertzelCanvasHolder.style.display = 'none';
        spectrogramGoertzelCanvas.style.display = 'none';

        thresholdHolder.style.display = '';

        waveformHolder.style.display = '';

        filterHolder.style.display = '';

        break;

    case THRESHOLD_TYPE_GOERTZEL:

        amplitudeThresholdHolder.style.display = 'none';
        goertzelFilterThresholdHolder.style.display = '';
        goertzelCanvasHolder.style.display = '';
        spectrogramGoertzelCanvas.style.display = '';

        thresholdHolder.style.display = '';

        waveformHolder.style.display = 'none';

        filterHolder.style.display = 'none';

        break;

    }

}

/**
 * Handle a change to the amplitude threshold status/value
 */
function updateThresholdUI () {

    updateThresholdLabel();

    const thresholdTypeIndex = getThresholdTypeIndex();

    if (thresholdTypeIndex === THRESHOLD_TYPE_AMPLITUDE && sampleCount !== 0 && !drawing && !playing) {

        enableSlider(amplitudeThresholdSlider, amplitudeThresholdSliderHolder);
        amplitudeThresholdMaxLabel.style.color = '';
        amplitudeThresholdMinLabel.style.color = '';

        amplitudeThresholdDurationTable.style.color = '';

        for (let i = 0; i < amplitudeThresholdRadioButtons.length; i++) {

            amplitudeThresholdRadioButtons[i].disabled = false;

        }

    } else if (thresholdTypeIndex === THRESHOLD_TYPE_GOERTZEL && sampleCount !== 0 && !drawing && !playing) {

        goertzelFilterWindowTable.style.color = '';

        for (let i = 0; i < goertzelFilterWindowRadioButtons.length; i++) {

            goertzelFilterWindowRadioButtons[i].disabled = false;

        }

        enableSlider(goertzelFilterSlider, goertzelFilterSliderHolder);
        goertzelFilterMaxLabel.style.color = '';
        goertzelFilterMinLabel.style.color = '';

        goertzelDurationTable.style.color = '';

        for (let i = 0; i < goertzelDurationRadioButtons.length; i++) {

            goertzelDurationRadioButtons[i].disabled = false;

        }

        enableSlider(goertzelThresholdSlider, goertzelThresholdSliderHolder);
        goertzelThresholdMaxLabel.style.color = '';
        goertzelThresholdMinLabel.style.color = '';

    } else {

        // Disable amplitude trheshold UI

        disableSlider(amplitudeThresholdSlider, amplitudeThresholdSliderHolder);
        amplitudeThresholdMaxLabel.style.color = '#D3D3D3';
        amplitudeThresholdMinLabel.style.color = '#D3D3D3';

        amplitudeThresholdDurationTable.style.color = '#D3D3D3';

        for (let i = 0; i < amplitudeThresholdRadioButtons.length; i++) {

            amplitudeThresholdRadioButtons[i].disabled = true;

        }

        // Disable Goertzel UI

        goertzelFilterWindowTable.style.color = '#D3D3D3';

        for (let i = 0; i < goertzelFilterWindowRadioButtons.length; i++) {

            goertzelFilterWindowRadioButtons[i].disabled = true;

        }

        disableSlider(goertzelFilterSlider, goertzelFilterSliderHolder);
        goertzelFilterMaxLabel.style.color = '#D3D3D3';
        goertzelFilterMinLabel.style.color = '#D3D3D3';

        goertzelDurationTable.style.color = '#D3D3D3';

        for (let i = 0; i < goertzelDurationRadioButtons.length; i++) {

            goertzelDurationRadioButtons[i].disabled = true;

        }

        disableSlider(goertzelThresholdSlider, goertzelThresholdSliderHolder);
        goertzelThresholdMaxLabel.style.color = '#D3D3D3';
        goertzelThresholdMinLabel.style.color = '#D3D3D3';

        // If the UI is disabled because app is drawing, rather than manually disabled, don't rewrite the label

        if (!drawing && !playing) {

            thresholdLabel.textContent = 'All audio will be written to a WAV file.';

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
function samplesToPixels (samples) {

    const pixels = samples / displayLength * spectrogramCanvas.width;

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

/**
 * Draw line to an SVG holder
 * @param {Element} parent SVG element to be drawn to
 * @param {number} x1 X coordinate of line start
 * @param {number} y1 Y coordinate of line start
 * @param {number} x2 X coordinate of line end
 * @param {number} y2 Y coordinate of line end
 */
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
 * Gets sample rate, returning a filler value if no samples have been loaded yet
 * @returns Sample rate
 */
function getSampleRate () {

    return (sampleCount !== 0) ? sampleRate : FILLER_SAMPLE_RATE;

}

/**
 * Convert zoom index to zoom level
 * @returns Zoom level
 */
function getZoomY () {

    return Math.pow(2, waveformZoomYIndex);

}

/**
 * Convert zoom index to zoom level for decibel plot
 * @returns Zoom level for decibel plot
 */
function getDecibelZoomY () {

    return 1.0 / Math.pow(10, (-6 * waveformZoomYIndex / 20));

}

/**
 * Convert zoom index to zoom level for Goertzel plot
 * @returns Zoom level for decibel plot
 */
 function getGoertzelZoomY () {

    return Math.pow(2, goertzelZoomYIndex);

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

    // If no file has been loaded, use a filler sample count/rate

    const currentSampleRate = getSampleRate();
    const currentSampleCount = (sampleCount !== 0) ? sampleCount : FILLER_SAMPLE_COUNT;

    let label = 0;

    const displayedTimeAmounts = [
        {
            amount: 30,
            labelIncrement: 5,
            precision: 0
        },
        {
            amount: 10,
            labelIncrement: 2,
            precision: 0
        },
        {
            amount: 5,
            labelIncrement: 1,
            precision: 0
        },
        {
            amount: 2,
            labelIncrement: 0.5,
            precision: 1
        },
        {
            amount: 1,
            labelIncrement: 0.2,
            precision: 1
        },
        {
            amount: 0.5,
            labelIncrement: 0.1,
            precision: 1
        },
        {
            amount: 0.2,
            labelIncrement: 0.05,
            precision: 2
        },
        {
            amount: 0.1,
            labelIncrement: 0.02,
            precision: 2
        },
        {
            amount: 0.05,
            labelIncrement: 0.01,
            precision: 2
        },
        {
            amount: 0.02,
            labelIncrement: 0.005,
            precision: 3
        },
        {
            amount: 0.01,
            labelIncrement: 0.002,
            precision: 3
        },
        {
            amount: 0.005,
            labelIncrement: 0.001,
            precision: 3
        }
    ];

    let xLabelIncrementSecs = displayedTimeAmounts[0].labelIncrement;
    let xLabelDecimalPlaces = displayedTimeAmounts[0].precision;

    for (let i = 0; i < displayedTimeAmounts.length; i++) {

        const displayedTimeSamples = displayedTimeAmounts[i].amount * currentSampleRate;

        xLabelIncrementSecs = displayedTimeAmounts[i].labelIncrement;
        xLabelDecimalPlaces = displayedTimeAmounts[i].precision;

        if (displayLength > displayedTimeSamples) {

            break;

        }

    }

    const xLabelIncrementSamples = xLabelIncrementSecs * currentSampleRate;

    // So the centre of the text can be the label location, there's a small amount of padding around the label canvas
    const xLabelPadding = (timeLabelSVG.width.baseVal.value - waveformCanvas.width) / 2;

    while (label <= currentSampleCount) {

        // Convert the time to a pixel value, then take into account the label width and the padding to position correctly

        const x = samplesToPixels(label) + xLabelPadding - samplesToPixels(offset);

        if (x - xLabelPadding < 0) {

            label += xLabelIncrementSamples;
            continue;

        }

        if (x - xLabelPadding > waveformCanvas.width) {

            break;

        }

        const labelText = (label / currentSampleRate).toFixed(xLabelDecimalPlaces);

        addSVGText(timeLabelSVG, labelText, x, 10, 'middle');
        addSVGLine(timeLabelSVG, x, 0, x, xMarkerLength);

        label += xLabelIncrementSamples;

    }

    // Draw y axis labels for spectrogram

    clearSVG(spectrogramLabelSVG);

    const ySpecLabelIncrement = getSampleRate() / 2 / Y_LABEL_COUNT;
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

    const displayedWaveformAmounts = [
        {
            // 100%
            step16Bit: 8192,
            stepPercentage: 20,
            precisionPercentage: 0,
            labelsDecibel: [0, -2, -4, -6, -12]
        },
        {
            // 50%
            step16Bit: 4096,
            stepPercentage: 10,
            precisionPercentage: 0,
            labelsDecibel: [-6, -8, -10, -12, -18]
        },
        {
            // 25%
            step16Bit: 2048,
            stepPercentage: 10,
            precisionPercentage: 0,
            labelsDecibel: [-12, -14, -16, -18, -24]
        },
        {
            // 12.5%
            step16Bit: 1024,
            stepPercentage: 5,
            precisionPercentage: 0,
            labelsDecibel: [-18, -20, -22, -24, -30]
        },
        {
            // 6.25%
            step16Bit: 512,
            stepPercentage: 1,
            precisionPercentage: 0,
            labelsDecibel: [-24, -26, -28, -30, -36]
        },
        {
            // 3.125%
            step16Bit: 256,
            stepPercentage: 1,
            precisionPercentage: 0,
            labelsDecibel: [-30, -32, -34, -36, -42]
        },
        {
            // 1.5625%
            step16Bit: 128,
            stepPercentage: 0.5,
            precisionPercentage: 1,
            labelsDecibel: [-36, -38, -40, -42, -48]
        },
        {
            // 0.78125%
            step16Bit: 64,
            stepPercentage: 0.2,
            precisionPercentage: 1,
            labelsDecibel: [-42, -44, -46, -48, -54]
        },
        {
            // 0.390625%
            step16Bit: 32,
            stepPercentage: 0.1,
            precisionPercentage: 1,
            labelsDecibel: [-48, -50, -52, -54, -60]
        }
    ];

    const z = getZoomY();
    const waveformMax = 32768 / z;
    const waveformMaxPercentage = 100.0 / z;

    const waveformCanvasH = waveformLabelSVG.height.baseVal.value;
    const waveformCanvasHCentre = waveformCanvasH / 2.0;

    const yLabelIncrementWaveform16Bit = displayedWaveformAmounts[waveformZoomYIndex].step16Bit;
    const yLabelIncrementWaveformPercentage = displayedWaveformAmounts[waveformZoomYIndex].stepPercentage;
    const yLabelDecimalPlacesWaveform = displayedWaveformAmounts[waveformZoomYIndex].precisionPercentage;
    const yLabelDecibelLabels = displayedWaveformAmounts[waveformZoomYIndex].labelsDecibel;

    const yLabelPositionIncrementWaveform = (yLabelIncrementWaveform16Bit / waveformMax) * waveformCanvasH / 2;
    const yLabelPositionIncrementWaveformPercentage = (yLabelIncrementWaveformPercentage / waveformMaxPercentage) * waveformCanvasH / 2;

    const waveformLabelTexts = [];
    const waveformLabelYPositions = [];

    if (amplitudeThresholdScaleIndex === AMPLITUDE_THRESHOLD_SCALE_PERCENTAGE) {

        let waveformLabelYOffsetPercentage = 0.0;
        let waveformLabelValuePercentage = 0.0;

        while (waveformLabelValuePercentage <= waveformMaxPercentage) {

            // 1.5% can't be selected but 0.5 is a chosen step, so skip that label

            if (yLabelIncrementWaveformPercentage === 0.5 && waveformLabelValuePercentage === 1.5) {

                waveformLabelValuePercentage += yLabelIncrementWaveformPercentage;
                waveformLabelYOffsetPercentage += yLabelPositionIncrementWaveformPercentage;

                continue;

            }

            waveformLabelTexts.push(waveformLabelValuePercentage.toFixed(yLabelDecimalPlacesWaveform) + '%');
            waveformLabelYPositions.push(waveformCanvasHCentre - waveformLabelYOffsetPercentage);

            // Add mirrored label

            if (waveformLabelValuePercentage > 0.0) {

                waveformLabelTexts.unshift(waveformLabelValuePercentage.toFixed(yLabelDecimalPlacesWaveform) + '%');
                waveformLabelYPositions.unshift(waveformCanvasHCentre + waveformLabelYOffsetPercentage);

            }

            waveformLabelValuePercentage += yLabelIncrementWaveformPercentage;
            waveformLabelYOffsetPercentage += yLabelPositionIncrementWaveformPercentage;

        }

    } else if (amplitudeThresholdScaleIndex === AMPLITUDE_THRESHOLD_SCALE_16BIT) {

        let waveformLabelYOffset = 0;
        let waveformLabelValue16Bit = 0;

        while (waveformLabelValue16Bit <= waveformMax) {

            waveformLabelTexts.push(waveformLabelValue16Bit);
            waveformLabelYPositions.push(waveformCanvasHCentre - waveformLabelYOffset);

            // Add mirrored label

            if (waveformLabelValue16Bit > 0) {

                waveformLabelTexts.unshift(waveformLabelValue16Bit);
                waveformLabelYPositions.unshift(waveformCanvasHCentre + waveformLabelYOffset);

            }

            waveformLabelValue16Bit += yLabelIncrementWaveform16Bit;
            waveformLabelYOffset += yLabelPositionIncrementWaveform;

        }

    } else if (amplitudeThresholdScaleIndex === AMPLITUDE_THRESHOLD_SCALE_DECIBEL) {

        for (let i = 0; i < yLabelDecibelLabels.length; i++) {

            const decibelValue = yLabelDecibelLabels[i];

            const labelPosition = Math.pow(10, decibelValue / 20);

            waveformLabelTexts.push(yLabelDecibelLabels[i] + 'dB');
            waveformLabelYPositions.push(waveformCanvasHCentre - (getDecibelZoomY() * labelPosition * waveformCanvasHCentre));

            // No label is drawn for 0, so no need to check that here

            waveformLabelTexts.push(yLabelDecibelLabels[i] + 'dB');
            waveformLabelYPositions.push(waveformCanvasHCentre + (getDecibelZoomY() * labelPosition * waveformCanvasHCentre));

        }

    }

    const wavLabelX = waveformLabelSVG.width.baseVal.value - 7;
    const wavMarkerX = waveformLabelSVG.width.baseVal.value - yMarkerLength;

    for (let i = 0; i < waveformLabelTexts.length; i++) {

        let markerY = waveformLabelYPositions[i];
        let labelY = markerY;

        labelY = (labelY - 5 <= 0) ? 5 : labelY;
        labelY = (labelY + 5 >= waveformCanvasH) ? waveformCanvasH - 5 : labelY;

        addSVGText(waveformLabelSVG, waveformLabelTexts[i], wavLabelX, labelY, 'end');

        // Nudge markers slightly onto canvas so they're not cut off

        markerY = (markerY === 0) ? markerY + 1 : markerY;
        markerY = (markerY === waveformCanvasH) ? markerY - 1 : markerY;

        addSVGLine(waveformLabelSVG, wavMarkerX, markerY, waveformLabelSVG.width.baseVal.value, markerY);

    }

    // Draw y axis labels for goertzel plot

    clearSVG(goertzelLabelSVG);

    const displayedGoertzelAmounts = [
        {
            // 100%
            labelIncrement: 20,
            precision: 0
        },
        {
            // 50%
            labelIncrement: 10,
            precision: 0
        },
        {
            // 25%
            labelIncrement: 10,
            precision: 0
        },
        {
            // 12.5%
            labelIncrement: 5,
            precision: 0
        },
        {
            // 6.25%
            labelIncrement: 1,
            precision: 0
        },
        {
            // 3.125%
            labelIncrement: 1,
            precision: 0
        },
        {
            // 1.5625% !
            labelIncrement: 0.5,
            precision: 1
        },
        {
            // 0.78125%
            labelIncrement: 0.2,
            precision: 1
        },
        {
            // 0.390625%
            labelIncrement: 0.1,
            precision: 1
        }
    ];

    let yLabelIncrementGoertzel = displayedGoertzelAmounts[0].labelIncrement;
    let yLabelDecimalPlacesGoertzel = displayedGoertzelAmounts[0].precision;

    const goertzelCanvasH = goertzelLabelSVG.height.baseVal.value;
    let yLabelPositionIncrementGoertzel = 0;

    const goertzelMax = 100.0 / getGoertzelZoomY();

    yLabelIncrementGoertzel = displayedGoertzelAmounts[goertzelZoomYIndex].labelIncrement;
    yLabelDecimalPlacesGoertzel = displayedGoertzelAmounts[goertzelZoomYIndex].precision;

    yLabelPositionIncrementGoertzel = (yLabelIncrementGoertzel / goertzelMax) * goertzelCanvasH;

    let goertzelLabelValue = 0.0;
    let goertzelLabelYPosition = goertzelCanvasH;

    const goertzelLabelTexts = [];
    const goertzelLabelYPositions = [];

    while (goertzelLabelValue <= goertzelMax) {

        goertzelLabelTexts.push(goertzelLabelValue.toFixed(yLabelDecimalPlacesGoertzel) + '%');
        goertzelLabelYPositions.push(goertzelLabelYPosition);

        goertzelLabelValue += yLabelIncrementGoertzel;
        goertzelLabelYPosition -= yLabelPositionIncrementGoertzel;

    }

    const goertzelLabelX = goertzelLabelSVG.width.baseVal.value - 7;
    const goertzelMarkerX = goertzelLabelSVG.width.baseVal.value - yMarkerLength;

    for (let i = 0; i < goertzelLabelTexts.length; i++) {

        let markerY = goertzelLabelYPositions[i];
        let labelY = markerY;

        // Nudge labels slightly onto canvas so they're not cut off

        labelY = (labelY - 5 <= 0) ? 5 : labelY;
        labelY = (labelY + 5 >= goertzelCanvasH) ? goertzelCanvasH - 5 : labelY;

        addSVGText(goertzelLabelSVG, goertzelLabelTexts[i], goertzelLabelX, labelY, 'end');

        // Nudge markers slightly onto canvas so they're not cut off

        markerY = (markerY === 0) ? markerY + 1 : markerY;
        markerY = (markerY === goertzelCanvasH) ? markerY - 1 : markerY;

        addSVGLine(goertzelLabelSVG, goertzelMarkerX, markerY, goertzelLabelSVG.width.baseVal.value, markerY);

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
function resetCanvas (canvas) {

    // Setting the width/height of a canvas in any way wipes it clean and resets the context's transformations
    // eslint-disable-next-line no-self-assign
    canvas.width = canvas.width;

}

/**
 * Update zoom input with current zoom level and enable/disable zoom in/out buttons if appropriate
 */
function updateZoomUI () {

    if (sampleCount === 0) {

        zoomInButton.disabled = true;
        zoomOutButton.disabled = true;
        homeButton.disabled = true;
        return;

    }

    if (displayLength === sampleCount) {

        homeButton.disabled = true;

    } else {

        homeButton.disabled = false;

    }

    if (displayLength >= sampleCount) {

        zoomOutButton.disabled = true;

    } else {

        zoomOutButton.disabled = false;

    }

    if (displayLength <= minDisplayLength) {

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

    if (offset <= 0) {

        panLeftButton.disabled = true;

    } else {

        panLeftButton.disabled = false;

    }

    let sampleEnd = Math.floor(offset + displayLength);

    // Gap at the end of the plot in samples
    const gapLength = sampleEnd - sampleCount;

    sampleEnd = sampleEnd > sampleCount ? sampleCount : sampleEnd;

    if (gapLength >= 0) {

        panRightButton.disabled = true;

    } else {

        panRightButton.disabled = false;

    }

}

/**
 * Update zoom and pan UI elements, disabling x axis home button if needed
 */
function updateNavigationUI () {

    updateZoomUI();
    updatePanUI();

}

/**
 * Draw amplitude threshold value to its overlay layer
 */
function drawAmplitudeThresholdLines () {

    const thresholdCtx = waveformThresholdLineCanvas.getContext('2d');
    const w = waveformThresholdLineCanvas.width;
    const h = waveformThresholdLineCanvas.height;

    resetCanvas(waveformThresholdLineCanvas);

    thresholdCtx.strokeStyle = 'black';
    thresholdCtx.lineWidth = 1;

    const amplitudeThresholdValues = getAmplitudeThreshold();

    const centre = h / 2;
    let offsetFromCentre = 0;

    if (amplitudeThresholdScaleIndex === AMPLITUDE_THRESHOLD_SCALE_PERCENTAGE) {

        const amplitudeThresholdRatio = parseFloat(amplitudeThresholdValues.percentage) / 100.0;
        offsetFromCentre = Math.round(amplitudeThresholdRatio * centre * getZoomY());

    } else if (amplitudeThresholdScaleIndex === AMPLITUDE_THRESHOLD_SCALE_16BIT) {

        const amplitudeThresholdRatio = amplitudeThresholdValues.amplitude / 32768.0;
        offsetFromCentre = Math.round(amplitudeThresholdRatio * centre * getZoomY());

    } else if (amplitudeThresholdScaleIndex === AMPLITUDE_THRESHOLD_SCALE_DECIBEL) {

        const amplitudeThresholdRatio = Math.pow(10, amplitudeThresholdValues.decibels / 20);
        offsetFromCentre = Math.round(amplitudeThresholdRatio * centre * getDecibelZoomY());

    }

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
 * Draw Goertzel threshold value to its overlay layer
 */
function drawGoertzelThresholdLine () {

    const thresholdCtx = goertzelThresholdLineCanvas.getContext('2d');
    const w = goertzelThresholdLineCanvas.width;
    const h = goertzelThresholdLineCanvas.height;

    resetCanvas(goertzelThresholdLineCanvas);

    thresholdCtx.strokeStyle = 'black';

    const frequencyThreshold = getGoertzelThreshold();

    const thresholdY = h - (h * frequencyThreshold * getGoertzelZoomY());

    thresholdCtx.moveTo(0, thresholdY);
    thresholdCtx.lineTo(w, thresholdY);
    thresholdCtx.stroke();

}

function drawGoertzelFilter () {

    const filterCtx = spectrogramGoertzelCanvas.getContext('2d');
    const w = spectrogramGoertzelCanvas.width;
    const h = spectrogramGoertzelCanvas.height;

    resetCanvas(spectrogramGoertzelCanvas);

    filterCtx.lineWidth = 1;
    filterCtx.strokeStyle = 'black';

    const nyquist = sampleRate / 2.0;

    const freq = goertzelFilterSlider.getValue();
    const freqY = h - (h * freq / nyquist);

    const windowLength = GOERTZEL_FILTER_WINDOW_LENGTHS[getSelectedRadioValue('goertzel-filter-window-radio')];
    const bandwidth = 4.0 * sampleRate / windowLength;
    const bandwidthY = (h * bandwidth / nyquist) / 2;

    // Draw central frequency

    filterCtx.moveTo(0, freqY);
    filterCtx.lineTo(w, freqY);
    filterCtx.stroke();

    // Draw lines at edge of bandwidth

    filterCtx.moveTo(0, freqY - bandwidthY);
    filterCtx.lineTo(w, freqY - bandwidthY);
    filterCtx.stroke();

    filterCtx.moveTo(0, freqY + bandwidthY);
    filterCtx.lineTo(w, freqY + bandwidthY);
    filterCtx.stroke();

    // Grey out areas outside the thresholded frequency

    filterCtx.globalAlpha = 0.25;
    filterCtx.fillStyle = 'white';

    filterCtx.fillRect(0, 0, w, freqY - bandwidthY);
    filterCtx.fillRect(0, freqY + bandwidthY, w, h - (freqY + bandwidthY));

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

    // Reset scaling from zoom

    waveformCtx.resetTransform();

    waveformCtx.fillStyle = 'white';
    waveformCtx.globalAlpha = 0.75;

    spectrogramCtx.resetTransform();

    spectrogramCtx.fillStyle = 'white';
    spectrogramCtx.globalAlpha = 0.85;

    let drawingPeriod = false;
    let startPixels;

    const start = Math.floor(offset / AMPLITUDE_THRESHOLD_BUFFER_LENGTH);
    const end = Math.floor((offset + displayLength - 1) / AMPLITUDE_THRESHOLD_BUFFER_LENGTH);

    for (let i = start; i <= end; i++) {

        const sampleIndex = i * AMPLITUDE_THRESHOLD_BUFFER_LENGTH;

        if (!samplesAboveThreshold[i]) {

            if (!drawingPeriod) {

                drawingPeriod = true;
                startPixels = samplesToPixels(sampleIndex - offset);

            }

        } else {

            if (drawingPeriod) {

                drawingPeriod = false;

                const endPixels = samplesToPixels(sampleIndex - offset);
                const lengthPixels = endPixels - startPixels;

                waveformCtx.fillRect(startPixels, 0, lengthPixels, waveformH);
                spectrogramCtx.fillRect(startPixels, 0, lengthPixels, spectrogramH);

            }

        }

    }

    // If a period is cut off by the end of the displayed area

    if (drawingPeriod) {

        const endPixels = samplesToPixels(offset + displayLength);
        const lengthPixels = endPixels - startPixels;

        waveformCtx.fillRect(startPixels, 0, lengthPixels, waveformH);
        spectrogramCtx.fillRect(startPixels, 0, lengthPixels, spectrogramH);

    }

}

/**
 * Draw Goertzel threshold periods to the overlay layer
 */
function drawGoertzelThresholdedPeriods () {

    const spectrogramCtx = spectrogramThresholdCanvas.getContext('2d');
    const spectrogramW = spectrogramThresholdCanvas.width;
    const spectrogramH = spectrogramThresholdCanvas.height;

    spectrogramCtx.clearRect(0, 0, spectrogramW, spectrogramH);

    const goertzelCtx = goertzelThresholdCanvas.getContext('2d');
    const goertzelW = goertzelThresholdCanvas.width;
    const goertzelH = goertzelThresholdCanvas.height;

    goertzelCtx.clearRect(0, 0, goertzelW, goertzelH);

    // Reset scaling from zoom

    spectrogramCtx.resetTransform();

    spectrogramCtx.fillStyle = 'white';
    spectrogramCtx.globalAlpha = 0.85;

    // goertzelCtx.resetTransform();

    goertzelCtx.fillStyle = 'white';
    goertzelCtx.globalAlpha = 0.75;

    let drawingPeriod = false;
    let startPixels;

    const start = Math.floor(offset / GOERTZEL_THRESHOLD_BUFFER_LENGTH);
    const end = Math.floor((offset + displayLength - 1) / GOERTZEL_THRESHOLD_BUFFER_LENGTH);

    for (let i = start; i <= end; i++) {

        const sampleIndex = i * GOERTZEL_THRESHOLD_BUFFER_LENGTH;

        if (!samplesAboveGoertzelThreshold[i]) {

            if (!drawingPeriod) {

                drawingPeriod = true;
                startPixels = samplesToPixels(sampleIndex - offset);

            }

        } else {

            if (drawingPeriod) {

                drawingPeriod = false;

                const endPixels = samplesToPixels(sampleIndex - offset);
                const lengthPixels = endPixels - startPixels;

                spectrogramCtx.fillRect(startPixels, 0, lengthPixels, spectrogramH);
                goertzelCtx.fillRect(startPixels, 0, lengthPixels, goertzelH);

            }

        }

    }

    // If a period is cut off by the end of the displayed area

    if (drawingPeriod) {

        const endPixels = samplesToPixels(offset + displayLength);
        const lengthPixels = endPixels - startPixels;

        spectrogramCtx.fillRect(startPixels, 0, lengthPixels, spectrogramH);
        goertzelCtx.fillRect(startPixels, 0, lengthPixels, goertzelH);

    }

}

/**
 * Draw a loading message to the given canvas
 * @param {object} canvas The canvas to be cleared and display the loading message
 */
function drawLoadingImage (svgCanvas) {

    const w = svgCanvas.width.baseVal.value;
    const h = svgCanvas.height.baseVal.value;

    clearSVG(svgCanvas);

    addSVGText(svgCanvas, 'Loading...', w / 2, h / 2, 'middle');

}

/**
 * Draw loading message on spectrogram and waveform canvases
 */
function drawLoadingImages () {

    resetCanvas(spectrogramCanvas);
    drawLoadingImage(spectrogramLoadingSVG);
    resetCanvas(waveformCanvas);
    drawLoadingImage(waveformLoadingSVG);

}

/**
 * Re-enable UI at the end of the drawing process
 */
function reenableUI () {

    fileButton.disabled = false;

    resetButton.disabled = false;
    exportButton.disabled = false;

    updateNavigationUI();
    updateYZoomUI();

    filterCheckbox.disabled = false;
    filterCheckboxLabel.style.color = '';
    updateFilterUI();

    thresholdTypeLabel.style.color = '';
    for (let i = 0; i < thresholdTypeRadioButtons.length; i++) {

        thresholdTypeRadioButtons[i].disabled = false;

    }

    updateThresholdTypeUI();

    updateThresholdUI();

    resetButton.disabled = false;
    exportButton.disabled = false;

    playButton.disabled = false;
    enableSlider(playbackSpeedSlider, playbackSpeedDiv);
    playbackModeSelect.disabled = false;

}

/**
 * Draw the waveform plot, its axis labels, and then re-enable all UI
 * @param {number[]} samples Samples to render
 * @param {boolean} isInitialRender Is this the first time this file has been rendered
 * @param {number} spectrogramCompletionTime Time taken to render spectrogram
 */
function drawWaveformPlot (samples, isInitialRender, spectrogramCompletionTime) {

    console.log('Drawing waveform');

    resetCanvas(waveformCanvas);

    const thresholdTypeIndex = getThresholdTypeIndex();

    // Halving vertical view just cuts off the mid point label, so reduce zoom slightly if in decibel mode

    const zoomLevel = (amplitudeThresholdScaleIndex === AMPLITUDE_THRESHOLD_SCALE_DECIBEL) ? getDecibelZoomY() : getZoomY();

    drawWaveform(samples, offset, displayLength, zoomLevel, (waveformCompletionTime) => {

        if (isInitialRender) {

            initialRenderCompletionTime = spectrogramCompletionTime + waveformCompletionTime;
            console.log('Initial rendering took', initialRenderCompletionTime, 'ms');

        }

        resetCanvas(waveformThresholdCanvas);
        resetCanvas(waveformThresholdLineCanvas);

        clearSVG(waveformLoadingSVG);

        if (thresholdTypeIndex === THRESHOLD_TYPE_AMPLITUDE) {

            drawThresholdedPeriods();
            drawAmplitudeThresholdLines();

        }

        drawAxisLabels();

        drawing = false;

        if (thresholdTypeIndex === THRESHOLD_TYPE_GOERTZEL) {

            resetCanvas(goertzelCanvas);
            resetCanvas(goertzelThresholdCanvas);
            resetCanvas(goertzelThresholdLineCanvas);
            clearSVG(goertzelLoadingSVG);

            const windowLength = GOERTZEL_FILTER_WINDOW_LENGTHS[getSelectedRadioValue('goertzel-filter-window-radio')];

            drawGoertzelPlot(goertzelValues, windowLength, offset, displayLength, getGoertzelZoomY(), () => {

                drawGoertzelThresholdedPeriods();
                drawGoertzelFilter();
                drawGoertzelThresholdLine();
                reenableUI();

            });

        } else {

            reenableUI();

        }

    });

}

/**
 * Estimate time taken to render with the new display length
 * @returns Approximate render time
 */
function estimateRenderTime () {

    if (sampleCount === 0) {

        return 0;

    }

    const displayRatio = displayLength / sampleCount;

    return displayRatio * initialRenderCompletionTime / getSampleRate();

}

/**
 * Draw spectrogram and waveform plots
 * @param {number[]} samples Samples to render
 * @param {boolean} isInitialRender Is this the first time the file has been rendered
 */
function drawPlots (samples, isInitialRender) {

    drawSpectrogram(processedSpectrumFrames, spectrumMin, spectrumMax, async (completionTime) => {

        resetCanvas(spectrogramThresholdCanvas);
        clearSVG(spectrogramLoadingSVG);

        drawWaveformPlot(samples, isInitialRender, completionTime);

        updateFileSizePanel();

    });

}

/**
 * Turn off all UI elements so settings can't be changed during processing
 */
function disableUI () {

    updateFilterUI();
    updateThresholdTypeUI();
    updateThresholdUI();

}

/**
 * Temporarily disable UI then calculate spectrogram frames
 * @param {number[]} samples Samples to be processed
 * @param {boolean} isInitialRender Is this the first time the file has been rendered
 */
function processContents (samples, isInitialRender, renderPlots) {

    drawing = true;

    // Wait short period to make sure UI is completely disabled before processing actually begins

    setTimeout(() => {

        console.log('Calculating spectrogram frames');

        // Process spectrogram frames

        const result = calculateSpectrogramFrames(samples, offset, displayLength);
        processedSpectrumFrames = result.frames;

        if (spectrumMin === 0.0 && spectrumMax === 0.0) {

            spectrumMin = result.min;
            spectrumMax = result.max;

            console.log('Resetting colour map. Min: ' + spectrumMin + ' Max: ' + spectrumMax);

        }

        if (renderPlots) {

            drawPlots(samples, isInitialRender);

        }

    }, 0);

}

/**
 * Reset x axis zoom/pan settings
 */
function resetXTransformations () {

    const currentSampleCount = (sampleCount !== 0) ? sampleCount : FILLER_SAMPLE_COUNT;
    displayLength = currentSampleCount;
    offset = 0;
    updateNavigationUI();

}

/**
 * Reset all zoom/pan settings
 */
function resetTransformations () {

    resetXTransformations();
    waveformZoomYIndex = 0;
    goertzelZoomYIndex = 0;

}

/**
 * Shift plot along if zooming out at current location would create a gap at the end of the plot
 */
function removeEndGap () {

    const sampleEnd = Math.floor(offset + displayLength);

    const gapLength = sampleEnd - sampleCount;

    if (gapLength > 0) {

        offset -= gapLength;

    }

}

/**
 * Pan plot to the right
 */
function panRight () {

    if (sampleCount !== 0 && !drawing && !playing) {

        const offsetIncrement = Math.floor(displayLength / 2);

        offset = offset + offsetIncrement;

        removeEndGap();

        setTimeout(() => {

            updatePlots(false, true, false, false, false);

        }, 0);

        updatePanUI();

    }

}

/**
 * Pan plot to the left
 */
function panLeft () {

    if (sampleCount !== 0 && !drawing && !playing) {

        const offsetIncrement = Math.floor(displayLength / 2);

        const newOffset = offset - offsetIncrement;

        offset = Math.max(newOffset, 0);

        setTimeout(() => {

            updatePlots(false, true, false, false, false);

        }, 0);

        updatePanUI();

    }

}

/**
 * Zoom plot in
 */
function zoomIn () {

    if (sampleCount !== 0 && !drawing && !playing) {

        const oldCentre = offset + Math.floor(displayLength / 2);

        const newDisplayLength = Math.floor(displayLength / ZOOM_MULTIPLIER);

        displayLength = (newDisplayLength >= minDisplayLength) ? newDisplayLength : minDisplayLength;

        const newCentre = offset + Math.floor(displayLength / 2);

        const diffSamples = oldCentre - newCentre;

        offset += diffSamples;

        offset = (offset < 0) ? 0 : offset;

        setTimeout(() => {

            updatePlots(false, true, false, false, false);

        }, 10);

        updateNavigationUI();

    }

}

/**
 * Zoom plot out
 */
function zoomOut () {

    if (sampleCount !== 0 && !drawing && !playing) {

        const oldCentre = offset + Math.floor(displayLength / 2);

        const newDisplayLength = displayLength * ZOOM_MULTIPLIER;

        if (newDisplayLength < sampleCount) {

            displayLength = newDisplayLength;

            const newCentre = offset + Math.floor(displayLength / 2);

            const diffSecs = oldCentre - newCentre;

            offset += diffSecs;

            offset = (offset < 0) ? 0 : offset;

            removeEndGap();

            updateNavigationUI();

        } else {

            resetXTransformations();

        }

        setTimeout(() => {

            updatePlots(false, true, false, false, false);

        }, 10);

    }

}

/**
 * Enable/disable waveform navigation buttons if current values are within limits
 */
function updateYZoomUI () {

    if (sampleCount === 0) {

        waveformHomeButton.disabled = true;
        waveformZoomInButton.disabled = true;
        waveformZoomOutButton.disabled = true;
        return;

    }

    const thresholdTypeIndex = getThresholdTypeIndex();

    if (thresholdTypeIndex === THRESHOLD_TYPE_NONE || thresholdTypeIndex === THRESHOLD_TYPE_AMPLITUDE) {

        waveformHomeButton.disabled = (waveformZoomYIndex === 0);
        waveformZoomInButton.disabled = (waveformZoomYIndex >= MAX_ZOOM_Y_INDEX);
        waveformZoomOutButton.disabled = (waveformZoomYIndex === 0);

    } else {

        waveformHomeButton.disabled = (goertzelZoomYIndex === 0);
        waveformZoomInButton.disabled = (goertzelZoomYIndex >= MAX_ZOOM_Y_INDEX);
        waveformZoomOutButton.disabled = (goertzelZoomYIndex === 0);

    }

}

/**
 * Zoom waveform in on y axis
 */
function zoomInWaveformY () {

    if (sampleCount !== 0 && !drawing && !playing) {

        const newZoom = waveformZoomYIndex + 1;

        if (newZoom <= MAX_ZOOM_Y_INDEX) {

            waveformZoomYIndex = newZoom;

            disableUI();

            // Redraw just the waveform plot

            if (!filterCheckbox.checked) {

                drawWaveformPlot(unfilteredSamples, false);

            } else {

                drawWaveformPlot(filteredSamples, false);

            }

            updateYZoomUI();

        }

    }

}

/**
 * Zoom waveform out on y axis
 */
function zoomOutWaveformY () {

    if (sampleCount !== 0 && !drawing && !playing) {

        const newZoom = waveformZoomYIndex - 1;

        if (newZoom >= 0) {

            waveformZoomYIndex = newZoom;

            disableUI();

            // Redraw just the waveform plot

            if (!filterCheckbox.checked) {

                drawWaveformPlot(unfilteredSamples, false);

            } else {

                drawWaveformPlot(filteredSamples, false);

            }

            updateYZoomUI();

        }

    }

}

/**
 * Set y zoom level to default and redraw waveform plot
 */
function resetWaveformZoom () {

    if (sampleCount !== 0 && !drawing && !playing) {

        waveformZoomYIndex = 0;

        disableUI();

        // Redraw just the waveform plot

        if (!filterCheckbox.checked) {

            drawWaveformPlot(unfilteredSamples, false);

        } else {

            drawWaveformPlot(filteredSamples, false);

        }

        updateYZoomUI();

    }

}

/**
 * Zoom Goertzel plot in on y axis
 */
function zoomInGoertzelY () {

    if (sampleCount !== 0 && !drawing && !playing) {

        const newZoom = goertzelZoomYIndex + 1;

        if (newZoom <= MAX_ZOOM_Y_INDEX) {

            goertzelZoomYIndex = newZoom;

            disableUI();

            // Redraw just the goertzel plot

            resetCanvas(goertzelCanvas);
            resetCanvas(goertzelThresholdCanvas);
            resetCanvas(goertzelThresholdLineCanvas);
            clearSVG(goertzelLoadingSVG);

            const windowLength = GOERTZEL_FILTER_WINDOW_LENGTHS[getSelectedRadioValue('goertzel-filter-window-radio')];

            drawGoertzelPlot(goertzelValues, windowLength, offset, displayLength, getGoertzelZoomY(), () => {

                drawAxisLabels();
                drawGoertzelThresholdedPeriods();
                drawGoertzelFilter();
                drawGoertzelThresholdLine();
                reenableUI();

                updateYZoomUI();

            });

        }

    }

}

/**
 * Zoom Goertzel plot out on y axis
 */
function zoomOutGoertzelY () {

    if (sampleCount !== 0 && !drawing && !playing) {

        const newZoom = goertzelZoomYIndex - 1;

        if (newZoom >= 0) {

            goertzelZoomYIndex = newZoom;

            disableUI();

            // Redraw just the goertzel plot

            resetCanvas(goertzelCanvas);
            resetCanvas(goertzelThresholdCanvas);
            resetCanvas(goertzelThresholdLineCanvas);
            clearSVG(goertzelLoadingSVG);

            const windowLength = GOERTZEL_FILTER_WINDOW_LENGTHS[getSelectedRadioValue('goertzel-filter-window-radio')];

            drawGoertzelPlot(goertzelValues, windowLength, offset, displayLength, getGoertzelZoomY(), () => {

                drawAxisLabels();
                drawGoertzelThresholdedPeriods();
                drawGoertzelFilter();
                drawGoertzelThresholdLine();
                reenableUI();

                updateYZoomUI();

            });

        }

    }

}

/**
 * Set y zoom level to default and redraw Goertzel plot plot
 */
function resetGoertzelZoom () {

    if (sampleCount !== 0 && !drawing && !playing) {

        goertzelZoomYIndex = 0;

        disableUI();

        // Redraw just the goertzel plot

        resetCanvas(goertzelCanvas);
        resetCanvas(goertzelThresholdCanvas);
        resetCanvas(goertzelThresholdLineCanvas);
        clearSVG(goertzelLoadingSVG);

        const windowLength = GOERTZEL_FILTER_WINDOW_LENGTHS[getSelectedRadioValue('goertzel-filter-window-radio')];

        drawGoertzelPlot(goertzelValues, windowLength, offset, displayLength, getGoertzelZoomY(), () => {

            drawAxisLabels();
            drawGoertzelThresholdedPeriods();
            drawGoertzelFilter();
            drawGoertzelThresholdLine();
            reenableUI();

            updateYZoomUI();

        });

    }

}

/**
 * Zoom in on the currently shown plot (waveform or Goertzel) in the y axis only
 */
function zoomInY () {

    const thresholdTypeIndex = getThresholdTypeIndex();

    if (thresholdTypeIndex === THRESHOLD_TYPE_GOERTZEL) {

        zoomInGoertzelY();

    } else {

        zoomInWaveformY();

    }

}

/**
 * Zoom in on the currently shown plot (waveform or Goertzel) in the y axis only
 */
function zoomOutY () {

    const thresholdTypeIndex = getThresholdTypeIndex();

    if (thresholdTypeIndex === THRESHOLD_TYPE_GOERTZEL) {

        zoomOutGoertzelY();

    } else {

        zoomOutWaveformY();

    }

}

/**
 * Reset the Y zoom the currently shown plot (waveform or Goertzel)
 */
function resetZoomY () {

    const thresholdTypeIndex = getThresholdTypeIndex();

    if (thresholdTypeIndex === THRESHOLD_TYPE_GOERTZEL) {

        resetGoertzelZoom();

    } else {

        resetWaveformZoom();

    }

}

/**
 * Apply filter and/or amplitude threshold if enabled
 * @param {boolean} reapplyFilter Whether or not to reappply a frequency filter
 * @param {boolean} updateThresholdedSampleArray Whether or not to recalculate the boolean array of thresholded samples
 * @param {boolean} recalculateGoertzelValues Whether or not the Goertzel filter used for frequency thresholding needs to be recalculated
 * @returns Samples to be rendered
 */
function getRenderSamples (reapplyFilter, updateThresholdedSampleArray, recalculateGoertzelValues) {

    const thresholdTypeIndex = getThresholdTypeIndex();

    // Apply low/band/high pass filter

    if (reapplyFilter && filterCheckbox.checked && thresholdTypeIndex !== THRESHOLD_TYPE_GOERTZEL) {

        const filterIndex = getSelectedRadioValue('filter-radio');

        let bandPassFilterValue0, bandPassFilterValue1;

        switch (filterIndex) {

        case LOW_PASS_FILTER:
            console.log('Applying low-pass filter');
            applyLowPassFilter(unfilteredSamples, filteredSamples, getSampleRate(), lowPassFilterSlider.getValue());
            break;
        case HIGH_PASS_FILTER:
            console.log('Applying high-pass filter');
            applyHighPassFilter(unfilteredSamples, filteredSamples, getSampleRate(), highPassFilterSlider.getValue());
            break;
        case BAND_PASS_FILTER:
            console.log('Applying band-pass filter');
            bandPassFilterValue0 = Math.min(...bandPassFilterSlider.getValue());
            bandPassFilterValue1 = Math.max(...bandPassFilterSlider.getValue());
            applyBandPassFilter(unfilteredSamples, filteredSamples, getSampleRate(), bandPassFilterValue0, bandPassFilterValue1);
            break;

        }

    }

    const renderSamples = (filterCheckbox.checked && thresholdTypeIndex !== THRESHOLD_TYPE_GOERTZEL) ? filteredSamples : unfilteredSamples;

    // Apply amplitude threshold

    if (thresholdTypeIndex === THRESHOLD_TYPE_AMPLITUDE && updateThresholdedSampleArray) {

        const threshold = getAmplitudeThreshold().amplitude;
        const minimumTriggerDurationSecs = MINIMUM_TRIGGER_DURATIONS[getSelectedRadioValue('amplitude-threshold-duration-radio')];
        const minimumTriggerDurationSamples = minimumTriggerDurationSecs * getSampleRate();

        console.log('Applying amplitude threshold');
        console.log('Threshold:', threshold);
        console.log('Minimum trigger duration: %i (%i samples)', minimumTriggerDurationSecs, minimumTriggerDurationSamples);

        thresholdedValueCount = applyAmplitudeThreshold(renderSamples, threshold, minimumTriggerDurationSamples, samplesAboveThreshold);

    }

    if (thresholdTypeIndex === THRESHOLD_TYPE_GOERTZEL && updateThresholdedSampleArray) {

        const minimumTriggerDurationSecs = MINIMUM_TRIGGER_DURATIONS[getSelectedRadioValue('goertzel-duration-radio')];
        const minimumTriggerDurationSamples = minimumTriggerDurationSecs * getSampleRate();

        const windowLength = GOERTZEL_FILTER_WINDOW_LENGTHS[getSelectedRadioValue('goertzel-filter-window-radio')];

        if (recalculateGoertzelValues || goertzelValues.length === 0) {

            const freq = goertzelFilterSlider.getValue();

            // Create array which will contain all the Goertzel values

            goertzelValues = new Array(Math.floor(sampleCount / windowLength));

            // Apply filter to samples

            applyGoertzelFilter(renderSamples, sampleRate, freq, windowLength, goertzelValues);

        }

        // Divide slider value by maximum possible Goertzel response

        const threshold = getGoertzelThreshold();

        thresholdedValueCount = applyGoertzelThreshold(goertzelValues, threshold, windowLength, minimumTriggerDurationSamples, samplesAboveGoertzelThreshold);

    }

    return renderSamples;

}

/**
 * Apply filter and amplitude threshold if appropriate then redraw plots
 * @param {boolean} resetColourMap Whether or not to reset the stored max and min values used to calculate the colour map
 * @param {boolean} updateSpectrogram Whether or not to recalculate the spectrogram frames. Needs to be done when the contents of the samples or navigation changes
 * @param {boolean} updateThresholdedSampleArray Whether or not to recalculate the boolean array of thresholded samples.
 * @param {boolean} reapplyFilter Whether or not to reappply a frequency filter
 * @param {boolean} recalculateGoertzelValues Whether or not the Goertzel filter used for frequency thresholding needs to be recalculated
 */
async function updatePlots (resetColourMap, updateSpectrogram, updateThresholdedSampleArray, reapplyFilter, recalculateGoertzelValues) {

    if (drawing || sampleCount === 0) {

        return;

    }

    disableUI();

    const approximateRenderTime = estimateRenderTime();

    if (approximateRenderTime > DISABLE_BUTTON_BUSY_LENGTH) {

        fileButton.disabled = true;

        homeButton.disabled = true;
        zoomInButton.disabled = true;
        zoomOutButton.disabled = true;
        panLeftButton.disabled = true;
        panRightButton.disabled = true;

        waveformHomeButton.disabled = true;
        waveformZoomInButton.disabled = true;
        waveformZoomOutButton.disabled = true;

        resetButton.disabled = true;
        exportButton.disabled = true;

    }

    if (resetColourMap) {

        spectrumMin = 0.0;
        spectrumMax = 0.0;

    }

    const thresholdTypeIndex = getThresholdTypeIndex();

    if (!filterCheckbox.checked && thresholdTypeIndex === THRESHOLD_TYPE_NONE) {

        processContents(unfilteredSamples, false, true);

        return;

    }

    const renderSamples = getRenderSamples(reapplyFilter, updateThresholdedSampleArray, recalculateGoertzelValues);

    if (updateSpectrogram) {

        processContents(renderSamples, false, true);

    } else {

        drawPlots(renderSamples, false);

    }

}

/**
 * Process the result of loading a file
 * @param {object} result wavReader.js result object
 * @param {function} callback Function called after completion
 */
function processReadResult (result, callback) {

    if (!result.success) {

        console.error('Failed to read file');

        errorDisplay.style.display = '';
        errorText.innerHTML = result.error;

        if (result.error === 'Could not read input file.' || result.error === 'File is too large. Use the Split function in the AudioMoth Configuration App to split your recording into 60 second sections.') {

            errorText.innerHTML += '<br>';
            errorText.innerHTML += 'For more information, <u><a href="#faqs" style="color: white;">click here</a></u>.';

        }

        setTimeout(() => {

            if (errorDisplay.style.display === '') {

                errorDisplay.style.display = 'none';

            }

        }, ERROR_DISPLAY_TIME);

        return;

    }

    errorDisplay.style.display = 'none';

    sampleRate = result.header.wavFormat.samplesPerSecond;
    sampleCount = result.samples.length;

    const lengthSecs = sampleCount / sampleRate;

    console.log('Loaded ' + sampleCount + ' samples at a sample rate of ' + sampleRate + ' Hz (' + lengthSecs + ' seconds)');

    callback(result);

}

/**
 * Read the contents of the file given by the current filehandler
 * @returns Samples read from file
 */
async function readFromFile (exampleFilePath, callback) {

    console.log('Reading samples');

    let result;

    if (exampleFilePath) {

        if (exampleResultObjects[exampleFilePath] === undefined) {

            const req = new XMLHttpRequest();

            req.open('GET', exampleFilePath, true);
            req.responseType = 'arraybuffer';

            req.onload = () => {

                const arrayBuffer = req.response; // Note: not oReq.responseText
                result = readWavContents(arrayBuffer);

                processReadResult(result, callback);

            };

            req.send(null);

        } else {

            result = exampleResultObjects[exampleFilePath];

            processReadResult(result, callback);

        }

    } else {

        if (!fileHandler) {

            console.error('No filehandler!');
            return [];

        }

        result = await readWav(fileHandler);

        processReadResult(result, callback);

    }

}

/**
 * Update what the maximum value for the zoom can be, based on the number of samples loaded
 */
function updateMaxZoom () {

    minDisplayLength = MIN_TIME_VIEW * getSampleRate();

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

    const totalSeconds = unfilteredSamples.length / getSampleRate();
    const totalFileSize = getSampleRate() * 2 * totalSeconds;

    const thresholdTypeIndex = getThresholdTypeIndex();

    if (thresholdTypeIndex !== THRESHOLD_TYPE_NONE) {

        const thresholdedSeconds = thresholdedValueCount / getSampleRate();

        const thresholdedFileSize = getSampleRate() * 2 * (totalSeconds - thresholdedSeconds);

        const compressionRatio = (thresholdedFileSize > 0) ? totalFileSize / thresholdedFileSize : 0;

        sizeInformationPanel.innerHTML = 'Original WAV file size: ' + formatFileSize(totalFileSize) + '. Resulting T.WAV file size: ' + formatFileSize(thresholdedFileSize) + '.<br>';

        sizeInformationPanel.innerHTML += 'Current threshold settings give a file compression ratio of ' + compressionRatio.toFixed(1) + '.';

    } else {

        sizeInformationPanel.innerHTML = 'File size: ' + formatFileSize(totalFileSize) + '.<br>';
        sizeInformationPanel.innerHTML += 'Enable thresholding to estimate file size reduction.';

    }

}

/**
 * Load a file either from a user-selected location or a hosted example file
 * @param {string} exampleFilePath Path of an example recording if file isn't chosen by user
 * @param {string} exampleName Name of example file if file isn't chosen by user
 */
async function loadFile (exampleFilePath, exampleName) {

    let fileName;

    if (exampleFilePath) {

        console.log('Loading example file');

        fileName = exampleName;

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

            fileSpan.innerText = 'No WAV files selected.';
            return;

        }

        fileHandler = fileHandler[0];

        fileName = fileHandler.name;

    }

    const prevSampleRate = sampleRate;

    // Read samples

    await readFromFile(exampleFilePath, (result) => {

        const samples = result.samples;

        // If no samples can be read, return

        if (!samples) {

            return;

        }

        filteredSamples = new Array(sampleCount);

        // If file has been trimmed, display warning

        trimmedSpan.style.display = result.trimmed ? '' : 'none';

        // Reset threshold arrays

        samplesAboveThreshold = new Array(Math.ceil(samples.length / AMPLITUDE_THRESHOLD_BUFFER_LENGTH));
        samplesAboveGoertzelThreshold = new Array(samplesAboveThreshold.length);

        goertzelValues = [];

        // Reset UI

        resetTransformations();

        resetCanvas(waveformThresholdLineCanvas);

        drawLoadingImages();

        unfilteredSamples = samples;

        // Update file name display

        fileSpan.innerText = fileName;

        // Work out what the maximum zoom level should be

        updateMaxZoom();

        // Reset values used to calculate colour map

        spectrumMin = 0.0;
        spectrumMax = 0.0;

        // Update filter range

        sampleRateChange(prevSampleRate === undefined || !filterChanged);

        if (sampleRate !== prevSampleRate && prevSampleRate !== undefined && filterChanged) {

            // Handle band/low/high-pass filter sliders

            const maxFreq = getSampleRate() / 2;
            const filterSliderStep = FILTER_SLIDER_STEPS[getSampleRate()];

            const currentBandPassLower = Math.min(...bandPassFilterSlider.getValue());
            const currentBandPassHigher = Math.max(...bandPassFilterSlider.getValue());
            const currentLowPassFreq = lowPassFilterSlider.getValue();
            const currentHighPassFreq = highPassFilterSlider.getValue();

            const newBandPassLower = currentBandPassLower > maxFreq ? 0 : currentBandPassLower;
            const newBandPassHigher = currentBandPassHigher > maxFreq ? maxFreq : currentBandPassHigher;
            setBandPass(roundToSliderStep(newBandPassLower, filterSliderStep), roundToSliderStep(newBandPassHigher, filterSliderStep));

            const newLowPassFreq = currentLowPassFreq > maxFreq ? maxFreq : currentLowPassFreq;
            setLowPassSliderValue(roundToSliderStep(newLowPassFreq, filterSliderStep));

            const newHighPassFreq = currentHighPassFreq > maxFreq ? maxFreq : currentHighPassFreq;
            setHighPassSliderValue(roundToSliderStep(newHighPassFreq, filterSliderStep));

            updateFilterUI();

            updateFilterLabel();

            // Handle Goertzel filter slider

            const currentGoertzelFilterValue = goertzelFilterSlider.getValue();

            const newGoertzelFilterValue = currentGoertzelFilterValue > maxFreq ? maxFreq : currentGoertzelFilterValue;
            goertzelFilterSlider.setValue(newGoertzelFilterValue);

            updateThresholdUI();

        }

        // Enable "Are you sure you wish to navigate away from the page?" alert

        window.onbeforeunload = () => {

            return true;

        };

        // Create audio context to allow for playback

        createAudioContext();

        // Generate spectrogram frames and draw plots

        const thresholdTypeIndex = getThresholdTypeIndex();

        if (!filterCheckbox.checked && thresholdTypeIndex === THRESHOLD_TYPE_NONE) {

            processContents(unfilteredSamples, true, true);

        } else {

            // Calculate spectrogram frames of unfiltered samples to create initial colour map

            processContents(unfilteredSamples, true, false);

            // Get filtered/thresholded samples

            const renderSamples = getRenderSamples(true, true);

            // Plot samples

            processContents(renderSamples, false, true);

        }

    });

}

/**
 * Load samples from all example files then render the first file
 * @param {boolean} devMode If testing locally, don't load example files as it will fail
 */
async function loadExampleFiles (devMode) {

    if (devMode) {

        disabledFileButton.style.display = 'none';
        fileButton.style.display = '';

        return;

    }

    console.log('Loading example files');

    fileSpan.innerText = 'Loading example file...';

    drawing = true;

    for (let i = 0; i < exampleNames.length; i++) {

        await readFromFile(examplePaths[i], (result) => {

            console.log('Loaded', exampleNames[i]);

            exampleResultObjects[examplePaths[i]] = result;

            if (i === exampleNames.length - 1) {

                loadFile(examplePaths[0], exampleNames[0]);

            }

        });

    }

}

// Handle a new file being selected

fileButton.addEventListener('click', () => {

    if (!drawing && !playing) {

        loadFile();

    }

});

// Handle example files being selected

for (let i = 0; i < examplePaths.length; i++) {

    exampleLinks[i].addEventListener('click', () => {

        if (!drawing && !playing) {

            loadFile(examplePaths[i], exampleNames[i]);

        }

    });

}

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
goertzelDragCanvas.addEventListener('mousedown', handleMouseDown);

/**
 * Draw the alpha-ed overlay rectangle to the given canvas
 * @param {object} canvas Canvas being drawn to
 * @param {number} dragCurrentX The end of the drag area
 */
function drawZoomOverlay (canvas, dragCurrentX) {

    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Lock drag area to plot

    let dragBoxEnd = Math.min(dragCurrentX, canvas.width);
    dragBoxEnd = Math.max(dragBoxEnd, 0);

    // Draw a light grey box with a black outline

    ctx.fillStyle = 'lightgrey';
    ctx.globalAlpha = 0.5;
    ctx.fillRect(dragStartX, 0, dragBoxEnd - dragStartX, canvas.height);

    ctx.fillStyle = 'black';
    ctx.strokeRect(dragStartX, 0, dragBoxEnd - dragStartX, canvas.height);

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
        drawZoomOverlay(goertzelDragCanvas, dragCurrentX);

    }

}

/**
 * End dragging action
 * @param {number} dragEndX Location where mouse was lifted
 */
function dragZoom (dragEndX) {

    // If dragging has started, samples are available and a plot is not currently being drawn

    if (isDragging && sampleCount !== 0 && !drawing && !playing) {

        isDragging = false;

        if (dragEndX === dragStartX) {

            return;

        }

        // Clear zoom overlay canvases

        const specCtx = spectrogramDragCanvas.getContext('2d');
        specCtx.clearRect(0, 0, spectrogramDragCanvas.width, spectrogramDragCanvas.height);
        const wavCtx = waveformDragCanvas.getContext('2d');
        wavCtx.clearRect(0, 0, waveformDragCanvas.width, waveformDragCanvas.height);
        const goertzelCtx = goertzelDragCanvas.getContext('2d');
        goertzelCtx.clearRect(0, 0, goertzelDragCanvas.width, goertzelDragCanvas.height);

        // Calculate new zoom value

        let newDisplayLength = Math.floor(displayLength * (Math.abs(dragStartX - dragEndX) / spectrogramDragCanvas.width));

        const dragLeft = Math.min(dragStartX, dragEndX);
        const dragRight = Math.max(dragStartX, dragEndX);

        let newOffset;

        if (newDisplayLength >= minDisplayLength) {

            console.log('Zooming to display selected area');

            // Calculate new offset value

            newOffset = offset + Math.round(displayLength * dragLeft / spectrogramDragCanvas.width);

        } else {

            console.log('Zoomed max amount, moving offset to centre of dragged area');

            // Zoom to max zoom level and centre plot on selected centre

            newDisplayLength = minDisplayLength;

            const dragDiff = dragRight - dragLeft;
            const dragCentre = dragLeft + (dragDiff / 2);
            const dragCentreSamples = Math.round(displayLength * dragCentre / spectrogramDragCanvas.width);

            newOffset = offset + dragCentreSamples - (newDisplayLength / 2);

        }

        newOffset = (newOffset < 0) ? 0 : newOffset;

        // Set new zoom/offset values

        displayLength = newDisplayLength;
        offset = newOffset;

        removeEndGap();

        // Redraw plots

        setTimeout(() => {

            updatePlots(false, true, false, false, false);

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

    dragZoom(dragEndX);

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
 * Handle canvas being double clicked on by zooming in, centred on the click location
 * @param {event} e Double click event
 */
function handleDoubleClick (e) {

    // If it's not a left click, ignore it

    if (e.button !== 0) {

        return;

    }

    // Clear zoom overlay canvases

    const specCtx = spectrogramDragCanvas.getContext('2d');
    specCtx.clearRect(0, 0, spectrogramDragCanvas.width, spectrogramDragCanvas.height);
    const wavCtx = waveformDragCanvas.getContext('2d');
    wavCtx.clearRect(0, 0, waveformDragCanvas.width, waveformDragCanvas.height);
    const goertzelCtx = goertzelDragCanvas.getContext('2d');
    goertzelCtx.clearRect(0, 0, goertzelDragCanvas.width, goertzelDragCanvas.height);

    // If samples have been loaded and drawing a plot isn't currently underway

    if (sampleCount !== 0 && !drawing && !playing) {

        const canvas = e.target;
        const rect = canvas.getBoundingClientRect();

        const clickX = e.clientX - rect.left;

        const clickCentreSamples = Math.round(displayLength * clickX / spectrogramDragCanvas.width);

        const newDisplayLength = Math.floor(displayLength / ZOOM_MULTIPLIER);

        // If zoom is at max, just move offset to clicked location

        if (newDisplayLength >= minDisplayLength) {

            displayLength = newDisplayLength;

        } else {

            displayLength = minDisplayLength;

        }

        let newOffset = offset + clickCentreSamples;

        newOffset -= Math.round(displayLength / 2);

        newOffset = (newOffset < 0) ? 0 : newOffset;

        offset = newOffset;

        removeEndGap();

        // Redraw plots

        setTimeout(() => {

            updatePlots(false, true, false, false, false);

        }, 10);

        updateNavigationUI();

    }

}

spectrogramDragCanvas.addEventListener('dblclick', handleDoubleClick);
waveformDragCanvas.addEventListener('dblclick', handleDoubleClick);
goertzelDragCanvas.addEventListener('dblclick', handleDoubleClick);

// Add listeners which react to the low/band/high pass filter lengths being changed

for (let i = 0; i < filterRadioButtons.length; i++) {

    filterRadioButtons[i].addEventListener('change', function () {

        updateFilterUI();
        updateFilterSliders();
        updateFilterLabel();

    });

}

// Add amplitude threshold scale listener

amplitudeThresholdScaleSelect.addEventListener('change', function () {

    prevAmplitudeThresholdScaleIndex = amplitudeThresholdScaleIndex;

    amplitudeThresholdScaleIndex = parseInt(amplitudeThresholdScaleSelect.value);

    // If mode is changed to or from decibel, the scale of the waveform plot has changed slightly, so redraw

    if (amplitudeThresholdScaleIndex === AMPLITUDE_THRESHOLD_SCALE_DECIBEL || prevAmplitudeThresholdScaleIndex === AMPLITUDE_THRESHOLD_SCALE_DECIBEL) {

        if (!filterCheckbox.checked) {

            drawWaveformPlot(unfilteredSamples, false);

        } else {

            drawWaveformPlot(filteredSamples, false);

        }

    }

    updateAmplitudethresholdScale();

    drawAxisLabels();

    const thresholdTypeIndex = getThresholdTypeIndex();

    if (thresholdTypeIndex === THRESHOLD_TYPE_AMPLITUDE) {

        handleAmplitudeThresholdChange();

        drawAmplitudeThresholdLines();

    }

});

// Add listener which updates the threshold information label when slider values are changed

amplitudeThresholdSlider.on('change', updateThresholdLabel);
goertzelFilterSlider.on('change', updateThresholdLabel);
goertzelThresholdSlider.on('change', updateThresholdLabel);

// Add listener which updates the position of the Goertzel filter line on the spectrogram plot

goertzelFilterSlider.on('change', drawGoertzelFilter);

// Add listener which updates the position of the lines on the waveform/frequency plot as the threshold sliders moves

amplitudeThresholdSlider.on('change', drawAmplitudeThresholdLines);
goertzelThresholdSlider.on('change', drawGoertzelThresholdLine);

/**
 * Run updatePlots function without refreshing the colour map, recalculating the spectrogram frames
 */
function handleFilterChange () {

    updatePlots(false, true, true, true, false);

}

// Add update plot listeners, applying low/band/high pass filter and amplitude threshold if selected

filterCheckbox.addEventListener('change', (e) => {

    if (sampleCount === 0 || drawing || playing) {

        e.preventDefault();
        e.stopPropagation();

        return;

    }

    filterChanged = true;

    updateFilterUI();
    updateFilterSliders();
    updateFilterLabel();

    handleFilterChange();

});

filterRadioButtons[0].addEventListener('change', handleFilterChange);
filterRadioButtons[1].addEventListener('change', handleFilterChange);
filterRadioButtons[2].addEventListener('change', handleFilterChange);
bandPassFilterSlider.on('slideStop', handleFilterChange);
lowPassFilterSlider.on('slideStop', handleFilterChange);
highPassFilterSlider.on('slideStop', handleFilterChange);

/**
 * Handle event when a different threshold type is selected
 * @param {event} e Threshold type change event
 */
function handleThresholdTypeChange (e) {

    if (sampleCount === 0 || drawing || playing) {

        e.preventDefault();
        e.stopPropagation();

        return;

    }

    const thresholdTypeIndex = getThresholdTypeIndex();

    if (thresholdTypeIndex === THRESHOLD_TYPE_GOERTZEL) {

        amplitudeThresholdScaleSelect.value = AMPLITUDE_THRESHOLD_SCALE_PERCENTAGE;
        amplitudeThresholdScaleSelect.disabled = true;

    } else {

        amplitudeThresholdScaleSelect.value = amplitudeThresholdScaleIndex;
        amplitudeThresholdScaleSelect.disabled = false;

    }

    updatePlots(false, true, true, false, false);

    if (thresholdTypeIndex === THRESHOLD_TYPE_NONE) {

        playbackModeSelect.value = 0;

    }

    setTimeout(() => {

        updateThresholdTypeUI();
        updateThresholdUI();

    }, 10);

}

for (let i = 0; i < thresholdTypeRadioButtons.length; i++) {

    thresholdTypeRadioButtons[i].addEventListener('change', handleThresholdTypeChange);

}

/**
 * Run updatePlots function without refreshing the colour map, recalculating the spectrogram frames
 */
function handleAmplitudeThresholdChange () {

    updatePlots(false, false, true, false, false);

}

amplitudeThresholdSlider.on('slideStop', handleAmplitudeThresholdChange);

for (let i = 0; i < amplitudeThresholdRadioButtons.length; i++) {

    amplitudeThresholdRadioButtons[i].addEventListener('change', handleAmplitudeThresholdChange);

}

/**
 * Handle event when the Goertzel filter changes
 * @param {event} e Value change event
 */
function handleGoertzelFilterChange (e) {

    if (sampleCount === 0 || drawing || playing) {

        e.preventDefault();
        e.stopPropagation();

        return;

    }

    updateThresholdUI();
    updatePlots(false, false, true, false, true);

}

goertzelFilterSlider.on('slideStop', handleGoertzelFilterChange);

for (let i = 0; i < goertzelFilterWindowRadioButtons.length; i++) {

    goertzelFilterWindowRadioButtons[i].addEventListener('change', (e) => {

        const windowLength = GOERTZEL_FILTER_WINDOW_LENGTHS[getSelectedRadioValue('goertzel-filter-window-radio')];
        generateHammingValues(windowLength);

        handleGoertzelFilterChange(e);

    });

}

/**
 * Handle event when the Goertzel filter threshold changes without the filter itself changing
 * @param {event} e Value change event
 */
function handleGoertzelThresholdChange (e) {

    if (sampleCount === 0 || drawing || playing) {

        e.preventDefault();
        e.stopPropagation();

        return;

    }

    updateThresholdUI();
    updatePlots(false, false, true, false, false);

}

for (let i = 0; i < goertzelDurationRadioButtons.length; i++) {

    goertzelDurationRadioButtons[i].addEventListener('change', handleGoertzelThresholdChange);

}

goertzelThresholdSlider.on('slideStop', handleGoertzelThresholdChange);

/**
 * Reset button event
 */
function reset () {

    if (sampleCount !== 0 && !drawing && !playing) {

        filterRadioButtons[1].checked = true;
        amplitudeThresholdRadioButtons[0].checked = true;

        amplitudeThresholdSlider.setValue(0);

        goertzelThresholdSlider.setValue(0);

        goertzelFilterWindowRadioButtons[2].checked = true;
        goertzelDurationRadioButtons[0].checked = true;

        sampleRateChange(true);

        previousSelectionType = 1;

        filterCheckbox.checked = false;
        thresholdTypeRadioButtons[0].checked = true;
        updateFilterUI();
        updateThresholdTypeUI();
        updateThresholdUI();

        playbackModeSelect.value = 0;

        updatePlots(false, true, true, false, false);

    }

}

resetButton.addEventListener('click', reset);

// Add filter slider listeners which update the information label

bandPassFilterSlider.on('change', updateFilterLabel);
lowPassFilterSlider.on('change', updateFilterLabel);
highPassFilterSlider.on('change', updateFilterLabel);

// Add home, zoom and pan control to buttons

function resetNavigation () {

    if (sampleCount !== 0 && !drawing && !playing) {

        resetXTransformations();
        updatePlots(false, true, false, false, false);

    }

}

homeButton.addEventListener('click', resetNavigation);

zoomInButton.addEventListener('click', zoomIn);
zoomOutButton.addEventListener('click', zoomOut);

panLeftButton.addEventListener('click', panLeft);
panRightButton.addEventListener('click', panRight);

// Add navigation control for waveform y axis

waveformHomeButton.addEventListener('click', resetZoomY);

waveformZoomInButton.addEventListener('click', zoomInY);
waveformZoomOutButton.addEventListener('click', zoomOutY);

/**
 * Export configuration to file which can be read by the AudioMoth Configuration App
 */
function exportConfig () {

    if (sampleCount === 0 || drawing || playing) {

        return;

    }

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

    const amplitudeThresholdValues = convertThreshold(amplitudeThresholdSlider.getValue());

    let amplitudeThreshold = 0;

    switch (amplitudeThresholdScaleIndex) {

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

    const frequencyThreshold = convertThreshold(goertzelThresholdSlider.getValue());

    const thresholdTypeIndex = getThresholdTypeIndex();

    const settings = {
        version: 'playground',
        sampleRate: getSampleRate(),
        passFiltersEnabled: filterCheckbox.checked,
        filterType: filterTypes[filterIndex],
        lowerFilter: filterValue0,
        higherFilter: filterValue1,
        amplitudeThresholdingEnabled: thresholdTypeIndex === THRESHOLD_TYPE_AMPLITUDE,
        amplitudeThreshold: amplitudeThreshold,
        minimumAmplitudeThresholdDuration: minimumTriggerDuration,
        amplitudeThresholdingScale: amplitudeThresholdScales[amplitudeThresholdScaleIndex],
        frequencyThresholdEnabled: thresholdTypeIndex === THRESHOLD_TYPE_GOERTZEL,
        frequencyThresholdFilterFreq: goertzelFilterSlider.getValue(),
        frequencyThresholdExponent: frequencyThreshold.percentageExponent,
        frequencyThresholdMantissa: frequencyThreshold.percentageMantissa
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

}

exportButton.addEventListener('click', exportConfig);

/**
 * Get playback rate value from slider
 * @returns Rate to play audio at
 */
function getPlaybackRate () {

    return playbackRates[playbackSpeedSlider.getValue()];

}

/**
 * PLAYBACK_MODE_ALL (0) - Play all samples
 * PLAYBACK_MODE_MUTE (1) - Mute samples below the chosen amplitude threshold
 * PLAYBACK_MODE_SKIP (2) - Skip samples below the amplitude threshold
 * @returns Playback mode selected
 */
function getPlaybackMode () {

    let playbackMode = parseInt(playbackModeSelect.value);

    // If amplitude threshold isn't on, all modes are equivalent to playing all samples

    const thresholdTypeIndex = getThresholdTypeIndex();

    playbackMode = (thresholdTypeIndex !== THRESHOLD_TYPE_NONE) ? playbackMode : PLAYBACK_MODE_ALL;

    return playbackMode;

}

/**
 * Draw a line which shows how far through a recording the playback is
 */
function playAnimation () {

    const waveformCtx = waveformPlaybackCanvas.getContext('2d');
    const waveformW = waveformPlaybackCanvas.width;
    const waveformH = waveformPlaybackCanvas.height;

    const spectrogramCtx = spectrogramPlaybackCanvas.getContext('2d');
    const spectrogramH = spectrogramPlaybackCanvas.height;

    const goertzelCtx = goertzelPlaybackCanvas.getContext('2d');
    const goertzelH = goertzelPlaybackCanvas.height;

    // Get current playback information

    const playbackRate = getPlaybackRate();

    const displayedTime = displayLength / getSampleRate();
    const progress = getTimestamp() / displayedTime * playbackRate;

    const playbackMode = getPlaybackMode();

    // Calculate x co-ordinate of playback marker

    let x = 0;

    if (playbackMode === PLAYBACK_MODE_SKIP) {

        // If playback mode skips thresholded periods, used previously calculated X axis values

        let index = Math.round(getTimestamp() * getSampleRate() * playbackRate);
        index = Math.min(index, skippingXCoords.length - 1);

        x = skippingXCoords[index];

    } else {

        x = progress * waveformW;

    }

    // Draw on waveform canvas

    resetCanvas(waveformPlaybackCanvas);

    waveformCtx.strokeStyle = 'red';
    waveformCtx.lineWidth = 1;

    waveformCtx.moveTo(x, 0);
    waveformCtx.lineTo(x, waveformH);
    waveformCtx.stroke();

    // Draw on spectrogram canvas

    resetCanvas(spectrogramPlaybackCanvas);

    spectrogramCtx.strokeStyle = 'red';
    spectrogramCtx.lineWidth = 1;

    spectrogramCtx.moveTo(x, 0);
    spectrogramCtx.lineTo(x, spectrogramH);
    spectrogramCtx.stroke();

    // Draw on Goertzel canvas

    resetCanvas(goertzelPlaybackCanvas);

    goertzelCtx.strokeStyle = 'red';
    goertzelCtx.lineWidth = 1;

    goertzelCtx.moveTo(x, 0);
    goertzelCtx.lineTo(x, goertzelH);
    goertzelCtx.stroke();

    // Set timer for next update

    animationTimer = setTimeout(playAnimation, 1);

}

/**
 * Event called when playback is either manually stopped or finishes
 */
function stopEvent () {

    // Update playing status

    playing = false;

    // Reenable UI

    fileButton.disabled = false;

    for (let i = 0; i < exampleLinks.length; i++) {

        exampleLinks[i].disabled = false;

    }

    fileButton.disabled = false;

    resetButton.disabled = false;
    exportButton.disabled = false;

    filterCheckbox.disabled = false;
    filterCheckboxLabel.style.color = '';
    updateFilterUI();

    thresholdTypeLabel.style.color = '';
    for (let i = 0; i < thresholdTypeRadioButtons.length; i++) {

        thresholdTypeRadioButtons[i].disabled = false;

    }

    updateThresholdTypeUI();
    updateThresholdUI();

    enableSlider(playbackSpeedSlider, playbackSpeedDiv);
    playbackModeSelect.disabled = false;

    updateYZoomUI();
    updateNavigationUI();

    // Switch from stop icon to play icon

    playIcon.style.display = '';
    stopIcon.style.display = 'none';

    // Switch colour of button

    playButton.classList.remove('btn-danger');
    playButton.classList.add('btn-success');

    // Stop animation loop

    clearTimeout(animationTimer);

    // Get final position of playback line

    const waveformCtx = waveformPlaybackCanvas.getContext('2d');
    const waveformH = waveformPlaybackCanvas.height;

    const spectrogramCtx = spectrogramPlaybackCanvas.getContext('2d');
    const spectrogramW = spectrogramPlaybackCanvas.width;
    const spectrogramH = spectrogramPlaybackCanvas.height;

    const playbackMode = getPlaybackMode();

    let x = spectrogramW;

    if (playbackMode === PLAYBACK_MODE_SKIP) {

        x = skippingXCoords[skippingXCoords.length - 1];

    }

    resetCanvas(waveformPlaybackCanvas);

    resetCanvas(spectrogramPlaybackCanvas);
    resetCanvas(goertzelPlaybackCanvas);

    if (!manuallyStopped) {

        // Draw line briefly on waveform canvas

        waveformCtx.strokeStyle = 'red';
        waveformCtx.lineWidth = 1;

        waveformCtx.moveTo(x, 0);
        waveformCtx.lineTo(x, waveformH);
        waveformCtx.stroke();

        // Draw line briefly on spectrogram canvas

        spectrogramCtx.strokeStyle = 'red';
        spectrogramCtx.lineWidth = 1;

        spectrogramCtx.moveTo(x, 0);
        spectrogramCtx.lineTo(x, spectrogramH);
        spectrogramCtx.stroke();

        setTimeout(() => {

            resetCanvas(waveformPlaybackCanvas);

            resetCanvas(spectrogramPlaybackCanvas);
            resetCanvas(goertzelPlaybackCanvas);

        }, 100);

    }

    manuallyStopped = false;

}

// Play audio button

playButton.addEventListener('click', () => {

    if (sampleCount === 0 || drawing) {

        return;

    }

    if (playing) {

        manuallyStopped = true;

        // If already playing, stop

        stopAudio();

    } else {

        // Update playing status

        playing = true;

        const playbackRate = getPlaybackRate();

        // If the recording will be playing for more than DISABLE_BUTTON_BUSY_LENGTH, disable the buttons so it's clear they don't work

        if (displayLength / getSampleRate() / playbackRate > DISABLE_BUTTON_BUSY_LENGTH) {

            fileButton.disabled = true;

            homeButton.disabled = true;
            zoomInButton.disabled = true;
            zoomOutButton.disabled = true;
            panLeftButton.disabled = true;
            panRightButton.disabled = true;

            waveformHomeButton.disabled = true;
            waveformZoomInButton.disabled = true;
            waveformZoomOutButton.disabled = true;

            filterCheckbox.disabled = true;

            for (let i = 0; i < thresholdTypeRadioButtons.length; i++) {

                thresholdTypeRadioButtons[i].disabled = true;

            }

            resetButton.disabled = true;
            exportButton.disabled = true;

            disableSlider(playbackSpeedSlider, playbackSpeedDiv);
            playbackModeSelect.disabled = true;

        }

        // Otherwise, disable UI then play

        disableUI();
        playButton.disabled = false;

        // Switch from play icon to stop icon

        playIcon.style.display = 'none';
        stopIcon.style.display = '';

        // Switch play button colour

        playButton.classList.remove('btn-success');
        playButton.classList.add('btn-danger');

        // Get mode which dictates how amplitude thresholded periods are handled

        const playbackMode = getPlaybackMode();

        // Get currently displayed samples to play

        const samples = (filterCheckbox.checked && playbackMode !== PLAYBACK_MODE_ALL) ? filteredSamples : unfilteredSamples;

        let playbackBufferLength = displayLength;

        const thresholdTypeIndex = getThresholdTypeIndex();

        // If playback mode is to skip thresholded periods, build an array of X axis locations which map to playback progress

        if (playbackMode === PLAYBACK_MODE_SKIP) {

            // Create x coordinate map

            skippingXCoords = new Array(displayLength).fill(0);

            const waveformW = waveformPlaybackCanvas.width;

            let n = 0;

            const displayedTime = displayLength / getSampleRate();

            // Create mapping from sample index to x coordinate

            const start = Math.floor(offset / AMPLITUDE_THRESHOLD_BUFFER_LENGTH);
            const end = Math.floor((offset + displayLength - 1) / AMPLITUDE_THRESHOLD_BUFFER_LENGTH);

            for (let i = start; i <= end; i++) {

                const sampleIndex = i * AMPLITUDE_THRESHOLD_BUFFER_LENGTH;

                const sampleAboveThreshold = (thresholdTypeIndex === THRESHOLD_TYPE_GOERTZEL) ? samplesAboveGoertzelThreshold[i] : samplesAboveThreshold[i];

                if (sampleAboveThreshold) {

                    // Add an x coordinate for each sample within the period above the threshold

                    for (let j = 0; j < AMPLITUDE_THRESHOLD_BUFFER_LENGTH; j++) {

                        const periodSample = sampleIndex + j - offset;

                        if (periodSample >= 0 && periodSample < displayLength) {

                            let xCoord = periodSample / getSampleRate() / displayedTime;
                            xCoord *= waveformW;

                            skippingXCoords[n] = xCoord;
                            n++;

                        }

                    }

                }

            }

            // Reduce length to just unthresholded samples on screen

            skippingXCoords.length = n;
            playbackBufferLength = n;

        }

        // Play the samples

        if (playbackBufferLength > 0) {

            if (thresholdTypeIndex === THRESHOLD_TYPE_GOERTZEL) {

                playAudio(samples, samplesAboveGoertzelThreshold, offset, displayLength, getSampleRate(), playbackRate, playbackMode, playbackBufferLength, stopEvent);

            } else {

                playAudio(samples, samplesAboveThreshold, offset, displayLength, getSampleRate(), playbackRate, playbackMode, playbackBufferLength, stopEvent);

            }

            // Start animation loop

            playAnimation();

        } else {

            stopEvent();

        }

    }

});

// Hide error box on click

errorDisplay.addEventListener('click', () => {

    errorDisplay.style.display = 'none';

});

// Start zoom and offset level on default values

resetTransformations();

// Add filler axis labels

drawAxisLabels();
drawAxisHeadings();

// Prepare threshold UI

updateThresholdTypeUI();
updateThresholdUI();

// Prepare filter UI

filterCheckbox.checked = false;
updateFilterUI();
updateFilterLabel();

// Disable playback controls until file is loaded

disableSlider(playbackSpeedSlider, playbackSpeedDiv);
playbackModeSelect.disabled = true;

// Display error if current browser is not Chrome

const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);

if (!isChrome) {

    fileSelectionTitleDiv.style.color = '#D3D3D3';
    browserErrorDisplay.style.display = '';
    disabledFileButton.style.display = '';
    fileButton.style.display = 'none';

    setTimeout(() => {

        browserErrorDisplay.style.display = 'none';

    }, 16000);

}

// This should only be true when developing
// loadExampleFiles(true);
loadExampleFiles();
