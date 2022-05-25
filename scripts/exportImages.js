/****************************************************************************
 * exportImages.js
 * openacousticdevices.info
 * May 2022
 *****************************************************************************/

/* global jsPDF */

window.jsPDF = window.jspdf.jsPDF;

function exportPDF (canvas0array, canvas1array, xAxisSVG, yAxis0SVG, yAxis1SVG, yAxisTitle0, yAxisTitle1, fileName) {

    const xAxisLabelH = 10;
    const yAxisLabelW = 10;
    const xAxisMarkerH = 25;
    const yAxisMarkerW = 40;

    const edgeSpacing = 15;

    const topSpacing = 15 + edgeSpacing;

    const xAxisH = xAxisMarkerH + xAxisLabelH;
    const yAxisW = yAxisMarkerW + yAxisLabelW + edgeSpacing;
    const plotSpacing = 10;

    const canvas0 = canvas0array[0];
    const canvas1 = canvas1array[0];

    const w = canvas0.width + yAxisW + edgeSpacing;
    const h = topSpacing + canvas0.height + plotSpacing + canvas1.height + xAxisH + edgeSpacing;

    const pdfDoc = new jsPDF({
        orientation: 'landscape',
        hotfixes: ['px_scaling'],
        unit: 'px',
        format: [w, h]
    });

    // Draw plots to canvas

    for (let i = 0; i < canvas0array.length; i++) {

        pdfDoc.addImage(canvas0array[i], 'PNG', yAxisW, topSpacing);

    }

    for (let i = 0; i < canvas1array.length; i++) {

        pdfDoc.addImage(canvas1array[i], 'PNG', yAxisW, topSpacing + canvas0.height + plotSpacing);

    }

    // Give plots a border

    pdfDoc.setDrawColor('#CDCDCD');
    pdfDoc.setLineWidth(2);

    pdfDoc.rect(yAxisW, topSpacing + 1, canvas0.width, canvas0.height);

    pdfDoc.rect(yAxisW, topSpacing + canvas0.height + plotSpacing + 1, canvas1.width, canvas1.height);

    // Add x axis labels

    pdfDoc.setDrawColor('#000000');
    pdfDoc.setLineWidth(1);

    const xLines = xAxisSVG.getElementsByTagName('line');
    const xLabels = xAxisSVG.getElementsByTagName('text');

    const xOffset = 16;
    const yOffset = topSpacing + canvas0.height + plotSpacing + canvas1.height;

    pdfDoc.setFont('Helvetica');
    pdfDoc.setFontSize(8);
    pdfDoc.setTextColor('#000000');

    for (let i = 0; i < xLines.length; i++) {

        const x = parseFloat(xLines[i].getAttribute('x1')) + yAxisW - xOffset;
        const labelText = xLabels[i].innerHTML;

        pdfDoc.line(x, yOffset, x, yOffset + 5);

        pdfDoc.text(labelText, x, yOffset + 15, {align: 'center'});

    }

    // Add canvas 0 y axis labels

    const y0Lines = yAxis0SVG.getElementsByTagName('line');
    const y0Labels = yAxis0SVG.getElementsByTagName('text');

    for (let i = 0; i < y0Lines.length; i++) {

        let y = parseFloat(y0Lines[i].getAttribute('y1'));
        const labelText = y0Labels[i].innerHTML;

        let baseline = 'middle';

        if (y - 10 <= 0) {

            baseline = 'top';

        } else if (y + 10 >= canvas0.height) {

            baseline = 'bottom';

        }

        y += topSpacing;

        pdfDoc.line(yAxisW, y, yAxisW - 5, y);

        pdfDoc.text(labelText, yAxisW - 7, y, {align: 'right', baseline: baseline});

    }

    // Add canvas 1 y axis labels

    const y1Lines = yAxis1SVG.getElementsByTagName('line');
    const y1Labels = yAxis1SVG.getElementsByTagName('text');

    for (let i = 0; i < y1Lines.length; i++) {

        let y = parseFloat(y1Lines[i].getAttribute('y1'));

        const labelText = y1Labels[i].innerHTML;
        let labelY = parseFloat(y1Labels[i].getAttribute('y'));

        y += topSpacing + canvas0.height + plotSpacing;
        labelY += topSpacing + canvas0.height + plotSpacing;

        pdfDoc.line(yAxisW, y, yAxisW - 5, y);

        pdfDoc.text(labelText, yAxisW - 7, labelY, {align: 'right', baseline: 'middle'});

    }

    // Add titles

    pdfDoc.text(fileName + '.WAV', yAxisW + (canvas0.width / 2), edgeSpacing, {align: 'center', baseline: 'top'});

    pdfDoc.text('Time (secs)', yAxisW + (canvas0.width / 2), topSpacing + canvas0.height + plotSpacing + canvas1.height + xAxisMarkerH, {align: 'center', baseline: 'top'});

    pdfDoc.text(yAxisTitle0, edgeSpacing + 5, topSpacing + (canvas0.height / 2) + 20, null, 90);

    pdfDoc.text(yAxisTitle1, edgeSpacing + 5, topSpacing + canvas0.height + plotSpacing + (canvas1.height / 2) + 25, null, 90);

    pdfDoc.save(fileName + '.pdf');

}

/**
 * Save both visible plots as "fileName.png"
 * @param {canvas[]} canvas0array Ordered array of canvas layers for top plot
 * @param {canvas[]} canvas1array Ordered array of canvas layers for bottom plot
 * @param {canvas} xAxisSVG SVG canvas containing x axis labels
 * @param {canvas} yAxis0SVG SVG canvas containing y axis labels of top plot
 * @param {canvas} yAxis1SVG SVG canvas containing y axis labels of bottom plot
 * @param {string} yAxisTitle0 Title of top plot's y axis
 * @param {string} yAxisTitle1 Title of bottom plot's y axis
 * @param {string} fileName Name of file being drawn
 */
function exportPNG (canvas0array, canvas1array, xAxisSVG, yAxis0SVG, yAxis1SVG, yAxisTitle0, yAxisTitle1, fileName) {

    // Calculate size of overall canvas

    const xAxisLabelH = 10;
    const yAxisLabelW = 10;
    const xAxisMarkerH = 25;
    const yAxisMarkerW = 40;

    const edgeSpacing = 15;

    const topSpacing = 15 + edgeSpacing;

    const xAxisH = xAxisMarkerH + xAxisLabelH;
    const yAxisW = yAxisMarkerW + yAxisLabelW + edgeSpacing;
    const plotSpacing = 10;

    const canvas0 = canvas0array[0];
    const canvas1 = canvas1array[0];

    const w = canvas0.width + yAxisW + edgeSpacing;
    const h = topSpacing + canvas0.height + plotSpacing + canvas1.height + xAxisH + edgeSpacing;

    // Create canvas

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');

    // Fill background

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, w, h);

    // Draw plots to canvas

    for (let i = 0; i < canvas0array.length; i++) {

        ctx.drawImage(canvas0array[i], yAxisW, topSpacing);

    }

    for (let i = 0; i < canvas1array.length; i++) {

        ctx.drawImage(canvas1array[i], yAxisW, topSpacing + canvas0.height + plotSpacing);

    }

    // Give plots a border

    ctx.strokeStyle = '#CDCDCD';

    ctx.rect(yAxisW, topSpacing + 1, canvas0.width, canvas0.height);
    ctx.stroke();

    ctx.rect(yAxisW, topSpacing + canvas0.height + plotSpacing + 1, canvas1.width, canvas1.height);
    ctx.stroke();

    // Add x axis labels

    ctx.strokeStyle = 'black';

    const xLines = xAxisSVG.getElementsByTagName('line');
    const xLabels = xAxisSVG.getElementsByTagName('text');

    const xOffset = 16;
    const yOffset = topSpacing + canvas0.height + plotSpacing + canvas1.height;

    ctx.font = '10px Arial';
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';

    for (let i = 0; i < xLines.length; i++) {

        const x = parseFloat(xLines[i].getAttribute('x1')) + yAxisW - xOffset;
        const labelText = xLabels[i].innerHTML;

        ctx.beginPath();
        ctx.moveTo(x, yOffset);
        ctx.lineTo(x, yOffset + 5);
        ctx.stroke();

        ctx.fillText(labelText, x, yOffset + 15);

    }

    // Add canvas 0 y axis labels

    ctx.strokeStyle = 'black';

    const y0Lines = yAxis0SVG.getElementsByTagName('line');
    const y0Labels = yAxis0SVG.getElementsByTagName('text');

    ctx.textAlign = 'right';

    for (let i = 0; i < y0Lines.length; i++) {

        let y = parseFloat(y0Lines[i].getAttribute('y1'));
        const labelText = y0Labels[i].innerHTML;

        if (y - 10 <= 0) {

            ctx.textBaseline = 'top';

        } else if (y + 10 >= canvas0.height) {

            ctx.textBaseline = 'bottom';

        } else {

            ctx.textBaseline = 'middle';

        }

        y += topSpacing;

        ctx.beginPath();
        ctx.moveTo(yAxisW, y);
        ctx.lineTo(yAxisW - 5, y);
        ctx.stroke();

        ctx.fillText(labelText, yAxisW - 7, y);

    }

    // Add canvas 1 y axis labels

    const y1Lines = yAxis1SVG.getElementsByTagName('line');
    const y1Labels = yAxis1SVG.getElementsByTagName('text');

    ctx.textBaseline = 'middle';

    for (let i = 0; i < y1Lines.length; i++) {

        let y = parseFloat(y1Lines[i].getAttribute('y1'));

        const labelText = y1Labels[i].innerHTML;
        let labelY = parseFloat(y1Labels[i].getAttribute('y'));

        y += topSpacing + canvas0.height + plotSpacing;
        labelY += topSpacing + canvas0.height + plotSpacing;

        ctx.beginPath();
        ctx.moveTo(yAxisW, y);
        ctx.lineTo(yAxisW - 5, y);
        ctx.stroke();

        ctx.fillText(labelText, yAxisW - 7, labelY);

    }

    // Add titles

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    ctx.fillText(fileName + '.WAV', yAxisW + (canvas0.width / 2), edgeSpacing);

    ctx.fillText('Time (secs)', yAxisW + (canvas0.width / 2), topSpacing + canvas0.height + plotSpacing + canvas1.height + xAxisMarkerH);

    ctx.save();
    ctx.translate(edgeSpacing, topSpacing + (canvas0.height / 2));
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yAxisTitle0, 0, 0);
    ctx.restore();

    ctx.save();
    ctx.translate(edgeSpacing, topSpacing + canvas0.height + plotSpacing + (canvas1.height / 2));
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yAxisTitle1, 0, 0);
    ctx.restore();

    // Save image

    const link = document.createElement('a');
    link.download = fileName + '.png';
    link.href = canvas.toDataURL();
    link.click();
    link.remove();

}
