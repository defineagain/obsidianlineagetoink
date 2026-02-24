/** Open a browser file picker and return the file content via callback */
export function loadFromDisk(
    accept: string,
    callback: (filename: string, content: string) => void,
): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.addEventListener('change', (e: Event) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const content = String(evt.target?.result || '');
            callback(file.name, content);
        };
        reader.readAsText(file);
    });
    input.click();
}
