/****************************************************************************
 * exportImages.js
 * openacousticdevices.info
 * May 2022
 *****************************************************************************/

/* global jsPDF */

window.jsPDF = window.jspdf.jsPDF;

function exportPDF (canvas0array, canvas1array, xAxisSVG, yAxis0SVG, yAxis1SVG, yAxisTitle0, yAxisTitle1, fileName) {

    console.log('Exporting to PDF');

    const xAxisLabelH = 10;
    const yAxisLabelW = 15;
    const xAxisMarkerH = 25;
    const yAxisMarkerW = 40;

    const edgeSpacing = 15;

    const topSpacing = 25 + edgeSpacing;

    const xAxisH = xAxisMarkerH + xAxisLabelH;
    const yAxisW = yAxisMarkerW + yAxisLabelW + edgeSpacing;

    const canvas0 = canvas0array[0];
    const canvas1 = canvas1array[0];

    const w = canvas0.width + yAxisW + edgeSpacing;
    const h = w / 4 * 3;

    const plotSpacing = h - (topSpacing + canvas0.height + canvas1.height + xAxisH + edgeSpacing);

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

    pdfDoc.setDrawColor('#000000');

    pdfDoc.rect(yAxisW, topSpacing, canvas0.width, canvas0.height);
    pdfDoc.rect(yAxisW, topSpacing + canvas0.height + plotSpacing, canvas1.width, canvas1.height);

    // Add x axis labels

    pdfDoc.setDrawColor('#000000');

    const xLines = xAxisSVG.getElementsByTagName('line');
    const xLabels = xAxisSVG.getElementsByTagName('text');

    const xOffset = 45;
    const yOffset = topSpacing + canvas0.height + plotSpacing + canvas1.height;

    pdfDoc.setFont('Helvetica');
    pdfDoc.setFontSize(8);
    pdfDoc.setTextColor('#000000');

    for (let i = 0; i < xLines.length; i++) {

        let x = parseFloat(xLines[i].getAttribute('x1')) + yAxisW - xOffset;
        const labelText = xLabels[i].innerHTML;

        x = (i === 0) ? x - 1 : x;
        x = (i === xLines.length - 1) ? x + 0.5 : x;

        pdfDoc.line(x, yOffset, x, yOffset + 5);

        pdfDoc.text(labelText, x, yOffset + 15, {align: 'center'});

    }

    // Add canvas 0 y axis labels

    const y0Lines = yAxis0SVG.getElementsByTagName('line');
    const y0Labels = yAxis0SVG.getElementsByTagName('text');

    for (let i = 0; i < y0Lines.length; i++) {

        let y = parseFloat(y0Lines[i].getAttribute('y1'));
        const labelText = y0Labels[i].innerHTML;

        y += topSpacing;

        y = (i === y0Lines.length - 1) ? y - 0.5 : y;
        y = (i === 0) ? y + 0.5 : y;

        pdfDoc.line(yAxisW, y, yAxisW - 5, y);

        pdfDoc.text(labelText, yAxisW - 7, y, {align: 'right', baseline: 'middle'});

    }

    // Add canvas 1 y axis labels

    const y1Lines = yAxis1SVG.getElementsByTagName('line');
    const y1Labels = yAxis1SVG.getElementsByTagName('text');

    for (let i = 0; i < y1Lines.length; i++) {

        let y = parseFloat(y1Lines[i].getAttribute('y1'));
        y += topSpacing + canvas0.height + plotSpacing;

        const labelText = y1Labels[i].innerHTML;

        y = (i === 0) ? y + 0.5 : y;
        y = (i === y1Lines.length - 1) ? y - 0.5 : y;

        pdfDoc.line(yAxisW, y, yAxisW - 5, y);

        pdfDoc.text(labelText, yAxisW - 7, y, {align: 'right', baseline: 'middle'});

    }

    // Add titles

    pdfDoc.text('Time (secs)', yAxisW + (canvas0.width / 2), topSpacing + canvas0.height + plotSpacing + canvas1.height + xAxisMarkerH, {align: 'center', baseline: 'top'});

    pdfDoc.text(yAxisTitle0, edgeSpacing + 5, topSpacing + (canvas0.height / 2) + 20, null, 90);

    pdfDoc.text(yAxisTitle1, edgeSpacing + 5, topSpacing + canvas0.height + plotSpacing + (canvas1.height / 2) + 25, null, 90);

    pdfDoc.setFontSize(10);
    pdfDoc.text(fileName + '.WAV', yAxisW + (canvas0.width / 2), edgeSpacing, {align: 'center', baseline: 'top'});

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

    console.log('Exporting to PNG');

    // Calculate size of overall canvas

    const xAxisLabelH = 10;
    const yAxisLabelW = 15;
    const xAxisMarkerH = 25;
    const yAxisMarkerW = 40;

    const edgeSpacing = 15;

    const topSpacing = 25 + edgeSpacing;

    const xAxisH = xAxisMarkerH + xAxisLabelH;
    const yAxisW = yAxisMarkerW + yAxisLabelW + edgeSpacing;

    const canvas0 = canvas0array[0];
    const canvas1 = canvas1array[0];

    const w = canvas0.width + yAxisW + edgeSpacing;
    const h = w / 4 * 3;

    const plotSpacing = h - (topSpacing + canvas0.height + canvas1.height + xAxisH + edgeSpacing);

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

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;

    ctx.rect(yAxisW, topSpacing, canvas0.width, canvas0.height);
    ctx.stroke();

    ctx.rect(yAxisW, topSpacing + canvas0.height + plotSpacing, canvas1.width, canvas1.height);
    ctx.stroke();

    // Add x axis labels

    ctx.strokeStyle = 'black';

    const xLines = xAxisSVG.getElementsByTagName('line');
    const xLabels = xAxisSVG.getElementsByTagName('text');

    const xOffset = 45;
    const yOffset = topSpacing + canvas0.height + plotSpacing + canvas1.height;

    ctx.font = '11px Helvetica';
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
    ctx.textBaseline = 'middle';

    for (let i = 0; i < y0Lines.length; i++) {

        let y = parseFloat(y0Lines[i].getAttribute('y1'));
        const labelText = y0Labels[i].innerHTML;

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

    ctx.font = '12px Helvetica';
    ctx.fillText(fileName + '.WAV', yAxisW + (canvas0.width / 2), edgeSpacing);

    // Save image

    const link = document.createElement('a');
    link.download = fileName + '.png';
    link.href = canvas.toDataURL();
    link.click();
    link.remove();

}
