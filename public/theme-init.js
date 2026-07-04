;(function () {
  try {
    var theme = localStorage.getItem("theme")
    var root = document.documentElement
    var dark =
      theme === "dark" ||
      ((!theme || theme === "system") &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    root.classList.toggle("dark", dark)
    root.classList.toggle("light", !dark)
  } catch (error) {
    // storage unavailable
  }
})()
