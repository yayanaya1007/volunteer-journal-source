// Attach only to the trip-photo tab and its panel. A file drop belongs to the day
// selected when the files arrive, even if the calendar changes during compression.
export function journalPhotoDropHandlers(onFiles, disabled) {
  function dragOver(event) {
    if (!Array.from(event.dataTransfer.types).includes('Files')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = disabled ? 'none' : 'copy';
    event.currentTarget.toggleAttribute('data-photo-drag-over', !disabled);
  }
  return {
    onDragEnter: dragOver,
    onDragOver: dragOver,
    onDragLeave(event) {
      if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) {
        event.currentTarget.removeAttribute('data-photo-drag-over');
      }
    },
    onDrop(event) {
      event.currentTarget.removeAttribute('data-photo-drag-over');
      if (!event.dataTransfer.files.length) return;
      event.preventDefault();
      event.stopPropagation();
      if (!disabled) onFiles(Array.from(event.dataTransfer.files));
    },
  };
}

export function journalPhotoFile(file) {
  if (file.type) return file;
  const extension = file.name.split('.').pop().toLowerCase();
  const type = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' }[extension];
  return type ? new File([file], file.name, { type, lastModified: file.lastModified }) : file;
}
