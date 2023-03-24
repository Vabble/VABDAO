// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "../libraries/Helper.sol";
import "../dao/VabbleDAO.sol";

interface IVabbleDAO {   
    
    struct Film {
        string title;            // proposal title
        string description;      // proposal description
        uint256[] sharePercents; // percents(1% = 1e8) that studio defines to pay revenue for each payee
        address[] studioPayees;  // payee addresses who studio define to pay revenue
        uint256 raiseAmount;     // USDC amount(in cash) studio are seeking to raise for the film
        uint256 fundPeriod;      // how many days(ex: 20 days) to keep the funding pool open        
        uint256 fundType;        // Financing Type(None=>0, Token=>1, NFT=>2, NFT & Token=>3)
        uint256 noVote;          // if 0 => false, 1 => true
        uint256 enableClaimer;   // if 0 => false, 1 => true
        uint256 pCreateTime;     // proposal created time(block.timestamp) by studio
        uint256 pApproveTime;    // proposal approved time(block.timestamp) by vote
        address studio;          // studio address(film owner)
        Helper.Status status;    // status of film
    }

    function getFilmFund(uint256 _filmId) external view returns (uint256 raiseAmount_, uint256 fundPeriod_, uint256 fundType_);

    function getFilmStatus(uint256 _filmId) external view returns (Helper.Status status_);
    
    function getFilmOwner(uint256 _filmId) external view returns (address owner_);

    function getFilmProposalTime(uint256 _filmId) external view returns (uint256 cTime_, uint256 aTime_);

    function approveFilmByVote(uint256 _filmId, uint256 _flag) external;

    function isEnabledClaimer(uint256 _filmId) external view returns (bool enable_);

    function getFilmShare(uint256 _filmId) external view 
    returns (
        uint256[] memory sharePercents_, 
        address[] memory studioPayees_
    );

    function getUserFilmListForMigrate(address _user) external view returns (Film[] memory filmList_);
}
