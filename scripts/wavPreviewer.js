/****************************************************************************
 * wavPreviewer.js
 * openacousticdevices.info
 * October 2022
 *****************************************************************************/

/* global bootstrap */
/* global LENGTH_OF_WAV_HEADER */
/* global renderWaveform */
/* global addSVGText, addSVGLine, clearSVG */

const sliceModal = new bootstrap.Modal(document.getElementById('slice-modal'), {
    backdrop: 'static',
    keyboard: false
});

const sliceModalLabel = document.getElementById('slice-modal-label');
const sliceCanvas = document.getElementById('slice-canvas');
const selectionSpan = document.getElementById('slice-selection-span');
const sliceSelectionCanvas = document.getElementById('slice-selection-canvas');
const sliceHoverCanvas = document.getElementById('slice-hover-canvas');

const sliceTimeAxisSVG = document.getElementById('slice-time-axis-svg');
const sliceTimeAxisLabelSVG = document.getElementById('slice-time-axis-label-svg');

const sliceSelectionLeftButton = document.getElementById('slice-selection-left-button');
const sliceSelectionRightButton = document.getElementById('slice-selection-right-button');

const sliceNavigateLeftButton = document.getElementById('slice-navigate-left-button');
const sliceNavigateRightButton = document.getElementById('slice-navigate-right-button');
const slicePageSpan = document.getElementById('slice-page-span');

const sliceSelectButton = document.getElementById('slice-select-button');

// Function called when a slice is selected, either by clicking the select button or by double clicking the canvas

let sliceSelectEventHandler;

// TODO: Add x axis labels

// Length and sample rate of previewed file in seconds

let previewLength, previewSampleRate;

// Waveform data in pages of length sliceCanvas.width

let waveformPages;
let currentPage = 0;
let pageCount = 1;

const HOUR_SECONDS = 3600;

// Start of selected period in seconds

let sliceSelection = 0;

// Selected positions for each page

let pageSelections;

/**
 * Display modal
 */
function showSliceModal () {

    sliceModal.show();

}

/**
 * Hide modal
 */
function hideSliceModal () {

    sliceModal.hide();

}

/**
 * Converts time in seconds into string of format HH:MM:SS
 * @param {int} time Amount of time in seconds
 * @returns Formatted string
 */
function formatTime (time) {

    const hours = Math.floor(time / 3600);
    time -= hours * 3600;

    const mins = Math.floor(time / 60);
    time -= mins * 60;

    const secs = Math.floor(time);

    return String(hours).padStart(2, '0') + ':' + String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');

}

/**
 * Update text in selection span
 */
function updateSelectionSpan (start, end) {

    selectionSpan.innerText = formatTime(start) + ' - ' + formatTime(end);

}

function drawPreviewAxis (callback) {

    // Draw axis labels

    clearSVG(sliceTimeAxisSVG);

    let finalPageLength = previewLength % HOUR_SECONDS;
    finalPageLength = (finalPageLength === 0) ? HOUR_SECONDS : finalPageLength;

    const xMarkerLength = 4;

    const pageOffset = currentPage * HOUR_SECONDS * previewSampleRate;

    let label = pageOffset;

    const displayedTimeAmounts = [
        {
            amount: 3600,
            labelIncrement: 900
        },
        {
            amount: 1800,
            labelIncrement: 300
        },
        {
            amount: 900,
            labelIncrement: 180
        },
        {
            amount: 300,
            labelIncrement: 60
        },
        {
            amount: 60,
            labelIncrement: 15
        },
        {
            amount: 30,
            labelIncrement: 5
        },
        {
            amount: 10,
            labelIncrement: 1
        }
    ];

    let xLabelIncrementSecs = displayedTimeAmounts[0].labelIncrement;

    const pageLength = (currentPage === pageCount - 1) ? finalPageLength : HOUR_SECONDS;
    const pageLengthSamples = pageLength * previewSampleRate;

    console.log('pageLength', pageLength);

    for (let i = 0; i < displayedTimeAmounts.length; i++) {

        xLabelIncrementSecs = displayedTimeAmounts[i].labelIncrement;

        if (pageLength >= displayedTimeAmounts[i].amount) {

            break;

        }

    }

    console.log('xLabelIncrementSecs', xLabelIncrementSecs);

    const xLabelIncrementSamples = xLabelIncrementSecs * previewSampleRate;

    while (label <= pageLengthSamples + pageOffset) {

        // Convert to pixel values

        const labelPixels = label / pageLengthSamples * sliceCanvas.width;
        const pageOffsetPixels = pageOffset / pageLengthSamples * sliceCanvas.width;

        let x = labelPixels - pageOffsetPixels;

        if (x < 0) {

            label += xLabelIncrementSamples;
            continue;

        }

        if (x > sliceCanvas.width) {

            break;

        }

        let textAnchor = 'middle';

        if (x === 0) {

            textAnchor = 'start';

        } else if (x > sliceCanvas.width - 10) {

            textAnchor = 'end';

        }

        x = (x === 0) ? x + 1 : x;
        x = (x === sliceCanvas.width) ? x - 0.5 : x;

        // Shift along to align with edge of canvas (axis has a buffer zone to allow text to overflow slightly without being cut off)
        x += 20;

        addSVGLine(sliceTimeAxisSVG, x, 0, x, xMarkerLength);

        const labelText = formatTime(label / previewSampleRate);

        console.log(x, labelText);

        addSVGText(sliceTimeAxisSVG, labelText, x, 10, textAnchor, 'middle');

        label += xLabelIncrementSamples;

    }

    // Draw heading

    clearSVG(sliceTimeAxisLabelSVG);

    addSVGText(sliceTimeAxisLabelSVG, 'Time (hh:mm:ss)', sliceTimeAxisLabelSVG.width.baseVal.value / 2, 10, 'middle', 'middle');

    callback();

}

/**
 * Draw the preview as a waveform then run callback
 * @param {function} callback Function run after completion
 */
function drawPreviewWaveform (callback) {

    console.log('Drawing page', currentPage);

    const waveformValues = waveformPages[currentPage];

    const ctx = sliceCanvas.getContext('2d');
    ctx.clearRect(0, 0, sliceCanvas.width, sliceCanvas.height);

    const startTime = new Date();

    drawPreviewAxis(() => {

        renderWaveform(sliceCanvas, waveformValues, startTime, callback);

    });

}

/**
 * Change current page number to value given
 * @param {int} newPage Page number to be set to
 */
function updatePreviewPage (newPage) {

    currentPage = newPage;

    updateSliceSelection(pageSelections[currentPage]);

    sliceNavigateLeftButton.disabled = (currentPage === 0);
    sliceNavigateRightButton.disabled = (currentPage === waveformPages.length - 1);

    slicePageSpan.innerHTML = 'Page ' + (currentPage + 1) + ' of ' + pageCount;

}

/**
 * Read file in chunks to calculate a series of min and max values which can be used to draw a waveform
 * @param {FileSystemFileHandle} fileHandler Object which handles file access
 * @param {int} lengthSeconds Length of file in seconds
 * @param {int} previewSampleRate File's sample rate
 * @param {function} callback Function to be called after completion
 */
async function loadPreview (fileHandler, lengthSeconds, pSampleRate, callback) {

    sliceModalLabel.innerText = fileHandler.name;

    // Prepare value multiplier

    const halfHeight = sliceCanvas.height / 2;

    let multiplier = Math.pow(32767, -1);

    // Scale to size of canvas

    multiplier *= halfHeight;

    // Flip y axis

    multiplier *= -1;

    previewLength = lengthSeconds;
    previewSampleRate = pSampleRate;

    const file = await fileHandler.getFile();

    const fileSize = file.size;

    /**
     * Divide lengthSeconds by 1 hour to get page count
     * If pageCount > 1, enable navigation buttons
     * Keep track of what page is being drawn
     * lengthSeconds % 1 hour to get length of final page. If 0, final page = 1 hour
     * Calculate finalPageChunkSize using finalPageLength
     * chunkSize is a constant, assuming normal page size is 1 hour
     * currentChunkSize = either chunkSize or finalPageChunkSize, depending on if currentPage === pageCount - 1 (final page)
     * Store waveform as 2d array [pageCount][720]
     */

    // Max page length is 1 hour, split file into pages

    pageCount = Math.ceil(lengthSeconds / HOUR_SECONDS);

    // Calculate how long the last page will be

    let finalPageLength = lengthSeconds % HOUR_SECONDS;

    // If lengthSeconds is divisible by 1 hour, then the last page will be a full length page

    finalPageLength = (finalPageLength === 0) ? HOUR_SECONDS : finalPageLength;

    const chunkSize = Math.ceil(HOUR_SECONDS * previewSampleRate / sliceCanvas.width);
    const finalPageChunkSize = Math.ceil(finalPageLength * previewSampleRate / sliceCanvas.width);

    // Create the waveform data

    waveformPages = new Array(pageCount);

    pageSelections = new Array(pageCount);

    for (let i = 0; i < pageCount; i++) {

        pageSelections[i] = i * HOUR_SECONDS;

    }

    updatePreviewPage(0);

    // Start reading after header

    let processedSampleCount = LENGTH_OF_WAV_HEADER;

    let page = 0;
    let currentChunkSize = (page === pageCount - 1) ? finalPageChunkSize : chunkSize;
    let currentChunkSizeBytes = currentChunkSize * 2;

    waveformPages[0] = new Array(sliceCanvas.width * 2);

    let index = 0;

    while (processedSampleCount < fileSize) {

        const start = processedSampleCount;
        const end = Math.min(processedSampleCount + currentChunkSizeBytes, fileSize);

        const blob = file.slice(start, end);
        const buffer = await blob.arrayBuffer();

        const view = new Int16Array(buffer);

        let min = 99999;
        let max = 99999;

        for (let j = 0; j < view.length; j++) {

            const sample = view[j];

            max = (sample > max || max === 99999) ? sample : max;
            min = (sample < min || min === 99999) ? sample : min;

        }

        // Scale values for drawable waveform

        waveformPages[page][index * 2] = Math.round(multiplier * min) + halfHeight;
        waveformPages[page][(index * 2) + 1] = Math.round(max * multiplier) + halfHeight;

        index++;

        processedSampleCount += currentChunkSizeBytes;

        if (index === sliceCanvas.width) {

            index = 0;

            page++;

            if (page < pageCount) {

                currentChunkSize = (page === pageCount - 1) ? finalPageChunkSize : chunkSize;
                currentChunkSizeBytes = currentChunkSize * 2;

                // Each page represents a full width plot, with a min and max

                waveformPages[page] = new Array(sliceCanvas.width * 2);

            }

        }

    }

    callback();

}

/**
 * @returns Width on canvas in pixels representing 1 second, given the current page length
 */
function getSecondWidth () {

    let secondWidth;

    if (currentPage === pageCount - 1) {

        let finalPageLength = previewLength % HOUR_SECONDS;

        // If lengthSeconds is divisible by 1 hour, then the last page will be a full length page

        finalPageLength = (finalPageLength === 0) ? HOUR_SECONDS : finalPageLength;

        secondWidth = sliceCanvas.width / finalPageLength;

    } else {

        secondWidth = sliceCanvas.width / HOUR_SECONDS;

    }

    return secondWidth;

}

/**
 * Draw a translucent rectangle over selected slice
 * @param {int} x x co-ordinate on sliceCanvas
 */
function drawSliceSelection (x) {

    const ctx = sliceSelectionCanvas.getContext('2d');

    ctx.clearRect(0, 0, sliceSelectionCanvas.width, sliceSelectionCanvas.height);

    ctx.fillStyle = 'green';
    ctx.globalAlpha = 0.2;

    ctx.fillRect(x, 0, getSecondWidth() * 60, sliceSelectionCanvas.height);

}

/**
 * Apply limits, update stored selection value, and draw selection area
 * @param {int} seconds Selected time
 */
function updateSliceSelection (seconds) {

    seconds = Math.round(seconds / 30) * 30;

    const thirtyWidth = getSecondWidth() * 30;

    // Calculate what the last selectable section is

    let finalPeriod;

    if (sliceSelectionCanvas.width % thirtyWidth === 0) {

        finalPeriod = previewLength - 30;

    } else {

        finalPeriod = previewLength - (previewLength % 30);

    }

    // Lock selection to limits of file if on last page

    if (currentPage === pageCount - 1) {

        seconds = (seconds > finalPeriod) ? finalPeriod : seconds;

    }

    seconds = (seconds < 0) ? 0 : seconds;

    sliceSelection = seconds;

    const pageSeconds = seconds - (currentPage * HOUR_SECONDS);

    const x = pageSeconds * getSecondWidth();

    drawSliceSelection(x);

    const start = seconds;
    let end = start + 60;

    if (currentPage === pageCount - 1) {

        end = (end > previewLength) ? previewLength : end;

    } else {

        end = (end > HOUR_SECONDS) ? HOUR_SECONDS : end;

    }

    updateSelectionSpan(start, end);

    sliceSelectionLeftButton.disabled = (sliceSelection === 0);
    sliceSelectionRightButton.disabled = (sliceSelection === finalPeriod);

    pageSelections[currentPage] = seconds;

}

/**
 * @param {int} x x co-ordinate on sliceCanvas
 * @returns What time in the file x represents
 */
function convertPreviewPixelsToSeconds (x) {

    let seconds;

    if (currentPage === pageCount - 1) {

        let finalPageLength = previewLength % HOUR_SECONDS;

        // If lengthSeconds is divisible by 1 hour, then the last page will be a full length page

        finalPageLength = (finalPageLength === 0) ? HOUR_SECONDS : finalPageLength;

        seconds = x * (finalPageLength / sliceCanvas.width);

    } else {

        seconds = x * (HOUR_SECONDS / sliceCanvas.width);

    }

    seconds += currentPage * HOUR_SECONDS;

    return seconds;

}

sliceSelectionCanvas.addEventListener('click', (e) => {

    const rect = sliceSelectionCanvas.getBoundingClientRect();

    const seconds = convertPreviewPixelsToSeconds(e.clientX - rect.left) - 30;

    updateSliceSelection(seconds);

});

sliceSelectionCanvas.addEventListener('mouseleave', () => {

    const ctx = sliceHoverCanvas.getContext('2d');
    ctx.clearRect(0, 0, sliceHoverCanvas.width, sliceHoverCanvas.height);

});

sliceSelectionCanvas.addEventListener('mousemove', (e) => {

    const rect = sliceSelectionCanvas.getBoundingClientRect();
    let x = e.clientX - rect.left;

    // Lock to 30 second increments

    const thirtyWidth = getSecondWidth() * 30;
    x = Math.round((x - thirtyWidth) / thirtyWidth) * thirtyWidth;

    // Calculate what the last selectable section is

    let finalPeriod;

    if (sliceHoverCanvas.width % thirtyWidth === 0) {

        finalPeriod = sliceHoverCanvas.width - (thirtyWidth * 2);

    } else {

        finalPeriod = sliceHoverCanvas.width - (sliceHoverCanvas.width % thirtyWidth);

    }

    // Lock selection to length of file

    if (currentPage === pageCount - 1) {

        x = (x > finalPeriod) ? finalPeriod : x;

    }

    if (currentPage === 0) {

        x = (x < 0) ? 0 : x;

    }

    const ctx = sliceHoverCanvas.getContext('2d');

    ctx.clearRect(0, 0, sliceHoverCanvas.width, sliceHoverCanvas.height);

    ctx.fillStyle = 'black';
    ctx.globalAlpha = 0.1;

    ctx.fillRect(x, 0, getSecondWidth() * 60, sliceHoverCanvas.height);

});

/**
 * Add functionality to a button which runs a function every delay ms while it is held
 * @param {Element} button Button to apply functionality to
 * @param {int} delay Amount of time between each firing of the action
 * @param {function} action Function to be run every delay ms
 */
function holdButton (button, delay, action) {

    let t;

    const repeat = () => {

        if (button.disabled) {

            clearTimeout(t);
            return;

        }

        action();
        t = setTimeout(repeat, delay);

    };

    button.addEventListener('mousedown', () => {

        repeat();

    });

    button.addEventListener('mouseup', () => {

        clearTimeout(t);

    });

}

holdButton(sliceSelectionLeftButton, 300, () => {

    updateSliceSelection(sliceSelection - 30);

});

holdButton(sliceSelectionRightButton, 300, () => {

    updateSliceSelection(sliceSelection + 30);

});

sliceNavigateLeftButton.addEventListener('click', () => {

    updatePreviewPage(currentPage - 1);

    drawPreviewWaveform();

});

sliceNavigateRightButton.addEventListener('click', () => {

    updatePreviewPage(currentPage + 1);

    drawPreviewWaveform();

});

/**
 * Set function used by select button and double clicking the canvas to select the current period
 * @param {function} eventHandler Select function
 */
function setSliceSelectButtonEventHandler (eventHandler) {

    sliceSelectEventHandler = eventHandler;

}

/**
 * If sliceSelectEventHandler has been set, run it with the current selection
 */
function usePreviewSelection () {

    if (sliceSelectEventHandler) {

        sliceSelectEventHandler(sliceSelection);

    }

}

sliceSelectButton.addEventListener('click', usePreviewSelection);
sliceSelectionCanvas.addEventListener('dblclick', usePreviewSelection);
