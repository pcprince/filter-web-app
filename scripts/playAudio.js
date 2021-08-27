/****************************************************************************
 * playAudio.js
 * openacousticdevices.info
 * August 2021
 *****************************************************************************/

/* global OfflineAudioContext */

let audioContext;
let source;

/**
 * Scale a given value between a max and min
 * @param {number} x Value to be scaled
 * @param {number} max Upper end of possible values
 * @param {number} min Lower end of possible values
 * @returns x scaled between min and max
 */
function scaleValue (x, max, min) {

    return (2 * ((x - min) / (max - min))) - 1;

}

/**
 * Resample an audio buffer to a given target sample rate and then run callback
 * @param {object} audioBuffer Audio buffer containing samples
 * @param {number} targetSampleRate Sample rate buffer should be resampled to
 * @param {function} onComplete Callback function
 */
function resample (audioBuffer, targetSampleRate, onComplete) {

    const channel = audioBuffer.numberOfChannels;
    const samples = audioBuffer.length * targetSampleRate / audioBuffer.sampleRate;

    const offlineContext = new OfflineAudioContext(channel, samples, targetSampleRate);
    const bufferSource = offlineContext.createBufferSource();
    bufferSource.buffer = audioBuffer;

    bufferSource.connect(offlineContext.destination);
    bufferSource.start(0);

    offlineContext.startRendering().then((renderedBuffer) => {

        onComplete(renderedBuffer);

    });

}

/**
 * Given a set of samples, play from start index for the given length
 * @param {number[]} samples Array of 16-bit samples
 * @param {number} start Start index for playback
 * @param {number} length Number of samples which should be played
 * @param {number} sampleRate Sample rate of audio
 * @param {function} endEvent Callback for when playback ends or is manually stopped
 */
function playAudio (samples, start, length, sampleRate, playbackRate, endEvent) {

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContext();

    const audioBuffer = audioContext.createBuffer(1, length, sampleRate * playbackRate);

    const nowBuffering = audioBuffer.getChannelData(0);

    for (let i = 0; i < length; i++) {

        nowBuffering[i] = scaleValue(samples[start + i], -32768, 32768);

    }

    resample(audioBuffer, audioContext.sampleRate, (resampledBuffer) => {

        source = audioContext.createBufferSource();

        source.addEventListener('ended', () => {

            audioContext.close();

            endEvent();

        });

        source.buffer = resampledBuffer;

        source.connect(audioContext.destination);

        source.start();

    });

}

/**
 * Stop current playback
 */
function stopAudio () {

    source.stop();

}

/**
 * Get timestamp of current playback
 * @returns Time of current playback in seconds
 */
function getTimestamp () {

    return audioContext.getOutputTimestamp().contextTime;

}
