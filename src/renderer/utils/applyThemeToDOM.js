function resolveTheme(themeName) {
  if (themeName === 'system') {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  return themeName;
}

export function applyThemeToDOM(themeName) {
  const resolved = resolveTheme(themeName);
  if (resolved === 'dark') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', resolved);
  }
}
