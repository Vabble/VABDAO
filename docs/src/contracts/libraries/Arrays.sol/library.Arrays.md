# Arrays
[Git Source](https://github.com/Mill1995/VABDAO/blob/4914bdc306cbdb860037485ce4bcebbfdd390c9f/contracts/libraries/Arrays.sol)

*Collection of functions related to array types.*


## Functions
### sort

*Sort an array of bytes32 (in memory) following the provided comparator function.
This function does the sorting "in place", meaning that it overrides the input. The object is returned for
convenience, but that returned value can be discarded safely if the caller has a memory pointer to the array.
NOTE: this function's cost is `O(n · log(n))` in average and `O(n²)` in the worst case, with n the length of the
array. Using it in view functions that are executed through `eth_call` is safe, but one should be very careful
when executing this as part of a transaction. If the array being sorted is too large, the sort operation may
consume more gas than is available in a block, leading to potential DoS.*


```solidity
function sort(
    bytes32[] memory array,
    function(bytes32, bytes32) pure returns (bool) comp
)
    internal
    pure
    returns (bytes32[] memory);
```

### sort

*Variant of [sort](/contracts/libraries/Arrays.sol/library.Arrays.md#sort) that sorts an array of bytes32 in increasing order.*


```solidity
function sort(bytes32[] memory array) internal pure returns (bytes32[] memory);
```

### sort

*Variant of [sort](/contracts/libraries/Arrays.sol/library.Arrays.md#sort) that sorts an array of address following a provided comparator function.*


```solidity
function sort(
    address[] memory array,
    function(address, address) pure returns (bool) comp
)
    internal
    pure
    returns (address[] memory);
```

### sort

*Variant of [sort](/contracts/libraries/Arrays.sol/library.Arrays.md#sort) that sorts an array of address in increasing order.*


```solidity
function sort(address[] memory array) internal pure returns (address[] memory);
```

### sort

*Variant of [sort](/contracts/libraries/Arrays.sol/library.Arrays.md#sort) that sorts an array of uint256 following a provided comparator function.*


```solidity
function sort(
    uint256[] memory array,
    function(uint256, uint256) pure returns (bool) comp
)
    internal
    pure
    returns (uint256[] memory);
```

### sort

*Variant of [sort](/contracts/libraries/Arrays.sol/library.Arrays.md#sort) that sorts an array of uint256 in increasing order.*


```solidity
function sort(uint256[] memory array) internal pure returns (uint256[] memory);
```

### _quickSort

*Performs a quick sort of a segment of memory. The segment sorted starts at `begin` (inclusive), and stops
at end (exclusive). Sorting follows the `comp` comparator.
Invariant: `begin <= end`. This is the case when initially called by [sort](/contracts/libraries/Arrays.sol/library.Arrays.md#sort) and is preserved in subcalls.
IMPORTANT: Memory locations between `begin` and `end` are not validated/zeroed. This function should
be used only if the limits are within a memory array.*


```solidity
function _quickSort(uint256 begin, uint256 end, function(bytes32, bytes32) pure returns (bool) comp) private pure;
```

### _begin

*Pointer to the memory location of the first element of `array`.*


```solidity
function _begin(bytes32[] memory array) private pure returns (uint256 ptr);
```

### _end

*Pointer to the memory location of the first memory word (32bytes) after `array`. This is the memory word
that comes just after the last element of the array.*


```solidity
function _end(bytes32[] memory array) private pure returns (uint256 ptr);
```

### _mload

*Load memory word (as a bytes32) at location `ptr`.*


```solidity
function _mload(uint256 ptr) private pure returns (bytes32 value);
```

### _swap

*Swaps the elements memory location `ptr1` and `ptr2`.*


```solidity
function _swap(uint256 ptr1, uint256 ptr2) private pure;
```

### _defaultComp

*Comparator for sorting arrays in increasing order.*


```solidity
function _defaultComp(bytes32 a, bytes32 b) private pure returns (bool);
```

### _castToBytes32Array

*Helper: low level cast address memory array to uint256 memory array*


```solidity
function _castToBytes32Array(address[] memory input) private pure returns (bytes32[] memory output);
```

### _castToBytes32Array

*Helper: low level cast uint256 memory array to uint256 memory array*


```solidity
function _castToBytes32Array(uint256[] memory input) private pure returns (bytes32[] memory output);
```

### _castToBytes32Comp

*Helper: low level cast address comp function to bytes32 comp function*


```solidity
function _castToBytes32Comp(function(address, address) pure returns (bool) input)
    private
    pure
    returns (function(bytes32, bytes32) pure returns (bool) output);
```

### _castToBytes32Comp

*Helper: low level cast uint256 comp function to bytes32 comp function*


```solidity
function _castToBytes32Comp(function(uint256, uint256) pure returns (bool) input)
    private
    pure
    returns (function(bytes32, bytes32) pure returns (bool) output);
```

