// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "../interfaces/IVabbleDAO.sol";
import "../libraries/Helper.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

library DAOOperations  {
    using Counters for Counters.Counter;

    function migrateFilmProposals(
        IVabbleDAO.Film[] calldata _filmDetails,
        mapping(uint256 => IVabbleDAO.Film) storage filmInfo,
        mapping(uint256 => uint256[]) storage totalFilmIds,
        mapping(address => mapping(uint256 => uint256[])) storage userFilmIds,
        Counters.Counter storage filmCount,
        Counters.Counter storage updatedFilmCount
    ) external {
        require(_filmDetails.length > 0, "No films to migrate");
        require(_filmDetails.length < 1000, "Too many films");

        for (uint256 i = 0; i < _filmDetails.length; ++i) {
            filmCount.increment();
            uint256 filmId = filmCount.current();
            IVabbleDAO.Film memory filmDetail = _filmDetails[i];

            filmInfo[filmId] = filmDetail;

            // Assign default lists
            totalFilmIds[1].push(filmId);
            userFilmIds[filmDetail.studio][1].push(filmId);

            // Update based on status
            if (
                filmDetail.status == Helper.Status.APPROVED_LISTING
                    || filmDetail.status == Helper.Status.APPROVED_FUNDING || filmDetail.status == Helper.Status.UPDATED
                    || (
                        filmDetail.status == Helper.Status.REJECTED && filmDetail.pCreateTime != 0
                            && filmDetail.pApproveTime > filmDetail.pCreateTime
                    )
            ) {
                updatedFilmCount.increment();
                totalFilmIds[4].push(filmId);
                userFilmIds[filmDetail.studio][2].push(filmId);

                // Further status-specific logic
                if (filmDetail.status == Helper.Status.APPROVED_LISTING) {
                    totalFilmIds[2].push(filmId);
                    userFilmIds[filmDetail.studio][3].push(filmId);
                } else if (filmDetail.status == Helper.Status.APPROVED_FUNDING) {
                    totalFilmIds[3].push(filmId);
                    userFilmIds[filmDetail.studio][3].push(filmId);
                }
            }
        }
    }
}
