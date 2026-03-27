/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Graphik', 'Arial', 'Helvetica', 'sans-serif'],
        serif: ['GT Sectra Fine', 'Palatino', 'serif']
      },
      colors: {
        // Remap slate → Accenture neutral palette
        slate: {
          950: '#000000',
          900: '#101010',
          800: '#202020',
          700: '#2b2b2b',
          600: '#3d3d3d',
          500: '#616160',
          400: '#a2a2a0',
          300: '#e3e3df',
          200: '#f1f1ef',
          100: '#fafafa',
          50:  '#ffffff'
        },
        // Remap purple → Accenture purple palette
        purple: {
          950: '#39005e',
          900: '#460073',
          800: '#57008f',
          700: '#7500c0',
          600: '#a100ff',
          500: '#a100ff',
          400: '#dcafff',
          300: '#e6dcff',
          200: '#f0e6ff',
          100: '#f9f0ff'
        }
      },
      transitionTimingFunction: {
        'acc': 'cubic-bezier(0.85, 0, 0, 1)'
      },
      transitionDuration: {
        '550': '550ms'
      },
      boxShadow: {
        'acc-card': '0 8px 12px 6px rgba(0,0,0,0.15), 0 4px 4px rgba(0,0,0,0.3)'
      }
    }
  },
  plugins: []
};
