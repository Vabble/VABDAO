// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../interfaces/IUniHelper.sol";
import "../interfaces/IStakingPool.sol";
import "../interfaces/IProperty.sol";
import "../interfaces/IOwnablee.sol";
import "../interfaces/IFactoryFilmNFT.sol";
import "../interfaces/IVabbleDAO.sol";
import "../interfaces/IVabbleFund.sol";
import "../libraries/Helper.sol";

/**
 * @title VabbleFund Contract
 * @notice VabbleFund contract handles the management of funds deposited for films in the Vabble ecosystem.
 *
 * @dev This contract facilitates the deposit, processing, and withdrawal of funds by investors for funding films.
 * Funds can be deposited in the form of tokens, and are managed based on specified film funding criteria.
 * Upon successful funding, rewards are distributed to the staking pool and remaining funds are transferred to the film
 * owner. Funding rewards for investors can be issued in the form of NFT's, tokens or both.
 *
 * @dev The contract interacts with other contracts including Ownable, StakingPool, UniHelper, Property, FactoryFilmNFT,
 * VabbleDAO, and various ERC20 tokens to achieve its functionalities.
 *
 * @dev It includes features for checking film funding status, managing investor lists, handling asset transfers,
 * and ensuring compliance with film-specific funding conditions such as minimum and maximum deposit amounts.
 */
contract VabbleFund_ is IVabbleFund, ReentrancyGuard {
    /*//////////////////////////////////////////////////////////////
                           TYPE DECLARATIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Represents an asset with its token address and amount.
     * @param token The address of the token.
     * @param amount The amount of the token.
     */
    struct Asset {
        address token;
        uint256 amount;
    }

    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/
    /// @dev The address of the Ownable contract.
    address private immutable OWNABLE;

    /// @dev The address of the StakingPool contract.
    address private immutable STAKING_POOL;

    /// @dev The address of the UniHelper contract.
    address private immutable UNI_HELPER;

    /// @dev The address of the Property contract.
    address private immutable DAO_PROPERTY;

    /// @dev The address of the FilmNftFactory contract.
    address private immutable FILM_NFT;

    /// @notice The address of the VabbleDAO contract.
    address public VABBLE_DAO;

    /// @dev List of film IDs that have processed funds.
    uint256[] private fundProcessedFilmIds;

    /// @dev Mapping from film ID to list of investor addresses.
    mapping(uint256 => address[]) private filmInvestorList;

    /// @notice Mapping from film ID to list of assets per film.
    mapping(uint256 => Asset[]) public assetPerFilm;

    /// @notice Mapping to check if fund is processed for a film.
    mapping(uint256 => bool) public isFundProcessed;

    /// @notice Mapping from film ID and customer address to list of assets.
    mapping(uint256 => mapping(address => Asset[])) public assetInfo;

    /// @dev Mapping from film ID and user address to NFT count.
    mapping(uint256 => mapping(address => uint256)) private allowUserNftCount;

    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Emitted when tokens are deposited to a film.
     * @param customer The address of the investor.
     * @param filmId The ID of the film.
     * @param token The address of the token deposited.
     * @param amount The amount of tokens deposited.
     * @param flag Indicates the type of deposit (1 for token, 2 for NFT).
     */
    event DepositedToFilm(
        address indexed customer, uint256 indexed filmId, address token, uint256 amount, uint256 flag
    );

    /**
     * @notice Emitted when the funding for a film is processed.
     * @param filmId The ID of the film.
     * @param studio The address of the studio.
     */
    event FundFilmProcessed(uint256 indexed filmId, address indexed studio);

    /**
     * @notice Emitted when funds are withdrawn from a film when the funding failed.
     * @param filmId The ID of the film.
     * @param customer The address of the investor.
     */
    event FundWithdrawed(uint256 indexed filmId, address indexed customer);

    /*//////////////////////////////////////////////////////////////
                               MODIFIERS
    //////////////////////////////////////////////////////////////*/

    /// @dev Restricts access to the deployer of the Ownable contract.
    modifier onlyDeployer() {
        require(msg.sender == IOwnablee(OWNABLE).deployer(), "caller is not the deployer");
        _;
    }

    /*//////////////////////////////////////////////////////////////
                               FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Initializes the contract with the given addresses.
     * @param _ownable The address of the Ownable contract.
     * @param _uniHelper The address of the UniHelper contract.
     * @param _staking The address of the StakingPool contract.
     * @param _property The address of the DAO property contract.
     * @param _filmNftFactory The address of the FilmNftFactory contract.
     */
    constructor(address _ownable, address _uniHelper, address _staking, address _property, address _filmNftFactory) {
        require(_ownable != address(0), "ownableContract: Zero address");
        OWNABLE = _ownable;
        require(_uniHelper != address(0), "uniHelperContract: Zero address");
        UNI_HELPER = _uniHelper;
        require(_staking != address(0), "stakingContract: Zero address");
        STAKING_POOL = _staking;
        require(_property != address(0), "daoProperty: Zero address");
        DAO_PROPERTY = _property;
        require(_filmNftFactory != address(0), "setup: zero factoryContract address");
        FILM_NFT = _filmNftFactory;
    }

    receive() external payable { }

    /*//////////////////////////////////////////////////////////////
                                EXTERNAL
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Initializes the VabbleDAO contract address.
     * @param _vabbleDAO The address of the Vabble DAO.
     */
    function initialize(address _vabbleDAO) external onlyDeployer {
        require(VABBLE_DAO == address(0), "initialize: already initialized");

        require(_vabbleDAO != address(0), "initialize: zero address");
        VABBLE_DAO = _vabbleDAO;
    }

    /**
     * @notice Investors deposit tokens to fund a film.
     * @param _filmId The ID of the film.
     * @param _amount The amount to deposit must be between the range of
     * `Property::minDepositAmount` and `Property::maxDepositAmount`.
     * @param _flag Indicates the type of deposit (1 for token, 2 for NFT).
     * @param _token The address of the token to deposit.
     */
    function depositToFilm(
        uint256 _filmId,
        uint256 _amount,
        uint256 _flag,
        address _token
    )
        external
        payable
        nonReentrant
    {
        if (_token != IOwnablee(OWNABLE).PAYOUT_TOKEN() && _token != address(0)) {
            require(IOwnablee(OWNABLE).isDepositAsset(_token), "depositToFilm: not allowed asset");
        }
        require(_flag == 1 || _flag == 2, "depositToFilm: invalid flag");
        require(_amount != 0, "depositToFilm: zero value");

        (, uint256 fundPeriod, uint256 fundType,) = IVabbleDAO(VABBLE_DAO).getFilmFund(_filmId);
        (, uint256 pApproveTime) = IVabbleDAO(VABBLE_DAO).getFilmProposalTime(_filmId);
        Helper.Status status = IVabbleDAO(VABBLE_DAO).getFilmStatus(_filmId);

        require(status == Helper.Status.APPROVED_FUNDING, "depositToFilm: filmId not approved for funding");
        require(fundPeriod >= block.timestamp - pApproveTime, "depositToFilm: passed funding period");

        uint256 userFundAmountPerFilm = getUserFundAmountPerFilm(msg.sender, _filmId); // USDC
        uint256 tokenAmount = __depositToFilm(_filmId, _amount, _flag, fundType, userFundAmountPerFilm, _token);

        if (userFundAmountPerFilm == 0) {
            filmInvestorList[_filmId].push(msg.sender);
        }

        // Return remain ETH to user back if case of ETH
        if (_token == address(0)) {
            require(msg.value >= tokenAmount, "depositToFilm: Insufficient paid");

            if (msg.value > tokenAmount) Helper.safeTransferETH(msg.sender, msg.value - tokenAmount);
        } else {
            Helper.safeTransferFrom(_token, msg.sender, address(this), tokenAmount);
        }

        __assignToken(_filmId, _token, tokenAmount);

        emit DepositedToFilm(msg.sender, _filmId, _token, tokenAmount, _flag);
    }

    /**
     * @notice Processes the funds for a film, transferring rewards to the staking pool and the remaining funds to the
     * film owner.
     * @dev This function can only be called by the owner of the film and ensures the film has met the funding criteria.
     * @param _filmId The unique identifier of the film to process funds for.
     *
     * Requirements:
     * - Caller must be the owner of the film.
     * - Film must not have already been processed.
     * - Film must be in the approved funding status.
     * - The funding period must have ended.
     * - The film must have raised the full required amount.
     *
     * Functionality:
     * - Calculates and transfers the `Property::fundFeePercent` of the funds to the reward pool as VAB tokens.
     * - Transfers the remaining funds to the film owner.
     * - Marks the film as processed and emits a `FundFilmProcessed` event.
     */
    function fundProcess(uint256 _filmId) external nonReentrant {
        address owner = IVabbleDAO(VABBLE_DAO).getFilmOwner(_filmId);
        require(owner == msg.sender, "fundProcess: not film owner");
        require(!isFundProcessed[_filmId], "fundProcess: already processed");

        Helper.Status status = IVabbleDAO(VABBLE_DAO).getFilmStatus(_filmId);
        require(status == Helper.Status.APPROVED_FUNDING, "fundProcess: filmId not approved for funding");

        (, uint256 fundPeriod,,) = IVabbleDAO(VABBLE_DAO).getFilmFund(_filmId);
        (, uint256 pApproveTime) = IVabbleDAO(VABBLE_DAO).getFilmProposalTime(_filmId);
        require(fundPeriod < block.timestamp - pApproveTime, "fundProcess: funding period");

        require(isRaisedFullAmount(_filmId), "fundProcess: not full raised");

        // Send fundFeePercent(2%) to reward pool as VAB token and rest send to studio
        address vabToken = IOwnablee(OWNABLE).PAYOUT_TOKEN();
        Asset[] memory assetArr = assetPerFilm[_filmId];
        uint256 rewardSumAmount;
        uint256 rewardAmount;
        uint256 assetArrLength = assetArr.length;
        require(assetArrLength < 1000, "fundProcess: bad length");
        for (uint256 i = 0; i < assetArrLength; ++i) {
            rewardAmount = assetArr[i].amount * IProperty(DAO_PROPERTY).fundFeePercent() / 1e10;
            if (vabToken == assetArr[i].token) {
                rewardSumAmount += rewardAmount;
            } else {
                if (assetArr[i].token == address(0)) {
                    Helper.safeTransferETH(UNI_HELPER, rewardAmount);
                } else {
                    if (IERC20(assetArr[i].token).allowance(address(this), UNI_HELPER) == 0) {
                        Helper.safeApprove(assetArr[i].token, UNI_HELPER, IERC20(assetArr[i].token).totalSupply());
                    }
                }
                bytes memory swapArgs = abi.encode(rewardAmount, assetArr[i].token, vabToken);
                rewardSumAmount += IUniHelper(UNI_HELPER).swapAsset(swapArgs);
            }
            // transfer assets(except reward) to film owner
            Helper.safeTransferAsset(assetArr[i].token, msg.sender, (assetArr[i].amount - rewardAmount));
        }

        if (rewardSumAmount != 0) {
            if (IERC20(vabToken).allowance(address(this), STAKING_POOL) == 0) {
                Helper.safeApprove(vabToken, STAKING_POOL, IERC20(vabToken).totalSupply());
            }
            // transfer reward(2%) to rewardPool
            IStakingPool(STAKING_POOL).addRewardToPool(rewardSumAmount);
        }

        fundProcessedFilmIds.push(_filmId);
        isFundProcessed[_filmId] = true;

        emit FundFilmProcessed(_filmId, msg.sender);
    }

    /**
     * @notice Allows an investor to withdraw their funds from a film if the funding period has ended and the film did
     * not meet its funding goal.
     * @dev This function can only be called by investors who have deposited funds into the film.
     * @param _filmId The unique identifier of the film from which funds are being withdrawn.
     *
     * Requirements:
     * - Film must be in the approved funding status.
     * - The funding period must have ended.
     * - The film must not have raised the full required amount.
     *
     * Functionality:
     * - Transfers deposited tokens back to the investor.
     * - If the investor's total fund amount for the film becomes zero after withdrawal, they are removed from the
     * investor list.
     * - Emits a `FundWithdrawed` event upon successful withdrawal.
     */
    function withdrawFunding(uint256 _filmId) external nonReentrant {
        Helper.Status status = IVabbleDAO(VABBLE_DAO).getFilmStatus(_filmId);
        require(status == Helper.Status.APPROVED_FUNDING, "withdrawFunding: filmId not approved for funding");

        (, uint256 fundPeriod,,) = IVabbleDAO(VABBLE_DAO).getFilmFund(_filmId);
        (, uint256 pApproveTime) = IVabbleDAO(VABBLE_DAO).getFilmProposalTime(_filmId);
        require(fundPeriod < block.timestamp - pApproveTime, "withdrawFunding: funding period");

        require(!isRaisedFullAmount(_filmId), "withdrawFunding: full raised");

        Asset[] storage assetArr = assetInfo[_filmId][msg.sender];
        uint256 assetArrLength = assetArr.length;
        require(assetArrLength < 1000, "withdrawFunding: bad length");
        for (uint256 i = 0; i < assetArrLength; ++i) {
            if (assetArr[i].token == address(0)) {
                if (address(this).balance >= assetArr[i].amount) {
                    Helper.safeTransferETH(msg.sender, assetArr[i].amount);
                    assetArr[i].amount = 0;
                }
            } else {
                if (IERC20(assetArr[i].token).balanceOf(address(this)) >= assetArr[i].amount) {
                    Helper.safeTransfer(assetArr[i].token, msg.sender, assetArr[i].amount);
                    assetArr[i].amount = 0;
                }
            }
        }

        uint256 userFundAmountPerFilm = getUserFundAmountPerFilm(msg.sender, _filmId);
        if (userFundAmountPerFilm == 0) {
            __removeFilmInvestorList(_filmId, msg.sender);
        }

        emit FundWithdrawed(_filmId, msg.sender);
    }

    /**
     * @notice Retrieves a list of film IDs that have successfully processed funds.
     * @return List of values representing the film IDs that have completed the fund processing.
     */
    function getFundProcessedFilmIdList() external view returns (uint256[] memory) {
        return fundProcessedFilmIds;
    }

    /**
     * @notice Returns the list of investors for a film.
     * @param _filmId The ID of the film.
     * @return List of investor addresses.
     */
    function getFilmInvestorList(uint256 _filmId) external view override returns (address[] memory) {
        return filmInvestorList[_filmId];
    }

    /**
     * @notice Returns the allowed NFT count for an investor in a film.
     * @param _filmId The ID of the film.
     * @param _user The address of the investor.
     * @return The allowed NFT count.
     */
    function getAllowUserNftCount(uint256 _filmId, address _user) external view override returns (uint256) {
        return allowUserNftCount[_filmId][_user];
    }

    /*//////////////////////////////////////////////////////////////
                                 PUBLIC
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Checks if the film funding has met the raise amount.
     * @param _filmId The ID of the film.
     * @return True if the raise amount is met, false otherwise.
     */
    function isRaisedFullAmount(uint256 _filmId) public view override returns (bool) {
        uint256 raisedAmount = getTotalFundAmountPerFilm(_filmId);

        (uint256 raiseAmount,,,) = IVabbleDAO(VABBLE_DAO).getFilmFund(_filmId);
        if (raisedAmount != 0 && raisedAmount >= raiseAmount) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * @notice Returns the fund amount for an investor in a film.
     * @param _customer The address of the investor.
     * @param _filmId The ID of the film.
     * @return amount_ The fund amount in USDC.
     */
    function getUserFundAmountPerFilm(
        address _customer,
        uint256 _filmId
    )
        public
        view
        override
        returns (uint256 amount_)
    {
        Asset[] memory assetArr = assetInfo[_filmId][_customer];
        uint256 assetArrLength = assetArr.length;
        for (uint256 i = 0; i < assetArrLength; ++i) {
            if (assetArr[i].amount == 0) continue;
            amount_ += __getExpectedUsdcAmount(assetArr[i].token, assetArr[i].amount);
        }
    }

    /**
     * @notice Returns the total fund amount for a film.
     * @param _filmId The ID of the film.
     * @return amount_ The total fund amount in USDC.
     */
    function getTotalFundAmountPerFilm(uint256 _filmId) public view override returns (uint256 amount_) {
        Asset[] memory assetArr = assetPerFilm[_filmId];
        uint256 assetArrLength = assetArr.length;
        for (uint256 i = 0; i < assetArrLength; ++i) {
            if (assetArr[i].amount == 0) continue;
            amount_ += __getExpectedUsdcAmount(assetArr[i].token, assetArr[i].amount);
        }
    }

    /**
     * @notice Returns the token amount equivalent to the given USDC amount.
     * @param _token The address of the token.
     * @param _usdcAmount The amount in USDC.
     * @return amount_ The equivalent token amount.
     */
    //@follow-up why is this public ?
    function __getExpectedTokenAmount(address _token, uint256 _usdcAmount) public view returns (uint256 amount_) {
        amount_ = _usdcAmount;
        if (_token != IOwnablee(OWNABLE).USDC_TOKEN()) {
            amount_ = IUniHelper(UNI_HELPER).expectedAmount(_usdcAmount, IOwnablee(OWNABLE).USDC_TOKEN(), _token);
        }
    }

    /**
     * @notice Returns the USDC amount equivalent to the given token amount.
     * @param _token The address of the token.
     * @param _tokenAmount The amount of the token.
     * @return amount_ The equivalent USDC amount.
     */
    //@follow-up why is this public ?
    function __getExpectedUsdcAmount(address _token, uint256 _tokenAmount) public view returns (uint256 amount_) {
        amount_ = _tokenAmount;
        if (_token != IOwnablee(OWNABLE).USDC_TOKEN()) {
            amount_ = IUniHelper(UNI_HELPER).expectedAmount(_tokenAmount, _token, IOwnablee(OWNABLE).USDC_TOKEN());
        }
    }

    /*//////////////////////////////////////////////////////////////
                                PRIVATE
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Deposits an amount to a film based on specified parameters.
     * @dev Function to deposit funds to a film based on specified conditions.
     * - Requires proper authorization based on the fund type and token/NFT availability.
     * - Ensures the deposited amount meets minimum and maximum deposit criteria.
     * @param _filmId The ID of the film to deposit funds into.
     * @param _amount The amount to deposit.
     * @param _flag A flag indicating the type of funding operation:
     *   - 1 for token-based funding.
     *   - 2 for NFT-based funding.
     * @param _fundType The type of funding:
     *   - 1 for token funding.
     *   - 2 for NFT funding.
     *   - 3 for NFT & token funding.
     * @param _userFundAmount The current total funds deposited by the user for the film.
     * @param _token The address of the token used for funding.
     * @return tokenAmount_ The amount of tokens or NFTs deposited.
     *
     */
    function __depositToFilm(
        uint256 _filmId,
        uint256 _amount,
        uint256 _flag,
        uint256 _fundType,
        uint256 _userFundAmount,
        address _token
    )
        private
        returns (uint256 tokenAmount_)
    {
        if (_flag == 1) {
            require(_fundType == 1 || _fundType == 3, "depositToFilm: not fund type by token");

            tokenAmount_ = _amount;
            uint256 usdcAmount = __getExpectedUsdcAmount(_token, _amount);
            require(__isOverMinAmount(_userFundAmount + usdcAmount), "depositToFilm: less min amount");
            require(__isLessMaxAmount(_userFundAmount + usdcAmount), "depositToFilm: over max amount");
        } else if (_flag == 2) {
            require(_fundType == 2 || _fundType == 3, "depositToFilm: not fund type by nft");
            (, uint256 maxMintAmount, uint256 mintPrice, address nft,) = IFactoryFilmNFT(FILM_NFT).getMintInfo(_filmId);
            uint256 filmNftTotalSupply = IFactoryFilmNFT(FILM_NFT).getTotalSupply(_filmId);

            require(nft != address(0), "depositToFilm: not deployed for film");
            require(maxMintAmount != 0, "depositToFilm: no mint info");
            require(maxMintAmount >= filmNftTotalSupply + _amount, "depositToFilm: exceed mint amount");

            uint256 usdcAmount = _amount * mintPrice; // USDC
            tokenAmount_ = __getExpectedTokenAmount(_token, usdcAmount);
            require(__isLessMaxAmount(_userFundAmount + usdcAmount), "depositToFilm: over max amount");

            allowUserNftCount[_filmId][msg.sender] = _amount;
        }
    }

    /**
     * @dev Assigns a token amount to the user's funding information for a specific film.
     * @dev Function to update or add the token amount for the user's funding information.
     * @param _filmId The ID of the film.
     * @param _token The address of the token.
     * @param _amount The amount of tokens to assign.
     */
    function __assignToken(uint256 _filmId, address _token, uint256 _amount) private {
        bool isNewTokenPerUser = true;
        bool isNewTokenPerFilm = true;

        // update token amount
        uint256 assetInfoLength = assetInfo[_filmId][msg.sender].length;
        for (uint256 i = 0; i < assetInfoLength; ++i) {
            if (_token == assetInfo[_filmId][msg.sender][i].token) {
                assetInfo[_filmId][msg.sender][i].amount += _amount;
                isNewTokenPerUser = false;
            }
        }
        // add new token
        if (isNewTokenPerUser) {
            assetInfo[_filmId][msg.sender].push(Asset({ token: _token, amount: _amount }));
        }

        uint256 assetPerFilmLength = assetPerFilm[_filmId].length;
        require(assetPerFilmLength < 1000, "assignToken: bad length");
        for (uint256 i = 0; i < assetPerFilmLength; ++i) {
            if (_token == assetPerFilm[_filmId][i].token) {
                assetPerFilm[_filmId][i].amount += _amount;
                isNewTokenPerFilm = false;
            }
        }
        if (isNewTokenPerFilm) {
            assetPerFilm[_filmId].push(Asset({ token: _token, amount: _amount }));
        }
    }

    /**
     * @dev Removes a user from the investor list for a specific film.
     * @param _filmId The ID of the film.
     * @param _user The address of the user to remove.
     */
    function __removeFilmInvestorList(uint256 _filmId, address _user) private {
        uint256 length = filmInvestorList[_filmId].length;
        require(length < 1e5, "removeFilmInvestorList: bad length");
        for (uint256 k = 0; k < length; ++k) {
            if (_user == filmInvestorList[_filmId][k]) {
                filmInvestorList[_filmId][k] = filmInvestorList[_filmId][filmInvestorList[_filmId].length - 1];
                filmInvestorList[_filmId].pop();
                break;
            }
        }
    }

    /**
     * @dev Checks if the amount is over the minimum deposit amount allowed for a film.
     * @param _amount The amount to check.
     * @return passed_ True if the amount meets or exceeds the minimum deposit amount, otherwise false.
     */
    function __isOverMinAmount(uint256 _amount) private view returns (bool passed_) {
        if (_amount >= IProperty(DAO_PROPERTY).minDepositAmount()) passed_ = true;
    }

    /**
     * @dev Checks if the amount is less than or equal to the maximum deposit amount allowed for a film.
     * @param _amount The amount to check.
     * @return passed_ True if the amount is within the maximum deposit amount, otherwise false.
     */
    function __isLessMaxAmount(uint256 _amount) private view returns (bool passed_) {
        if (_amount <= IProperty(DAO_PROPERTY).maxDepositAmount()) passed_ = true;
    }
}
