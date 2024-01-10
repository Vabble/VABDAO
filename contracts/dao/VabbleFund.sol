// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../libraries/Helper.sol";
import "../interfaces/IUniHelper.sol";
import "../interfaces/IStakingPool.sol";
import "../interfaces/IProperty.sol";
import "../interfaces/IOwnablee.sol";
import "../interfaces/IFactoryFilmNFT.sol";
import "../interfaces/IVabbleDAO.sol";
import "../interfaces/IVabbleFund.sol";

contract VabbleFund is IVabbleFund, ReentrancyGuard {
    
    event DepositedToFilm(address indexed customer, uint256 indexed filmId, address token, uint256 amount, uint256 flag, uint256 depositTime);
    event FundFilmProcessed(uint256 indexed filmId, address indexed studio, uint256 processTime);
    event FundWithdrawed(uint256 indexed filmId, address indexed customer, uint256 withdrawTime);   

    struct Asset {
        address token;   // token address
        uint256 amount;  // token amount
    }
  
    address private immutable OWNABLE;         // Ownablee contract address
    address private immutable STAKING_POOL;    // StakingPool contract address
    address private immutable UNI_HELPER;      // UniHelper contract address
    address private immutable DAO_PROPERTY;
    address private immutable FILM_NFT;  
    address public VABBLE_DAO;  
    
    uint256[] private fundProcessedFilmIds;
    
    mapping(uint256 => Asset[]) public assetPerFilm;                     // (filmId => Asset[token, amount])
    mapping(uint256 => mapping(address => Asset[])) public assetInfo;    // (filmId => (customer => Asset[token, amount]))
    mapping(uint256 => address[]) private filmInvestorList;              // (filmId => investor address[])
    mapping(uint256 => bool) public isFundProcessed;                     // (filmId => true/false)
    mapping(uint256 => mapping(address => uint256)) private allowUserNftCount; // (filmId => (user => nft count))    
    
    modifier onlyDeployer() {
        require(msg.sender == IOwnablee(OWNABLE).deployer(), "caller is not the deployer");
        _;
    }
    
    receive() external payable {}
    
    constructor(
        address _ownable,
        address _uniHelper,
        address _staking,
        address _property,
        address _filmNftFactory
    ) {        
        require(_ownable != address(0), "ownableContract: Zero address");
        OWNABLE = _ownable;     
        require(_uniHelper != address(0), "uniHelperContract: Zero address");
        UNI_HELPER = _uniHelper;
        require(_staking != address(0), "stakingContract: Zero address");
        STAKING_POOL = _staking;      
        require(_property != address(0), "daoProperty: Zero address");
        DAO_PROPERTY = _property; 
        require(_filmNftFactory!= address(0), "setup: zero factoryContract address");
        FILM_NFT = _filmNftFactory;  
    }

    /// @notice Initialize
    function initialize(address _vabbleDAO) external onlyDeployer {        
        // require(VABBLE_DAO == address(0), "initialize: already initialized");

        require(_vabbleDAO != address(0), "initialize: zero address");
        VABBLE_DAO = _vabbleDAO; 
    } 

    // =================== Funding(Launch Pad) START ===============================
    /// @notice Deposit tokens(VAB, USDT, USDC)/native token($50 ~ $5000 per address for a film) to only funding film by investor
    function depositToFilm(
        uint256 _filmId,
        uint256 _amount, // flag=1 => token amount, flag=2 => nft count
        uint256 _flag,   // flag=1 => token, flag=2 => nft
        address _token
    ) external payable nonReentrant {
        if(_token != IOwnablee(OWNABLE).PAYOUT_TOKEN() && _token != address(0)) {
            require(IOwnablee(OWNABLE).isDepositAsset(_token), "depositToFilm: not allowed asset");   
        }
        require(_flag == 1 || _flag == 2, "depositToFilm: invalid flag");
        require(_amount > 0, "depositToFilm: zero value");

        (, uint256 fundPeriod, uint256 fundType, ) = IVabbleDAO(VABBLE_DAO).getFilmFund(_filmId);    
        (, uint256 pApproveTime) = IVabbleDAO(VABBLE_DAO).getFilmProposalTime(_filmId);
        Helper.Status status = IVabbleDAO(VABBLE_DAO).getFilmStatus(_filmId);

        require(status == Helper.Status.APPROVED_FUNDING, "depositToFilm: filmId not approved for funding");
        require(fundPeriod >= block.timestamp - pApproveTime, "depositToFilm: passed funding period");    

        uint256 userFundAmountPerFilm = getUserFundAmountPerFilm(msg.sender, _filmId); // USDC
        uint256 tokenAmount = __depositToFilm(_filmId, _amount, _flag, fundType, userFundAmountPerFilm, _token);

        if(userFundAmountPerFilm == 0) {
            filmInvestorList[_filmId].push(msg.sender);
        }

        // Return remain ETH to user back if case of ETH
        if(_token == address(0)) {
            require(msg.value >= tokenAmount, "depositToFilm: Insufficient paid");

            if (msg.value > tokenAmount) Helper.safeTransferETH(msg.sender, msg.value - tokenAmount);
        } else {
            Helper.safeTransferFrom(_token, msg.sender, address(this), tokenAmount);
        }        

        __assignToken(_filmId, _token, tokenAmount);

        emit DepositedToFilm(msg.sender, _filmId, _token, tokenAmount, _flag, block.timestamp);
    }    

    /// @dev Avoid deep error
    function __depositToFilm(
        uint256 _filmId, 
        uint256 _amount, 
        uint256 _flag, 
        uint256 _fundType, 
        uint256 _userFundAmount,
        address _token 
    ) private returns (uint256 tokenAmount_) {
        if(_flag == 1) {     
            require(_fundType == 1 || _fundType == 3, "depositToFilm: not fund type by token");

            tokenAmount_ = _amount;
            uint256 usdcAmount = __getExpectedUsdcAmount(_token, _amount);            
            require(__isOverMinAmount(_userFundAmount + usdcAmount), "depositToFilm: less min amount");
            require(__isLessMaxAmount(_userFundAmount + usdcAmount), "depositToFilm: over max amount");

        } else if(_flag == 2) {     
            require(_fundType == 2 || _fundType == 3, "depositToFilm: not fund type by nft");
            (, uint256 maxMintAmount, uint256 mintPrice, address nft, ) = IFactoryFilmNFT(FILM_NFT).getMintInfo(_filmId);
            uint256 filmNftTotalSupply = IFactoryFilmNFT(FILM_NFT).getTotalSupply(_filmId);

            require(nft != address(0), "depositToFilm: not deployed for film");
            require(maxMintAmount > 0, "depositToFilm: no mint info");     
            require(maxMintAmount >= filmNftTotalSupply + _amount, "depositToFilm: exceed mint amount");   
            
            uint256 usdcAmount = _amount * mintPrice; // USDC
            tokenAmount_ = __getExpectedTokenAmount(_token, usdcAmount);            
            require(__isLessMaxAmount(_userFundAmount + usdcAmount), "depositToFilm: over max amount");
            
            allowUserNftCount[_filmId][msg.sender] = _amount;
        }
    }

    /// @dev Update/Add user fund amount
    function __assignToken(uint256 _filmId, address _token, uint256 _amount) private {
        bool isNewTokenPerUser = true;
        bool isNewTokenPerFilm = true;

        // update token amount
        for(uint256 i = 0; i < assetInfo[_filmId][msg.sender].length; i++) {
            if(_token == assetInfo[_filmId][msg.sender][i].token) {
                assetInfo[_filmId][msg.sender][i].amount += _amount;
                isNewTokenPerUser = false;
            }
        }
        // add new token
        if(isNewTokenPerUser) {
            assetInfo[_filmId][msg.sender].push(Asset({token: _token, amount: _amount}));
        }
        
        for(uint256 i = 0; i < assetPerFilm[_filmId].length; i++) {
            if(_token == assetPerFilm[_filmId][i].token) {
                assetPerFilm[_filmId][i].amount += _amount;
                isNewTokenPerFilm = false;
            }
        }
        if(isNewTokenPerFilm) {
            assetPerFilm[_filmId].push(Asset({token: _token, amount: _amount}));
        }
    }

    /// @notice onlyStudio send the 2% of funds to reward pool in VAB if funding meet the raise amount after fund period
    function fundProcess(uint256 _filmId) external nonReentrant {                
        address owner = IVabbleDAO(VABBLE_DAO).getFilmOwner(_filmId);
        require(owner == msg.sender, "fundProcess: not film owner");    
        require(!isFundProcessed[_filmId], "fundProcess: already processed");

        Helper.Status status = IVabbleDAO(VABBLE_DAO).getFilmStatus(_filmId);
        require(status == Helper.Status.APPROVED_FUNDING, "fundProcess: filmId not approved for funding");
        
        (, uint256 fundPeriod, , ) = IVabbleDAO(VABBLE_DAO).getFilmFund(_filmId);    
        (, uint256 pApproveTime) = IVabbleDAO(VABBLE_DAO).getFilmProposalTime(_filmId);        
        require(fundPeriod < block.timestamp - pApproveTime, "fundProcess: funding period");

        require(isRaisedFullAmount(_filmId), "fundProcess: not full raised");
        
        // Send fundFeePercent(2%) to reward pool as VAB token and rest send to studio
        address vabToken = IOwnablee(OWNABLE).PAYOUT_TOKEN();
        Asset[] memory assetArr = assetPerFilm[_filmId];
        uint256 rewardSumAmount;
        uint256 rewardAmount;
        for(uint256 i = 0; i < assetArr.length; i++) {                
            rewardAmount = assetArr[i].amount * IProperty(DAO_PROPERTY).fundFeePercent() / 1e10;
            if(vabToken == assetArr[i].token) {
                rewardSumAmount += rewardAmount;
            } else {
                if(assetArr[i].token == address(0)) {
                    Helper.safeTransferETH(UNI_HELPER, rewardAmount);
                } else {
                    if(IERC20(assetArr[i].token).allowance(address(this), UNI_HELPER) == 0) {
                        Helper.safeApprove(assetArr[i].token, UNI_HELPER, IERC20(assetArr[i].token).totalSupply());
                    }
                }                
                bytes memory swapArgs = abi.encode(rewardAmount, assetArr[i].token, vabToken);
                rewardSumAmount += IUniHelper(UNI_HELPER).swapAsset(swapArgs);
            }
            // transfer assets(except reward) to film owner
            Helper.safeTransferAsset(assetArr[i].token, msg.sender, (assetArr[i].amount - rewardAmount));
        }

        if(rewardSumAmount > 0) {
            if(IERC20(vabToken).allowance(address(this), STAKING_POOL) == 0) {
                Helper.safeApprove(vabToken, STAKING_POOL, IERC20(vabToken).totalSupply());
            }        
            // transfer reward(2%) to rewardPool
            IStakingPool(STAKING_POOL).addRewardToPool(rewardSumAmount);
        }

        fundProcessedFilmIds.push(_filmId);
        isFundProcessed[_filmId] = true;

        emit FundFilmProcessed(_filmId, msg.sender, block.timestamp);
    }
    
    /// @notice Investor can withdraw fund after fund period if funding fails to meet the raise amount
    function withdrawFunding(uint256 _filmId) external nonReentrant {     
        Helper.Status status = IVabbleDAO(VABBLE_DAO).getFilmStatus(_filmId);        
        require(status == Helper.Status.APPROVED_FUNDING, "withdrawFunding: filmId not approved for funding");
        
        (, uint256 fundPeriod, , ) = IVabbleDAO(VABBLE_DAO).getFilmFund(_filmId);    
        (, uint256 pApproveTime) = IVabbleDAO(VABBLE_DAO).getFilmProposalTime(_filmId); 
        require(fundPeriod < block.timestamp - pApproveTime, "withdrawFunding: funding period");

        require(!isRaisedFullAmount(_filmId), "withdrawFunding: full raised");

        Asset[] storage assetArr = assetInfo[_filmId][msg.sender];
        for(uint256 i = 0; i < assetArr.length; i++) {   
            if(assetArr[i].token == address(0)) {
                if(address(this).balance >= assetArr[i].amount) {
                    Helper.safeTransferETH(msg.sender, assetArr[i].amount);
                    assetArr[i].amount = 0;
                }                
            } else {
                if(IERC20(assetArr[i].token).balanceOf(address(this)) >= assetArr[i].amount) {
                    Helper.safeTransfer(assetArr[i].token, msg.sender, assetArr[i].amount);    
                    assetArr[i].amount = 0;
                }
            }
        }

        uint256 userFundAmountPerFilm = getUserFundAmountPerFilm(msg.sender, _filmId);
        if(userFundAmountPerFilm == 0) {
            __removeFilmInvestorList(_filmId, msg.sender);
        }

        emit FundWithdrawed(_filmId, msg.sender, block.timestamp);
    }

    /// @dev Remove user from investor list
    function __removeFilmInvestorList(uint256 _filmId, address _user) private { 
        for(uint256 k = 0; k < filmInvestorList[_filmId].length; k++) { 
            if(_user == filmInvestorList[_filmId][k]) {
                filmInvestorList[_filmId][k] = filmInvestorList[_filmId][filmInvestorList[_filmId].length - 1];
                filmInvestorList[_filmId].pop();
                break;
            }
        }
    }

    /// @dev Check min amount for each token/ETH per film
    function __isOverMinAmount(uint256 _amount) private view returns (bool passed_) {
        if(_amount >= IProperty(DAO_PROPERTY).minDepositAmount()) passed_ = true;
    }

    /// @dev Check max amount for each token/ETH per film
    function __isLessMaxAmount(uint256 _amount) private view returns (bool passed_) {
        if(_amount <= IProperty(DAO_PROPERTY).maxDepositAmount()) passed_ = true;
    }
    
    /// @notice Check if fund meet raise amount
    function isRaisedFullAmount(uint256 _filmId) public view override returns (bool) {
        uint256 raisedAmount = getTotalFundAmountPerFilm(_filmId);

        (uint256 raiseAmount, , , ) = IVabbleDAO(VABBLE_DAO).getFilmFund(_filmId);    
        if(raisedAmount > 0 && raisedAmount >= raiseAmount) {
            return true;
        } else {
            return false;
        }
    }     

    /// @notice Get user fund amount in cash(usdc) for each token per film
    function getUserFundAmountPerFilm(
        address _customer, 
        uint256 _filmId
    ) public view override returns (uint256 amount_) {
        Asset[] memory assetArr = assetInfo[_filmId][_customer];
        for(uint256 i = 0; i < assetArr.length; i++) {
            if(assetArr[i].amount == 0) continue;
            amount_ += __getExpectedUsdcAmount(assetArr[i].token, assetArr[i].amount);
        }
    }

    /// @notice Get fund amount in cash(usdc) per film
    function getTotalFundAmountPerFilm(uint256 _filmId) public view override returns (uint256 amount_) {
        Asset[] memory assetArr = assetPerFilm[_filmId];
        for(uint256 i = 0; i < assetArr.length; i++) {
            if(assetArr[i].amount == 0) continue;
            amount_ += __getExpectedUsdcAmount(assetArr[i].token, assetArr[i].amount);
        }
    }
    
    /// @dev token amount from usdc amount
    function __getExpectedTokenAmount(
        address _token, 
        uint256 _usdcAmount
    ) public view returns (uint256 amount_) {
        amount_ = _usdcAmount;
        if(_token != IOwnablee(OWNABLE).USDC_TOKEN()) {
            amount_ = IUniHelper(UNI_HELPER).expectedAmount(_usdcAmount, IOwnablee(OWNABLE).USDC_TOKEN(), _token); 
        }
    }

    /// @dev usdc amount from token amount
    function __getExpectedUsdcAmount(
        address _token, 
        uint256 _tokenAmount
    ) public view returns (uint256 amount_) {
        amount_ = _tokenAmount;
        if(_token != IOwnablee(OWNABLE).USDC_TOKEN()) {
            amount_ = IUniHelper(UNI_HELPER).expectedAmount(_tokenAmount, _token, IOwnablee(OWNABLE).USDC_TOKEN()); 
        }
    }

    /// @notice Get fundProcessedFilmIds
    function getFundProcessedFilmIdList() external view returns (uint256[] memory) {
        return fundProcessedFilmIds;
    }
    
    /// @notice Get investor list per film Id
    function getFilmInvestorList(uint256 _filmId) external view override returns (address[] memory) {
        return filmInvestorList[_filmId];
    }

    /// @notice Get investor list per film Id
    function getAllowUserNftCount(uint256 _filmId, address _user) external view override returns (uint256) {
        return allowUserNftCount[_filmId][_user];
    }    
}
