export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Space Grotesk", "system-ui", "sans-serif"],
        body: ["Work Sans", "system-ui", "sans-serif"]
      },
      colors: {
        ink: "#1d1b16",
        sand: "#f5efe6",
        clay: "#d2b48c",
        moss: "#3a5a40",
        ember: "#c8553d"
      },
      boxShadow: {
        glow: "0 20px 50px -30px rgba(58,90,64,0.5)"
      }
    }
  },
  plugins: []
};
