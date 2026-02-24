export const slugify = (inputString: string) => {
    return inputString
        .toLowerCase() // Convert to lowercase
        .replace(/[^a-z0-9]/g, '_') // Replace non-alphanumeric characters with underscores
        .replace(/_+/g, '_') // Replace consecutive underscores with a single underscore
        .replace(/^_+|_$/g, ''); // Remove leading and trailing underscores
};
