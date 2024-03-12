//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {ERC404U16} from "../ERC404U16.sol";
import {IJoeFactory} from "../interfaces/IJoeFactory.sol";

contract OGS404 is Ownable, ERC404U16 {
  event setTaxedToFromAddressERC20( address indexed taxedToFromAdress, bool value);
  event ogAllowlistSet(address indexed account, bool value);
  event allowlistSet(address indexed account, bool value);
  event bulkOgAllowlistSet(address[] accounts, bool value);
  event bulkAllowlistSet(address[] accounts, bool value);
  event mintPhaseSet(MintPhase mintPhase);
  event setERC20TradingActive(bool value);

  enum MintPhase {
    Closed,
    OG,
    Allowlist,
    Public
  }

  uint256 private _mintedSupply;

  uint256 public constant LIQUIDITY_SUPPLY = 380;
  uint256 public constant ONE_WEEK_TIMESTAMP = 604800;
  uint256 public constant MAX_BUY_TAX_RATE = 990; // 99%
  uint256 public constant MAX_SELL_TAX_RATE = 200; // 99%
  uint256 public constant MAX_SUPPLY = 1500;

  uint256 public constant BUY_TAX_MULTIPLIER = 10;
  uint256 public constant SELL_TAX_MULTIPLIER = 2;

  uint256 public constant OGS_MINT_PRICE = 0.3 ether;
  uint256 public constant OGS_MINT_PER_WALLET = 3;
  uint256 public constant ALLOWLIST_MINT_PRICE = 0.5 ether;
  uint256 public constant ALLOWLIST_MINT_PER_WALLET = 5;
  uint256 public constant PUBLIC_MINT_PRICE = 0.7 ether;
  uint256 public constant PUBLIC_MINT_PER_WALLET = 10;

  uint256 public immutable DEPLOYMENT_TIMESTAMP = 0;
  address public immutable TRADERJOE_ROUTER = address(0);
  address public immutable TRADERJOE_FACTORY = address(0);
  address public immutable WAVAX = address(0);
  address public immutable PAIR_ADDRESS = address(0);
  // current mint phase
  MintPhase public mintPhase = MintPhase.Closed;

  bool public isERC20TradingActive = false;

  mapping(address => bool) public taxedToFromAddressesERC20;
  mapping(address => bool) public ogAllowlist;
  mapping(address => bool) public allowlist;

  mapping(address => uint256) public ogMintedForAddress;
  mapping(address => uint256) public allowlistMintedForAddress;
  mapping(address => uint256) public publicMintedForAddress;

  constructor(
    address initialOwner_,
    address liquidityRecipient_,
    address traderjoeRouter_,
    address traderjoeFactory_,
    address wavax_
  ) ERC404("OGS404", "OGS404", 18) Ownable(initialOwner_) {
    //We don't mint the ERC721s to the initial owner, as they are just going to 
    //be transferred to the liquidity pool.

    require( initialOwner_ != address(0), "OGS404: initialOwner_ cannot be the zero address");
    require( liquidityRecipient_ != address(0), "OGS404: liquidityRecipient_ cannot be the zero address");
    require( traderjoeRouter_ != address(0), "OGS404: traderjoeRouter_ cannot be the zero address");
    require( traderjoeFactory_ != address(0), "OGS404: traderjoeFactory_ cannot be the zero address");
    require( wavax_ != address(0), "OGS404: wavax_ cannot be the zero address");

    _setERC721TransferExempt(initialMintRecipient_, true);
    _setERC721TransferExempt(traderjoeRouter_, true);
    _setERC721TransferExempt(traderjoeFactory_, true);
    _mintERC20(liquidityRecipient_, LIQUIDITY_SUPPLY * units);

    TRADERJOE_ROUTER = traderjoeRouter_;
    TRADERJOE_FACTORY = traderjoeFactory_;
    WAVAX = wavax_;

    PAIR_ADDRESS = computePairAddress();

    _setERC721TransferExempt(PAIR_ADDRESS, true);

    DEPLOYMENT_TIMESTAMP = block.timestamp;
  }

  function tokenURI(uint256 id_) public pure override returns (string memory) {
    //TODO: handle the URI better - probably on contract creation
    return string.concat("https://example.com/token/", Strings.toString(id_));
  }

  // Set the address that will be taxed for ERC20 transfers - this will usually be
  // the liquidity pool address.
  function setTaxedToFromAddressERC20( 
    address taxedToFrom_,
    bool value_
  ) external onlyOwner {
    require(taxedToFrom_ != address(0), "ERC404Example: taxedToFrom_ cannot be the zero address");

    taxedToFromAddressesERC20[taxedToFrom_] = value_;

    emit setTaxedToFromAddressERC20(taxedToFrom_, value_);
  }

  function setOgAllowlist(address account_, bool value_) external onlyOwner {
    ogAllowlist[account_] = value_;

    emit ogAllowlistSet(account_, value_);
  }

  function bulkSetOgAllowlist(address[] calldata accounts_, bool value_) external onlyOwner {
    for (uint256 i = 0; i < accounts_.length; i++) {
      ogAllowlist[accounts_[i]] = value_;
    }

    emit bulkOgAllowlistSet(accounts_, value_);
  }

  function setAllowlist(address account_, bool value_) external onlyOwner {
    allowlist[account_] = value_;

    emit allowlistSet(account_, value_);
  }

  function bulkSetAllowlist(address[] calldata accounts_, bool value_) external onlyOwner {
    for (uint256 i = 0; i < accounts_.length; i++) {
      allowlist[accounts_[i]] = value_;
    }

    emit bulkAllowlistSet(accounts_, value_);
  }

  function setMintPhase(MintPhase mintPhase_) external onlyOwner {
    mintPhase = mintPhase_;

    emit mintPhaseSet(mintPhase_);
  }

  function getCurrentTaxForErc20( bool _isBuy ) external view returns (uint256) {
    if (taxedToFromAddress == address(0)) {
      return 0;
    }

    uint256 timeSinceDeployment = block.timestamp - DEPLOYMENT_TIMESTAMP;

    uint256 taxRateMultiplier = _isBuy ? BUY_TAX_MULTIPLIER : SELL_TAX_MULTIPLIER;

    uint256 taxRate = (timeSinceDeployment / ONE_WEEK_TIMESTAMP) * taxRateMultiplier;

    uint256 maxTaxRate = _isBuy ? MAX_BUY_TAX_RATE : MAX_SELL_TAX_RATE;

    if (taxRate > maxTaxRate) {
      taxRate = maxTaxRate;
    }

    return taxRate;
  }

  function setERC721TransferExempt(
    address account_,
    bool value_
  ) external onlyOwner {
    _setERC721TransferExempt(account_, value_);
  }

  //cannot be undone once trading is active
  function setERC20TradingActive(
  ) external onlyOwner {
    require(!isERC20TradingActive, "OGS404: trading already active");

    isERC20TradingActive = true;

    emit setERC20TradingActive(value_);
  }

  function transfer(address to, uint256 amount) public override returns (bool) {
    if (isERC20TradingActive || msg.sender == TRADERJOE_ROUTER || msg.sender == owner()) {
        // Assuming selling to the pair
        if (to == PAIR_ADDRESS) {
            uint256 taxPercentage = getCurrentTaxForErc20(false); // Selling, hence false
            uint256 taxAmount = amount * taxAmount / 1000;
            handleTax(taxAmount); // Ensure you define how to handleTax
            amount -= taxAmount;
        }

        return super.transfer(to, amount);
    } else {
        revert("OGS404: Trading is not active.");
    }
}

function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
    if (isERC20TradingActive || from == TRADERJOE_ROUTER || from == owner()) {
        // Assuming buying from the pair
        if (from == PAIR_ADDRESS) {
            uint256 onePercentOfSupply = ( MAX_SUPPLY * uints ) / 100;

            if (amount > onePercentOfSupply) {
                revert("OGS404: antiwhale: amount exceeds 1% of supply");
            }

            uint256 taxPercentage = getCurrentTaxForErc20(true); // Buying, hence true
            uint256 axAmount = amount * taxAmount / 1000;
            handleTax(taxAmount); // Define this function to manage tax
            amount -= taxAmount;
        }

        return super.transferFrom(from, to, amount);
    } else {
        revert("OGS404: Trading is not active.");
    }
}

  function handleTax(uint256 taxAmount) internal {
      // TODO: Implement tax handling, sending to a treasury or burning
  }

  function computePairAddress()
      internal
      pure
      returns (address pair)
  {
      (address token0, address token1) = address(this) < WAVAX ? (address(this), WAVAX) : (WAVAX, address(this));
      bytes32 pairCodeHash = IJoeFactory(TRADERJOE_FACTORY).pairCodeHash();
      bytes32 salt = keccak256(abi.encodePacked(token0, token1));
      bytes32 data = keccak256(
          abi.encodePacked(
              bytes1(0xff),
              TRADERJOE_FACTORY,
              salt,
              pairCodeHash
          )
      );
      return address(uint160(uint256(data)));
  }

  //Mint function for ERC721s
  function mint(
    uint256 quantity_
  ) external {
    require(_mintedSupply + LIQUIDITY_SUPPLY + _quantity <= MAX_SUPPLY, "OGS404: max supply reached");
    require(mintPhase != MintPhase.Closed, "OGS404: minting is closed");

    if( mintPhase == MintPhase.OG ) {
      //require the sender to be in the OG allowlist
      require(ogAllowlist[msg.sender], "OGS404: sender not in OG allowlist");
      require(quantity_ <= OGS_MINT_PER_WALLET, "OGS404: quantity exceeds limit");
      require(ogMintedForAddress[msg.sender] + quantity_ <= OGS_MINT_PER_WALLET, "OGS404: quantity exceeds limit");
      require(msg.value == OGS_MINT_PRICE * quantity_, "OGS404: incorrect value");

      ogMintedForAddress[msg.sender] += quantity_;

      _mintERC20(msg.sender, quantity_ * units);
    } else if ( mintPhase == MintPhase.Allowlist) {
      require(allowlist[msg.sender], "OGS404: sender not in allowlist");
      require(quantity_ <= ALLOWLIST_MINT_PER_WALLET, "OGS404: quantity exceeds limit");
      require(
        allowlistMintedForAddress[msg.sender] + quantity_ <= ALLOWLIST_MINT_PER_WALLET, 
        "OGS404: quantity exceeds limit"
      );
      require(msg.value == ALLOWLIST_MINT_PRICE * quantity_, "OGS404: incorrect value");

      allowlistMintedForAddress[msg.sender] += quantity_;

      _mintERC20(msg.sender, quantity_ * units);
    } else if ( mintPhase == MintPhase.Public) {
      require(quantity_ <= PUBLIC_MINT_PER_WALLET, "OGS404: quantity exceeds limit");
      require(msg.value == PUBLIC_MINT_PRICE * quantity_, "OGS404: incorrect value");
      require(publicMintedForAddress + quantity_ <= PUBLIC_MINT_PER_WALLET, "OGS404: quantity exceeds limit");

      publicMintedForAddress[msg.sender] += quantity_;

      _mintERC20(msg.sender, quantity_ * units);
    }
  }
}
