// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.4;

// import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
// import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/utils/Address.sol";

library Helper {
    enum Status {
        LISTED,              //0 proposal created by studio
        UPDATED,             //1 proposal updated by studio
        APPROVED_LISTING,    //2 approved for listing by vote from VAB holders(staker)
        APPROVED_FUNDING,    //3 approved for funding by vote from VAB holders(staker)
        REJECTED             //4 rejected by vote from VAB holders(staker)
    }

    enum TokenType {
        ERC20,
        ERC721,
        ERC1155
    }

    function safeApprove(
        address token,
        address to,
        uint256 value
    ) internal {
        // bytes4(keccak256(bytes('approve(address,uint256)')));
        require(Address.isContract(token), "C");
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(0x095ea7b3, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), "TransferHelper::safeApprove: approve failed");
    }

    function safeTransfer(
        address token,
        address to,
        uint256 value
    ) internal {
        require(Address.isContract(token), "C");
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(0xa9059cbb, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), "VabbleDAO::safeTransfer: transfer failed");
    }

    function safeTransferFrom(
        address token,
        address from,
        address to,
        uint256 value
    ) internal {
        require(Address.isContract(token), "C");
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(0x23b872dd, from, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), "VabbleDAO::transferFrom: transferFrom failed");
    }

    function safeTransferETH(address to, uint256 value) internal {
        (bool success, ) = to.call{value: value}(new bytes(0));
        require(success, "VabbleDAO::safeTransferETH: ETH transfer failed");
    }

    function safeTransferAsset(
        address token,
        address to,
        uint256 value
    ) internal {
        if (token == address(0)) {
            safeTransferETH(to, value);
        } else {
            safeTransfer(token, to, value);
        }
    }

    // function safeTransferNFT(
    //     address _nft,
    //     address _from,
    //     address _to,
    //     TokenType _type,
    //     uint256 _tokenId
    // ) internal {
    //     if (_type == TokenType.ERC721) {
    //         IERC721(_nft).safeTransferFrom(_from, _to, _tokenId);
    //     } else {
    //         IERC1155(_nft).safeTransferFrom(_from, _to, _tokenId, 1, "0x00");
    //     }
    // }

    function isContract(address _address) internal view returns(bool){
        // uint32 size;
        // assembly {
        //     size := extcodesize(_address)
        // }
        // return (size != 0);
        return Address.isContract(_address);
    }

    // function moveToAnotherArray(uint256[] storage array1, uint256[] storage array2, uint256 value) internal {
    //     uint256 index = array1.length;

    //     for(uint256 i = 0; i < array1.length; ++i) {
    //         if(array1[i] == value) {
    //             index = i;
    //         }
    //     }

    //     if (index >= array1.length) return;

    //     array2.push(value);
        
    //     array1[index] = array1[array1.length - 1];
    //     array1.pop();
    // }

    function isTestNet() internal view returns (bool) {
        uint256 id = block.chainid;
        return id == 1337 || id == 80001 || id == 31337;
    }
}
