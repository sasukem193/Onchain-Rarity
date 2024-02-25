# OnChain Rarity 

## Overview
This project is a protocol designed to calculate rarity on-chain for Non-Fungible Tokens (NFTs). It directly fetches metadata from the blockchain and computes a score for each trait, allowing for the ranking of NFTs based on their rarity.

## Features
- Fetch metadata directly from the blockchain
- Calculate rarity scores for each trait
- Rank NFTs based on their rarity scores
- Suitable for integration into rarity platforms, NFT marketplaces, and similar applications

## Contributing

Contributions are welcome! Please open an issue or submit a pull request if you have any suggestions, feature requests, or bug fixes.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

Inspired by the need for on-chain rarity calculations in the NFT space.
Built with love by Your Name/Organization.

## Disclaimer

This software is provided as is and without any warranty, express or implied. Use at your own risk.

## Installation
```bash
npm install onchain-rarity-calculator


## Usage

```javascript
// Import the calculateRarity function from the 'onchain-rarity-calculator' package
const { calculateRarity } = require('onchain-rarity-calculator');

// Example usage
const nftMetadata = {
    tokenId: '0x123...',
    traits: {
        trait1: 10,
        trait2: 5,
        // Add more traits as needed
    }
};

// Calculate the rarity score for the provided NFT metadata
const rarityScore = calculateRarity(nftMetadata);

// Output the rarity score to the console
console.log('Rarity Score:', rarityScore);



