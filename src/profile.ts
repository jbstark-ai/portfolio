export const profile = {
  name: 'Jay',
  role: 'Freelance Web, Mobile & Blockchain Developer',
  tagline: 'Building the future, one block at a time.',
  github: 'https://github.com/jbstark-ai',
  repo: 'https://github.com/jbstark-ai/portfolio/tree/main/apps',
  // Set to show a mailto link in the contact section.
  email: '',
}

export const apps = [
  {
    name: 'China Airlines — AI redesign',
    blurb:
      'Poster-style airline booking with a multilingual natural-language trip search, From/To/dates form and destination-driven hero imagery.',
    image: 'screens/airline.jpg',
    stack: ['TanStack Router/Query', 'Node.js', 'Fastify', 'TypeScript', 'SQLite'],
    folder: 'china-airlines',
    run: 'npm i && npm run dev',
    port: 5173,
  },
  {
    name: 'Art Patron',
    blurb:
      'Swipe to back creators with many disciplines. Responsive for mobile and desktop, and follows the OS dark/light theme.',
    image: 'screens/patron.jpg',
    stack: ['React', 'Vite', 'Go', 'SQLite'],
    folder: 'art-patron',
    run: 'cd server && go run .  |  cd web && npm i && npm run dev',
    port: 5174,
  },
  {
    name: 'Crypto Store',
    blurb: 'A Web3 supermarket with a playful, Nintendo-inspired storefront and a .NET API.',
    image: 'screens/crypto.jpg',
    stack: ['TanStack Router/Query', '.NET 10', 'SQLite'],
    folder: 'crypto-store',
    run: 'dotnet run --project api --urls http://localhost:5080  |  cd web && npm i && npm run dev',
    port: 5175,
  },
  {
    name: 'STARK',
    blurb: 'Challenger-bank dashboard that fuses Polaroid framing with IBM Carbon-style clarity.',
    image: 'screens/bank.jpg',
    stack: ['React', 'Vite', 'Node.js', 'Fastify', 'SQLite'],
    folder: 'neo-bank',
    run: 'cd server && npm i && npm start  |  cd web && npm i && npm run dev',
    port: 5176,
  },
]

export const skills = [
  'React', 'TypeScript', 'Node.js', 'Go', '.NET', 'Cloud',
  'React Native', 'Expo', 'Capacitor', 'Electron', 'Solidity', 'Web3.js',
]

export const experience = [
  'Ford', 'Talamo', 'Zilliqa', 'SupraOracles', 'NTT', 'Infinity Works', 'Critical Mass', 'Matchesfashion',
]