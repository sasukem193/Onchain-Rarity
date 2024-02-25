const fs = require('fs');
const fetch = require('node-fetch');

// Load the ABI of your ERC-721 contract
const erc721ABI = JSON.parse(fs.readFileSync('erc721_abi.json', 'utf8'));

// Initialize ethers provider
const { ethers } = require('ethers');
const provider = new ethers.providers.JsonRpcProvider('https://ethereum-rpc.publicnode.com');

// Instantiate the ERC-721 contract
const contractAddress = '0xf3e6dbbe461c6fa492cea7cb1f5c5ea660eb1b47';
const contract = new ethers.Contract(contractAddress, erc721ABI, provider);

// Total supply of the collection
const totalSupply = 8887;

// Object to store fetched metadata
const metadataMap = {};

// Function to fetch token metadata from HTTP or IPFS
async function fetchTokenMetadata(tokenId) {
    try {
        const tokenUri = await contract.tokenURI(tokenId);
        if (tokenUri.startsWith('ipfs://')) {
            // If token URI is in IPFS format
            const ipfsHash = tokenUri.replace('ipfs://', '');
            const ipfsGatewayUrl = `https://ipfs.io/ipfs/${ipfsHash}`;
            const metadataResponse = await fetch(ipfsGatewayUrl);
            const metadata = await metadataResponse.json();
            console.log(`Successfully fetched metadata for token ${tokenId}`);
            metadataMap[tokenId] = metadata; // Store metadata in the map
            return metadata;
        } else {
            // If token URI is a regular HTTP URL
            const metadataResponse = await fetch(tokenUri);
            const metadata = await metadataResponse.json();
            console.log(`Successfully fetched metadata for token ${tokenId}`);
            metadataMap[tokenId] = metadata; // Store metadata in the map
            return metadata;
        }
    } catch (error) {
        console.error(`Error fetching metadata for token ${tokenId}:`, error.message);
        throw error; // Propagate the error to the caller
    }
}

// Function to adjust image URL in metadata if it starts with ipfs://
async function adjustImageURL(metadata) {
    try {
        const adjustedMetadata = { ...metadata }; // Create a copy of the metadata object
        if (adjustedMetadata.image && adjustedMetadata.image.startsWith('ipfs://')) {
            // If image URL starts with ipfs://, replace it with IPFS gateway URL
            const ipfsHash = adjustedMetadata.image.replace('ipfs://', '');
            const ipfsGatewayUrl = `https://ipfs.io/ipfs/${ipfsHash}`;
            adjustedMetadata.image = ipfsGatewayUrl;
            
        }
        return adjustedMetadata;
    } catch (error) {
        
        throw error; // Propagate the error to the caller
    }
}

// Function to calculate scores for each trait_type based on occurrence across all metadata
function calculateScoresForTraitTypes(metadataMap) {
    const traitScores = {};
    const traitCounts = {}; // Object to store count of each trait_type occurrence
    
    // Initialize scores for each trait_type
    for (const tokenId in metadataMap) {
        const metadata = metadataMap[tokenId];
        metadata.attributes.forEach(attribute => {
            const traitType = attribute.trait_type;
            traitScores[traitType] = traitScores[traitType] || 0;
        });
    }

    // Count occurrences of each trait_type across all metadata
    for (const tokenId in metadataMap) {
        const metadata = metadataMap[tokenId];
        const attributes = metadata.attributes;
        attributes.forEach(attribute => {
            const traitType = attribute.trait_type;
            traitScores[traitType]++;
            traitCounts[traitType] = traitCounts[traitType] ? traitCounts[traitType] + 1 : 1; // Increment count of trait_type occurrence
        });
    }

    // Normalize scores to a scale of 0-100
    const totalTokens = Object.keys(metadataMap).length;
    for (const traitType in traitScores) {
        traitScores[traitType] = (traitScores[traitType] / totalTokens) * 100;
    }

    return { traitScores, traitCounts };
}

// Function to update metadata with scores for each trait_type and trait counts
function updateMetadataWithScores(metadataMap, traitScores, traitCounts) {
    for (const tokenId in metadataMap) {
        const metadata = metadataMap[tokenId];
        metadata.attributes.forEach(attribute => {
            const traitType = attribute.trait_type;
            attribute.score = traitScores[traitType];
            attribute.traitCount = traitCounts[traitType]; // Add trait count to each attribute
        });
    }
}

// Function to calculate total rarity score for each token
function calculateTotalRarityScore(metadata) {
    let totalScore = 0;
    metadata.attributes.forEach(attribute => {
        totalScore += attribute.score || 0; // Add the score of each attribute
    });
    return totalScore;
}

// Function to calculate rarity from metadata
function calculateRarityFromMetadata(metadataMap) {
    const rarityScores = {};
    for (const tokenId in metadataMap) {
        const metadata = metadataMap[tokenId];
        const totalRarityScore = calculateTotalRarityScore(metadata);
        rarityScores[tokenId] = totalRarityScore;
    }
    return rarityScores;
}

// Function to rank tokens based on rarity scores
function rankTokens(rarityScores) {
    const sortedTokens = Object.entries(rarityScores).sort((a, b) => b[1] - a[1]);
    return sortedTokens.map(([tokenId, score], index) => ({ tokenId, totalRarityScore: score, rank: index + 1 }));
}

// Iterate through each token ID
async function main() {
    const tokenRarityScores = {};

    for (let tokenId = 1; tokenId <= totalSupply; tokenId++) {
        try {
            // Fetch token metadata
            const metadata = await fetchTokenMetadata(tokenId);
            tokenRarityScores[tokenId] = calculateTotalRarityScore(metadata);
            // Adjust image URL if necessary
            metadataMap[tokenId] = await adjustImageURL(metadata);
        } catch (error) {
            // Log the error and continue with next token
            console.error(`Error processing token ${tokenId}:`, error.message);
        }
    }

    // Calculate scores for each trait_type based on occurrence across all metadata
    const { traitScores, traitCounts } = calculateScoresForTraitTypes(metadataMap);

    // Update metadata with scores for each trait_type and trait counts
    updateMetadataWithScores(metadataMap, traitScores, traitCounts);

    // Rank tokens based on rarity scores
    const rarityScores = calculateRarityFromMetadata(metadataMap);
    const rankedTokens = rankTokens(rarityScores);

    // Include rarity data and trait counts in metadata
    for (const token of rankedTokens) {
        const tokenId = token.tokenId;
        const rarityData = {
            totalRarityScore: token.totalRarityScore,
            rank: token.rank
        };
        metadataMap[tokenId].rarity = rarityData;
    }

    // Combine metadata and rarity ranking into a single object
    const finalData = {
        metadata: metadataMap,
        rarity: rankedTokens
    };

    // Write final data to metadata.json
    fs.writeFileSync('metadata.json', JSON.stringify(finalData, null, 2), 'utf8');
    console.log('Updated metadata and final NFT ranking saved to metadata.json');
}

main();
