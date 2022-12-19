// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../libraries/Helper.sol";
import "../interfaces/IVabbleDAO.sol";
import "../interfaces/IUniHelper.sol";
import "../interfaces/IProperty.sol";
import "../interfaces/IOwnablee.sol";
import "hardhat/console.sol";

contract Subscription is ReentrancyGuard {
    
    event SubscriptionActivated(address customer, address token, uint256 period);
    event NFTsRegistered(address[] nfts);
    event SubscriptionNFTActivated(address customer, address nft, uint256 tokenId, uint256 tokenType);
    event GatedContentRegistered(address studio, uint256[] filmIds);
    event VABWalletChanged(address wallet);

    address private immutable OWNABLE;      // Ownablee contract address  
    address private immutable VABBLE_DAO;   // VabbleDAO contract
    address private immutable UNI_HELPER;   // UniHelper contract
    address private immutable DAO_PROPERTY; // Property contract
    address public VAB_WALLET;              // Vabble wallet

    uint256 private constant PERIOD_UNIT = 30 days; // 30 days

    uint256[] private gatedFilmIds;              // filmIds added by Studio for gated content

    struct UserSubscription {
        uint256 activeTime;       // active time
        uint256 period;           // period of subscription(ex: 1 => 1 month, 3 => 3 month)
        uint256 expireTime;       // expire time
    }

    struct GateNFT {
        address nftAddr;            // nft address
        uint256 tokenId;            // nft tokenId if erc721, id if erc1155
        uint256 tokenType;          // nft token type(1=>erc721, 2=>erc1155)
    }
    
    mapping(address => UserSubscription) public subscriptionInfo;             // (user => UserSubscription)
    mapping(address => mapping(uint256 => bool)) public isUsedNFT;            // (nft => (tokenId => true/false))

    mapping(uint256 => GateNFT[]) public gatedNFTs;                           // (filmId => GateNFT[])
    mapping(uint256 => mapping(address => mapping(uint256 => bool))) public isGatedNFT;  // (filmId => (nft => (tokenId => true/false)))
    mapping(uint256 => bool) public isGatedFilmId;                            // (filmId => true/false)

    modifier onlyAuditor() {
        require(msg.sender == IOwnablee(OWNABLE).auditor(), "caller is not the auditor");
        _;
    }
    
    receive() external payable {}

    constructor(
        address _ownableContract,
        address _uniHelperContract,
        address _daoProperty,
        address _vabbleDAO,
        address _vabbleWallet
    ) {        
        require(_ownableContract != address(0), "ownableContract: zero address");
        OWNABLE = _ownableContract;  
        require(_uniHelperContract != address(0), "uniHelperContract: zero address");
        UNI_HELPER = _uniHelperContract;      
        require(_daoProperty != address(0), "daoProperty: zero address");
        DAO_PROPERTY = _daoProperty; 
        require(_vabbleDAO != address(0), "vabbleDAO: zero address");
        VABBLE_DAO = _vabbleDAO;  
        require(_vabbleWallet != address(0), "vabbleWallet: zero address");
        VAB_WALLET = _vabbleWallet;
    }

    // ============= 0. Subscription by token and NFT. ===========    
    /// @notice active subscription(pay $1 monthly as ETH/USDC/USDT/VAB...) for renting the films
    function activeSubscription(address _token, uint256 _period) public payable nonReentrant {
        require(IOwnablee(OWNABLE).isDepositAsset(_token), "activeSubscription: not allowed asset"); 
        
        uint256 _expectAmount = getExpectedSubscriptionAmount(_token, _period);
        if(_token == address(0)) {
            require(msg.value >= _expectAmount, "activeSubscription: Insufficient paid");
            if (msg.value > _expectAmount) {
                Helper.safeTransferETH(msg.sender, msg.value - _expectAmount);
            }
        } else {
            Helper.safeTransferFrom(_token, msg.sender, address(this), _expectAmount); 

            // Approve token to send from this contract to UNI_HELPER contract
            if(IERC20(_token).allowance(address(this), UNI_HELPER) == 0) {
                Helper.safeApprove(_token, UNI_HELPER, IERC20(_token).totalSupply());
            }
        }

        uint256 usdcAmount;
        address usdc_token = IProperty(DAO_PROPERTY).USDC_TOKEN();
        address payout_token = IProperty(DAO_PROPERTY).PAYOUT_TOKEN();
        // if token is VAB, send USDC(convert from VAB to USDC) to wallet
        if(_token == payout_token) {
            bytes memory swapArgs = abi.encode(_expectAmount, _token, usdc_token);
            usdcAmount = IUniHelper(UNI_HELPER).swapAsset(swapArgs);
            Helper.safeTransfer(usdc_token, VAB_WALLET, usdcAmount);
        } 
        // if token != VAB, send VAB(convert token(60%) to VAB) and USDC(convert token(40%) to USDC) to wallet
        else {            
            uint256 amount60 = _expectAmount * 60 * 1e8 / 1e10;  
            // Send ETH from this contract to UNI_HELPER contract
            if(_token == address(0)) Helper.safeTransferETH(UNI_HELPER, amount60); // 60%
            
            bytes memory swapArgs = abi.encode(amount60, _token, payout_token);
            uint256 vabAmount = IUniHelper(UNI_HELPER).swapAsset(swapArgs);            
            // Transfer VAB to wallet
            Helper.safeTransfer(payout_token, VAB_WALLET, vabAmount);

            if(_token == usdc_token) {
                usdcAmount = _expectAmount - amount60;
            } else {
                // Send ETH from this contract to UNI_HELPER contract
                if(_token == address(0)) Helper.safeTransferETH(UNI_HELPER, _expectAmount - amount60); // 40%
                
                bytes memory swapArgs1 = abi.encode(_expectAmount - amount60, _token, usdc_token);
                usdcAmount = IUniHelper(UNI_HELPER).swapAsset(swapArgs1);
            }
            // Transfer USDC to wallet
            Helper.safeTransfer(usdc_token, VAB_WALLET, usdcAmount);
        }        
        
        UserSubscription storage subscription = subscriptionInfo[msg.sender];
        if(isActivedSubscription(msg.sender)) {
            uint256 oldPeriod = subscription.period;
            subscription.period = oldPeriod + _period;
            subscription.expireTime = subscription.activeTime + PERIOD_UNIT * (oldPeriod + _period);
        } else {
            subscription.activeTime = block.timestamp;
            subscription.period = _period;
            subscription.expireTime = block.timestamp + PERIOD_UNIT * _period;
        }

        emit SubscriptionActivated(msg.sender, _token, _period);          
    }

    /// @notice Expected token amount that user should pay for activing the subscription
    function getExpectedSubscriptionAmount(address _token, uint256 _period) public view returns(uint256 expectAmount_) {
        require(_period > 0, "getExpectedSubscriptionAmount: Zero period");

        address usdc_token = IProperty(DAO_PROPERTY).USDC_TOKEN();
        address payout_token = IProperty(DAO_PROPERTY).PAYOUT_TOKEN();
        uint256 scriptAmount = _period * IProperty(DAO_PROPERTY).subscriptionAmount();
        if(_token == payout_token) {
            expectAmount_ = IUniHelper(UNI_HELPER).expectedAmount(scriptAmount * 40 * 1e8 / 1e10, usdc_token, _token);
        } else if(_token == usdc_token) {
            expectAmount_ = scriptAmount;
        } else {            
            expectAmount_ = IUniHelper(UNI_HELPER).expectedAmount(scriptAmount, usdc_token, _token);
        }
    }

    // ============= 2. NFT Gated Content ===========
    /// @notice Register filmIds(nft gated content) and nfts by Studio
    function registerGatedContent(
        bytes[] calldata _uploadFilms
    ) external nonReentrant {
        require(_uploadFilms.length > 0, "registerGatedContent: Invalid item length");

        uint256 filmId;
        address[] memory nftAddresses;
        uint256[] memory tokenIds;
        uint256[] memory tokenTypes;
        for(uint256 i = 0; i < _uploadFilms.length; i++) {        
            ( filmId, nftAddresses, tokenIds, tokenTypes ) = abi.decode(_uploadFilms[i], (uint256, address[], uint256[], uint256[]));
               
            if(!__isApprovedFilm(filmId)) continue;
            if(nftAddresses.length == 0 || nftAddresses.length != tokenIds.length || nftAddresses.length != tokenTypes.length) continue;

            bool isNFTSaved = false;
            for(uint256 k = 0; k < nftAddresses.length; k++) {    
                if(nftAddresses[k] == address(0)) continue;
                if(isGatedNFT[filmId][nftAddresses[k]][tokenIds[k]]) continue;

                gatedNFTs[filmId].push(GateNFT({
                    nftAddr: nftAddresses[k],
                    tokenId: tokenIds[k],
                    tokenType: tokenTypes[k]
                }));
                isGatedNFT[filmId][nftAddresses[k]][tokenIds[k]] = true;
                isNFTSaved = true;
            }

            if(isGatedFilmId[filmId] || !isNFTSaved) continue;

            gatedFilmIds.push(filmId);            
            isGatedFilmId[filmId] = true;
        }   
        emit GatedContentRegistered(msg.sender, gatedFilmIds);
    }

    /// @notice active
    function isActivatedGatedContent(uint256 _filmId) external view returns (bool isActive_) {        
        
        require(isGatedFilmId[_filmId], "isActivatedGatedContent: Not registered");

        address _nft;
        uint256 _tokenId;
        uint256 _tokenType;
        for(uint256 k = 0; k < gatedNFTs[_filmId].length; k++) {
            _nft = gatedNFTs[_filmId][k].nftAddr;
            _tokenId = gatedNFTs[_filmId][k].tokenId;
            _tokenType = gatedNFTs[_filmId][k].tokenType;

            if(_tokenType == 1) {
                if(IERC721(_nft).ownerOf(_tokenId) == msg.sender) {
                    isActive_ = true;
                    break;
                }
            } else {
                if(IERC1155(_nft).balanceOf(msg.sender, _tokenId) > 0) {
                    isActive_ = true;
                    break;
                }
            }
        }
    }

    function __isApprovedFilm(uint256 _filmId) private view returns (bool approve_) {
        address owner = IVabbleDAO(VABBLE_DAO).getFilmOwner(_filmId);
        Helper.Status status = IVabbleDAO(VABBLE_DAO).getFilmStatus(_filmId);
        if(
            owner == msg.sender &&
            (status == Helper.Status.APPROVED_LISTING || 
            status == Helper.Status.APPROVED_FUNDING || 
            status == Helper.Status.APPROVED_WITHOUTVOTE)) {
            approve_ = true;
        } else {
            approve_ = false;
        }
    }    

    /// @notice Change VAB wallet address
    function changeVABWallet(address _wallet) external onlyAuditor nonReentrant {
        require(_wallet == address(0), "changeVABWallet: Zero Address");
        VAB_WALLET = _wallet;

        emit VABWalletChanged(_wallet);
    } 

    /// @notice Check if subscription period 
    function isActivedSubscription(address _customer) public view returns(bool active_) {
        if(subscriptionInfo[_customer].expireTime > block.timestamp) active_ = true;
        else active_ = false;
    }
    
    /// @notice Get gated content(film) list
    function getGatedFilmIdList() public view returns (uint256[] memory) {
        return gatedFilmIds;
    }    
}
