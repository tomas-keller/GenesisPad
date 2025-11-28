// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {ERC7984} from "confidential-contracts-v91/contracts/token/ERC7984/ERC7984.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {FHE, euint64} from "@fhevm/solidity/lib/FHE.sol";

/// @title GenesisToken
/// @notice ERC7984 token with fixed supply, free minting, and on-chain metadata.
contract GenesisToken is ERC7984, ZamaEthereumConfig {
    uint64 public immutable maxSupply;
    uint64 public mintedSupply;
    uint256 public immutable initialPriceWei;
    address public immutable creator;

    event Minted(address indexed minter, address indexed recipient, uint64 amount);

    constructor(
        string memory name_,
        string memory symbol_,
        uint64 maxSupply_,
        uint256 initialPriceWei_,
        address creator_
    ) ERC7984(name_, symbol_, "") {
        require(bytes(name_).length > 0, "Name required");
        require(bytes(symbol_).length > 0, "Symbol required");
        require(maxSupply_ > 0, "Max supply required");

        maxSupply = maxSupply_;
        initialPriceWei = initialPriceWei_;
        creator = creator_;
    }

    /// @notice Mint tokens without cost while respecting the max supply.
    /// @param to Address receiving the minted tokens.
    /// @param amount Number of tokens to mint (unencrypted).
    function mint(address to, uint64 amount) external {
        require(amount > 0, "Amount required");
        uint256 newSupply = uint256(mintedSupply) + amount;
        require(newSupply <= maxSupply, "Exceeds supply");

        mintedSupply = uint64(newSupply);

        euint64 encryptedAmount = FHE.asEuint64(amount);
        _mint(to, encryptedAmount);

        emit Minted(msg.sender, to, amount);
    }

    /// @notice Return metadata for UI consumption.
    function details() external view returns (string memory, string memory, uint64, uint64, uint256, address) {
        return (name(), symbol(), maxSupply, mintedSupply, initialPriceWei, creator);
    }
}

/// @title GenesisTokenFactory
/// @notice Deploys GenesisToken instances and keeps an index of created tokens.
contract GenesisTokenFactory is ZamaEthereumConfig {
    struct TokenMetadata {
        address token;
        string name;
        string symbol;
        uint64 maxSupply;
        uint64 mintedSupply;
        uint256 initialPriceWei;
        address creator;
    }

    TokenMetadata[] private _tokens;

    event TokenCreated(
        address indexed token,
        address indexed creator,
        string name,
        string symbol,
        uint64 maxSupply,
        uint256 initialPriceWei
    );

    /// @notice Create a new ERC7984 token with an initial ETH price reference.
    /// @param name_ Token name.
    /// @param symbol_ Token symbol.
    /// @param maxSupply_ Maximum mintable supply.
    /// @param initialPriceWei_ Initial price in wei (for display/reference).
    function createToken(
        string calldata name_,
        string calldata symbol_,
        uint64 maxSupply_,
        uint256 initialPriceWei_
    ) external returns (address) {
        GenesisToken token = new GenesisToken(name_, symbol_, maxSupply_, initialPriceWei_, msg.sender);

        _tokens.push(
            TokenMetadata({
                token: address(token),
                name: name_,
                symbol: symbol_,
                maxSupply: maxSupply_,
                mintedSupply: 0,
                initialPriceWei: initialPriceWei_,
                creator: msg.sender
            })
        );

        emit TokenCreated(address(token), msg.sender, name_, symbol_, maxSupply_, initialPriceWei_);

        return address(token);
    }

    /// @notice Return all created tokens with up-to-date minted supplies.
    function getTokens() external view returns (TokenMetadata[] memory) {
        uint256 length = _tokens.length;
        TokenMetadata[] memory list = new TokenMetadata[](length);

        for (uint256 i = 0; i < length; i++) {
            TokenMetadata memory stored = _tokens[i];
            uint64 mintedSupply = GenesisToken(stored.token).mintedSupply();

            list[i] = TokenMetadata({
                token: stored.token,
                name: stored.name,
                symbol: stored.symbol,
                maxSupply: stored.maxSupply,
                mintedSupply: mintedSupply,
                initialPriceWei: stored.initialPriceWei,
                creator: stored.creator
            });
        }

        return list;
    }

    /// @notice Return a single token metadata entry by index.
    /// @param index Index of the token in the registry.
    function getToken(uint256 index) external view returns (TokenMetadata memory) {
        TokenMetadata memory tokenData = _tokens[index];
        uint64 mintedSupply = GenesisToken(tokenData.token).mintedSupply();

        return
            TokenMetadata({
                token: tokenData.token,
                name: tokenData.name,
                symbol: tokenData.symbol,
                maxSupply: tokenData.maxSupply,
                mintedSupply: mintedSupply,
                initialPriceWei: tokenData.initialPriceWei,
                creator: tokenData.creator
            });
    }

    /// @notice Number of tokens created by the factory.
    function tokenCount() external view returns (uint256) {
        return _tokens.length;
    }
}
