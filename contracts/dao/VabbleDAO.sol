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
import "../interfaces/IVote.sol";
import "../libraries/DAOOperations .sol";

contract VabbleDAO is ReentrancyGuard {
    using Counters for Counters.Counter;

    event FilmProposalCreated(uint256 indexed filmId, uint256 noVote, uint256 fundType, address studio);
    event FilmProposalUpdated(uint256 indexed filmId, uint256 fundType, address studio);
    event FinalFilmSetted(
        address[] users, uint256[] filmIds, uint256[] watchedPercents, uint256[] rentPrices, uint256 setTime
    );
    event FilmFundPeriodUpdated(uint256 indexed filmId, address studio, uint256 fundPeriod);
    event AllocatedToPool(address[] users, uint256[] amounts, uint256 which);
    event RewardAllClaimed(address indexed user, uint256 indexed monthId, uint256[] filmIds, uint256 claimAmount);
    event SetFinalFilms(address indexed user, uint256[] filmIds, uint256[] payouts);
    event ChangeFilmOwner(uint256 indexed filmId, address indexed oldOwner, address indexed newOwner);
    event FilmProposalsMigrated(uint256 numberOfFilms, address migrator);

    address public immutable OWNABLE; // Ownablee contract address
    address public immutable VOTE; // Vote contract address
    address public immutable STAKING_POOL; // StakingPool contract address
    address public immutable UNI_HELPER; // UniHelper contract address
    address public immutable DAO_PROPERTY;
    address public immutable VABBLE_FUND;

    // (flag => filmId list) flag: 1=proposal, 2=approveListing, 3=approveFunding, 4=updated
    mapping(uint256 => uint256[]) private totalFilmIds;

    address[] private studioPoolUsers; // (which => user list)
    address[] private edgePoolUsers; // (which => user list)

    mapping(uint256 => IVabbleDAO.Film) public filmInfo; // Each film information(filmId => Film)
    // (user => (flag => filmId list)) flag: 1=create, 2=update, 3=approve, 4=final
    mapping(address => mapping(uint256 => uint256[])) private userFilmIds;

    mapping(uint256 => uint256[]) private finalizedFilmIds; // (monthId => filmId list)
    mapping(uint256 => mapping(uint256 => mapping(address => uint256))) public finalizedAmount;
    mapping(uint256 => mapping(address => uint256)) public latestClaimMonthId; // (filmId => (user => monthId))
    mapping(address => mapping(uint256 => bool)) private isInvested; // (investor => (filmId => true/false))

    mapping(address => bool) private isStudioPoolUser;
    mapping(address => bool) private isEdgePoolUser;

    uint256 public StudioPool;
    mapping(uint256 => uint256) public finalFilmCalledTime; // (filmId => finalized time)

    bool private migrationPerformed;

    Counters.Counter public filmCount; // created filmId is from No.1
    Counters.Counter public updatedFilmCount; // updated filmId is from No.1
    Counters.Counter public monthId; // monthId

    modifier onlyAuditor() {
        require(msg.sender == IOwnablee(OWNABLE).auditor(), "only auditor");
        _;
    }

    modifier onlyVote() {
        require(msg.sender == VOTE, "only vote");
        _;
    }

    modifier onlyStakingPool() {
        require(msg.sender == STAKING_POOL, "only stakingPool");
        _;
    }

    receive() external payable { }

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

    /// @notice One-time migration function to import existing film proposals
    /// @dev Can only be called once by the auditor
    /// @param _filmDetails Array of film details corresponding to the film IDs
    function migrateFilmProposals(IVabbleDAO.Film[] calldata _filmDetails) external {
        require(!migrationPerformed, "Migration already completed");
        migrationPerformed = true;
        DAOOperations.migrateFilmProposals(
            _filmDetails, filmInfo, totalFilmIds, userFilmIds, filmCount, updatedFilmCount
        );
        emit FilmProposalsMigrated(_filmDetails.length, msg.sender);
    }

    /**
     * Film proposal
     *
     * @param _fundType Distribution => 0, Token => 1, NFT => 2, NFT & Token => 3
     * @param _noVote if 0 => false, 1 => true
     * @param _feeToken Matic/USDC/USDT, not VAB
     */
    function proposalFilmCreate(uint256 _fundType, uint256 _noVote, address _feeToken) external payable nonReentrant {
        require(_feeToken != IOwnablee(OWNABLE).PAYOUT_TOKEN(), "pF: not allowed VAB");
        if (_feeToken != address(0)) {
            require(IOwnablee(OWNABLE).isDepositAsset(_feeToken), "pF: not allowed asset");
        }
        if (_fundType == 0) require(_noVote == 0, "pF: pass vote");

        __paidFee(_feeToken, _noVote);

        filmCount.increment();
        uint256 filmId = filmCount.current();

        IVabbleDAO.Film storage fInfo = filmInfo[filmId];
        fInfo.fundType = _fundType;
        fInfo.noVote = _noVote;
        fInfo.studio = msg.sender;
        fInfo.status = Helper.Status.LISTED;

        totalFilmIds[1].push(filmId);
        userFilmIds[msg.sender][1].push(filmId); // create

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
    )
        external
        nonReentrant
    {
        require(_studioPayees.length != 0, "pU: e1");
        require(_studioPayees.length == _sharePercents.length, "pU: e2");
        require(bytes(_title).length != 0, "pU: e3");

        IVabbleDAO.Film storage fInfo = filmInfo[_filmId];
        if (fInfo.fundType != 0) {
            require(_fundPeriod != 0, "pU: e4");
            require(_raiseAmount > IProperty(DAO_PROPERTY).minDepositAmount(), "pU: e5");
            require(_rewardPercent <= 1e10, "pU: e6");
        } else {
            require(_rewardPercent == 0, "pU: e7");
        }

        uint256 totalPercent = 0;
        if (_studioPayees.length == 1) {
            totalPercent = _sharePercents[0];
        } else {
            for (uint256 i = 0; i < _studioPayees.length; ++i) {
                totalPercent += _sharePercents[i];
            }
        }
        require(totalPercent == 1e10, "pU: e8");

        require(fInfo.status == Helper.Status.LISTED, "pU: NL"); // proposalUpdate: Not listed
        require(fInfo.studio == msg.sender, "pU: NFO"); // proposalUpdate: not film owner

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
        totalFilmIds[4].push(_filmId);
        userFilmIds[msg.sender][2].push(_filmId); // update

        uint256 proposalID = IStakingPool(STAKING_POOL).addProposalData(
            msg.sender, block.timestamp, IProperty(DAO_PROPERTY).filmVotePeriod()
        );
        IVote(VOTE).saveProposalWithFilm(_filmId, proposalID);

        // If proposal is for fund, update "lastfundProposalCreateTime"
        if (fInfo.fundType != 0) {
            IStakingPool(STAKING_POOL).updateLastfundProposalCreateTime(block.timestamp);

            if (fInfo.noVote == 1) {
                fInfo.status = Helper.Status.APPROVED_FUNDING;
                fInfo.pApproveTime = block.timestamp;
                totalFilmIds[3].push(_filmId);
                userFilmIds[msg.sender][3].push(_filmId); // approve
            }
        }

        emit FilmProposalUpdated(_filmId, fInfo.fundType, msg.sender);
    }

    function changeOwner(uint256 _filmId, address newOwner) external nonReentrant returns (bool) {
        IVabbleDAO.Film storage fInfo = filmInfo[_filmId];

        require(fInfo.studio == msg.sender, "cO, E1"); //changeOwner: not film owner

        uint256 payeeLength = fInfo.studioPayees.length;
        require(payeeLength < 1000, "cO, E2");
        for (uint256 k = 0; k < payeeLength; k++) {
            if (fInfo.studioPayees[k] == msg.sender) {
                fInfo.studioPayees[k] = newOwner;
            }
        }

        fInfo.studio = newOwner;

        if (fInfo.status == Helper.Status.LISTED) {
            __moveToAnotherArray(userFilmIds[msg.sender][1], userFilmIds[newOwner][1], _filmId);
        }

        if (fInfo.status == Helper.Status.UPDATED) {
            __moveToAnotherArray(userFilmIds[msg.sender][2], userFilmIds[newOwner][2], _filmId);
        }

        if (fInfo.status == Helper.Status.APPROVED_FUNDING || fInfo.status == Helper.Status.APPROVED_LISTING) {
            __moveToAnotherArray(userFilmIds[msg.sender][3], userFilmIds[newOwner][3], _filmId);
            __moveToAnotherArray(userFilmIds[msg.sender][4], userFilmIds[newOwner][4], _filmId);

            if (isInvested[msg.sender][_filmId]) {
                isInvested[msg.sender][_filmId] = false;
                isInvested[newOwner][_filmId] = true;
            }

            uint256 curMonth = monthId.current();
            __updateFinalizeAmountAndLastClaimMonth(_filmId, curMonth, msg.sender, newOwner);
        }

        emit ChangeFilmOwner(_filmId, msg.sender, newOwner);

        return true;
    }

    function __moveToAnotherArray(uint256[] storage array1, uint256[] storage array2, uint256 value) private {
        uint256 arrayLength = array1.length;
        require(arrayLength < 1e6, "mTAA: too many length");
        uint256 index = arrayLength;

        for (uint256 i = 0; i < arrayLength; ++i) {
            if (array1[i] == value) {
                index = i;
            }
        }

        if (index >= arrayLength) return;

        array2.push(value);

        array1[index] = array1[arrayLength - 1];
        array1.pop();
    }

    /// @notice Check if proposal fee transferred from studio to stakingPool
    // Get expected VAB amount from UniswapV2 and then Transfer VAB: user(studio) -> stakingPool.
    function __paidFee(address _dToken, uint256 _noVote) private {
        uint256 feeAmount = IProperty(DAO_PROPERTY).proposalFeeAmount(); // in cash(usdc)
        if (_noVote == 1) feeAmount = IProperty(DAO_PROPERTY).proposalFeeAmount() * 2;

        uint256 expectTokenAmount = feeAmount;
        if (_dToken != IOwnablee(OWNABLE).USDC_TOKEN()) {
            expectTokenAmount =
                IUniHelper(UNI_HELPER).expectedAmount(feeAmount, IOwnablee(OWNABLE).USDC_TOKEN(), _dToken);
        }

        if (_dToken == address(0)) {
            require(msg.value >= expectTokenAmount, "paidFee: Insufficient paid");
            if (msg.value > expectTokenAmount) {
                Helper.safeTransferETH(msg.sender, msg.value - expectTokenAmount);
            }
            // Send ETH from this contract to UNI_HELPER contract
            Helper.safeTransferETH(UNI_HELPER, expectTokenAmount);
        } else {
            Helper.safeTransferFrom(_dToken, msg.sender, address(this), expectTokenAmount);
            if (IERC20(_dToken).allowance(address(this), UNI_HELPER) == 0) {
                Helper.safeApprove(_dToken, UNI_HELPER, IERC20(_dToken).totalSupply());
            }
        }

        address vabToken = IOwnablee(OWNABLE).PAYOUT_TOKEN();
        bytes memory swapArgs = abi.encode(expectTokenAmount, _dToken, vabToken);
        uint256 vabAmount = IUniHelper(UNI_HELPER).swapAsset(swapArgs);

        if (IERC20(vabToken).allowance(address(this), STAKING_POOL) == 0) {
            Helper.safeApprove(vabToken, STAKING_POOL, IERC20(vabToken).totalSupply());
        }
        IStakingPool(STAKING_POOL).addRewardToPool(vabAmount);
    }

    /// @notice Approve a film for funding/listing from vote contract
    function approveFilmByVote(uint256 _filmId, uint256 _flag) external onlyVote {
        require(_filmId != 0, "aFV: e1");

        filmInfo[_filmId].pApproveTime = block.timestamp;

        uint256 fundType = filmInfo[_filmId].fundType;
        if (_flag == 0) {
            if (fundType != 0) {
                // in case of fund film
                filmInfo[_filmId].status = Helper.Status.APPROVED_FUNDING;
                totalFilmIds[3].push(_filmId);
            } else {
                filmInfo[_filmId].status = Helper.Status.APPROVED_LISTING;
                totalFilmIds[2].push(_filmId);
            }

            address studioA = filmInfo[_filmId].studio;
            userFilmIds[studioA][3].push(_filmId); // approve
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
    )
        external
        onlyAuditor
        nonReentrant
    {
        uint256 userLength = _users.length;

        require(userLength == _amounts.length && userLength < 1000, "aTP: e1");
        require(_which == 1 || _which == 2, "aTP: e2");

        if (_which == 1) {
            IStakingPool(STAKING_POOL).sendVAB(_users, OWNABLE, _amounts);
        } else {
            StudioPool += IStakingPool(STAKING_POOL).sendVAB(_users, address(this), _amounts);
        }

        for (uint256 i = 0; i < userLength; ++i) {
            if (_which == 1) {
                if (isEdgePoolUser[_users[i]]) continue;

                isEdgePoolUser[_users[i]] = true;
                edgePoolUsers.push(_users[i]);
            } else {
                if (isStudioPoolUser[_users[i]]) continue;

                isStudioPoolUser[_users[i]] = true;
                studioPoolUsers.push(_users[i]);
            }
        }

        emit AllocatedToPool(_users, _amounts, _which);
    }

    /// @notice Allocate VAB from EdgePool(Ownable) to StudioPool(VabbleDAO) by Auditor
    function allocateFromEdgePool(uint256 _amount) external onlyAuditor nonReentrant {
        uint256 userLength = edgePoolUsers.length;
        require(userLength < 1e5, "aFEP: bad length");

        IOwnablee(OWNABLE).addToStudioPool(_amount); // Transfer VAB from EdgePool to StudioPool
        StudioPool += _amount;

        for (uint256 i = 0; i < userLength; ++i) {
            if (isStudioPoolUser[edgePoolUsers[i]]) continue;

            studioPoolUsers.push(edgePoolUsers[i]);
        }

        delete edgePoolUsers;
    }

    /// @notice Withdraw VAB token from StudioPool(VabbleDAO) to V2 by StakingPool contract
    function withdrawVABFromStudioPool(address _to) external onlyStakingPool nonReentrant returns (uint256) {
        address vabToken = IOwnablee(OWNABLE).PAYOUT_TOKEN();
        uint256 poolBalance = IERC20(vabToken).balanceOf(address(this));
        if (poolBalance != 0) {
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
    )
        external
        onlyAuditor
        nonReentrant
    {
        uint256 filmLength = _filmIds.length;

        require(filmLength != 0 && filmLength < 1000 && filmLength == _payouts.length, "sFF: bad length");

        bool[] memory _valids = checkSetFinalFilms(_filmIds);

        for (uint256 i = 0; i < filmLength; ++i) {
            if (_filmIds[i] == 0 || _payouts[i] == 0) continue;
            if (!_valids[i]) continue;

            __setFinalFilm(_filmIds[i], _payouts[i]);
            finalFilmCalledTime[_filmIds[i]] = block.timestamp;
        }

        emit SetFinalFilms(msg.sender, _filmIds, _payouts);
    }

    function startNewMonth() external onlyAuditor nonReentrant {
        monthId.increment();
    }

    function __setFinalFilm(uint256 _filmId, uint256 _payout) private {
        IVabbleDAO.Film memory fInfo = filmInfo[_filmId];
        require(
            fInfo.status == Helper.Status.APPROVED_LISTING || fInfo.status == Helper.Status.APPROVED_FUNDING,
            "sFF: Not approved"
        );

        uint256 curMonth = monthId.current();
        if (fInfo.status == Helper.Status.APPROVED_LISTING) {
            __setFinalAmountToPayees(_filmId, _payout, curMonth);
        } else if (fInfo.status == Helper.Status.APPROVED_FUNDING) {
            uint256 rewardAmount = _payout * fInfo.rewardPercent / 1e10;
            uint256 payAmount = _payout - rewardAmount;

            if (!IVabbleFund(VABBLE_FUND).isRaisedFullAmount(_filmId)) {
                rewardAmount = 0;
                payAmount = _payout;
            }

            // set to funders
            if (rewardAmount != 0) __setFinalAmountToHelpers(_filmId, rewardAmount, curMonth);

            // set to studioPayees
            if (payAmount != 0) __setFinalAmountToPayees(_filmId, payAmount, curMonth);
        }

        finalizedFilmIds[curMonth].push(_filmId);
    }

    /// @dev Avoid deep error
    function __setFinalAmountToPayees(uint256 _filmId, uint256 _payout, uint256 _curMonth) private {
        IVabbleDAO.Film memory fInfo = filmInfo[_filmId];
        uint256 payeeLength = fInfo.studioPayees.length;
        for (uint256 k = 0; k < payeeLength; k++) {
            uint256 shareAmount = _payout * fInfo.sharePercents[k] / 1e10;
            finalizedAmount[_curMonth][_filmId][fInfo.studioPayees[k]] += shareAmount;

            __addFinalFilmId(fInfo.studioPayees[k], _filmId);
        }
    }
    /// @dev Avoid deep error

    function __setFinalAmountToHelpers(uint256 _filmId, uint256 _rewardAmount, uint256 _curMonth) private {
        uint256 raisedAmount = IVabbleFund(VABBLE_FUND).getTotalFundAmountPerFilm(_filmId);
        if (raisedAmount != 0) {
            address[] memory investors = IVabbleFund(VABBLE_FUND).getFilmInvestorList(_filmId);
            for (uint256 i = 0; i < investors.length; ++i) {
                uint256 userAmount = IVabbleFund(VABBLE_FUND).getUserFundAmountPerFilm(investors[i], _filmId);
                if (userAmount == 0) continue;

                uint256 percent = (userAmount * 1e10) / raisedAmount;
                uint256 amount = (_rewardAmount * percent) / 1e10;
                finalizedAmount[_curMonth][_filmId][investors[i]] += amount;

                __addFinalFilmId(investors[i], _filmId);
            }
        }
    }

    function __addFinalFilmId(address _user, uint256 _filmId) private {
        if (!isInvested[_user][_filmId]) {
            userFilmIds[_user][4].push(_filmId); // final
            isInvested[_user][_filmId] = true;
        }
    }

    // Claim reward for multi-filmIds till current from when auditor call setFinalFilms()
    function claimReward(uint256[] memory _filmIds) external nonReentrant {
        require(_filmIds.length != 0 && _filmIds.length < 1000, "cR: bad filmIds");

        __claimAllReward(_filmIds);
    }

    function __claimAllReward(uint256[] memory _filmIds) private {
        uint256 filmLength = _filmIds.length;
        require(filmLength < 1e5, "cAR: bad array");

        uint256 curMonth = monthId.current();
        address vabToken = IOwnablee(OWNABLE).PAYOUT_TOKEN();
        uint256 rewardSum;
        for (uint256 i = 0; i < filmLength; ++i) {
            if (
                finalFilmCalledTime[_filmIds[i]] == 0 // not still call final film
            ) {
                continue;
            }

            rewardSum += getUserRewardAmountForUser(_filmIds[i], curMonth, msg.sender);
            latestClaimMonthId[_filmIds[i]][msg.sender] = curMonth;
        }

        require(rewardSum != 0, "cAR: zero amount");
        require(StudioPool >= rewardSum, "cAR: insufficient 1");
        require(IERC20(vabToken).balanceOf(address(this)) >= StudioPool, "cAR: insufficient 2");

        Helper.safeTransfer(vabToken, msg.sender, rewardSum);
        StudioPool -= rewardSum;

        emit RewardAllClaimed(msg.sender, curMonth, _filmIds, rewardSum);
    }

    // Claim reward of all filmIds for each user
    function claimAllReward() external nonReentrant {
        uint256[] memory filmIds = userFilmIds[msg.sender][4]; // final
        require(filmIds.length != 0 && filmIds.length < 1000, "cAR: zero filmIds");

        __claimAllReward(filmIds);
    }

    function getUserRewardAmountBetweenMonths(
        uint256 _filmId,
        uint256 _preMonth,
        uint256 _curMonth,
        address _user
    )
        public
        view
        returns (uint256 amount_)
    {
        if (_preMonth < _curMonth) {
            for (uint256 mon = _preMonth + 1; mon <= _curMonth; ++mon) {
                amount_ += finalizedAmount[mon][_filmId][_user];
            }
        }
    }

    function getAllAvailableRewards(uint256 _curMonth, address _user) public view returns (uint256) {
        uint256[] memory filmIds = userFilmIds[_user][4]; // final

        uint256 rewardSum = 0;
        uint256 preMonth = 0;
        uint256 filmLength = filmIds.length;
        for (uint256 i = 0; i < filmLength; ++i) {
            preMonth = latestClaimMonthId[filmIds[i]][_user];
            rewardSum += getUserRewardAmountBetweenMonths(filmIds[i], preMonth, _curMonth, _user);
        }

        return rewardSum;
    }

    function getUserRewardAmountForUser(
        uint256 _filmId,
        uint256 _curMonth,
        address _user
    )
        public
        view
        returns (uint256)
    {
        uint256 preMonth = latestClaimMonthId[_filmId][_user];
        return getUserRewardAmountBetweenMonths(_filmId, preMonth, _curMonth, _user);
    }

    /// @notice flag: create=1, update=2, approve=3, final=4
    function getUserFilmIds(address _user, uint256 _flag) external view returns (uint256[] memory) {
        return userFilmIds[_user][_flag];
    }

    /// @notice Get film status based on Id
    function getFilmStatus(uint256 _filmId) external view returns (Helper.Status status_) {
        status_ = filmInfo[_filmId].status;
    }

    /// @notice Get film owner(studio) based on Id
    function getFilmOwner(uint256 _filmId) external view returns (address owner_) {
        owner_ = filmInfo[_filmId].studio;
    }

    /// @notice Get film fund info based on Id
    function getFilmFund(uint256 _filmId)
        external
        view
        returns (uint256 raiseAmount_, uint256 fundPeriod_, uint256 fundType_, uint256 rewardPercent_)
    {
        raiseAmount_ = filmInfo[_filmId].raiseAmount;
        fundPeriod_ = filmInfo[_filmId].fundPeriod;
        fundType_ = filmInfo[_filmId].fundType;
        rewardPercent_ = filmInfo[_filmId].rewardPercent;
    }

    /// @notice Get film fund info based on Id
    function getFilmShare(uint256 _filmId)
        external
        view
        returns (uint256[] memory sharePercents_, address[] memory studioPayees_)
    {
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
        if (filmInfo[_filmId].enableClaimer == 1) enable_ = true;
        else enable_ = false;
    }

    /// @notice Set enableClaimer based on Id by studio
    function updateEnabledClaimer(uint256 _filmId, uint256 _enable) external {
        require(filmInfo[_filmId].studio == msg.sender, "uEC: not film owner");

        filmInfo[_filmId].enableClaimer = _enable;
    }

    /// @notice Get film Ids
    function getFilmIds(uint256 _flag) external view returns (uint256[] memory list_) {
        return totalFilmIds[_flag];
    }

    /// @notice flag=1 => studioPoolUsers, flag=2 => edgePoolUsers
    function getPoolUsers(uint256 _flag) external view onlyAuditor returns (address[] memory list_) {
        if (_flag == 1) list_ = studioPoolUsers;
        else if (_flag == 2) list_ = edgePoolUsers;
    }

    function getFinalizedFilmIds(uint256 _monthId) external view returns (uint256[] memory) {
        return finalizedFilmIds[_monthId];
    }

    function __updateFinalizeAmountAndLastClaimMonth(
        uint256 _filmId,
        uint256 _curMonth,
        address _oldOwner,
        address _newOwner
    )
        private
    {
        uint256 _preMonth = latestClaimMonthId[_filmId][_oldOwner];

        // update last claim month for newOwner
        latestClaimMonthId[_filmId][_newOwner] = _preMonth;

        if (_preMonth < _curMonth) {
            for (uint256 mon = _preMonth + 1; mon <= _curMonth; ++mon) {
                // set finalizedAmount for new owner
                finalizedAmount[mon][_filmId][_newOwner] = finalizedAmount[mon][_filmId][_oldOwner];

                // set 0 for old owner
                finalizedAmount[mon][_filmId][_oldOwner] = 0;
            }
        }
    }
}
