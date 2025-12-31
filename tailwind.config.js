/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: 'class',
    content: [
        "./src/**/*.{html,ts}",
    ],
    theme: {
        extend: {
            colors: {
                primary: "hsl(var(--color-primary) / <alpha-value>)",
                secondary: "hsl(var(--color-secondary) / <alpha-value>)",
                // We'll rely on the CSS variables defined in styles.css
            }
        },
    },
    plugins: [],
}
