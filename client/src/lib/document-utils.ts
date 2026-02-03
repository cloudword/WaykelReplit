/**
 * Robustly detects file types from URLs, handling signed URLs with query parameters.
 */
export function getFileTypeFromUrl(url: string | null | undefined): { isImage: boolean; isPdf: boolean; extension: string } {
    if (!url) {
        return { isImage: false, isPdf: false, extension: '' };
    }

    try {
        // Remove query parameters to get the "pure" path
        const pureUrl = url.split('?')[0];
        const extension = pureUrl.split('.').pop()?.toLowerCase() || '';

        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
        const isImage = imageExtensions.includes(extension);
        const isPdf = extension === 'pdf';

        return { isImage, isPdf, extension };
    } catch (e) {
        console.warn('[FileType] Error parsing URL:', url, e);
        return { isImage: false, isPdf: false, extension: '' };
    }
}

/**
 * Checks if a document type/URL or contentType indicates an image.
 */
export function isImageDocument(doc: { url?: string; contentType?: string }): boolean {
    if (doc.contentType?.startsWith('image/')) return true;
    return getFileTypeFromUrl(doc.url).isImage;
}

/**
 * Checks if a document type/URL or contentType indicates a PDF.
 */
export function isPdfDocument(doc: { url?: string; contentType?: string }): boolean {
    if (doc.contentType === 'application/pdf') return true;
    return getFileTypeFromUrl(doc.url).isPdf;
}
