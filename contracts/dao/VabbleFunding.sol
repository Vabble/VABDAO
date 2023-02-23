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

contract VabbleFunding is ReentrancyGuard {
    
    event DepositedTokenToFilm(address customer, address token, uint256 amount, uint256 filmId, uint256 depositTime);
    event FundFilmProcessed(uint256 filmId, address studio, uint256 processTime);
    event FundWithdrawed(uint256 filmId, address customer, uint256 withdrawTime);
    
    struct Asset {
        address token;   // token address
        uint256 amount;  // token amount
    }
  
    address private immutable OWNABLE;         // Ownablee contract address
    address private immutable STAKING_POOL;    // StakingPool contract address
    address private immutable UNI_HELPER;      // UniHelper contract address
    address private immutable DAO_PROPERTY;
    address private immutable FILM_NFT_FACTORY;  
    address private immutable VABBLE_DAO;  
    
    uint256[] private fundProcessedFilmIds;
    
    mapping(uint256 => Asset[]) public assetPerFilm;                  // (filmId => Asset[token, amount])
    mapping(uint256 => mapping(address => Asset[])) public assetInfo; // (filmId => (customer => Asset[token, amount]))
    mapping(uint256 => address[]) private filmInvestorList;   // (filmId => investor address[])
    mapping(address => uint256[]) private userInvestFilmIds;  // (user => invest filmId[]) for only approved_funding films
    mapping(address => mapping(uint256 => bool)) public isFundProcessed; // (customer => (filmId => true/false))
    
    receive() external payable {}
    
    constructor(
        address _ownable,
        address _uniHelper,
        address _staking,
        address _property,
        address _filmNftFactory,
        address _vabbleDAO
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
        FILM_NFT_FACTORY = _filmNftFactory;  
        require(_vabbleDAO!= address(0), "setup: zero DAO address");
        VABBLE_DAO = _vabbleDAO;  
    }

    // =================== Funding(Launch Pad) START ===============================
    /// @notice Deposit tokens(VAB, USDT, USDC)/native token($50 ~ $5000 per address for a film) to only funding film by investor
    function depositToFilm(
        uint256 _filmId,
        uint256 _amount, 
        address _token
    ) external payable {
        if(_token != IOwnablee(OWNABLE).PAYOUT_TOKEN()) {
            require(IOwnablee(OWNABLE).isDepositAsset(_token), "depositToFilm: not allowed asset");   
        }
        require(msg.sender != address(0) && _amount > 0, "depositToFilm: Zero value");

        (, uint256 fundPeriod, uint256 fundType) = IVabbleDAO(VABBLE_DAO).getFilmFund(_filmId);    
        (, uint256 pApproveTime) = IVabbleDAO(VABBLE_DAO).getFilmProposalTime(_filmId);
        Helper.Status status = IVabbleDAO(VABBLE_DAO).getFilmStatus(_filmId);

        require(fundType == 1 || fundType == 3, "depositToFilm: not fund type by token");
        require(status == Helper.Status.APPROVED_FUNDING, "depositToFilm: filmId not approved for funding");
        require(fundPeriod >= block.timestamp - pApproveTime, "depositToFilm: passed funding period");    

        uint256 userFundAmountPerFilm = getUserFundAmountPerFilm(msg.sender, _filmId);
        uint256 fundAmount = _amount;
        if(_token != IOwnablee(OWNABLE).USDC_TOKEN()) {
            fundAmount = IUniHelper(UNI_HELPER).expectedAmount(_amount, _token, IOwnablee(OWNABLE).USDC_TOKEN());    
        }
        uint256 amountOfUser = userFundAmountPerFilm + fundAmount;    
        require(__checkMinMaxAmount(amountOfUser), "depositToFilm: Invalid amount");

        if(userFundAmountPerFilm == 0) {
            filmInvestorList[_filmId].push(msg.sender);            
            userInvestFilmIds[msg.sender].push(_filmId);
        }

        // Return remain ETH to user back if case of ETH
        if(_token == address(0)) {
            require(msg.value >= _amount, "depositToFilm: Insufficient paid");
            if (msg.value > _amount) {
                Helper.safeTransferETH(msg.sender, msg.value - _amount);
            }
        }
        
        if(_token != address(0)) {
            Helper.safeTransferFrom(_token, msg.sender, address(this), _amount);
        }            
        __assignToken(_filmId, _token, _amount);

        emit DepositedTokenToFilm(msg.sender, _token, _amount, _filmId, block.timestamp);
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

        Helper.Status status = IVabbleDAO(VABBLE_DAO).getFilmStatus(_filmId);
        require(status == Helper.Status.APPROVED_FUNDING, "fundProcess: filmId not approved for funding");
        
        (, uint256 fundPeriod, ) = IVabbleDAO(VABBLE_DAO).getFilmFund(_filmId);    
        (, uint256 pApproveTime) = IVabbleDAO(VABBLE_DAO).getFilmProposalTime(_filmId);        
        require(fundPeriod < block.timestamp - pApproveTime, "fundProcess: funding period");

        require(isRaisedFullAmount(_filmId), "fundProcess: fails to meet raise amount");
        require(!isFundProcessed[msg.sender][_filmId], "fundProcess: already processed");
        
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
                if(IERC20(assetArr[i].token).allowance(address(this), UNI_HELPER) == 0) {
                    Helper.safeApprove(assetArr[i].token, UNI_HELPER, IERC20(assetArr[i].token).totalSupply());
                }
                bytes memory swapArgs = abi.encode(rewardAmount, assetArr[i].token, vabToken);
                rewardSumAmount += IUniHelper(UNI_HELPER).swapAsset(swapArgs);
            }
            Helper.safeTransfer(assetArr[i].token, msg.sender, (assetArr[i].amount - rewardAmount));
            // assetArr[i].amount = 0;
        }

        if(rewardSumAmount > 0) {
            if(IERC20(vabToken).allowance(address(this), STAKING_POOL) == 0) {
                Helper.safeApprove(vabToken, STAKING_POOL, IERC20(vabToken).totalSupply());
            }        
            IStakingPool(STAKING_POOL).addRewardToPool(rewardSumAmount);
        }

        fundProcessedFilmIds.push(_filmId);
        isFundProcessed[msg.sender][_filmId] = true;

        emit FundFilmProcessed(_filmId, msg.sender, block.timestamp);
    }

    /// @notice Investor can withdraw fund after fund period if funding fails to meet the raise amount
    function withdrawFunding(uint256 _filmId) external nonReentrant {     
        Helper.Status status = IVabbleDAO(VABBLE_DAO).getFilmStatus(_filmId);        
        require(status == Helper.Status.APPROVED_FUNDING, "withdrawFunding: filmId not approved for funding");
        
        (, uint256 fundPeriod, ) = IVabbleDAO(VABBLE_DAO).getFilmFund(_filmId);    
        (, uint256 pApproveTime) = IVabbleDAO(VABBLE_DAO).getFilmProposalTime(_filmId); 
        require(fundPeriod < block.timestamp - pApproveTime, "withdrawFunding: funding period");

        require(!isRaisedFullAmount(_filmId), "withdrawFunding: satisfied raise amount");

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

        emit FundWithdrawed(_filmId, msg.sender, block.timestamp);
    }

    /// @dev Check min & max amount for each token/ETH per film
    function __checkMinMaxAmount(uint256 _amount) private view returns (bool passed_) {
        if(_amount >= IProperty(DAO_PROPERTY).minDepositAmount() && _amount <= IProperty(DAO_PROPERTY).maxDepositAmount()) {
            passed_ = true;
        } else {
            passed_ = false;
        } 
    }
    
    /// @notice Check if fund meet raise amount
    function isRaisedFullAmount(uint256 _filmId) public view returns (bool) {
        uint256 raisedAmount = getRaisedAmountByToken(_filmId) + IFactoryFilmNFT(FILM_NFT_FACTORY).getRaisedAmountByNFT(_filmId);

        (uint256 raiseAmount, , ) = IVabbleDAO(VABBLE_DAO).getFilmFund(_filmId);    
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
    ) public view returns (uint256 amount_) {
        address usdcToken = IOwnablee(OWNABLE).USDC_TOKEN();
        Asset[] memory assetArr = assetInfo[_filmId][_customer];
        for(uint256 i = 0; i < assetArr.length; i++) {
            if(assetArr[i].amount == 0) continue;

            if(assetArr[i].token == usdcToken) {
                amount_ += assetArr[i].amount;
            } else {
                amount_ += IUniHelper(UNI_HELPER).expectedAmount(assetArr[i].amount, assetArr[i].token, usdcToken);
            }
        }
    }

    /// @notice Get fund amount in cash(usdc) per film
    function getRaisedAmountByToken(uint256 _filmId) public view returns (uint256 amount_) {
        address usdcToken = IOwnablee(OWNABLE).USDC_TOKEN();
        Asset[] memory assetArr = assetPerFilm[_filmId];
        for(uint256 i = 0; i < assetArr.length; i++) {
            if(assetArr[i].amount == 0) continue;

            if(assetArr[i].token == usdcToken) {
                amount_ += assetArr[i].amount;
            } else {
                amount_ += IUniHelper(UNI_HELPER).expectedAmount(assetArr[i].amount, assetArr[i].token, usdcToken);
            }
        }
    }

    /// @notice Get investor list per film Id
    function getInvestorList(uint256 _filmId) external view returns (address[] memory) {
        return filmInvestorList[_filmId];
    }

    /// @notice Get fundProcessedFilmIds
    function getFundProcessedFilmIdList() external view returns (uint256[] memory) {
        return fundProcessedFilmIds;
    }

    /// @notice Get userInvestFilmIds
    function getUserInvestFilmIdList(address _user) external view returns (uint256[] memory) {
        return userInvestFilmIds[_user];
    }
    
}
