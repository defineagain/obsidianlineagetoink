import { detectBlockType, type BlockType } from './block-formatter';

export interface ValidationResult {
    isValid: boolean;
    message: string;
    type: 'success' | 'warning' | 'error';
    detectedType: BlockType;
}

/**
 * Validate that a card's detected block type is appropriate for its column depth.
 * Uses detectBlockType (single source of truth) instead of duplicating regex patterns.
 */
export function validateNodeTopology(content: string, depth: number): ValidationResult {
    const trimmed = content.trim();
    const detectedType = detectBlockType(content);

    if (!trimmed) {
        return { isValid: true, message: 'Card is empty.', type: 'success', detectedType: 'plain' };
    }

    if (depth === 0) {
        // Column 1: Should be a Knot
        if (detectedType === 'knot') {
            return { isValid: true, message: 'Valid Knot in Column 1.', type: 'success', detectedType };
        } else {
            return { 
                isValid: false, 
                message: `Column 1 should be a Knot (=== Title ===). Detected: ${detectedType}.`, 
                type: 'warning',
                detectedType
            };
        }
    }

    if (depth === 1) {
        // Column 2: Stitch OR Weave element
        const isWeave = detectedType === 'choice' || detectedType === 'sticky' || detectedType === 'gather' || detectedType === 'divert';
        if (detectedType === 'stitch' || isWeave) {
            return { isValid: true, message: `Valid ${detectedType} in Column 2.`, type: 'success', detectedType };
        } else if (detectedType === 'knot') {
            return { 
                isValid: false, 
                message: 'Found a Knot in Column 2. Knots should be in Column 1.', 
                type: 'error',
                detectedType
            };
        } else {
            // Plain text is allowed as immediate continuation
            return { 
                isValid: true, 
                message: 'Plain text in Column 2. Valid for story content.', 
                type: 'success',
                detectedType
            };
        }
    }

    // Column 3+: Weave (Choices, Gathers, Diverts, or plain text)
    if (detectedType === 'knot' || detectedType === 'stitch') {
        return { 
            isValid: false, 
            message: `Found a ${detectedType} in Weave (Column ${depth + 1}). Structural markers belong in Columns 1-2.`, 
            type: 'error',
            detectedType
        };
    }

    if (detectedType === 'choice' || detectedType === 'sticky' || detectedType === 'gather' || detectedType === 'divert') {
        return { isValid: true, message: `Valid ${detectedType} in Weave.`, type: 'success', detectedType };
    }

    return { 
        isValid: true, 
        message: 'Plain text in Weave. Valid for content following a choice or gather.', 
        type: 'success',
        detectedType
    };
}
