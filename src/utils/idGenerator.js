const Counter = require("../models/Counter");

/**
 * Generates a human-readable custom ID.
 *
 * @param {string} sequenceId     - Unique key for the counter in DB (e.g., "user_seq")
 * @param {string} entityPrefix   - Primary prefix (e.g., "USR", "RSC")
 * @param {string} subPrefix      - Optional secondary prefix (e.g., "US", "AD"). Pass "" to skip.
 * @param {number} paddingLength  - Zero-padding length for the sequence number (default: 3)
 * @returns {Promise<string>}     - e.g., "USR-US-001", "RSC-001"
 */
const generateCustomId = async (sequenceId, entityPrefix, subPrefix = "", paddingLength = 3) => {
    try {
        const counter = await Counter.findOneAndUpdate(
            { _id: sequenceId },
            { $inc: { seq: 1 } },
            { returnDocument: "after", upsert: true }
        );

        const zeroPaddedSeq = String(counter.seq).padStart(paddingLength, "0");

        return subPrefix
            ? `${entityPrefix}-${subPrefix.toUpperCase()}-${zeroPaddedSeq}`
            : `${entityPrefix}-${zeroPaddedSeq}`;
    } catch (error) {
        throw new Error(`Custom ID generation failed for "${sequenceId}": ${error.message}`);
    }
};

module.exports = generateCustomId;
