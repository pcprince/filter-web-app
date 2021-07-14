/****************************************************************************
 * waveform.js
 * openacousticdevices.info
 * June 2021
 *****************************************************************************/

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

function drawWaveform (samples, drawingCanvas, gapLength, callback) {

    // Prepare WebGL

    /** @type {WebGLRenderingContext} */
    let gl = drawingCanvas.getContext('webgl');

    if (!gl) {

        console.log('Loading experimental WebGL context');
        gl = drawingCanvas.getContext('experimental-webgl');

    }

    if (!gl) {

        console.error('WebGL not supported by this browser');
        return;

    }

    gl.viewport(0, 0, drawingCanvas.width, drawingCanvas.height);

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

    // Create buffer

    let blockCount = 20000;

    const sampleCount = samples.length + gapLength;

    blockCount = blockCount > sampleCount ? sampleCount : blockCount;
    const blockSize = Math.floor(sampleCount / blockCount);

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

    // Main render loop

    gl.useProgram(program);
    gl.drawArrays(gl.LINES, 0, pointData.length / 2);




    // const ctx = canvas.getContext('2d');

    // // Reset context transformations
    // canvas.width = canvas.width;

    // // ctx.scale(zoom, 1.0);
    // ctx.translate(0, canvas.height / 2); // Set Y = 0 to be in the middle of the canvas

    // const width = canvas.width / normalisedData.length;

    // for (let i = 0; i < normalisedData.length; i++) {

    //     const x = width * i;

    //     let height = normalisedData[i] * canvas.height - padding;

    //     if (height < 0) {

    //         height = 0;

    //     } else if (height > canvas.height / 2) {

    //         height = canvas.height / 2;

    //     }

    //     drawLineSegment(ctx, x, height, width, (i + 1) % 2);

    // }

    callback();

}
