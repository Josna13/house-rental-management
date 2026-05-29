/**
 * Safely parse property images regardless of whether they come from
 * MongoDB (already an array), a JSON string, or a bare file-path string.
 * Never throws — always returns a plain string[].
 * @param {string|Array|null|undefined} images
 * @returns {string[]}
 */
export const parseImages = (images) => {
    if (!images) return [];
    if (Array.isArray(images)) return images.filter(Boolean);
    if (typeof images === 'string') {
        const trimmed = images.trim();
        // Looks like a JSON array
        if (trimmed.startsWith('[')) {
            try {
                const parsed = JSON.parse(trimmed);
                return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
            } catch {
                // fall through
            }
        }
        // Plain path string like "uploads/foo.jpg"
        return trimmed ? [trimmed] : [];
    }
    return [];
};

/** Alias kept for backwards compatibility */
export const safeParseImages = parseImages;
