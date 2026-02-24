export interface ValidationResult {
    isValid: boolean;
    message: string;
    type: 'success' | 'warning' | 'error';
}

export function validateNodeTopology(content: string, depth: number): ValidationResult {
    const trimmed = content.trim();
    if (!trimmed) {
        return { isValid: true, message: 'Card is empty.', type: 'success' };
    }

    if (depth === 0) {
        // Column 1: Should be a Knot
        if (trimmed.startsWith('===')) {
            return { isValid: true, message: 'Valid Knot in Column 1.', type: 'success' };
        } else {
            return { 
                isValid: false, 
                message: 'Column 1 should typically be a Knot (=== Title ===).', 
                type: 'warning' 
            };
        }
    }

    if (depth === 1) {
        // Column 2: Should be a Stitch
        if (trimmed.startsWith('=') && !trimmed.startsWith('===')) {
            return { isValid: true, message: 'Valid Stitch in Column 2.', type: 'success' };
        } else if (trimmed.startsWith('===')) {
            return { 
                isValid: false, 
                message: 'Found a Knot (===) in Column 2. Knots should be in Column 1.', 
                type: 'error' 
            };
        } else {
            return { 
                isValid: false, 
                message: 'Column 2 should typically be a Stitch (= Title).', 
                type: 'warning' 
            };
        }
    }

    // Column 3+: Weave (Choices, Gathers, or plain text)
    if (trimmed.startsWith('===') || (trimmed.startsWith('=') && !trimmed.startsWith('==='))) {
        return { 
            isValid: false, 
            message: 'Found a Knot or Stitch in the Weave (Column 3+). These should only be in Columns 1 and 2.', 
            type: 'error' 
        };
    }

    const weaveMarkerRegex = /^(\*|\+|\-)\s*/;
    if (weaveMarkerRegex.test(trimmed)) {
        return { isValid: true, message: 'Valid Weave marker found.', type: 'success' };
    }

    return { 
        isValid: true, 
        message: 'Plain text in Weave. This is valid for content following a choice or gather.', 
        type: 'success' 
    };
}
