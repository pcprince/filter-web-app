/****************************************************************************
 * drawSVG.js
 * openacousticdevices.info
 * October 2022
 *****************************************************************************/

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Draw text to an SVG holder
 * @param {Element} parent SVG element to be drawn to
 * @param {string} content Text to be written
 * @param {number} x x coordinate
 * @param {number} y y coordinate
 * @param {string} anchor What end of the text it should be anchored to. Possible values: start/middle/end
 * @param {string} baseline What end of the text it should be anchored to. Possible values: text-top/middle/text-bottom
 */
function addSVGText (parent, content, x, y, anchor, baseline) {

    const textElement = document.createElementNS(SVG_NS, 'text');

    textElement.setAttributeNS(null, 'x', x);
    textElement.setAttributeNS(null, 'y', y);
    textElement.setAttributeNS(null, 'dominant-baseline', baseline);
    textElement.setAttributeNS(null, 'text-anchor', anchor);
    textElement.setAttributeNS(null, 'font-size', '10px');

    textElement.textContent = content;

    parent.appendChild(textElement);

}

/**
 * Draw line to an SVG holder
 * @param {Element} parent SVG element to be drawn to
 * @param {number} x1 X coordinate of line start
 * @param {number} y1 Y coordinate of line start
 * @param {number} x2 X coordinate of line end
 * @param {number} y2 Y coordinate of line end
 */
function addSVGLine (parent, x1, y1, x2, y2) {

    const lineElement = document.createElementNS(SVG_NS, 'line');

    lineElement.setAttributeNS(null, 'x1', x1);
    lineElement.setAttributeNS(null, 'y1', y1);
    lineElement.setAttributeNS(null, 'x2', x2);
    lineElement.setAttributeNS(null, 'y2', y2);
    lineElement.setAttributeNS(null, 'stroke', 'black');

    parent.appendChild(lineElement);

}

/**
 * Remove all SVG drawing elements from an SVG holder
 * @param {Element} parent SVG element containing labels to be cleared
 */
function clearSVG (parent) {

    while (parent.firstChild) {

        parent.removeChild(parent.lastChild);

    }

}
