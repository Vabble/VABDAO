// ooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooo
// 88             88            B8         B8         B8
//  88           88             88         88         88
//   88         88              88         88         88 
//    88       88   .d88888b.   88b8888b.  88b8888b.  88  .d88888b. 
//     88     88    88'   `88   88'   `88  88'   `88  88  88'   `8b
//      88   88     88     88   88     88  88     88  88  88b8888P`
//       88 88      88.   .88   88.   .88  88.   .88  88  88.   
//        88        `88888P`88  BBP88888'  BBP88888`  88  `888888P
// ooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooo

// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "../libraries/Helper.sol";
import "../interfaces/IUniHelper.sol";
import "../interfaces/IStakingPool.sol";
import "../interfaces/IProperty.sol";
import "../interfaces/IOwnablee.sol";
import "../interfaces/IVabbleFund.sol";
import "../interfaces/IVabbleDAO.sol";
// import "../libraries/VabbleDAOUtils.sol";


contract VabbleDAO is ReentrancyGuard {
    using Counters for Counters.Counter;

    event FilmProposalCreated(uint256 indexed filmId, uint256 noVote, uint256 fundType, address studio);
    event FilmProposalUpdated(uint256 indexed filmId, uint256 fundType, address studio);  
    event FinalFilmSetted(address[] users, uint256[] filmIds, uint256[] watchedPercents, uint256[] rentPrices, uint256 setTime);
    event FilmFundPeriodUpdated(uint256 indexed filmId, address studio, uint256 fundPeriod);
    event AllocatedToPool(address[] users, uint256[] amounts, uint256 which);
    // event RewardClaimed(address user, uint256 monthId, uint256 filmId, uint256 claimAmount, uint256 claimTime);  
    event RewardAllClaimed(address indexed user, uint256 indexed monthId, uint256[] filmIds, uint256 claimAmount);  
    event SetFinalFilms(address indexed user, uint256[] filmIds, uint256[] payouts);  
    event ChangeFilmOwner(uint256 indexed filmId, address indexed oldOwner, address indexed newOwner);  

    address public immutable OWNABLE;         // Ownablee contract address
    address public immutable VOTE;            // Vote contract address
    address public immutable STAKING_POOL;    // StakingPool contract address
    address public immutable UNI_HELPER;      // UniHelper contract address
    address public immutable DAO_PROPERTY;
    address public immutable VABBLE_FUND;  

    uint256[] private proposalFilmIds;    
    uint256[] private updatedProposalFilmIds;    
    uint256[] private approvedFundingFilmIds;
    uint256[] private approvedListingFilmIds;
    address[] private studioPoolUsers;            // (which => user list)
    address[] private edgePoolUsers;              // (which => user list)

    mapping(uint256 => IVabbleDAO.Film) public filmInfo;              // Each film information(filmId => Film)
    mapping(address => uint256[]) private userUpdatedFilmProposalIds; // (studio => filmId list)
    mapping(address => uint256[]) private userFilmProposalIds;        // (studio => filmId list)
    mapping(address => uint256[]) private userApprovedFilmIds;        // (studio => filmId list)

    mapping(uint256 => uint256[]) private finalizedFilmIds;           // (monthId => filmId list)
    mapping(uint256 => mapping(uint256 => mapping(address => uint256))) public finalizedAmount; 
    mapping(uint256 => mapping(address => uint256)) public latestClaimMonthId;      // (filmId => (user => monthId))    
    mapping(address => uint256[]) private userFinalFilmIds;           // (investor => finalized filmId list)  
    mapping(address => mapping(uint256 => bool)) private isInvested;  // (investor => (filmId => true/false))
        
    mapping(address => bool) private isStudioPoolUser;
    mapping(address => bool) private isEdgePoolUser;

    uint256 public StudioPool; 
    mapping(uint256 => uint256) public finalFilmCalledTime;           // (filmId => finalized time)

    Counters.Counter public filmCount;          // created filmId is from No.1
    Counters.Counter public updatedFilmCount;   // updated filmId is from No.1
    Counters.Counter public monthId;            // monthId

    modifier onlyAuditor() {
        require(msg.sender == IOwnablee(OWNABLE).auditor(), "caller is not the auditor");
        _;
    }  
    modifier onlyVote() {
        require(msg.sender == VOTE, "caller is not the vote contract");
        _;
    }
    modifier onlyStakingPool() {
        require(msg.sender == STAKING_POOL, "caller is not the StakingPool contract");
        _;
    }

    receive() external payable {}
    
    constructor(
        address _ownable,
        address _uniHelper,
        address _vote,
        address _staking,
        address _property,
        address _vabbleFund
    ) {        
        OWNABLE = _ownable;     
        UNI_HELPER = _uniHelper;
        VOTE = _vote;
        STAKING_POOL = _staking;      
        DAO_PROPERTY = _property; 
        VABBLE_FUND = _vabbleFund;  
    }

    // ======================== Film proposal ==============================
    /// @notice Staker create multi proposal for a lot of films | noVote: if 0 => false, 1 => true
    /// _feeToken : Matic/USDC/USDT, not VAB
    function proposalFilmCreate(uint256 _fundType, uint256 _noVote, address _feeToken) external payable nonReentrant {     
        require(_feeToken != IOwnablee(OWNABLE).PAYOUT_TOKEN(), "proposalFilm: not allowed VAB");
        if(_feeToken != address(0)) {
            require(IOwnablee(OWNABLE).isDepositAsset(_feeToken), "proposalFilm: not allowed asset");   
        }
        if(_fundType == 0) require(_noVote == 0, "proposalFilm: should pass vote");
        
        __paidFee(_feeToken, _noVote);
 
        filmCount.increment();
        uint256 filmId = filmCount.current();

        IVabbleDAO.Film storage fInfo = filmInfo[filmId];
        fInfo.fundType = _fundType;
        fInfo.noVote = _noVote;
        fInfo.studio = msg.sender;
        fInfo.status = Helper.Status.LISTED;

        proposalFilmIds.push(filmId);
        userFilmProposalIds[msg.sender].push(filmId);

        emit FilmProposalCreated(filmId, _noVote, _fundType, msg.sender);
    }
    function proposalFilmUpdate(
        uint256 _filmId, 
        string memory _title,
        string memory _description,
        uint256[] calldata _sharePercents,
        address[] calldata _studioPayees,
        uint256 _raiseAmount,
        uint256 _fundPeriod,
        uint256 _rewardPercent,
        uint256 _enableClaimer
    ) external nonReentrant {                
        require(_studioPayees.length != 0, 'proposalUpdate: empty payees');
        require(_studioPayees.length == _sharePercents.length, 'proposalUpdate: invalid share percent');
        
        bytes memory titleByte = bytes(_title);
        require(titleByte.length != 0, "proposalUpdate: empty title");

        IVabbleDAO.Film storage fInfo = filmInfo[_filmId];
        if(fInfo.fundType != 0) {            
            require(_fundPeriod != 0, 'proposalUpdate: invalid fund period');
            require(_raiseAmount > IProperty(DAO_PROPERTY).minDepositAmount(), 'proposalUpdate: invalid raise amount');
            require(_rewardPercent <= 1e10, 'proposalUpdate: over 100% reward percent');
        } else {
            require(_rewardPercent == 0, 'proposalUpdate: should be zero');
        }

        uint256 totalPercent = 0;
        if(_studioPayees.length == 1) totalPercent = _sharePercents[0];
        else {
            for(uint256 i = 0; i < _studioPayees.length; ++i) {
                totalPercent += _sharePercents[i];
            }
        }
        require(totalPercent == 1e10, 'proposalUpdate: total percent should be 100%');
        
        require(fInfo.status == Helper.Status.LISTED, 'proposalUpdate: Not listed');
        require(fInfo.studio == msg.sender, 'proposalUpdate: not film owner');

        fInfo.title = _title;
        fInfo.description = _description;
        fInfo.sharePercents = _sharePercents;
        fInfo.studioPayees = _studioPayees;    
        fInfo.raiseAmount = _raiseAmount;
        fInfo.fundPeriod = _fundPeriod;
        fInfo.rewardPercent = _rewardPercent;
        fInfo.enableClaimer = _enableClaimer;
        fInfo.pCreateTime = block.timestamp;
        fInfo.studio = msg.sender;
        fInfo.status = Helper.Status.UPDATED;

        updatedFilmCount.increment();
        updatedProposalFilmIds.push(_filmId);
        userUpdatedFilmProposalIds[msg.sender].push(_filmId);

        IStakingPool(STAKING_POOL).updateProposalCreatedTimeList(block.timestamp); // add timestap to array for calculating rewards

        // If proposal is for fund, update "lastfundProposalCreateTime"
        if(fInfo.fundType != 0) {
            IStakingPool(STAKING_POOL).updateLastfundProposalCreateTime(block.timestamp);

            if(fInfo.noVote == 1) {
                fInfo.status = Helper.Status.APPROVED_FUNDING;
                fInfo.pApproveTime = block.timestamp;
                approvedFundingFilmIds.push(_filmId);
                userApprovedFilmIds[msg.sender].push(_filmId);
            } 
        }       

        emit FilmProposalUpdated(_filmId, fInfo.fundType, msg.sender);     
    }

    function changeOwner(uint256 _filmId, address newOwner) external nonReentrant returns (bool) {
        IVabbleDAO.Film storage fInfo = filmInfo[_filmId];

        require(fInfo.studio == msg.sender, 'changeOwner: not film owner');

        uint256 payeeLength = fInfo.studioPayees.length;  
        for(uint256 k = 0; k < payeeLength; k++) {
            if (fInfo.studioPayees[k] == msg.sender)
                fInfo.studioPayees[k] = newOwner;
        }

        fInfo.studio = newOwner;

        if (fInfo.status == Helper.Status.LISTED) {
            moveToAnotherArray(userFilmProposalIds[msg.sender], userFilmProposalIds[newOwner], _filmId);
        }

        if (fInfo.status == Helper.Status.UPDATED) {            
            moveToAnotherArray(userUpdatedFilmProposalIds[msg.sender], userUpdatedFilmProposalIds[newOwner], _filmId);
        }
        
        if (fInfo.status == Helper.Status.APPROVED_FUNDING || fInfo.status == Helper.Status.APPROVED_LISTING) {
            moveToAnotherArray(userApprovedFilmIds[msg.sender], userApprovedFilmIds[newOwner], _filmId);
            moveToAnotherArray(userFinalFilmIds[msg.sender], userFinalFilmIds[newOwner], _filmId);
            uint256 curMonth = monthId.current();        
            updateFinalizeAmountAndLastClaimMonth(_filmId, curMonth, msg.sender, newOwner);
        }
        
        emit ChangeFilmOwner(_filmId, msg.sender, newOwner);

        return true;
    }

    function moveToAnotherArray(uint256[] storage array1, uint256[] storage array2, uint256 value) private {
        uint256 index = array1.length;

        for(uint256 i = 0; i < array1.length; ++i) {
            if(array1[i] == value) {
                index = i;
            }
        }

        if (index >= array1.length) return;

        array2.push(value);
        
        array1[index] = array1[array1.length - 1];
        array1.pop();
    }

    /// @notice Check if proposal fee transferred from studio to stakingPool
    // Get expected VAB amount from UniswapV2 and then Transfer VAB: user(studio) -> stakingPool.
    function __paidFee(address _dToken, uint256 _noVote) private {    
        uint256 feeAmount = IProperty(DAO_PROPERTY).proposalFeeAmount(); // in cash(usdc)
        if(_noVote == 1) feeAmount = IProperty(DAO_PROPERTY).proposalFeeAmount() * 2;
        
        uint256 expectTokenAmount = feeAmount;
        if(_dToken != IOwnablee(OWNABLE).USDC_TOKEN()) {
            expectTokenAmount = IUniHelper(UNI_HELPER).expectedAmount(feeAmount, IOwnablee(OWNABLE).USDC_TOKEN(), _dToken);
        }

        if(_dToken == address(0)) {
            require(msg.value >= expectTokenAmount, "paidFee: Insufficient paid");
            if (msg.value > expectTokenAmount) {
                Helper.safeTransferETH(msg.sender, msg.value - expectTokenAmount);
            }
            // Send ETH from this contract to UNI_HELPER contract
            Helper.safeTransferETH(UNI_HELPER, expectTokenAmount);
        } else {
            Helper.safeTransferFrom(_dToken, msg.sender, address(this), expectTokenAmount);
            if(IERC20(_dToken).allowance(address(this), UNI_HELPER) == 0) {
                Helper.safeApprove(_dToken, UNI_HELPER, IERC20(_dToken).totalSupply());
            }
        }                
        
        address vabToken = IOwnablee(OWNABLE).PAYOUT_TOKEN();
        bytes memory swapArgs = abi.encode(expectTokenAmount, _dToken, vabToken);
        uint256 vabAmount = IUniHelper(UNI_HELPER).swapAsset(swapArgs);    
        
        if(IERC20(vabToken).allowance(address(this), STAKING_POOL) == 0) {
            Helper.safeApprove(vabToken, STAKING_POOL, IERC20(vabToken).totalSupply());
        }  
        IStakingPool(STAKING_POOL).addRewardToPool(vabAmount);
    } 

    /// @notice Approve a film for funding/listing from vote contract
    function approveFilmByVote(uint256 _filmId, uint256 _flag) external onlyVote {
        require(_filmId != 0, "approveFilmByVote: Invalid filmId"); 

        filmInfo[_filmId].pApproveTime = block.timestamp;

        uint256 fundType = filmInfo[_filmId].fundType;
        if(_flag == 0) {
            if(fundType != 0) { // in case of fund film
                filmInfo[_filmId].status = Helper.Status.APPROVED_FUNDING;
                approvedFundingFilmIds.push(_filmId);
            } else {
                filmInfo[_filmId].status = Helper.Status.APPROVED_LISTING;    
                approvedListingFilmIds.push(_filmId);
            }        
            address studioA = filmInfo[_filmId].studio;
            userApprovedFilmIds[studioA].push(_filmId);
        } else {
            filmInfo[_filmId].status = Helper.Status.REJECTED;
        } 
    }

    /// @notice onlyStudio update film fund period
    function updateFilmFundPeriod(uint256 _filmId, uint256 _fundPeriod) external nonReentrant {
        require(msg.sender == filmInfo[_filmId].studio, "uFP: 1"); // updateFundPeriod: not film owner
        require(filmInfo[_filmId].fundType != 0, "uFP: 2"); // updateFundPeriod: not fund film

        filmInfo[_filmId].fundPeriod = _fundPeriod;
        
        emit FilmFundPeriodUpdated(_filmId, msg.sender, _fundPeriod);
    }   

    /// @notice Allocate VAB from StakingPool(user balance) to EdgePool(Ownable)/StudioPool(VabbleDAO) by Auditor
    // _which = 1 => to EdgePool, _which = 2 => to StudioPool
    function allocateToPool(
        address[] calldata _users,
        uint256[] calldata _amounts,
        uint256 _which
    ) external onlyAuditor nonReentrant {
        uint256 userLength = _users.length;

        require(userLength == _amounts.length && userLength < 1000, "allocate: bad array");
        require(_which == 1 || _which == 2, "allocate: bad from value");

        if(_which == 1) {            
            IStakingPool(STAKING_POOL).sendVAB(_users, OWNABLE, _amounts);
        } else {
            StudioPool += IStakingPool(STAKING_POOL).sendVAB(_users, address(this), _amounts);
        }

        
        for(uint256 i = 0; i < userLength; ++i) {   
            if(_which == 1) {
                if(isEdgePoolUser[_users[i]]) continue;

                isEdgePoolUser[_users[i]] = true;
                edgePoolUsers.push(_users[i]);
            } else {
                if(isStudioPoolUser[_users[i]]) continue;

                isStudioPoolUser[_users[i]] = true;
                studioPoolUsers.push(_users[i]);
            }
        }

        emit AllocatedToPool(_users, _amounts, _which);
    }

    /// @notice Allocate VAB from EdgePool(Ownable) to StudioPool(VabbleDAO) by Auditor
    function allocateFromEdgePool(uint256 _amount) external onlyAuditor nonReentrant {
        uint256 userLength = edgePoolUsers.length;
        require(userLength < 100000, "bad array");

        IOwnablee(OWNABLE).addToStudioPool(_amount); // Transfer VAB from EdgePool to StudioPool
        StudioPool += _amount;

                
        for(uint256 i = 0; i < userLength; ++i) {   
            if(isStudioPoolUser[edgePoolUsers[i]]) continue;

            studioPoolUsers.push(edgePoolUsers[i]);
        }

        delete edgePoolUsers;
    }

    /// @notice Withdraw VAB token from StudioPool(VabbleDAO) to V2 by StakingPool contract
    function withdrawVABFromStudioPool(address _to) external onlyStakingPool nonReentrant returns (uint256) {
        address vabToken = IOwnablee(OWNABLE).PAYOUT_TOKEN();    
        uint256 poolBalance = IERC20(vabToken).balanceOf(address(this));    
        if(poolBalance != 0) {
            Helper.safeTransfer(vabToken, _to, poolBalance);
            
            StudioPool = 0;
            delete studioPoolUsers;
        }
        
        return poolBalance;
    }

    /// Pre-Checking for set Final Film
    function checkSetFinalFilms(uint256[] calldata _filmIds) public view returns (bool[] memory _valids) {
        uint256 fPeriod = IProperty(DAO_PROPERTY).filmRewardClaimPeriod();

        _valids = new bool[](_filmIds.length);

        uint256 filmLength = _filmIds.length;
        for (uint256 i = 0; i < filmLength; ++i) {
            if (finalFilmCalledTime[_filmIds[i]] != 0) {
                _valids[i] = block.timestamp - finalFilmCalledTime[_filmIds[i]] >= fPeriod;                
            } else {
                _valids[i] = true;
            }
        }      
    }

    /// @notice Set final films for a customer with watched 
    // Auditor call this function per month
    function setFinalFilms(        
        uint256[] calldata _filmIds,
        uint256[] calldata _payouts // VAB to payees based on share(%) and watch(%) from offchain
    ) external onlyAuditor nonReentrant {
        uint256 filmLength = _filmIds.length;

        require(filmLength != 0 && filmLength < 1000 && filmLength == _payouts.length, "final: bad length");
        
        bool[] memory _valids = checkSetFinalFilms(_filmIds);
        
        for(uint256 i = 0; i < filmLength; ++i) {     
            if(_filmIds[i] == 0 || _payouts[i] == 0) continue;
            if (!_valids[i]) continue;

            __setFinalFilm(_filmIds[i], _payouts[i]);
            finalFilmCalledTime[_filmIds[i]] = block.timestamp;
        }

        emit SetFinalFilms(msg.sender, _filmIds, _payouts);
    }

    function startNewMonth() external onlyAuditor nonReentrant {
        monthId.increment();        
    }

    function __setFinalFilm(
        uint256 _filmId, 
        uint256 _payout  
    ) private {     
        IVabbleDAO.Film memory fInfo = filmInfo[_filmId];
        require(fInfo.status == Helper.Status.APPROVED_LISTING || fInfo.status == Helper.Status.APPROVED_FUNDING, "final: Not approved");

        uint256 curMonth = monthId.current();        
        if(fInfo.status == Helper.Status.APPROVED_LISTING) {

            __setFinalAmountToPayees(_filmId, _payout, curMonth);                

        } else if(fInfo.status == Helper.Status.APPROVED_FUNDING) {
            uint256 rewardAmount = _payout * fInfo.rewardPercent / 1e10;
            uint256 payAmount = _payout - rewardAmount;                 

            if(!IVabbleFund(VABBLE_FUND).isRaisedFullAmount(_filmId)) {
                rewardAmount = 0;
                payAmount = _payout;
            }

            // set to funders
            if(rewardAmount != 0) __setFinalAmountToHelpers(_filmId, rewardAmount, curMonth);

            // set to studioPayees
            if(payAmount != 0) __setFinalAmountToPayees(_filmId, payAmount, curMonth);  
        }

        finalizedFilmIds[curMonth].push(_filmId);
    }  

    /// @dev Avoid deep error
    function __setFinalAmountToPayees(uint256 _filmId, uint256 _payout, uint256 _curMonth) private {       
        IVabbleDAO.Film memory fInfo = filmInfo[_filmId];       
        uint256 payeeLength = fInfo.studioPayees.length;  
        for(uint256 k = 0; k < payeeLength; k++) {
            uint256 shareAmount = _payout * fInfo.sharePercents[k] / 1e10;
            finalizedAmount[_curMonth][_filmId][fInfo.studioPayees[k]] += shareAmount;

            __addFinalFilmId(fInfo.studioPayees[k], _filmId);
        } 
    }
    /// @dev Avoid deep error
    function __setFinalAmountToHelpers(uint256 _filmId, uint256 _rewardAmount, uint256 _curMonth) private {                
        uint256 raisedAmount = IVabbleFund(VABBLE_FUND).getTotalFundAmountPerFilm(_filmId);
        if(raisedAmount != 0) {
            address[] memory investors = IVabbleFund(VABBLE_FUND).getFilmInvestorList(_filmId); 
            for(uint256 i = 0; i < investors.length; ++i) {   
                uint256 userAmount = IVabbleFund(VABBLE_FUND).getUserFundAmountPerFilm(investors[i], _filmId);
                if(userAmount == 0) continue;

                uint256 percent = (userAmount * 1e10) / raisedAmount;
                uint256 amount = (_rewardAmount * percent) / 1e10;     
                finalizedAmount[_curMonth][_filmId][investors[i]] += amount;
                
                __addFinalFilmId(investors[i], _filmId);
            }
        }
    }
    function __addFinalFilmId(address _user, uint256 _filmId) private {
        if(!isInvested[_user][_filmId]) {
            userFinalFilmIds[_user].push(_filmId);
            isInvested[_user][_filmId] = true;
        }
    }

    // Claim reward for multi-filmIds till current from when auditor call setFinalFilms()
    function claimReward(uint256[] memory _filmIds) external nonReentrant {             
        require(_filmIds.length != 0 && _filmIds.length < 1000, "claimReward: zero film ids");
         
        __claimAllReward(_filmIds);        
    }

    function __claimAllReward(uint256[] memory _filmIds) private {     
        uint256 filmLength = _filmIds.length;
        require(filmLength < 100000, "bad array");
        
        uint256 curMonth = monthId.current();
        address vabToken = IOwnablee(OWNABLE).PAYOUT_TOKEN(); 
        uint256 rewardSum;        
        for(uint256 i = 0; i < filmLength; ++i) {  
            if (finalFilmCalledTime[_filmIds[i]] == 0) // not still call final film
                continue;

            rewardSum += getUserRewardAmount(_filmIds[i], curMonth);            
            latestClaimMonthId[_filmIds[i]][msg.sender] = curMonth;
        }
        
        require(rewardSum != 0, "claimReward: zero amount");
        require(StudioPool >= rewardSum, "claimReward: insufficient amount");
        require(IERC20(vabToken).balanceOf(address(this)) >= StudioPool, "claimReward: insufficient balance");

        Helper.safeTransfer(vabToken, msg.sender, rewardSum);
        StudioPool -= rewardSum; 

        emit RewardAllClaimed(msg.sender, curMonth, _filmIds, rewardSum);
    }

    // Claim reward of all filmIds for each user
    function claimAllReward() external nonReentrant {     
        uint256[] memory filmIds = userFinalFilmIds[msg.sender];
        require(filmIds.length != 0 && filmIds.length < 1000, "claimAllReward: zero film ids");

        __claimAllReward(filmIds);   
    }

    function getUserRewardAmountBetweenMonthsForUser (
        uint256 _filmId, 
        uint256 _preMonth, 
        uint256 _curMonth, 
        address _user
    ) public view returns (uint256 amount_) {
        if(_preMonth < _curMonth) {
            for(uint256 mon = _preMonth + 1; mon <= _curMonth; ++mon) {
                amount_ += finalizedAmount[mon][_filmId][_user];
            }                   
        }
    }

    function getAllAvailableRewards(
        uint256 _curMonth
    ) public view returns (uint256 reward_) {
        uint256[] memory filmIds = userFinalFilmIds[msg.sender];

        uint256 rewardSum;
        uint256 preMonth;
        uint256 filmLength = filmIds.length;
        for(uint256 i = 0; i < filmLength; ++i) {  
            preMonth = latestClaimMonthId[filmIds[i]][msg.sender];
            rewardSum += getUserRewardAmountBetweenMonthsForUser(filmIds[i], preMonth, _curMonth, msg.sender);                        
        }

        reward_ = rewardSum;
    }
        
    function getUserRewardAmount(uint256 _filmId, uint256 _curMonth) public view returns (uint256 amount_) {        
        uint256 preMonth = latestClaimMonthId[_filmId][msg.sender];
        amount_ = getUserRewardAmountBetweenMonthsForUser(_filmId, preMonth, _curMonth, msg.sender);
    }

    function getUserRewardAmountForUser(uint256 _filmId, uint256 _curMonth, address _user) public view returns (uint256 amount_) {        
        uint256 preMonth = latestClaimMonthId[_filmId][_user];
        amount_ = getUserRewardAmountBetweenMonthsForUser(_filmId, preMonth, _curMonth, _user);
    }

    function getPrevMonthAndUser(uint256 _filmId) public view returns (uint256 preMonth_, address user_) {
        preMonth_ = latestClaimMonthId[_filmId][msg.sender];
        user_ = msg.sender;
    }

    function getUserFinalFilmIds(address _user) external view returns (uint256[] memory) {        
        return userFinalFilmIds[_user];
    }

    /// @notice Get film status based on Id
    function getFilmStatus(uint256 _filmId) public view returns (Helper.Status status_) {
        status_ = filmInfo[_filmId].status;
    }

    /// @notice Get film owner(studio) based on Id
    function getFilmOwner(uint256 _filmId) public view returns (address owner_) {
        owner_ = filmInfo[_filmId].studio;
    }

    /// @notice Get film fund info based on Id
    function getFilmFund(uint256 _filmId) public view 
    returns (
        uint256 raiseAmount_, 
        uint256 fundPeriod_, 
        uint256 fundType_,
        uint256 rewardPercent_        
    ) {
        raiseAmount_ = filmInfo[_filmId].raiseAmount;
        fundPeriod_ = filmInfo[_filmId].fundPeriod;
        fundType_ = filmInfo[_filmId].fundType;
        rewardPercent_ = filmInfo[_filmId].rewardPercent;
    }

    /// @notice Get film fund info based on Id
    function getFilmShare(uint256 _filmId) external view 
    returns (
        uint256[] memory sharePercents_, 
        address[] memory studioPayees_
    ) {
        sharePercents_ = filmInfo[_filmId].sharePercents;
        studioPayees_ = filmInfo[_filmId].studioPayees;
    }

    /// @notice Get film proposal created time based on Id
    function getFilmProposalTime(uint256 _filmId) public view returns (uint256 cTime_, uint256 aTime_) {
        cTime_ = filmInfo[_filmId].pCreateTime;
        aTime_ = filmInfo[_filmId].pApproveTime;
    }

    /// @notice Get enableClaimer based on Id
    function isEnabledClaimer(uint256 _filmId) external view returns (bool enable_) {
        if(filmInfo[_filmId].enableClaimer == 1) enable_ = true;
        else enable_ = false;
    }
    
    /// @notice Set enableClaimer based on Id by studio
    function updateEnabledClaimer(uint256 _filmId, uint256 _enable) external {
        require(filmInfo[_filmId].studio == msg.sender, "updateEnableClaimer: not film owner");

        filmInfo[_filmId].enableClaimer = _enable;
    }

    /// @notice Get film Ids
    function getFilmIds(uint256 _flag) external view returns (uint256[] memory list_) {        
        if(_flag == 1) list_ = proposalFilmIds;
        else if(_flag == 2) list_ = approvedListingFilmIds;        
        else if(_flag == 3) list_ = approvedFundingFilmIds;        
        else if(_flag == 4) list_ = updatedProposalFilmIds;     
    }

    /// @notice flag=1 => studioPoolUsers, flag=2 => edgePoolUsers
    function getPoolUsers(uint256 _flag) external onlyAuditor view returns (address[] memory list_) {         
        if(_flag == 1) list_ = studioPoolUsers;
        else if(_flag == 2) list_ = edgePoolUsers;
    }

    function getFinalizedFilmIds(uint256 _monthId) external view returns (uint256[] memory) {           
        return finalizedFilmIds[_monthId];
    }

    // function getUserFilmIds(uint256 _flag, address _user) external view returns (uint256[] memory list_) {           
    //     if(_flag == 1) list_ = userUpdatedFilmProposalIds[_user];
    //     else if(_flag == 2) list_ = userFilmProposalIds[_user];
    //     else if(_flag == 3) list_ = userApprovedFilmIds[_user];
    // }

    // function getUserFilmListForMigrate(address _user) external view returns (IVabbleDAO.Film[] memory filmList_) {   
    //     filmList_ = VabbleDAOUtils.getUserFilmListForMigrate(_user, userApprovedFilmIds, filmInfo);
    // }    

    function updateFinalizeAmountAndLastClaimMonth (
        uint256 _filmId, 
        uint256 _curMonth, 
        address _oldOwner,
        address _newOwner
    ) private {
        uint256 _preMonth = latestClaimMonthId[_filmId][_oldOwner];

        // update last claim month for newOwner
        latestClaimMonthId[_filmId][_newOwner] = _preMonth;
        
        if(_preMonth < _curMonth) {
            for(uint256 mon = _preMonth + 1; mon <= _curMonth; ++mon) {
                // set finalizedAmount for new owner
                finalizedAmount[mon][_filmId][_newOwner] = finalizedAmount[mon][_filmId][_oldOwner];

                // set 0 for old owner
                finalizedAmount[mon][_filmId][_oldOwner] = 0;
            }                   
        }
        
    }
}
