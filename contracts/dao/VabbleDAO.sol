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
import "../interfaces/IUniHelper.sol";
import "../interfaces/IStakingPool.sol";
import "../interfaces/IProperty.sol";
import "../interfaces/IOwnablee.sol";
import "../interfaces/IVabbleFund.sol";
import "../interfaces/IVabbleDAO.sol";
import "../interfaces/IVote.sol";
import "../libraries/Helper.sol";

contract VabbleDAO is ReentrancyGuard {
    using Counters for Counters.Counter;

    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/
    /// @notice Address of the Ownable contract
    address public immutable OWNABLE;

    /// @notice Address of the Vote contract
    address public immutable VOTE;

    /// @notice Address of the StakingPool contract
    address public immutable STAKING_POOL;

    /// @notice Address of the UniHelper contract
    address public immutable UNI_HELPER;

    /// @notice Address of the DAO property
    address public immutable DAO_PROPERTY;

    /// @notice Address of the Vabble fund
    address public immutable VABBLE_FUND;

    /// @notice Total VAB tokens in the StudioPool
    uint256 public StudioPool;

    /**
     * @notice Counter for the total number of created films
     * @dev Film IDs start from 1 and increment for each new film create
     */
    Counters.Counter public filmCount;

    /**
     * @notice Counter for the total number of updated films
     * @dev Updated film IDs start from 1 and increment for each updated film
     */
    Counters.Counter public updatedFilmCount;

    /**
     * @notice Counter for the current month ID
     * @dev Month IDs increment for each new month
     */
    Counters.Counter public monthId;

    /**
     * @dev List of users in the StudioPool
     */
    address[] private studioPoolUsers;

    /**
     * @dev List of users in the EdgePool
     */
    address[] private edgePoolUsers;

    /**
     * @notice Mapping of film IDs to film information
     * @dev Maps each film ID to its corresponding film information
     */
    mapping(uint256 => IVabbleDAO.Film) public filmInfo;

    /**
     * @notice Mapping of finalized amounts by film ID, month ID, and user address
     * @dev Maps film ID and month ID to user addresses and their finalized amounts
     */
    mapping(uint256 => mapping(uint256 => mapping(address => uint256))) public finalizedAmount;

    /**
     * @notice Mapping of latest claim month ID by film ID and user address
     * @dev Maps film ID to user addresses and their latest claim month IDs
     */
    mapping(uint256 => mapping(address => uint256)) public latestClaimMonthId;

    /**
     * @notice Mapping of finalized film call times by film ID
     * @dev Maps film ID to the timestamp when the film was finalized
     */
    mapping(uint256 => uint256) public finalFilmCalledTime;

    /**
     * @dev Mapping of flags to film ID lists
     * @dev Flags indicate different states:
     * 1 = proposal, 2 = approveListing, 3 = approveFunding, 4 = updated
     */
    mapping(uint256 => uint256[]) private totalFilmIds;

    /**
     * @dev Mapping of user addresses to film ID lists by flag
     * @dev (user => (flag => filmId list))
     * @dev Flags indicate different user actions:
     * 1 = create, 2 = update, 3 = approve, 4 = final
     */
    mapping(address => mapping(uint256 => uint256[])) private userFilmIds;

    /**
     * @dev Mapping of month IDs to finalized film ID lists
     * @dev Maps each month ID to a list of finalized film IDs
     */
    mapping(uint256 => uint256[]) private finalizedFilmIds;

    /**
     * @dev Mapping of investment status by investor address and film ID
     * @dev Maps investor addresses to film IDs indicating if they have invested (true/false)
     */
    mapping(address => mapping(uint256 => bool)) private isInvested;

    /**
     * @dev Mapping indicating if an address is a StudioPool user
     * @dev Maps user addresses to boolean values indicating StudioPool membership
     */
    mapping(address => bool) private isStudioPoolUser;

    /**
     * @dev Mapping indicating if an address is an EdgePool user
     * @dev Maps user addresses to boolean values indicating EdgePool membership
     */
    mapping(address => bool) private isEdgePoolUser;

    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Emitted when a film proposal is created
     * @param filmId The ID of the film proposal
     * @param noVote If the proposal can skip voting phase 0 = false, 1 = true
     * @param fundType The type of funding for the proposal 0 = Distribution, 1 = Token, 2 = NFT, 3 = NFT & Token)
     * @param studio The address of the studio creating the proposal
     */
    event FilmProposalCreated(uint256 indexed filmId, uint256 noVote, uint256 fundType, address studio);

    /**
     * @dev Emitted when a film proposal is updated
     * @param filmId The ID of the updated film proposal
     * @param fundType The updated type of funding for the proposal
     * 0 = Distribution, 1 = Token, 2 = NFT, 3 = NFT & Token)
     * @param studio The address of the studio updating the proposal
     */
    event FilmProposalUpdated(uint256 indexed filmId, uint256 fundType, address studio);

    /**
     * @dev Emitted when the film fund period is updated
     * @param filmId The ID of the film whose fund period is updated
     * @param studio The address of the studio updating the fund period
     * @param fundPeriod The updated fund period
     */
    event FilmFundPeriodUpdated(uint256 indexed filmId, address studio, uint256 fundPeriod);

    /**
     * @dev Emitted when funds are allocated to a pool
     * @param users The list of users receiving allocations
     * @param amounts The amounts allocated to each user
     * @param which Indicates the type of pool (1 = studio, 2 = edge)
     */
    event AllocatedToPool(address[] users, uint256[] amounts, uint256 which);

    /**
     * @dev Emitted when a user claims all rewards for a month
     * @param user The address of the user claiming rewards
     * @param monthId The ID of the month for which rewards are claimed
     * @param filmIds The list of film IDs involved in the claim
     * @param claimAmount The total amount claimed
     */
    event RewardAllClaimed(address indexed user, uint256 indexed monthId, uint256[] filmIds, uint256 claimAmount);

    /**
     * @dev Emitted when final films are set by the auditor
     * @param user The address of the auditor setting the final films
     * @param filmIds The list of film IDs set as final
     * @param payouts The payout amounts for each film
     */
    event SetFinalFilms(address indexed user, uint256[] filmIds, uint256[] payouts);

    /**
     * @dev Emitted when the ownership of a film changes
     * @param filmId The ID of the film whose ownership is changing
     * @param oldOwner The address of the previous owner
     * @param newOwner The address of the new owner
     */
    event ChangeFilmOwner(uint256 indexed filmId, address indexed oldOwner, address indexed newOwner);

    //@audit-issue -low unused event
    event FinalFilmSetted(
        address[] users, uint256[] filmIds, uint256[] watchedPercents, uint256[] rentPrices, uint256 setTime
    );

    /*//////////////////////////////////////////////////////////////
                               MODIFIERS
    //////////////////////////////////////////////////////////////*/

    /// @dev Restricts access to the current Auditor.
    modifier onlyAuditor() {
        require(msg.sender == IOwnablee(OWNABLE).auditor(), "only auditor");
        _;
    }

    /// @dev Restricts access to the Vote contract.
    modifier onlyVote() {
        require(msg.sender == VOTE, "only vote");
        _;
    }

    /// @dev Restricts access to the StakingPool contract.
    modifier onlyStakingPool() {
        require(msg.sender == STAKING_POOL, "only stakingPool");
        _;
    }

    /*//////////////////////////////////////////////////////////////
                               FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Constructor for the VabbleDAO contract
     * @param _ownable The address of the Ownable contract
     * @param _uniHelper The address of the UniHelper contract
     * @param _vote The address of the Vote contract
     * @param _staking The address of the StakingPool contract
     * @param _property The address of the Property contract
     * @param _vabbleFund The address of the VabbleFund contract
     */
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

    receive() external payable { }

    /*//////////////////////////////////////////////////////////////
                                EXTERNAL
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Creates a film proposal
     * @notice User has to pay the current proposal fee
     * @param _fundType Distribution => 0, Token => 1, NFT => 2, NFT & Token => 3
     * @param _noVote If the proposal can skip voting phase 0 = false, 1 = true
     * @param _feeToken Must be a deposit asset added in the Ownable contract
     */
    //@audit q: why not use a boolean for the _noVote value ?
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

    /**
     * TODO: add detailed natspec
     * @notice Update details of a film proposal
     * @param _filmId ID of the film proposal to update
     * @param _title Title of the film
     * @param _description Description of the film
     * @param _sharePercents Array of share percentages for studio payees
     * @param _studioPayees Array of studio payees' addresses
     * @param _raiseAmount Amount to raise for funding
     * @param _fundPeriod Duration of the funding period
     * @param _rewardPercent Reward percentage for funders
     * @param _enableClaimer Flag to enable claimer
     */
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

    /**
     * @notice Change owner of a film
     * @param _filmId ID of the film to change owner
     * @param newOwner New owner address
     * @return success Boolean indicating success of the operation
     */
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

    /**
     * @notice Updates the film's approval status accordingly
     * @param _filmId ID of the film to approve
     * @param _flag Flag: 0 for film funding, 1 for listing film
     */
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

    /**
     * @notice Update film fund period by studio
     * @param _filmId ID of the film to update fund period
     * @param _fundPeriod New fund period in seconds
     */
    function updateFilmFundPeriod(uint256 _filmId, uint256 _fundPeriod) external nonReentrant {
        require(msg.sender == filmInfo[_filmId].studio, "uFP: 1"); // updateFundPeriod: not film owner
        require(filmInfo[_filmId].fundType != 0, "uFP: 2"); // updateFundPeriod: not fund film

        filmInfo[_filmId].fundPeriod = _fundPeriod;

        emit FilmFundPeriodUpdated(_filmId, msg.sender, _fundPeriod);
    }

    /**
     * @notice Allocate VAB from StakingPool(user balance) to EdgePool(Ownable)/StudioPool(VabbleDAO) by Auditor
     * @param _users Array of users to allocate VAB
     * @param _amounts Array of amounts to allocate per user
     * @param _which 1 => to EdgePool, 2 => to StudioPool
     */
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

    /**
     * @notice Allocate VAB from EdgePool(Ownable) to StudioPool(VabbleDAO) by Auditor
     * @param _amount Amount of VAB to allocate
     */
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

    /**
     * @notice Withdraw VAB token from StudioPool(VabbleDAO) to the new reward address.
     * @dev This will be called by the StakingPool contract after a reward address proposal has been accepted and
     * finalized. This is part of the migration process to a new DAO.
     * @param _to Address to receive the withdrawn VAB
     * @return Amount of VAB withdrawn
     */
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

    /**
     * @notice Start a new month for film rewards calculation / distribution
     * @dev This must be called before the auditor calls `setFinalFilms`.
     */
    function startNewMonth() external onlyAuditor nonReentrant {
        monthId.increment();
    }

    /**
     * @notice Finalizes the payout and reward distribution for a batch of films.
     * @dev This function is callable only by the auditor, he must call `startNewMonth` before.
     * It validates the input arrays, checks the validity of each film, and then
     * finalizes the payout for each valid film using the internal function `__setFinalFilm`.
     * This action will allow the studio, investors and assigned reward receives to claim their rewards.
     * @param _filmIds An array of unique identifiers for the films to be finalized.
     * @param _payouts An array of total payout amounts corresponding to each film, to be distributed to payees and
     *  film investors / funders.
     */
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

    /**
     * @notice Claim rewards for multiple film IDs after the auditor called setFinalFilms()
     * @param _filmIds Array of film IDs to claim rewards for
     */
    function claimReward(uint256[] memory _filmIds) external nonReentrant {
        require(_filmIds.length != 0 && _filmIds.length < 1000, "cR: bad filmIds");

        __claimAllReward(_filmIds);
    }

    /**
     * @notice Claim rewards of all finalized film IDs for the caller
     */
    function claimAllReward() external nonReentrant {
        uint256[] memory filmIds = userFilmIds[msg.sender][4]; // final
        require(filmIds.length != 0 && filmIds.length < 1000, "cAR: zero filmIds");

        __claimAllReward(filmIds);
    }

    /**
     * @notice Update enableClaimer status for a film by studio
     * @param _filmId ID of the film to update enableClaimer
     * @param _enable New enableClaimer status
     */
    function updateEnabledClaimer(uint256 _filmId, uint256 _enable) external {
        require(filmInfo[_filmId].studio == msg.sender, "uEC: not film owner");

        filmInfo[_filmId].enableClaimer = _enable;
    }

    /**
     * @notice Gets the film IDs for a user based on a flag
     * @param _user Address of the user
     * @param _flag Flag indicating the type of film IDs to retrieve
     * (1 for created, 2 for updated, 3 for approved, 4 for final)
     * @return List of film IDs for the user
     */
    function getUserFilmIds(address _user, uint256 _flag) external view returns (uint256[] memory) {
        return userFilmIds[_user][_flag];
    }

    /**
     * @notice Gets the status of a film based on its ID
     * @dev Retrieves the status of the specified film
     * @param _filmId ID of the film
     * @return status_ Status of the film
     */
    function getFilmStatus(uint256 _filmId) external view returns (Helper.Status status_) {
        status_ = filmInfo[_filmId].status;
    }

    /**
     * @notice Gets the owner of a film based on its ID
     * @dev Retrieves the address of the studio that owns the specified film
     * @param _filmId ID of the film
     * @return owner_ Address of the film owner
     */
    function getFilmOwner(uint256 _filmId) external view returns (address owner_) {
        owner_ = filmInfo[_filmId].studio;
    }

    /**
     * @notice Gets the fund information for a film based on its ID
     * @dev Retrieves the fund details for the specified film
     * @param _filmId ID of the film
     * @return raiseAmount_ Amount to be raised for the film
     * @return fundPeriod_ Fund period for the film
     * @return fundType_ Fund type for the film
     * @return rewardPercent_ Reward percentage for the film
     */
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

    /**
     * @notice Gets the share information for a film based on its ID
     * @dev Retrieves the share percentages and studio payees for the specified film
     * Studio payees are the addresses that will receive a part of the film's revenue based on their share percentage.
     * @param _filmId ID of the film
     * @return sharePercents_ List of share percentages for the film
     * @return studioPayees_ List of studio payees for the film
     */
    function getFilmShare(uint256 _filmId)
        external
        view
        returns (uint256[] memory sharePercents_, address[] memory studioPayees_)
    {
        sharePercents_ = filmInfo[_filmId].sharePercents;
        studioPayees_ = filmInfo[_filmId].studioPayees;
    }

    /**
     * @notice Gets the enableClaimer status for a filmID
     * @param _filmId ID of the film to get the enableClaimer status
     * @return enable_ The enableClaimer status
     */
    function isEnabledClaimer(uint256 _filmId) external view returns (bool enable_) {
        if (filmInfo[_filmId].enableClaimer == 1) enable_ = true;
        else enable_ = false;
    }

    /**
     * @notice Get film IDs based on flag
     * @param _flag Flag: 1 = proposal, 2 = approveListing, 3 = approveFunding, 4 = updated
     * @return list_ Array of film IDs
     */
    function getFilmIds(uint256 _flag) external view returns (uint256[] memory list_) {
        return totalFilmIds[_flag];
    }

    /**
     * @notice Get pool users based on flag
     * @param _flag Flag: 1 for studioPoolUsers, 2 for edgePoolUsers
     * @return list_ Array of pool users addresses
     */
    function getPoolUsers(uint256 _flag) external view onlyAuditor returns (address[] memory list_) {
        if (_flag == 1) list_ = studioPoolUsers;
        else if (_flag == 2) list_ = edgePoolUsers;
    }

    /**
     * @notice Get finalized film IDs for a specific month
     * @param _monthId Month ID to get finalized film IDs
     * @return Array of finalized film IDs
     */
    function getFinalizedFilmIds(uint256 _monthId) external view returns (uint256[] memory) {
        return finalizedFilmIds[_monthId];
    }

    /*//////////////////////////////////////////////////////////////
                                 PUBLIC
    //////////////////////////////////////////////////////////////*/

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

    /// @notice Get film proposal created time based on Id
    function getFilmProposalTime(uint256 _filmId) public view returns (uint256 cTime_, uint256 aTime_) {
        cTime_ = filmInfo[_filmId].pCreateTime;
        aTime_ = filmInfo[_filmId].pApproveTime;
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

    /*//////////////////////////////////////////////////////////////
                                PRIVATE
    //////////////////////////////////////////////////////////////*/

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

    /**
     * @notice Finalizes the payout and reward distribution for a given film.
     * @dev This function updates the final amounts to be paid to payees and investors
     * based on the film's status and the amount raised.
     * It handles both `APPROVED_LISTING` and `APPROVED_FUNDING` statuses. For `APPROVED_LISTING`,
     * it directly sets the final payout amounts to the payees. For `APPROVED_FUNDING`
     * it calculates and distributes the rewards to the helpers (investors) and the remaining amount to the payees.
     * @param _filmId The unique identifier of the film being finalized.
     * @param _payout The total payout amount to be distributed for the film.
     */
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
