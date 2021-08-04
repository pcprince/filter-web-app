/****************************************************************************
 * amplitudeThresholding.js
 * openacousticdevices.info
 * July 2021
 *****************************************************************************/

// 32 KB buffer, 16-bit samples

const BUFFER_LENGTH = 16000;

/**
 * Apply amplitude trheshold to given samples
 * @param {*} samples Samples to be processed
 * @param {*} threshold Amplitude threshold value
 * @param {*} minTriggerDurationSamples Minimum trigger duration in samples
 * @returns Samples with amplitude threshold applied
 */
function applyAmplitudeThreshold (samples, threshold, minTriggerDurationSamples) {

    // Convert minimum trigger duration buffers

    const minTriggerDurationBuffers = Math.ceil(minTriggerDurationSamples / BUFFER_LENGTH);

    let triggerDuration = 0;

    // Boolean array denoting a period is above the amplitude threshold

    const buffersAreAboveThreshold = [];

    let aboveThreshold = false;

    for (let i = 0; i < samples.length; i++) {

        if (i !== 0) {

            if (i % BUFFER_LENGTH === 0 || i === samples.length - 1) {

                buffersAreAboveThreshold.push(aboveThreshold);

                if (aboveThreshold) {

                    if (triggerDuration > 0) {

                        triggerDuration--;

                    } else {

                        aboveThreshold = false;

                    }

                }

            }

        }

        // If a sample within this block has already exceeded the threshold, don't bother checking the new sample

        if (aboveThreshold) {

            continue;

        }

        if (Math.abs(samples[i]) > threshold) {

            aboveThreshold = true;

            triggerDuration = (minTriggerDurationBuffers > 0) ? minTriggerDurationBuffers : 0;

        }

    }

    // Convert the array of booleans for each buffer to a set of periods which define where the gaps are
    // Gaps are the things being drawn, so they need to be returned
    // [{start: x, length: n}, {start: x, length: n}, ...]

    const buffersBelowThreshold = [];

    // Check if first buffer is below threshold and start array if it is

    if (!buffersAreAboveThreshold[0]) {

        buffersBelowThreshold.push({start: 0, length: BUFFER_LENGTH});

    }

    for (let j = 1; j < buffersAreAboveThreshold.length; j++) {

        if (!buffersAreAboveThreshold[j]) {

            // If the previous buffer was below, combine it

            if (!buffersAreAboveThreshold[j - 1]) {

                buffersBelowThreshold[buffersBelowThreshold.length - 1].length += BUFFER_LENGTH;

            } else {

                buffersBelowThreshold.push({start: j * BUFFER_LENGTH, length: BUFFER_LENGTH});

            }

        }

    }

    return buffersBelowThreshold;

}
