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

    IERC20 private immutable PAYOUT_TOKEN;   // VAB token      
    address private immutable OWNABLE;      // Ownablee contract address  
    address private immutable VABBLE_DAO;   // VabbleDAO contract
    address private immutable UNI_HELPER;   // UniHelper contract
    address private immutable DAO_PROPERTY; // Property contract
    address private immutable USDC_TOKEN;   // USDC token
    address public VAB_WALLET;              // Vabble wallet

    uint256 private constant PERIOD_UNIT = 30 days; // 30 days

    address[] private registeredNFTs;            // nfts registered for subscription by Auditor
    uint256[] private gatedFilmIds;              // filmIds added by Studio for gated content

    struct UserSubscription {
        uint256 time;             // current timestamp
        uint256 period;           // period of subscription(ex: 1 => 1 month, 3 => 3 month)
    }

    struct GateNFT {
        address nftAddr;            // nft address
        uint256 tokenId;            // nft tokenId if erc721, id if erc1155
        uint256 tokenType;          // nft token type(1=>erc721, 2=>erc1155)
    }
    
    mapping(address => UserSubscription) public subscriptionInfo;             // (user => UserSubscription)
    mapping(address => uint256) public periodPerNFT;                          // (nft => period)
    mapping(address => mapping(uint256 => bool)) public isUsedNFT;            // (nft => (tokenId => true/false))

    mapping(uint256 => GateNFT[]) public gatedNFTs;                           // (filmId => GateNFT[])
    mapping(uint256 => mapping(address => mapping(uint256 => bool))) public isGatedNFT;  // (filmId => (nft => (tokenId => true/false)))
    mapping(uint256 => bool) public isGatedFilmId;                            // (filmId => true/false)

    modifier onlyAuditor() {
        require(msg.sender == IOwnablee(OWNABLE).auditor(), "caller is not the auditor");
        _;
    }

    modifier onlyStudio() {
        require(IOwnablee(OWNABLE).isStudio(msg.sender), "caller is not the studio");
        _;
    }
    
    receive() external payable {}

    constructor(
        address _payoutToken,
        address _ownableContract,
        address _uniHelperContract,
        address _daoProperty,
        address _vabbleDAO,
        address _usdcToken,
        address _vabbleWallet
    ) {        
        require(_payoutToken != address(0), "payoutToken: Zero address");
        PAYOUT_TOKEN = IERC20(_payoutToken); 
        require(_ownableContract != address(0), "ownableContract: Zero address");
        OWNABLE = _ownableContract;  
        require(_uniHelperContract != address(0), "uniHelperContract: Zero address");
        UNI_HELPER = _uniHelperContract;      
        require(_daoProperty != address(0), "initializeVote: Zero filmBoard address");
        DAO_PROPERTY = _daoProperty; 
        require(_vabbleDAO != address(0), "vabbleDAO: Zero vabbleDAO address");
        VABBLE_DAO = _vabbleDAO;  
        require(_usdcToken != address(0), "usdcToken: Zero address");
        USDC_TOKEN = _usdcToken;
        require(_vabbleWallet != address(0), "vabbleWallet: Zero address");
        VAB_WALLET = _vabbleWallet;
    }

    // ============= 0. Subscription by token. ===========
    /// @notice active subscription(pay $10 monthly as ETH/USDC/USDT/VAB...) for renting the films
    function activeSubscription(address _token, uint256 _period) external payable nonReentrant {        
        require(!isActivedSubscription(msg.sender), "activeSubscription: Already actived");  
        
        uint256 expectAmount = getExpectedSubscriptionAmount(_token, _period);
        if(_token == address(0)) {
            require(msg.value >= expectAmount, "activeSubscription: Insufficient paid");
            if (msg.value > expectAmount) {
                Helper.safeTransferETH(msg.sender, msg.value - expectAmount);
            }
        } else {
            Helper.safeTransferFrom(_token, msg.sender, address(this), expectAmount); 

            // Approve token to send from this contract to UNI_HELPER contract
            if(IERC20(_token).allowance(address(this), UNI_HELPER) == 0) {
                Helper.safeApprove(_token, UNI_HELPER, IERC20(_token).totalSupply());
            }
        }

        uint256 usdcAmount;
        // if token is VAB, send USDC to wallet after convert VAB to USDC
        if(_token == address(PAYOUT_TOKEN)) {
            bytes memory swapArgs = abi.encode(expectAmount, _token, USDC_TOKEN);
            usdcAmount = IUniHelper(UNI_HELPER).swapAsset(swapArgs);
            Helper.safeTransfer(USDC_TOKEN, VAB_WALLET, usdcAmount);
        } 
        // if token is not VAB, 
        // 1. send VAB to wallet after convert token(60%) to VAB
        // 2. send USDC to wallet after convert token(40%) to USDC
        else {            
            uint256 amount60 = expectAmount * 60 * 1e8 / 1e10;  

            // Send ETH from this contract to UNI_HELPER contract
            if(_token == address(0)) Helper.safeTransferETH(UNI_HELPER, amount60);
            
            bytes memory swapArgs = abi.encode(amount60, _token, address(PAYOUT_TOKEN));
            uint256 vabAmount = IUniHelper(UNI_HELPER).swapAsset(swapArgs);
            
            // Transfer VAB to wallet
            Helper.safeTransfer(address(PAYOUT_TOKEN), VAB_WALLET, vabAmount);

            if(_token == USDC_TOKEN) {
                usdcAmount = expectAmount - amount60;
            } else {
                // Send ETH from this contract to UNI_HELPER contract
                if(_token == address(0)) Helper.safeTransferETH(UNI_HELPER, expectAmount - amount60);
                
                bytes memory swapArgs1 = abi.encode(expectAmount - amount60, _token, USDC_TOKEN);
                usdcAmount = IUniHelper(UNI_HELPER).swapAsset(swapArgs1);
            }
            // Transfer USDC to wallet
            Helper.safeTransfer(USDC_TOKEN, VAB_WALLET, usdcAmount);
        }

        UserSubscription storage subscription = subscriptionInfo[msg.sender];
        subscription.time = block.timestamp;
        subscription.period = _period;

        emit SubscriptionActivated(msg.sender, _token, _period);
    }

    /// @notice Expected token amount that user should pay for activing the subscription
    function getExpectedSubscriptionAmount(address _token, uint256 _period) public view returns(uint256 expectAmount_) {
        require(_period > 0, "getExpectedSubscriptionAmount: Zero period");

        uint256 scriptAmount = _period * IProperty(DAO_PROPERTY).subscriptionAmount();
        if(_token == address(PAYOUT_TOKEN)) {
            expectAmount_ = IUniHelper(UNI_HELPER).expectedAmount(scriptAmount * 40 * 1e8 / 1e10, USDC_TOKEN, _token);
        } else if(_token == USDC_TOKEN) {
            expectAmount_ = scriptAmount;
        } else {            
            expectAmount_ = IUniHelper(UNI_HELPER).expectedAmount(scriptAmount, USDC_TOKEN, _token);
            // if(_token == address(0)) _token is ETH/Matic...
        }
    }

    // ============= 1. Subscription NFTs. ===========
    /// @notice Register NFTs for subscription by Auditor
    /// @param _periods : [1, 2, 6 ...] 1=>1 month, 2=>2 months, 6=>6 months
    function registerNFTs(address[] memory _nfts, uint256[] memory _periods) public onlyAuditor {
        require(_nfts.length == _periods.length, "registerNFTs: Difference array length");

        for(uint256 i = 0; i < _nfts.length; i++) { 
            if(_nfts[i] == address(0) || _periods[i] <= 0) continue;

            if(!isRegisteredNFT(_nfts[i])) {
                registeredNFTs.push(_nfts[i]); 
            }            
            periodPerNFT[_nfts[i]] = _periods[i];
        }
        emit NFTsRegistered(registeredNFTs);
    }

    /// @notice active subscription by NFT for renting the films
    /// @param _nft : nft address 
    /// @param _tokenId: if ERC721 then nft token Id, if ERC1155 then nft Id(ex: cate=0, gold=1...)
    /// @param _tokenType: 1 => ERC721, 2 => ERC1155
    function activeNFTSubscription(address _nft, uint256 _tokenId, uint256 _tokenType) external nonReentrant {        
        require(!isActivedSubscription(msg.sender), "NFTSubscription: Already actived");  
        require(isRegisteredNFT(_nft) && !isUsedNFT[_nft][_tokenId], "NFTSubscription: Used or Unregistered nft");

        // TODO Verify Ownership On Chain.
        if(_tokenType == 1) {        
            require(IERC721(_nft).ownerOf(_tokenId) == msg.sender, "NFTSubscription: Not erc721-nft owner");
        } else if(_tokenType == 2) {
            require(IERC1155(_nft).balanceOf(msg.sender, _tokenId) > 0, "NFTSubscription: No erc1155-nft balance");
        }

        UserSubscription storage subscription = subscriptionInfo[msg.sender];
        subscription.time = block.timestamp;
        subscription.period = periodPerNFT[_nft]; // for now, 3 => 3 month
        isUsedNFT[_nft][_tokenId] = true;

        emit SubscriptionNFTActivated(msg.sender, _nft, _tokenId, _tokenType);
    }

    // ============= 2. NFT Gated Content ===========
    /// @notice Register filmIds(nft gated content) and nfts by Studio
    function registerGatedContent(
        bytes[] calldata _uploadFilms
    ) external onlyStudio nonReentrant {
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
        if(
            IVabbleDAO(VABBLE_DAO).getFilmStatusById(_filmId) == Helper.Status.APPROVED_LISTING || 
            IVabbleDAO(VABBLE_DAO).getFilmStatusById(_filmId) == Helper.Status.APPROVED_FUNDING || 
            IVabbleDAO(VABBLE_DAO).getFilmStatusById(_filmId) == Helper.Status.APPROVED_WITHOUTVOTE) {
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
        UserSubscription storage subscription = subscriptionInfo[_customer];        

        if(subscription.time + PERIOD_UNIT * subscription.period > block.timestamp) active_ = true;
        else active_ = false;
    }

    /// @notice Check if nft registered 
    function isRegisteredNFT(address _nft) public view returns(bool register_) {     
        require(_nft != address(0), "isRegisteredNFT: Zero nft address");

        if(periodPerNFT[_nft] > 0) register_ = true;
        else register_ = false;
    }

    /// @notice Get registered nft list
    function getRegisteredNFTList() public view returns (address[] memory) {
        return registeredNFTs;
    } 
    
    /// @notice Get gated content(film) list
    function getGatedFilmIdList() public view returns (uint256[] memory) {
        return gatedFilmIds;
    }    
}
