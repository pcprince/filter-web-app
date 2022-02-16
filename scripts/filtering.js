/****************************************************************************
 * filtering.js
 * openacousticdevices.info
 * February 2022
 *****************************************************************************/

// Filter Playground/Config App each have different methods of initialising Slider
/* global Slider */
// const Slider = require('bootstrap-slider');

const thresholdTypeRadioButtons = document.getElementsByName('threshold-type-radio');

const THRESHOLD_TYPE_NONE = 0;
const THRESHOLD_TYPE_AMPLITUDE = 1;
const THRESHOLD_TYPE_GOERTZEL = 2;

const thresholdHolder = document.getElementById('threshold-holder');
const amplitudeThresholdHolder = document.getElementById('amplitude-threshold-holder');
const goertzelFilterThresholdHolder = document.getElementById('goertzel-filter-threshold-holder');
const thresholdLabel = document.getElementById('threshold-label');

const filterHolder = document.getElementById('filter-holder');

const filterTypeLabel = document.getElementById('filter-type-label');

const FILTER_SLIDER_STEPS = [100, 100, 100, 100, 200, 500, 500, 1000];

const filterRadioLabels = document.getElementsByName('filter-radio-label');
const filterRadioButtons = document.getElementsByName('filter-radio');

const disabledRow = document.getElementById('disabled-row');
const highPassRow = document.getElementById('high-pass-row');
const lowPassRow = document.getElementById('low-pass-row');
const bandPassRow = document.getElementById('band-pass-row');

const disabledMaxLabel = document.getElementById('disabled-filter-max-label');
const disabledMinLabel = document.getElementById('disabled-filter-min-label');
const bandPassMaxLabel = document.getElementById('band-pass-filter-max-label');
const bandPassMinLabel = document.getElementById('band-pass-filter-min-label');
const lowPassMaxLabel = document.getElementById('low-pass-filter-max-label');
const lowPassMinLabel = document.getElementById('low-pass-filter-min-label');
const highPassMaxLabel = document.getElementById('high-pass-filter-max-label');
const highPassMinLabel = document.getElementById('high-pass-min-label');

const disabledFilterSlider = new Slider('#disabled-filter-slider', {});
const highPassFilterSlider = new Slider('#high-pass-filter-slider', {});
const lowPassFilterSlider = new Slider('#low-pass-filter-slider', {});
const bandPassFilterSlider = new Slider('#band-pass-filter-slider', {});

const filterLabel = document.getElementById('filter-label');

const amplitudeThresholdMaxLabel = document.getElementById('amplitude-threshold-max-label');
const amplitudeThresholdMinLabel = document.getElementById('amplitude-threshold-min-label');

const amplitudeThresholdSlider = new Slider('#amplitude-threshold-slider', {});
const amplitudeThresholdDurationRadioButtons = document.getElementsByName('amplitude-threshold-duration-radio');

const VALID_AMPLITUDE_VALUES = [0, 1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 88, 96, 104, 112, 120, 128, 144, 160, 176, 192, 208, 224, 240, 256, 288, 320, 352, 384, 416, 448, 480, 512, 576, 640, 704, 768, 832, 896, 960, 1024, 1152, 1280, 1408, 1536, 1664, 1792, 1920, 2048, 2304, 2560, 2816, 3072, 3328, 3584, 3840, 4096, 4608, 5120, 5632, 6144, 6656, 7168, 7680, 8192, 9216, 10240, 11264, 12288, 13312, 14336, 15360, 16384, 18432, 20480, 22528, 24576, 26624, 28672, 30720, 32768];

const MINIMUM_TRIGGER_DURATIONS = [0, 1, 2, 5, 10, 15, 30, 60];

// Goertzel filter UI

const GOERTZEL_FILTER_WINDOW_LENGTHS = [16, 32, 64, 128, 256, 512, 1024];

const goertzelFilterSlider = new Slider('#goertzel-filter-slider', {});
const goertzelFilterMaxLabel = document.getElementById('goertzel-filter-max-label');
const goertzelFilterMinLabel = document.getElementById('goertzel-filter-min-label');
const goertzelFilterWindowRadioButtons = document.getElementsByName('goertzel-filter-window-radio');
const goertzelFilterLabel = document.getElementById('goertzel-filter-label');
const goertzelThresholdSliderHolder = document.getElementById('goertzel-threshold-slider-holder');
const goertzelThresholdSlider = new Slider('#goertzel-threshold-slider', {});
const goertzelThresholdMaxLabel = document.getElementById('goertzel-threshold-max-label');
const goertzelThresholdMinLabel = document.getElementById('goertzel-threshold-min-label');
const goertzelDurationRadioButtons = document.getElementsByName('goertzel-duration-radio');

/* Only scale filter sliders if the filter has been enabled this session */
let filterHasBeenEnabled = false;

const FILTER_NONE = 3;
const FILTER_LOW = 0;
const FILTER_BAND = 1;
const FILTER_HIGH = 2;

let previousSelectionType = 1;

/* 0: 0-100%, 1: 16-Bit, 2: Decibels */

let amplitudeThresholdScaleIndex = 0;
let prevAmplitudeThresholdScaleIndex = 0;
const AMPLITUDE_THRESHOLD_SCALE_PERCENTAGE = 0;
const AMPLITUDE_THRESHOLD_SCALE_16BIT = 1;
const AMPLITUDE_THRESHOLD_SCALE_DECIBEL = 2;

let updateLifeDisplayOnChange;

/* All possible slider values */

const THRESHOLD_PERCENTAGE_SLIDER_VALUES = [];
const THRESHOLD_16BIT_SLIDER_VALUES = [];
const THRESHOLD_DECIBEL_SLIDER_VALUES = [];

/* Fill possible slider value lists */

const sliderMin = amplitudeThresholdSlider.getAttribute('min');
const sliderMax = amplitudeThresholdSlider.getAttribute('max');
const sliderStep = amplitudeThresholdSlider.getAttribute('step');

for (let sIndex = sliderMin; sIndex <= sliderMax; sIndex += sliderStep) {

    const rawSlider = sIndex;

    const amplitudeThresholdValues = convertThreshold(rawSlider);

    THRESHOLD_PERCENTAGE_SLIDER_VALUES.push(parseFloat(amplitudeThresholdValues.percentage));
    THRESHOLD_16BIT_SLIDER_VALUES.push(amplitudeThresholdValues.amplitude);
    THRESHOLD_DECIBEL_SLIDER_VALUES.push(amplitudeThresholdValues.decibels);

}

/* Add last() to Array */

if (!Array.prototype.last) {

    Array.prototype.last = () => {

        return this[this.length - 1];

    };

};

/* Retrieve the radio button selected from a group of named buttons */

function getSelectedRadioValue (radioName) {

    return parseInt(document.querySelector('input[name="' + radioName + '"]:checked').value, 10);

}

function getFilterSliderStep (sampleRate) {

    return FILTER_SLIDER_STEPS[sampleRate];

};

function getFilterRadioValue () {

    return getSelectedRadioValue('filter-radio');

}

function updateFilterSliders () {

    const newSelectionType = getFilterRadioValue();

    if (previousSelectionType === FILTER_LOW) {

        if (newSelectionType === FILTER_BAND) {

            bandPassFilterSlider.setValue([0, lowPassFilterSlider.getValue()]);

        } else if (newSelectionType === FILTER_HIGH) {

            highPassFilterSlider.setValue(lowPassFilterSlider.getValue());

        }

    } else if (previousSelectionType === FILTER_HIGH) {

        if (newSelectionType === FILTER_BAND) {

            bandPassFilterSlider.setValue([highPassFilterSlider.getValue(), bandPassFilterSlider.getAttribute('max')]);

        } else if (newSelectionType === FILTER_LOW) {

            lowPassFilterSlider.setValue(highPassFilterSlider.getValue());

        }

    } else if (previousSelectionType === FILTER_BAND) {

        if (newSelectionType === FILTER_LOW) {

            lowPassFilterSlider.setValue(Math.max(...bandPassFilterSlider.getValue()));

        } else if (newSelectionType === FILTER_HIGH) {

            highPassFilterSlider.setValue(Math.min(...bandPassFilterSlider.getValue()));

        }

    }

    previousSelectionType = newSelectionType;

}

/* Update the text on the label which describes the range of frequencies covered by the filter */

function updateFilterLabel () {

    const filterIndex = getFilterRadioValue();

    let currentBandPassLower, currentBandPassHigher, currentHighPass, currentLowPass;

    switch (filterIndex) {

    case FILTER_NONE:
        return;
    case FILTER_HIGH:
        currentHighPass = highPassFilterSlider.getValue() / 1000;
        filterLabel.textContent = 'Recordings will be filtered to frequencies above ' + currentHighPass.toFixed(1) + ' kHz.';
        break;
    case FILTER_LOW:
        currentLowPass = lowPassFilterSlider.getValue() / 1000;
        filterLabel.textContent = 'Recordings will be filtered to frequencies below ' + currentLowPass.toFixed(1) + ' kHz.';
        break;
    case FILTER_BAND:
        currentBandPassLower = Math.min(...bandPassFilterSlider.getValue()) / 1000;
        currentBandPassHigher = Math.max(...bandPassFilterSlider.getValue()) / 1000;
        filterLabel.textContent = 'Recordings will be filtered to frequencies between ' + currentBandPassLower.toFixed(1) + ' and ' + currentBandPassHigher.toFixed(1) + ' kHz.';
        break;

    }

}

/* Work out where on the slider a given amplitude threshold value is */

function lookupAmplitudeThresholdingSliderValue (amplitudeThreshold, scaleIndex) {

    let searchList;

    switch (scaleIndex) {

    case AMPLITUDE_THRESHOLD_SCALE_PERCENTAGE:
        searchList = THRESHOLD_PERCENTAGE_SLIDER_VALUES;
        break;

    case AMPLITUDE_THRESHOLD_SCALE_16BIT:
        searchList = THRESHOLD_16BIT_SLIDER_VALUES;
        break;

    case AMPLITUDE_THRESHOLD_SCALE_DECIBEL:
        searchList = THRESHOLD_DECIBEL_SLIDER_VALUES;
        break;

    }

    for (let i = 0; i < searchList.length; i++) {

        if (searchList[i] === amplitudeThreshold) {

            return i;

        }

    }

}

/* Convert exponent and mantissa into a string */

function formatPercentage (mantissa, exponent) {

    let response = '';

    if (exponent < 0) {

        response += '0.0000'.substring(0, 1 - exponent);

    }

    response += mantissa;

    for (let i = 0; i < exponent; i += 1) response += '0';

    return response;

}

/* Calculate the amplitude threshold in the currently enabled scale */

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
 * Update the information label which displays the threshold information
 */

function updateThresholdLabel () {

    const thresholdTypeIndex = getThresholdTypeIndex();

    if (thresholdTypeIndex === THRESHOLD_TYPE_AMPLITUDE) {

        thresholdLabel.style.color = '';

        const amplitudeThreshold = convertThreshold(amplitudeThresholdSlider.getValue());

        thresholdLabel.textContent = 'Amplitude threshold of ';

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
        thresholdLabel.textContent += ' will be used when generating T.WAV files.';

        goertzelFilterLabel.textContent = 'A central frequency of ' + goertzelFrequency.toFixed(1) + ' kHz will be used by the frequency trigger.';

    } else {

        thresholdLabel.style.color = '#D3D3D3';

        thresholdLabel.textContent = 'All audio will be written to a WAV file.';

    }

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

/* Exported functions for setting values */

function setFilters (enabled, lowerSliderValue, higherSliderValue, filterType) {

    filterHasBeenEnabled = enabled;

    let filterTypeIndex = FILTER_NONE;

    switch (filterType) {

    case 'low':
        setLowPassSliderValue(higherSliderValue);
        filterTypeIndex = FILTER_LOW;
        break;

    case 'high':
        setHighPassSliderValue(lowerSliderValue);
        filterTypeIndex = FILTER_HIGH;
        break;

    case 'band':
        setBandPass(lowerSliderValue, higherSliderValue);
        filterTypeIndex = FILTER_BAND;
        break;

    }

    for (let i = 0; i < filterRadioButtons.length; i++) {

        if (parseInt(filterRadioButtons[i].value) === filterTypeIndex) {

            filterRadioButtons[i].checked = true;

        }

    }

    updateFilterLabel();

}

function setAmplitudeThresholdScaleIndex (scaleIndex) {

    prevAmplitudeThresholdScaleIndex = amplitudeThresholdScaleIndex;

    amplitudeThresholdScaleIndex = scaleIndex;
    updateAmplitudeThresholdingScale();

}

function setAmplitudeThreshold (amplitudeThreshold) {

    amplitudeThresholdSlider.setValue(lookupAmplitudeThresholdingSliderValue(amplitudeThreshold, amplitudeThresholdScaleIndex));

}

function setThresholdType (type) {

    thresholdTypeRadioButtons[type].checked = true;
    updateThresholdTypeUI();

}

function setMinimumAmplitudeThresholdDuration (index) {

    amplitudeThresholdDurationRadioButtons[index].checked = true;

}

function setFrequencyThreshold (frequencyThreshold) {

    goertzelThresholdSlider.setValue(lookupAmplitudeThresholdingSliderValue(frequencyThreshold, AMPLITUDE_THRESHOLD_SCALE_PERCENTAGE));

}

function setFrequencyThresholdFilterFreq (freq) {

    goertzelFilterSlider.setValue(freq);

}

function setFrequencyThresholdWindowLength (length) {

    const index = GOERTZEL_FILTER_WINDOW_LENGTHS.indexOf(length);

    goertzelFilterWindowRadioButtons[index].checked = true;

}

function setMinimumFrequencyThresholdDuration (index) {

    goertzelDurationRadioButtons[index].checked = true;

}

/* External functions for obtaining values */

function filteringIsEnabled () {

    const filterIndex = getFilterRadioValue();

    return filterIndex !== FILTER_NONE;

}

function getFilterType () {

    const filterIndex = getFilterRadioValue();
    const filterTypes = ['low', 'band', 'high', 'none'];

    return filterTypes[filterIndex];

}

function getLowerSliderValue () {

    const filterIndex = getFilterRadioValue();

    switch (filterIndex) {

    case FILTER_NONE:
        return 0;
    case FILTER_HIGH:
        return highPassFilterSlider.getValue();
    case FILTER_LOW:
        return 0;
    case FILTER_BAND:
        return Math.min(...bandPassFilterSlider.getValue());

    }

}

function getHigherSliderValue () {

    const filterIndex = getFilterRadioValue();

    switch (filterIndex) {

    case FILTER_NONE:
        return 0;
    case FILTER_HIGH:
        return 65535;
    case FILTER_LOW:
        return lowPassFilterSlider.getValue();
    case FILTER_BAND:
        return Math.max(...bandPassFilterSlider.getValue());

    }

}

function get16BitAmplitudeThreshold () {

    return convertThreshold(amplitudeThresholdSlider.getValue()).amplitude;

}

function getPercentageAmplitudeThreshold () {

    return convertThreshold(amplitudeThresholdSlider.getValue()).percentage;

}

function getDecibelAmplitudeThreshold () {

    return convertThreshold(amplitudeThresholdSlider.getValue()).decibels;

}

function getPercentageAmplitudeThresholdExponentMantissa () {

    const results = convertThreshold(amplitudeThresholdSlider.getValue());

    return {
        exponent: results.percentageExponent,
        mantissa: results.percentageMantissa
    };

}

function getAmplitudeThresholdValues () {

    return convertThreshold(amplitudeThresholdSlider.getValue());

}

function getFrequencyThresholdValues () {

    return convertThreshold(goertzelThresholdSlider.getValue());

}

function getAmplitudeThreshold () {

    switch (amplitudeThresholdScaleIndex) {

    case AMPLITUDE_THRESHOLD_SCALE_PERCENTAGE:
        return getPercentageAmplitudeThreshold();

    case AMPLITUDE_THRESHOLD_SCALE_16BIT:
        return get16BitAmplitudeThreshold();

    case AMPLITUDE_THRESHOLD_SCALE_DECIBEL:
        return getDecibelAmplitudeThreshold();

    }

}

function amplitudeThresholdingIsEnabled () {

    const thresholdTypeIndex = getThresholdTypeIndex();

    return thresholdTypeIndex === THRESHOLD_TYPE_AMPLITUDE;

}

function getAmplitudeThresholdScaleIndex () {

    return amplitudeThresholdScaleIndex;

}

function getMinimumAmplitudeThresholdDuration () {

    return getSelectedRadioValue('amplitude-threshold-duration-radio');

}

function getFrequencyFilterThresholdExponentMantissa () {

    const results = convertThreshold(goertzelThresholdSlider.getValue());

    return {
        exponent: results.percentageExponent,
        mantissa: results.percentageMantissa
    };

}

/**
 * Convert selected frequency threshold from current scale raw slider value to amplitude
 * @returns Frequency threshold value
 */

function getFrequencyThreshold () {

    return parseFloat(convertThreshold(goertzelThresholdSlider.getValue()).percentage);

}

function getFrequencyThresholdFilterFreq () {

    return goertzelFilterSlider.getValue();

}

function frequencyThresholdingIsEnabled () {

    const thresholdTypeIndex = getThresholdTypeIndex();

    return thresholdTypeIndex === THRESHOLD_TYPE_GOERTZEL;

}

function getFrequencyThresholdWindowLength () {

    return GOERTZEL_FILTER_WINDOW_LENGTHS[getSelectedRadioValue('goertzel-filter-window-radio')];

}

function getMinimumFrequencyThresholdDuration () {

    return getSelectedRadioValue('goertzel-duration-radio');

}

function getMinimumTriggerDurationGoertzel () {

    return MINIMUM_TRIGGER_DURATIONS[getSelectedRadioValue('goertzel-duration-radio')];

}

function getMinimumTriggerDurationAmp () {

    return MINIMUM_TRIGGER_DURATIONS[getSelectedRadioValue('amplitude-threshold-duration-radio')];

}

/* Enable/disable threshold UI based on checkbox */

function updateThresholdUI () {

    updateThresholdLabel();

    if (updateLifeDisplayOnChange) {

        updateLifeDisplayOnChange();

    }

}

/* Check if the filtering UI should be enabled and update accordingly */

function updateFilterUI () {

    const filterIndex = getFilterRadioValue();

    switch (filterIndex) {

    case FILTER_NONE:
        disabledRow.style.display = 'flex';
        lowPassRow.style.display = 'none';
        highPassRow.style.display = 'none';
        bandPassRow.style.display = 'none';
        break;
    case FILTER_LOW:
        disabledRow.style.display = 'none';
        lowPassRow.style.display = 'flex';
        highPassRow.style.display = 'none';
        bandPassRow.style.display = 'none';
        break;
    case FILTER_HIGH:
        disabledRow.style.display = 'none';
        lowPassRow.style.display = 'none';
        highPassRow.style.display = 'flex';
        bandPassRow.style.display = 'none';
        break;
    case FILTER_BAND:
        disabledRow.style.display = 'none';
        lowPassRow.style.display = 'none';
        highPassRow.style.display = 'none';
        bandPassRow.style.display = 'flex';
        break;

    }

    if (filterIndex !== FILTER_NONE) {

        filterLabel.classList.remove('grey');

    } else {

        filterLabel.textContent = 'Recordings will not be filtered.';
        filterLabel.classList.add('grey');

    }

}

/* When sample rate changes, so does the slider step. Update values to match the corresponding step */

function roundToSliderStep (value, step) {

    return Math.round(value / step) * step;

}

/* Update UI according to new sample rate selection */

function sampleRateChange (resetValues, sampleRate) {

    const maxFreq = sampleRate / 2;

    const labelText = (maxFreq / 1000) + 'kHz';

    disabledMaxLabel.textContent = labelText;
    lowPassMaxLabel.textContent = labelText;
    highPassMaxLabel.textContent = labelText;
    bandPassMaxLabel.textContent = labelText;
    goertzelFilterMaxLabel.textContent = labelText;

    highPassFilterSlider.setAttribute('max', maxFreq);
    lowPassFilterSlider.setAttribute('max', maxFreq);
    bandPassFilterSlider.setAttribute('max', maxFreq);
    goertzelFilterSlider.setAttribute('max', maxFreq);

    const filterSliderStep = FILTER_SLIDER_STEPS[sampleRateIndex];

    highPassFilterSlider.setAttribute('step', filterSliderStep);
    lowPassFilterSlider.setAttribute('step', filterSliderStep);
    bandPassFilterSlider.setAttribute('step', filterSliderStep);
    goertzelFilterSlider.setAttribute('step', filterSliderStep);

    /* Get current slider values */

    const currentBandPassHigher = Math.max(...bandPassFilterSlider.getValue());
    const currentBandPassLower = Math.min(...bandPassFilterSlider.getValue());
    const currentLowPass = lowPassFilterSlider.getValue();
    const currentHighPass = highPassFilterSlider.getValue();
    const currentGoertzel = goertzelFilterSlider.getValue();

    if (filterHasBeenEnabled || !resetValues) {

        /* Validate current band-pass filter values */

        const newBandPassLower = currentBandPassLower > maxFreq ? 0 : currentBandPassLower;
        const newBandPassHigher = currentBandPassHigher > maxFreq ? maxFreq : currentBandPassHigher;
        setBandPass(roundToSliderStep(Math.max(newBandPassHigher, newBandPassLower), FILTER_SLIDER_STEPS[sampleRateIndex]), roundToSliderStep(Math.min(newBandPassHigher, newBandPassLower), FILTER_SLIDER_STEPS[sampleRateIndex]));

        /* Validate current low-pass filter value */

        const newLowPass = currentLowPass > maxFreq ? maxFreq : currentLowPass;
        setLowPassSliderValue(roundToSliderStep(newLowPass, FILTER_SLIDER_STEPS[sampleRateIndex]));

        /* Validate current high-pass filter value */

        const newHighPass = currentHighPass > maxFreq ? maxFreq : currentHighPass;
        setHighPassSliderValue(roundToSliderStep(newHighPass, FILTER_SLIDER_STEPS[sampleRateIndex]));

    } else {

        /* Set high/low-pass sliders to 1/4 and 3/4 of the bar if filtering has not yet been enabled */

        const newLowPassFreq = maxFreq / 4;
        const newHighPassFreq = 3 * maxFreq / 4;

        /* Set band-pass filter values */

        setBandPass(roundToSliderStep(newHighPassFreq, FILTER_SLIDER_STEPS[sampleRateIndex]), roundToSliderStep(newLowPassFreq, FILTER_SLIDER_STEPS[sampleRateIndex]));

        /* Set low-pass filter value */

        setLowPassSliderValue(roundToSliderStep(newHighPassFreq, FILTER_SLIDER_STEPS[sampleRateIndex]));

        /* Set high-pass filter value */

        setHighPassSliderValue(roundToSliderStep(newLowPassFreq, FILTER_SLIDER_STEPS[sampleRateIndex]));

    }

    /* Validate current Goertzel filter values */

    const newGoertzel = currentGoertzel > maxFreq ? maxFreq : currentGoertzel;

    setFrequencyThresholdFilterFreq(roundToSliderStep(newGoertzel, FILTER_SLIDER_STEPS[sampleRateIndex]));

    /* Update labels */

    updateFilterLabel();
    updateThresholdLabel();

}

/* Update the labels either side of the amplitude threshold scale */

function updateAmplitudeThresholdingScale () {

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
 * Get value of current threshold type (THRESHOLD_TYPE_NONE, THRESHOLD_TYPE_AMPLITUDE, THRESHOLD_TYPE_GOERTZEL)
 */
function getThresholdTypeIndex () {

    return getSelectedRadioValue('threshold-type-radio');

}

/**
 * Update UI based on which threshold type is selected
 */

function updateThresholdTypeUI () {

    const thresholdTypeIndex = getThresholdTypeIndex();

    switch (thresholdTypeIndex) {

    case THRESHOLD_TYPE_NONE:

        amplitudeThresholdHolder.style.display = 'none';
        goertzelFilterThresholdHolder.style.display = 'none';

        thresholdHolder.style.display = 'none';

        filterHolder.style.display = '';

        break;

    case THRESHOLD_TYPE_AMPLITUDE:

        amplitudeThresholdHolder.style.display = '';
        goertzelFilterThresholdHolder.style.display = 'none';

        thresholdHolder.style.display = '';

        filterHolder.style.display = '';

        break;

    case THRESHOLD_TYPE_GOERTZEL:

        amplitudeThresholdHolder.style.display = 'none';
        goertzelFilterThresholdHolder.style.display = '';

        thresholdHolder.style.display = '';

        filterHolder.style.display = 'none';

        break;

    }

}

/* Add listeners to all radio buttons which update the filter sliders */

function addFilterRadioButtonListeners (sampleRateChangeFunction) {

    for (let i = 0; i < filterRadioButtons.length; i++) {

        filterRadioButtons[i].addEventListener('change', function () {

            updateFilterUI();
            updateFilterSliders();
            updateFilterLabel();

            if (!filterRadioButtons[0].checked) {

                filterHasBeenEnabled = true;
                sampleRateChangeFunction();

            }

        });

    }

}

function resetElements () {

    filterRadioButtons[0].checked = true;
    amplitudeThresholdDurationRadioButtons[0].checked = true;

    amplitudeThresholdSlider.setValue(0);

    goertzelThresholdSlider.setValue(0);

    goertzelFilterWindowRadioButtons[2].checked = true;
    goertzelDurationRadioButtons[0].checked = true;

    previousSelectionType = 1;

    thresholdTypeRadioButtons[0].checked = true;

}

/* Prepare UI */

function prepareUI (changeFunction, checkRecordingDurationFunction, sampleRateChangeFunction) {

    updateLifeDisplayOnChange = changeFunction;

    addFilterRadioButtonListeners(sampleRateChangeFunction);

    for (let i = 0; i < thresholdTypeRadioButtons.length; i++) {

        thresholdTypeRadioButtons[i].addEventListener('change', () => {

            updateThresholdTypeUI();
            updateThresholdLabel();

        });

    }

    if (checkRecordingDurationFunction) {

        for (let i = 0; i < amplitudeThresholdDurationRadioButtons.length; i++) {

            amplitudeThresholdDurationRadioButtons[i].addEventListener('click', checkRecordingDurationFunction);
            goertzelDurationRadioButtons[i].addEventListener('click', checkRecordingDurationFunction);

            // Sync duration checkboxes

            amplitudeThresholdDurationRadioButtons[i].addEventListener('change', () => {

                goertzelDurationRadioButtons[i].checked = true;

            });

            goertzelDurationRadioButtons[i].addEventListener('change', () => {

                amplitudeThresholdDurationRadioButtons[i].checked = true;

            });

        }

    }

    bandPassFilterSlider.on('change', updateFilterLabel);
    lowPassFilterSlider.on('change', updateFilterLabel);
    highPassFilterSlider.on('change', updateFilterLabel);

    amplitudeThresholdSlider.on('change', updateThresholdLabel);
    goertzelFilterSlider.on('change', updateThresholdLabel);
    goertzelThresholdSlider.on('change', updateThresholdLabel);

    updateThresholdTypeUI();

    const thresholdTypeIndex = getThresholdTypeIndex();

    if (thresholdTypeIndex !== THRESHOLD_TYPE_NONE && checkRecordingDurationFunction) {

        checkRecordingDurationFunction();

    }

    updateFilterUI();
    updateThresholdUI();

}

/* Exports */

// exports.THRESHOLD_TYPE_NONE = THRESHOLD_TYPE_NONE;
// exports.THRESHOLD_TYPE_AMPLITUDE = THRESHOLD_TYPE_AMPLITUDE;
// exports.THRESHOLD_TYPE_GOERTZEL = THRESHOLD_TYPE_GOERTZEL;

// exports.FILTER_NONE = FILTER_NONE;
// exports.FILTER_LOW = FILTER_LOW;
// exports.FILTER_BAND = FILTER_BAND;
// exports.FILTER_HIGH = FILTER_HIGH;

// exports.getFilterSliderStep = getFilterSliderStep;

// exports.getFilterRadioValue = getFilterRadioValue;

// exports.setFilters = setFilters;

// exports.setAmplitudeThresholdScaleIndex = setAmplitudeThresholdScaleIndex;

// exports.setAmplitudeThreshold = setAmplitudeThreshold;

// exports.setThresholdType = setThresholdType;
// exports.getThresholdTypeIndex = getThresholdTypeIndex;

// exports.setMinimumAmplitudeThresholdDuration = setMinimumAmplitudeThresholdDuration;

// exports.setFrequencyThreshold = setFrequencyThreshold;

// exports.setFrequencyThresholdFilterFreq = setFrequencyThresholdFilterFreq;

// exports.setFrequencyThresholdWindowLength = setFrequencyThresholdWindowLength;

// exports.setMinimumFrequencyThresholdDuration = setMinimumFrequencyThresholdDuration;

// exports.filteringIsEnabled = filteringIsEnabled;

// exports.getFilterType = getFilterType;

// exports.getLowerSliderValue = getLowerSliderValue;

// exports.getHigherSliderValue = getHigherSliderValue;

// exports.get16BitAmplitudeThreshold = get16BitAmplitudeThreshold;
// exports.getPercentageAmplitudeThreshold = getPercentageAmplitudeThreshold;
// exports.getDecibelAmplitudeThreshold = getDecibelAmplitudeThreshold;
// exports.getPercentageAmplitudeThresholdExponentMantissa = getPercentageAmplitudeThresholdExponentMantissa;

// exports.getAmplitudeThresholdValues = getAmplitudeThresholdValues;
// exports.getFrequencyThresholdValues = getFrequencyThresholdValues;

// exports.getAmplitudeThreshold = getAmplitudeThreshold;
// exports.amplitudeThresholdingIsEnabled = amplitudeThresholdingIsEnabled;
// exports.getAmplitudeThresholdScaleIndex = getAmplitudeThresholdScaleIndex;
// exports.getMinimumAmplitudeThresholdDuration = getMinimumAmplitudeThresholdDuration;

// exports.getFrequencyFilterThresholdExponentMantissa = getFrequencyFilterThresholdExponentMantissa;
// exports.getFrequencyThreshold = getFrequencyThreshold;
// exports.getFrequencyThresholdFilterFreq = getFrequencyThresholdFilterFreq;
// exports.frequencyThresholdingIsEnabled = frequencyThresholdingIsEnabled;
// exports.getFrequencyThresholdWindowLength = getFrequencyThresholdWindowLength;

// exports.getMinimumFrequencyThresholdDuration = getMinimumFrequencyThresholdDuration;
// exports.getMinimumTriggerDurationGoertzel = getMinimumTriggerDurationGoertzel;
// exports.getMinimumTriggerDurationAmp = getMinimumTriggerDurationAmp;

// exports.updateThresholdUI = updateThresholdUI;
// exports.updateFilterUI = updateFilterUI;
// exports.sampleRateChange = sampleRateChange;
// exports.resetElements = resetElements;

// exports.prepareUI = prepareUI;
