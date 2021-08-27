/****************************************************************************
 * waveform.js
 * openacousticdevices.info
 * June 2021
 *****************************************************************************/

// Size of block samples are divided into for each peak/trough of the waveform

const BLOCK_SIZE = 32;

// If more than this sample count is being rendered, group into columns rather than using raw data

const MAX_RAW_PLOT_LENGTH = 10000;

// WebGL shaders

const waveformVertexShaderText =
[
    'precision mediump float;',
    '',
    'attribute vec2 vertPosition;',
    '',
    'void main()',
    '{',
    '   gl_PointSize = 1.0;',
    '   gl_Position = vec4(vertPosition, 0.0, 1.0);',
    '}'
].join('\n');

const waveformFragmentShaderText =
[
    'precision mediump float;',
    '',
    'void main ()',
    '{',
    '   gl_FragColor = vec4(0.0, 0.3, 0.6, 1.0);',
    '}'
].join('\n');

// Drawing canvas

const wavCanvas = document.getElementById('waveform-canvas');

/**
 * Draw the waveform plot
 * @param {number[]} data Absolute values of samples to be plotted. Either raw data or grouped into columns.
 * @param {number} yZoom Amount to zoom in the y axis
 * @param {function} callback Function called on completion
 */
function renderWaveform (data, yZoom, callback) {

    // Prepare WebGL

    /** @type {WebGLRenderingContext} */
    let gl = wavCanvas.getContext('webgl', {preserveDrawingBuffer: true});

    if (!gl) {

        console.log('Loading experimental WebGL context');
        gl = wavCanvas.getContext('experimental-webgl', {preserveDrawingBuffer: true});

    }

    if (!gl) {

        console.error('WebGL not supported by this browser');
        return;

    }

    gl.viewport(0, 0, wavCanvas.width, wavCanvas.height);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

    gl.shaderSource(vertexShader, waveformVertexShaderText);
    gl.shaderSource(fragmentShader, waveformFragmentShaderText);

    gl.compileShader(vertexShader);
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {

        console.error('Error compiling vertex shader', gl.getShaderInfoLog(vertexShader));
        return;

    }

    gl.compileShader(fragmentShader);
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {

        console.error('Error compiling fragment shader', gl.getShaderInfoLog(fragmentShader));
        return;

    }

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);

    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {

        console.error('Error linking program', gl.getProgramInfoLog(program));
        return;

    }

    // Scale data from -32767 to 32767, to -1 and 1

    const multiplier = Math.pow(32767, -1);
    const normalisedData = data.map(n => n * multiplier);
    const width = 2.0 / normalisedData.length;

    const pointData = [];

    // Add start point

    pointData.push(-1.0, 0.0);

    for (let i = 0; i < normalisedData.length; i++) {

        const x = width * i - 1.0;

        let height = normalisedData[i];

        if (height < 0) {

            height = 0;

        }

        height *= yZoom;

        // Is line an up or down stroke

        const y = (i + 1) % 2 ? height : -height;

        // Add top of peak

        pointData.push(x + width / 2.0, y);

        // Add line back down

        pointData.push(x + width, 0.0);

    }

    const pointVertexBufferObject = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pointVertexBufferObject);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pointData), gl.STATIC_DRAW);

    const positionAttribLocation = gl.getAttribLocation(program, 'vertPosition');

    gl.vertexAttribPointer(
        positionAttribLocation, // Attribute location
        2, // Number of elements per attribute
        gl.FLOAT, // Type of elements
        gl.FALSE,
        2 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
        0 // Offset from the bgeinning of a single vertex to this attribute
    );

    gl.enableVertexAttribArray(positionAttribLocation);

    // Render waveform

    gl.useProgram(program);
    gl.drawArrays(gl.LINE_STRIP, 0, pointData.length / 2);

    callback();

}

/**
 * Group samples into columns, taking max of each group
 * @param {number[]} samples Samples being drawn
 * @param {number} offset Offset from start of samples array to convert
 * @param {number} length Number of samples being converted
 * @returns An array of max values for each column
 */
function createColumns (samples, offset, length) {

    // Create buffer

    const blockCount = Math.ceil(length / BLOCK_SIZE);

    const filteredData = new Array(blockCount).fill(0);

    for (let i = 0; i < blockCount; i++) {

        const blockStart = BLOCK_SIZE * i;
        let max = 0;

        for (let j = 0; j < BLOCK_SIZE; j++) {

            if (blockStart + j > length) {

                continue;

            }

            max = Math.max(max, Math.abs(samples[offset + blockStart + j]));

        }

        filteredData[i] = max;

    }

    return filteredData;

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

    let data;

    if (length < MAX_RAW_PLOT_LENGTH) {

        // Convert to float array so values can be scaled between -1 and 1 later

        data = new Float32Array(samples.slice(offset, offset + length));
        data = data.map(n => Math.abs(n));

    } else {

        data = createColumns(samples, offset, length);

    }

    renderWaveform(data, yZoom, callback);

}
