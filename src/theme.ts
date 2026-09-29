export function applyTheme(theme: string) {
  document.documentElement.dataset.theme = theme;
  const light =
    theme === "light" ||
    (theme === "system" && matchMedia("(prefers-color-scheme: light)").matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    "content",
    light ? "#f7f8f5" : "#121212",
  );
}
