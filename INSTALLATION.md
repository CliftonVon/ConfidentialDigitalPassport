# Installation and Setup Guide

This guide will help you set up and run the Digital Passport Platform on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: Version 18.0.0 or higher
- **npm**: Comes with Node.js (version 9.0.0 or higher recommended)
- **Git**: For cloning the repository
- **MetaMask**: Browser extension for Web3 wallet connection

## Step-by-Step Installation

### 1. Install Dependencies

Navigate to the project directory and install all required packages:

```bash
npm install
```

This will install:
- React 18 and React DOM
- Vite build tool
- wagmi and RainbowKit for Web3 integration
- Tailwind CSS for styling
- Radix UI components
- Other required dependencies

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Open the `.env` file and configure the following:

```env
VITE_WALLET_CONNECT_PROJECT_ID=your_project_id_here
VITE_CONTRACT_ADDRESS=0x3d7Ce3a150a91e51fD5FbE25a539C0D2E24B009d
```

**Getting a WalletConnect Project ID:**

1. Visit [WalletConnect Cloud](https://cloud.walletconnect.com)
2. Sign up or log in
3. Create a new project
4. Copy your Project ID
5. Paste it into your `.env` file

### 3. Start Development Server

Run the development server:

```bash
npm run dev
```

The application will start at `http://localhost:3000`

### 4. Connect MetaMask to Sepolia Testnet

To use the application, you need to connect to the Ethereum Sepolia testnet:

1. Open MetaMask
2. Click on the network dropdown (top center)
3. Enable "Show test networks" in settings
4. Select "Sepolia test network"

**Getting Sepolia ETH:**

You'll need test ETH to interact with the smart contract:

1. Visit [Sepolia Faucet](https://sepoliafaucet.com/)
2. Enter your wallet address
3. Complete the captcha
4. Receive test ETH (usually takes a few minutes)

Alternative faucets:
- [Alchemy Sepolia Faucet](https://sepoliafaucet.com/)
- [Infura Sepolia Faucet](https://www.infura.io/faucet/sepolia)

## Building for Production

### Build the Application

Create an optimized production build:

```bash
npm run build
```

This creates a `dist` folder with:
- Minified JavaScript bundles
- Optimized CSS
- Static assets
- All files ready for deployment

### Preview Production Build

Test the production build locally:

```bash
npm run preview
```

Access at `http://localhost:4173`

## Deployment Options

### Option 1: Deploy to Vercel

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy:
```bash
vercel
```

4. Set environment variables in Vercel dashboard:
   - Go to Project Settings
   - Navigate to Environment Variables
   - Add `VITE_WALLET_CONNECT_PROJECT_ID`

### Option 2: Deploy to Netlify

1. Build the project:
```bash
npm run build
```

2. Install Netlify CLI:
```bash
npm install -g netlify-cli
```

3. Deploy:
```bash
netlify deploy --prod --dir=dist
```

4. Set environment variables in Netlify dashboard

### Option 3: Deploy to GitHub Pages

1. Install gh-pages:
```bash
npm install --save-dev gh-pages
```

2. Add to `package.json`:
```json
{
  "scripts": {
    "deploy": "vite build && gh-pages -d dist"
  }
}
```

3. Deploy:
```bash
npm run deploy
```

## Troubleshooting

### Common Issues and Solutions

#### Issue: "Module not found" errors

**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install
```

#### Issue: MetaMask not connecting

**Solution:**
1. Check that you're on Sepolia testnet
2. Refresh the page
3. Try disconnecting and reconnecting wallet
4. Clear browser cache

#### Issue: Transaction failing

**Solution:**
1. Ensure you have enough Sepolia ETH
2. Check gas settings in MetaMask
3. Verify contract address is correct
4. Check Etherscan for contract status

#### Issue: Environment variables not loading

**Solution:**
1. Ensure `.env` file exists in root directory
2. Variables must start with `VITE_`
3. Restart development server after changes
4. Check file permissions

#### Issue: Build errors with Tailwind CSS

**Solution:**
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

## Development Workflow

### Recommended Development Flow

1. **Start development server:**
```bash
npm run dev
```

2. **Make changes** to files in `src/`

3. **Test changes** in browser (hot reload enabled)

4. **Build for production:**
```bash
npm run build
```

5. **Preview production build:**
```bash
npm run preview
```

### Code Formatting

Install Prettier extension in your IDE:
- VS Code: Prettier - Code formatter
- Configure to format on save

### Linting

Run ESLint:
```bash
npm run lint
```

## Project Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run linter |

## Browser Compatibility

The application is compatible with:
- ✅ Chrome/Edge (v90+)
- ✅ Firefox (v88+)
- ✅ Safari (v14+)
- ✅ Opera (v76+)

**Note:** MetaMask extension required for Web3 functionality

## Performance Optimization

The build configuration includes:

- **Code Splitting**: Vendor, wallet, and UI chunks separated
- **Tree Shaking**: Removes unused code
- **Minification**: ESBuild for fast minification
- **Asset Optimization**: Images and fonts optimized

## Security Considerations

### Before Deployment

1. **Never commit `.env` file** to version control
2. **Rotate WalletConnect Project ID** for production
3. **Verify smart contract address** is correct
4. **Test all functionality** on testnet first
5. **Enable HTTPS** in production

### In Production

1. Use environment variables for sensitive data
2. Implement rate limiting if using backend API
3. Monitor contract interactions
4. Keep dependencies updated
5. Use security headers (CSP, HSTS, etc.)

## Getting Help

If you encounter issues:

1. Check this documentation
2. Review error messages in console
3. Check browser developer tools
4. Verify network connection to Sepolia
5. Open an issue on GitHub

## Next Steps

After successful installation:

1. Connect your wallet
2. Explore the interface
3. Try different roles (Authority, Verifier, User)
4. View transaction history
5. Test verification workflows

## Additional Resources

- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [wagmi Documentation](https://wagmi.sh/)
- [RainbowKit Docs](https://www.rainbowkit.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Radix UI](https://www.radix-ui.com/)
- [MetaMask Guide](https://metamask.io/faqs/)

---

For more information, see the main [README.md](./README.md)
