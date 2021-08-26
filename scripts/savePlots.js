/****************************************************************************
 * savePlots.js
 * openacousticdevices.info
 * August 2021
 *****************************************************************************/

function saveCanvas (canvas) {

    // Save canvas

    const link = document.createElement('a');

    const fileNameLabel = document.getElementById('file-label');
    const fileName = fileNameLabel.innerText.split('.')[0] + '.png';

    link.setAttribute('download', fileName);
    link.setAttribute('href', canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream'));
    document.body.appendChild(link);

    // Click link

    link.click();

}

function saveSpectrogram () {

    const specCanvas = document.getElementById('spectrogram-canvas');
    saveCanvas(specCanvas);

}

function saveWaveform () {

    const waveformCanvas = document.getElementById('waveform-canvas');
    saveCanvas(waveformCanvas);

}
