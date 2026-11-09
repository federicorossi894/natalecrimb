/** Must be called directly from the click, with a file already generated locally. */
export async function deliverLocalFile(file: File): Promise<void> {
  if (matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: file.name }); return; }
    catch (error) { if (error instanceof DOMException && error.name === 'AbortError') return; }
  }
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}