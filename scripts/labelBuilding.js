/****************************************************************************
 * labelBuilding.js
 * openacousticdevices.info
 * October 2022
 *****************************************************************************/

/* global DISPLAYED_TIME_AMOUNTS */


/**
 * Given the current duration being displayed, what level of precision and increment should be used to draw x axis labels
 * @param {number} length Displayed length in samples
 * @param {number} currentSampleRate Sample rate
 * @returns xLabelIncrementSecs, xLabelDecimalPlaces
 */
function getIncrementAndPrecision (length, currentSampleRate) {

    let xLabelIncrementSecs = DISPLAYED_TIME_AMOUNTS[0].labelIncrement;
    let xLabelDecimalPlaces = DISPLAYED_TIME_AMOUNTS[0].precision;

    for (let i = 0; i < DISPLAYED_TIME_AMOUNTS.length; i++) {

        const displayedTimeSamples = DISPLAYED_TIME_AMOUNTS[i].amount * currentSampleRate;

        xLabelIncrementSecs = DISPLAYED_TIME_AMOUNTS[i].labelIncrement;
        xLabelDecimalPlaces = DISPLAYED_TIME_AMOUNTS[i].precision;

        if (length > displayedTimeSamples) {

            break;

        }

    }

    return {xLabelIncrementSecs: xLabelIncrementSecs, xLabelDecimalPlaces: xLabelDecimalPlaces};

}

/**
 * Get a string which represents the format of the tick labels
 * @param {number} overallLength Overall file length in samples
 * @param {number} displayedLength Displayed length in samples
 * @param {number} currentSampleRate Sample rate
 * @returns String to put in axis heading
 */
function formatAxisUnits (overallLength, displayedLength, currentSampleRate) {

    const overallLengthSeconds = overallLength / currentSampleRate;

    if (overallLengthSeconds < 60) {

        return 's';

    }

    let format = (overallLengthSeconds >= 3600) ? 'hh:' : '';
    format += (overallLengthSeconds >= 60) ? 'mm:' : '';
    format += 'ss';

    const incrementPrecision = getIncrementAndPrecision(displayedLength, currentSampleRate);
    const xLabelDecimalPlaces = incrementPrecision.xLabelDecimalPlaces;

    if (xLabelDecimalPlaces > 0) {

        format += '.';
        format += 's'.repeat(xLabelDecimalPlaces);

    }

    return format;

}

/**
 * Converts time in seconds into string of format hh:mm:ss, removing empty units
 * @param {number} time Amount of time in seconds
 * @returns Formatted string
 */

/**
 * Converts time in seconds into string of format hh:mm:ss, removing empty units
 * @param {number} time Time on label in seconds
 * @param {number} maxTime Overall time being displayed
 * @param {number} decimalPlaces Number of decimal places to display
 * @returns Formatted string
 */
function formatTimeLabel (time, maxTime, decimalPlaces) {

    if (!decimalPlaces) {

        decimalPlaces = 0;

    }

    // If the value is a decimal, 2 characters are used to display the integer value + 1 character for the decimal point

    let secsPadding = decimalPlaces > 0 ? decimalPlaces + 3 : 2;
    secsPadding = maxTime < 60 ? secsPadding - 1 : secsPadding;

    const hours = Math.floor(time / 3600);
    time -= hours * 3600;

    const mins = Math.floor(time / 60);
    time -= mins * 60;

    const secs = time.toFixed(decimalPlaces);

    let formattedString = '';
    formattedString = (maxTime >= 3600) ? String(hours).padStart(2, '0') + ':' : '';
    formattedString += (maxTime >= 60) ? String(mins).padStart(2, '0') + ':' : '';
    formattedString += String(secs).padStart(secsPadding, '0');

    return formattedString;

}