// src/utils/parser.js

/**
 * Extracts the primary price from raw text strings like "ETB 179,998 -20% ETB 225,000"
 */
function parsePrice(rawPrice) {
    if (typeof rawPrice === 'number') return rawPrice;
    if (!rawPrice) return 0;

    // Split multi-price/discount strings and pick the first match
    const cleanStr = String(rawPrice).replace(/,/g, '');
    const matches = cleanStr.match(/\d+/g);

    if (!matches || matches.length === 0) return 0;

    // Return the first valid number
    return parseInt(matches[0], 10);
}

function extractPhoneNumber(text) {
    if (!text) return null;
    const match = text.match(/(?:\+?251|0)?9\d{8}/);
    return match ? match[0] : null;
}

module.exports = { parsePrice, extractPhoneNumber };