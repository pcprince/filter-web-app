/****************************************************************************
 * wavReader.js
 * openacousticdevices.info
 * June 2021
 *****************************************************************************/

/* WAV header constants */

const UINT16_LENGTH = 2;
const UINT32_LENGTH = 4;
const RIFF_ID_LENGTH = 4;
const LENGTH_OF_ARTIST = 32;
const LENGTH_OF_COMMENT = 384;
const LENGTH_OF_WAV_HEADER = 488;

/* WAV header component read functions */

function readString (state, length) {

    const utf8decoder = new TextDecoder();

    const bufferSplit = state.buffer.slice(state.index, state.index + length);
    const intBuffer = new Uint16Array(bufferSplit);
    const result = utf8decoder.decode(intBuffer).replace(/\0/g, '');

    state.index += length;
    return result;

}

function readInt32LE (state) {

    const bufferSplit = state.buffer.slice(state.index, state.index + UINT32_LENGTH);
    const dataView = new DataView(bufferSplit);
    const result = dataView.getInt32(0, true);

    state.index += UINT32_LENGTH;
    return result;

}

function readInt16LE (state) {

    const bufferSplit = state.buffer.slice(state.index, state.index + UINT32_LENGTH);
    const dataView = new DataView(bufferSplit);
    const result = dataView.getInt16(0, true);

    state.index += UINT16_LENGTH;
    return result;

}

function readUInt32LE (state) {

    const bufferSplit = state.buffer.slice(state.index, state.index + UINT32_LENGTH);
    const dataView = new DataView(bufferSplit);
    const result = dataView.getUint32(0, true);

    state.index += UINT32_LENGTH;
    return result;

}

function readUInt16LE (state) {

    const bufferSplit = state.buffer.slice(state.index, state.index + UINT32_LENGTH);
    const dataView = new DataView(bufferSplit);
    const result = dataView.getUint16(0, true);

    state.index += UINT16_LENGTH;
    return result;

}

function readChunk (state) {

    const result = {};
    result.id = readString(state, RIFF_ID_LENGTH);
    result.size = readUInt32LE(state);
    return result;

}

/* WAV header read and write functions */

function readHeader (buffer) {

    const header = {};

    const state = {buffer: buffer, index: 0};

    header.riff = readChunk(state);

    header.format = readString(state, RIFF_ID_LENGTH);

    header.fmt = readChunk(state);

    header.wavFormat = {};
    header.wavFormat.format = readUInt16LE(state);
    header.wavFormat.numberOfChannels = readUInt16LE(state);
    header.wavFormat.samplesPerSecond = readUInt32LE(state);
    header.wavFormat.bytesPerSecond = readUInt32LE(state);
    header.wavFormat.bytesPerCapture = readUInt16LE(state);
    header.wavFormat.bitsPerSample = readUInt16LE(state);

    header.list = readChunk(state);

    header.info = readString(state, RIFF_ID_LENGTH);

    header.icmt = readChunk(state);
    header.icmt.comment = readString(state, LENGTH_OF_COMMENT);

    header.iart = readChunk(state);
    header.iart.artist = readString(state, LENGTH_OF_ARTIST);

    header.data = readChunk(state);

    return header;

}

function readSamples (buffer, fileLength) {

    const state = {buffer: buffer, index: 0};

    const samples = [];

    while (state.index < fileLength) {

        samples.push(readInt16LE(state));

    }

    return samples;

}

/* Function to check header */

function checkHeader (header, fileSize) {

    if (header.riff.id !== 'RIFF') {

        return {
            success: false,
            error: 'Could not read input file.'
            // error: 'Could not find RIFF chunk in the input file.'
        };

    }

    if (header.riff.size + RIFF_ID_LENGTH + UINT32_LENGTH !== fileSize) {

        return {
            success: false,
            error: 'Could not read input file.'
            // error: 'RIFF chunk file size is incorrect.'
        };

    }

    if (header.format !== 'WAVE') {

        return {
            success: false,
            error: 'Could not read input file.'
            // error: 'Could not find WAVE format indicator in the input file.'
        };

    }

    if (header.fmt.id !== 'fmt ') {

        return {
            success: false,
            error: 'Could not read input file.'
            // error: 'Could not find fmt segment in the input file.'
        };

    }

    if (header.icmt.id !== 'ICMT') {

        return {
            success: false,
            error: 'Could not read input file.'
            // error: 'Could not find comment segment in the input file.'
        };

    }

    if (header.data.id !== 'data') {

        return {
            success: false,
            error: 'Could not read input file.'
            // error: 'Could not find data segment in the input file.'
        };

    }

    if (header.data.size + LENGTH_OF_WAV_HEADER !== fileSize) {

        return {
            success: false,
            error: 'Could not read input file.'
            // error: 'DATA chunk file size is incorrect.'
        };

    }

    return {
        success: true,
        error: null
    };

}

async function readWav (fileHandler, maxFileSize) {

    /* Open input file */

    let file, contents;

    try {

        file = await fileHandler.getFile();
        contents = await file.arrayBuffer();

    } catch (e) {

        return {
            success: false,
            error: 'Could not read input file.',
            header: null,
            samples: null
        };

    }

    const fileSize = contents.byteLength;

    if (fileSize === 0) {

        return {
            success: false,
            error: 'Input file has zero size.',
            header: null,
            samples: null
        };

    }

    if (fileSize > maxFileSize) {

        return {
            success: false,
            error: 'Input file is too large.',
            header: null,
            samples: null
        };

    }

    /* Read the header */

    let headerBuffer;

    try {

        headerBuffer = contents.slice(0, LENGTH_OF_WAV_HEADER);

    } catch (e) {

        return {
            success: false,
            error: 'Could not read the input WAV header.',
            header: null,
            samples: null
        };

    }

    /* Check the header */

    const header = readHeader(headerBuffer);

    const headerCheck = checkHeader(header, fileSize);

    if (headerCheck.success === false) {

        return {
            success: false,
            error: headerCheck.error,
            header: null,
            samples: null
        };

    }

    const samples = readSamples(contents.slice(LENGTH_OF_WAV_HEADER), header.data.size);

    return {
        success: true,
        error: null,
        header: header,
        samples: samples
    };

}