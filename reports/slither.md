**THIS CHECKLIST IS NOT COMPLETE**. Use `--show-ignored-findings` to show all the results.
Summary
 - [arbitrary-send-eth](#arbitrary-send-eth) (1 results) (High)
 - [encode-packed-collision](#encode-packed-collision) (1 results) (High)
 - [incorrect-exp](#incorrect-exp) (1 results) (High)
 - [divide-before-multiply](#divide-before-multiply) (18 results) (Medium)
 - [incorrect-equality](#incorrect-equality) (10 results) (Medium)
 - [reentrancy-no-eth](#reentrancy-no-eth) (15 results) (Medium)
 - [tautology](#tautology) (1 results) (Medium)
 - [uninitialized-local](#uninitialized-local) (6 results) (Medium)
 - [unused-return](#unused-return) (26 results) (Medium)
 - [shadowing-local](#shadowing-local) (2 results) (Low)
 - [events-access](#events-access) (5 results) (Low)
 - [missing-zero-check](#missing-zero-check) (9 results) (Low)
 - [calls-loop](#calls-loop) (36 results) (Low)
 - [reentrancy-benign](#reentrancy-benign) (35 results) (Low)
 - [timestamp](#timestamp) (30 results) (Low)
 - [assembly](#assembly) (11 results) (Informational)
 - [costly-loop](#costly-loop) (4 results) (Informational)
 - [cyclomatic-complexity](#cyclomatic-complexity) (3 results) (Informational)
 - [dead-code](#dead-code) (13 results) (Informational)
 - [low-level-calls](#low-level-calls) (8 results) (Informational)
 - [unused-import](#unused-import) (3 results) (Informational)
 - [unused-state](#unused-state) (2 results) (Informational)
 - [cache-array-length](#cache-array-length) (1 results) (Optimization)
 - [immutable-states](#immutable-states) (1 results) (Optimization)
## arbitrary-send-eth
Impact: High
Confidence: Medium
 - [ ] ID-0
[UniHelper.__swapETHToToken(uint256,uint256,address,address[])](contracts/dao/UniHelper.sol#L315-L331) sends eth to arbitrary user
	Dangerous calls:
	- [amounts_ = IUniswapV2Router(_router).swapExactETHForTokens{value: address(this).balance}(_expectedAmount,_path,address(this),block.timestamp + 1)](contracts/dao/UniHelper.sol#L328-L330)

contracts/dao/UniHelper.sol#L315-L331


## encode-packed-collision
Impact: High
Confidence: High
 - [ ] ID-1
[VabbleNFT.tokenURI(uint256)](contracts/dao/VabbleNFT.sol#L141-L145) calls abi.encodePacked() with multiple dynamic arguments:
	- [string(abi.encodePacked(baseUri,_tokenId.toString(),.json))](contracts/dao/VabbleNFT.sol#L144)

contracts/dao/VabbleNFT.sol#L141-L145


## incorrect-exp
Impact: High
Confidence: Medium
 - [ ] ID-2
[Math.mulDiv(uint256,uint256,uint256)](node_modules/@openzeppelin/contracts/utils/math/Math.sol#L55-L134) has bitwise-xor operator ^ instead of the exponentiation operator **: 
	 - [inverse = (3 * denominator) ^ 2](node_modules/@openzeppelin/contracts/utils/math/Math.sol#L116)

node_modules/@openzeppelin/contracts/utils/math/Math.sol#L55-L134


## divide-before-multiply
Impact: Medium
Confidence: Medium
 - [ ] ID-3
[Subscription.getExpectedSubscriptionAmount(address,uint256)](contracts/dao/Subscription.sol#L231-L266) performs a multiplication on the result of a division:
	- [scriptAmount = scriptAmount * (100 - discountList[0]) * 1e8 / 1e10](contracts/dao/Subscription.sol#L249)
	- [scriptAmount = scriptAmount * (100 - discountList[1]) * 1e8 / 1e10](contracts/dao/Subscription.sol#L251)

contracts/dao/Subscription.sol#L231-L266


 - [ ] ID-4
[Math.mulDiv(uint256,uint256,uint256)](node_modules/@openzeppelin/contracts/utils/math/Math.sol#L55-L134) performs a multiplication on the result of a division:
	- [denominator = denominator / twos](node_modules/@openzeppelin/contracts/utils/math/Math.sol#L101)
	- [inverse *= 2 - denominator * inverse](node_modules/@openzeppelin/contracts/utils/math/Math.sol#L120)

node_modules/@openzeppelin/contracts/utils/math/Math.sol#L55-L134


 - [ ] ID-5
[StakingPool.__calcRewards(address,uint256,uint256)](contracts/dao/StakingPool.sol#L1205-L1220) performs a multiplication on the result of a division:
	- [amount_ = totalRewardAmount * rewardPercent * period / 1e10 / 1e4](contracts/dao/StakingPool.sol#L1214)
	- [amount_ += amount_ * IProperty(DAO_PROPERTY).boardRewardRate() / 1e10](contracts/dao/StakingPool.sol#L1218)

contracts/dao/StakingPool.sol#L1205-L1220


 - [ ] ID-6
[Math.mulDiv(uint256,uint256,uint256)](node_modules/@openzeppelin/contracts/utils/math/Math.sol#L55-L134) performs a multiplication on the result of a division:
	- [prod0 = prod0 / twos](node_modules/@openzeppelin/contracts/utils/math/Math.sol#L104)
	- [result = prod0 * inverse](node_modules/@openzeppelin/contracts/utils/math/Math.sol#L131)

node_modules/@openzeppelin/contracts/utils/math/Math.sol#L55-L134


 - [ ] ID-7
[Math.mulDiv(uint256,uint256,uint256)](node_modules/@openzeppelin/contracts/utils/math/Math.sol#L55-L134) performs a multiplication on the result of a division:
	- [denominator = denominator / twos](node_modules/@openzeppelin/contracts/utils/math/Math.sol#L101)
	- [inverse *= 2 - denominator * inverse](node_modules/@openzeppelin/contracts/utils/math/Math.sol#L122)

node_modules/@openzeppelin/contracts/utils/math/Math.sol#L55-L134


 - [ ] ID-8
[StakingPool.calculateAPR(uint256,uint256,uint256,uint256,bool)](contracts/dao/StakingPool.sol#L740-L777) performs a multiplication on the result of a division:
	- [stakingRewards = totalRewardAmount * rewardPercent * _period / 1e10](contracts/dao/StakingPool.sol#L757)
	- [countVal = (_voteCount * 1e4) / _proposalCount](contracts/dao/StakingPool.sol#L771)
	- [pendingRewards = stakingRewards * countVal / 1e4](contracts/dao/StakingPool.sol#L772)

contracts/dao/StakingPool.sol#L740-L777


 - [ ] ID-9
[Math.mulDiv(uint256,uint256,uint256)](node_modules/@openzeppelin/contracts/utils/math/Math.sol#L55-L134) performs a multiplication on the result of a division:
	- [denominator = denominator / twos](node_modules/@openzeppelin/contracts/utils/math/Math.sol#L101)
	- [inverse *= 2 - denominator * inverse](node_modules/@openzeppelin/contracts/utils/math/Math.sol#L125)

node_modules/@openzeppelin/contracts/utils/math/Math.sol#L55-L134


 - [ ] ID-10
[StakingPool.__rewardPercent(uint256)](contracts/dao/StakingPool.sol#L1229-L1232) performs a multiplication on the result of a division:
	- [poolPercent = _stakingAmount * 1e10 / totalStakingAmount](contracts/dao/StakingPool.sol#L1230)
	- [percent_ = IProperty(DAO_PROPERTY).rewardRate() * poolPercent / 1e10](contracts/dao/StakingPool.sol#L1231)

contracts/dao/StakingPool.sol#L1229-L1232


 - [ ] ID-11
[StakingPool.calcRealizedRewards(address)](contracts/dao/StakingPool.sol#L981-L1011) performs a multiplication on the result of a division:
	- [countRate = (vCount * 1e4) / pCount](contracts/dao/StakingPool.sol#L1003)
	- [amount = (amount * countRate) / 1e4](contracts/dao/StakingPool.sol#L1004)

contracts/dao/StakingPool.sol#L981-L1011


 - [ ] ID-12
[Math.mulDiv(uint256,uint256,uint256)](node_modules/@openzeppelin/contracts/utils/math/Math.sol#L55-L134) performs a multiplication on the result of a division:
	- [denominator = denominator / twos](node_modules/@openzeppelin/contracts/utils/math/Math.sol#L101)
	- [inverse *= 2 - denominator * inverse](node_modules/@openzeppelin/contracts/utils/math/Math.sol#L124)

node_modules/@openzeppelin/contracts/utils/math/Math.sol#L55-L134


 - [ ] ID-13
[Math.mulDiv(uint256,uint256,uint256)](node_modules/@openzeppelin/contracts/utils/math/Math.sol#L55-L134) performs a multiplication on the result of a division:
	- [denominator = denominator / twos](node_modules/@openzeppelin/contracts/utils/math/Math.sol#L101)
	- [inverse *= 2 - denominator * inverse](node_modules/@openzeppelin/contracts/utils/math/Math.sol#L123)

node_modules/@openzeppelin/contracts/utils/math/Math.sol#L55-L134


 - [ ] ID-14
[StakingPool.calculateAPR(uint256,uint256,uint256,uint256,bool)](contracts/dao/StakingPool.sol#L740-L777) performs a multiplication on the result of a division:
	- [stakingRewards = totalRewardAmount * rewardPercent * _period / 1e10](contracts/dao/StakingPool.sol#L757)
	- [stakingRewards += stakingRewards * IProperty(DAO_PROPERTY).boardRewardRate() / 1e10](contracts/dao/StakingPool.sol#L761)

contracts/dao/StakingPool.sol#L740-L777


 - [ ] ID-15
[VabbleDAO.__setFinalAmountToHelpers(uint256,uint256,uint256)](contracts/dao/VabbleDAO.sol#L1043-L1058) performs a multiplication on the result of a division:
	- [percent = (userAmount * 1e10) / raisedAmount](contracts/dao/VabbleDAO.sol#L1051)
	- [amount = (_rewardAmount * percent) / 1e10](contracts/dao/VabbleDAO.sol#L1052)

contracts/dao/VabbleDAO.sol#L1043-L1058


 - [ ] ID-16
[Math.mulDiv(uint256,uint256,uint256)](node_modules/@openzeppelin/contracts/utils/math/Math.sol#L55-L134) performs a multiplication on the result of a division:
	- [denominator = denominator / twos](node_modules/@openzeppelin/contracts/utils/math/Math.sol#L101)
	- [inverse *= 2 - denominator * inverse](node_modules/@openzeppelin/contracts/utils/math/Math.sol#L121)

node_modules/@openzeppelin/contracts/utils/math/Math.sol#L55-L134


 - [ ] ID-17
[StakingPool.calcPendingRewards(address)](contracts/dao/StakingPool.sol#L1020-L1052) performs a multiplication on the result of a division:
	- [countRate = (pendingVoteCount * 1e4) / pCount](contracts/dao/StakingPool.sol#L1042)
	- [amount = (amount * countRate) / 1e4](contracts/dao/StakingPool.sol#L1043)

contracts/dao/StakingPool.sol#L1020-L1052


 - [ ] ID-18
[StakingPool.__calcRewards(address,uint256,uint256)](contracts/dao/StakingPool.sol#L1205-L1220) performs a multiplication on the result of a division:
	- [period = (endTime - startTime) * 1e4 / 86400](contracts/dao/StakingPool.sol#L1213)
	- [amount_ = totalRewardAmount * rewardPercent * period / 1e10 / 1e4](contracts/dao/StakingPool.sol#L1214)

contracts/dao/StakingPool.sol#L1205-L1220


 - [ ] ID-19
[Math.mulDiv(uint256,uint256,uint256)](node_modules/@openzeppelin/contracts/utils/math/Math.sol#L55-L134) performs a multiplication on the result of a division:
	- [denominator = denominator / twos](node_modules/@openzeppelin/contracts/utils/math/Math.sol#L101)
	- [inverse = (3 * denominator) ^ 2](node_modules/@openzeppelin/contracts/utils/math/Math.sol#L116)

node_modules/@openzeppelin/contracts/utils/math/Math.sol#L55-L134


 - [ ] ID-20
[Subscription.getExpectedSubscriptionAmount(address,uint256)](contracts/dao/Subscription.sol#L231-L266) performs a multiplication on the result of a division:
	- [scriptAmount = scriptAmount * (100 - discountList[1]) * 1e8 / 1e10](contracts/dao/Subscription.sol#L251)
	- [scriptAmount = scriptAmount * (100 - discountList[2]) * 1e8 / 1e10](contracts/dao/Subscription.sol#L253)

contracts/dao/Subscription.sol#L231-L266


## incorrect-equality
Impact: Medium
Confidence: High
 - [ ] ID-21
[StakingPool.__calcRewards(address,uint256,uint256)](contracts/dao/StakingPool.sol#L1205-L1220) uses a dangerous strict equality:
	- [si.stakeAmount == 0](contracts/dao/StakingPool.sol#L1207)

contracts/dao/StakingPool.sol#L1205-L1220


 - [ ] ID-22
[VabbleDAO.__setFinalFilm(uint256,uint256)](contracts/dao/VabbleDAO.sol#L990-L1017) uses a dangerous strict equality:
	- [fInfo.status == Helper.Status.APPROVED_LISTING](contracts/dao/VabbleDAO.sol#L998)

contracts/dao/VabbleDAO.sol#L990-L1017


 - [ ] ID-23
[VabbleDAO.isEnabledClaimer(uint256)](contracts/dao/VabbleDAO.sol#L763-L766) uses a dangerous strict equality:
	- [filmInfo[_filmId].enableClaimer == 1](contracts/dao/VabbleDAO.sol#L764)

contracts/dao/VabbleDAO.sol#L763-L766


 - [ ] ID-24
[VabbleDAO.__claimAllReward(uint256[])](contracts/dao/VabbleDAO.sol#L1079-L1105) uses a dangerous strict equality:
	- [finalFilmCalledTime[_filmIds[i]] == 0](contracts/dao/VabbleDAO.sol#L1088)

contracts/dao/VabbleDAO.sol#L1079-L1105


 - [ ] ID-25
[StakingPool.__calcRewards(address,uint256,uint256)](contracts/dao/StakingPool.sol#L1205-L1220) uses a dangerous strict equality:
	- [startTime == 0](contracts/dao/StakingPool.sol#L1208)

contracts/dao/StakingPool.sol#L1205-L1220


 - [ ] ID-26
[VabbleDAO.__setFinalFilm(uint256,uint256)](contracts/dao/VabbleDAO.sol#L990-L1017) uses a dangerous strict equality:
	- [fInfo.status == Helper.Status.APPROVED_FUNDING](contracts/dao/VabbleDAO.sol#L1000)

contracts/dao/VabbleDAO.sol#L990-L1017


 - [ ] ID-27
[VabbleDAO.proposalFilmUpdate(uint256,string,string,uint256[],address[],uint256,uint256,uint256,uint256)](contracts/dao/VabbleDAO.sol#L368-L442) uses a dangerous strict equality:
	- [fInfo.noVote == 1](contracts/dao/VabbleDAO.sol#L433)

contracts/dao/VabbleDAO.sol#L368-L442


 - [ ] ID-28
[StakingPool.unstakeVAB(uint256)](contracts/dao/StakingPool.sol#L364-L393) uses a dangerous strict equality:
	- [si.stakeAmount == 0](contracts/dao/StakingPool.sol#L385)

contracts/dao/StakingPool.sol#L364-L393


 - [ ] ID-29
[StakingPool.calcRewardAmount(address)](contracts/dao/StakingPool.sol#L843-L854) uses a dangerous strict equality:
	- [si.stakeAmount == 0](contracts/dao/StakingPool.sol#L846)

contracts/dao/StakingPool.sol#L843-L854


 - [ ] ID-30
[VabbleDAO.__setFinalFilm(uint256,uint256)](contracts/dao/VabbleDAO.sol#L990-L1017) uses a dangerous strict equality:
	- [require(bool,string)(fInfo.status == Helper.Status.APPROVED_LISTING || fInfo.status == Helper.Status.APPROVED_FUNDING,sFF: Not approved)](contracts/dao/VabbleDAO.sol#L992-L995)

contracts/dao/VabbleDAO.sol#L990-L1017


## reentrancy-no-eth
Impact: Medium
Confidence: Medium
 - [ ] ID-31
Reentrancy in [VabbleDAO.proposalFilmUpdate(uint256,string,string,uint256[],address[],uint256,uint256,uint256,uint256)](contracts/dao/VabbleDAO.sol#L368-L442):
	External calls:
	- [proposalID = IStakingPool(STAKING_POOL).addProposalData(msg.sender,block.timestamp,IProperty(DAO_PROPERTY).filmVotePeriod())](contracts/dao/VabbleDAO.sol#L424-L426)
	- [IVote(VOTE).saveProposalWithFilm(_filmId,proposalID)](contracts/dao/VabbleDAO.sol#L427)
	- [IStakingPool(STAKING_POOL).updateLastfundProposalCreateTime(block.timestamp)](contracts/dao/VabbleDAO.sol#L431)
	State variables written after the call(s):
	- [fInfo.status = Helper.Status.APPROVED_FUNDING](contracts/dao/VabbleDAO.sol#L434)
	[VabbleDAO.filmInfo](contracts/dao/VabbleDAO.sol#L106) can be used in cross function reentrancies:
	- [VabbleDAO.approveFilmByVote(uint256,uint256)](contracts/dao/VabbleDAO.sol#L496-L517)
	- [VabbleDAO.filmInfo](contracts/dao/VabbleDAO.sol#L106)
	- [VabbleDAO.getFilmFund(uint256)](contracts/dao/VabbleDAO.sol#L730-L739)
	- [VabbleDAO.getFilmOwner(uint256)](contracts/dao/VabbleDAO.sol#L717-L719)
	- [VabbleDAO.getFilmProposalTime(uint256)](contracts/dao/VabbleDAO.sol#L876-L879)
	- [VabbleDAO.getFilmShare(uint256)](contracts/dao/VabbleDAO.sol#L749-L756)
	- [VabbleDAO.getFilmStatus(uint256)](contracts/dao/VabbleDAO.sol#L707-L709)
	- [VabbleDAO.isEnabledClaimer(uint256)](contracts/dao/VabbleDAO.sol#L763-L766)
	- [VabbleDAO.updateEnabledClaimer(uint256,uint256)](contracts/dao/VabbleDAO.sol#L684-L688)
	- [fInfo.pApproveTime = block.timestamp](contracts/dao/VabbleDAO.sol#L435)
	[VabbleDAO.filmInfo](contracts/dao/VabbleDAO.sol#L106) can be used in cross function reentrancies:
	- [VabbleDAO.approveFilmByVote(uint256,uint256)](contracts/dao/VabbleDAO.sol#L496-L517)
	- [VabbleDAO.filmInfo](contracts/dao/VabbleDAO.sol#L106)
	- [VabbleDAO.getFilmFund(uint256)](contracts/dao/VabbleDAO.sol#L730-L739)
	- [VabbleDAO.getFilmOwner(uint256)](contracts/dao/VabbleDAO.sol#L717-L719)
	- [VabbleDAO.getFilmProposalTime(uint256)](contracts/dao/VabbleDAO.sol#L876-L879)
	- [VabbleDAO.getFilmShare(uint256)](contracts/dao/VabbleDAO.sol#L749-L756)
	- [VabbleDAO.getFilmStatus(uint256)](contracts/dao/VabbleDAO.sol#L707-L709)
	- [VabbleDAO.isEnabledClaimer(uint256)](contracts/dao/VabbleDAO.sol#L763-L766)
	- [VabbleDAO.updateEnabledClaimer(uint256,uint256)](contracts/dao/VabbleDAO.sol#L684-L688)
	- [totalFilmIds[3].push(_filmId)](contracts/dao/VabbleDAO.sol#L436)
	[VabbleDAO.totalFilmIds](contracts/dao/VabbleDAO.sol#L131) can be used in cross function reentrancies:
	- [VabbleDAO.approveFilmByVote(uint256,uint256)](contracts/dao/VabbleDAO.sol#L496-L517)
	- [VabbleDAO.getFilmIds(uint256)](contracts/dao/VabbleDAO.sol#L773-L775)
	- [userFilmIds[msg.sender][3].push(_filmId)](contracts/dao/VabbleDAO.sol#L437)
	[VabbleDAO.userFilmIds](contracts/dao/VabbleDAO.sol#L139) can be used in cross function reentrancies:
	- [VabbleDAO.approveFilmByVote(uint256,uint256)](contracts/dao/VabbleDAO.sol#L496-L517)
	- [VabbleDAO.getAllAvailableRewards(uint256,address)](contracts/dao/VabbleDAO.sol#L833-L845)
	- [VabbleDAO.getUserFilmIds(address,uint256)](contracts/dao/VabbleDAO.sol#L697-L699)

contracts/dao/VabbleDAO.sol#L368-L442


 - [ ] ID-32
Reentrancy in [FactorySubNFT.unlockNFT(uint256)](contracts/dao/FactorySubNFT.sol#L284-L297):
	External calls:
	- [subNFTContract.transferNFT(_tokenId,msg.sender)](contracts/dao/FactorySubNFT.sol#L291)
	State variables written after the call(s):
	- [lockInfo[_tokenId].lockPeriod = 0](contracts/dao/FactorySubNFT.sol#L293)
	[FactorySubNFT.lockInfo](contracts/dao/FactorySubNFT.sol#L87) can be used in cross function reentrancies:
	- [FactorySubNFT.getLockInfo(uint256)](contracts/dao/FactorySubNFT.sol#L308-L321)
	- [lockInfo[_tokenId].lockTime = 0](contracts/dao/FactorySubNFT.sol#L294)
	[FactorySubNFT.lockInfo](contracts/dao/FactorySubNFT.sol#L87) can be used in cross function reentrancies:
	- [FactorySubNFT.getLockInfo(uint256)](contracts/dao/FactorySubNFT.sol#L308-L321)

contracts/dao/FactorySubNFT.sol#L284-L297


 - [ ] ID-33
Reentrancy in [StakingPool.unstakeVAB(uint256)](contracts/dao/StakingPool.sol#L364-L393):
	External calls:
	- [__withdrawReward(rewardAmount)](contracts/dao/StakingPool.sol#L375)
		- [Helper.safeTransfer(IOwnablee(OWNABLE).PAYOUT_TOKEN(),msg.sender,_amount)](contracts/dao/StakingPool.sol#L1106)
		- [(success,data) = token.call(abi.encodeWithSelector(0xa9059cbb,to,value))](contracts/libraries/Helper.sol#L42)
	- [Helper.safeTransfer(IOwnablee(OWNABLE).PAYOUT_TOKEN(),msg.sender,_amount)](contracts/dao/StakingPool.sol#L379)
	State variables written after the call(s):
	- [si.stakeTime = block.timestamp](contracts/dao/StakingPool.sol#L381)
	[StakingPool.stakeInfo](contracts/dao/StakingPool.sol#L145) can be used in cross function reentrancies:
	- [StakingPool.__calcProposalTimeIntervals(address)](contracts/dao/StakingPool.sol#L872-L911)
	- [StakingPool.__calcRewards(address,uint256,uint256)](contracts/dao/StakingPool.sol#L1205-L1220)
	- [StakingPool.__getProposalVoteCount(address,uint256,uint256,uint256)](contracts/dao/StakingPool.sol#L928-L972)
	- [StakingPool.calcRewardAmount(address)](contracts/dao/StakingPool.sol#L843-L854)
	- [StakingPool.getStakeAmount(address)](contracts/dao/StakingPool.sol#L784-L786)
	- [StakingPool.getWithdrawableTime(address)](contracts/dao/StakingPool.sol#L821-L823)
	- [StakingPool.stakeInfo](contracts/dao/StakingPool.sol#L145)
	- [si.stakeAmount -= _amount](contracts/dao/StakingPool.sol#L382)
	[StakingPool.stakeInfo](contracts/dao/StakingPool.sol#L145) can be used in cross function reentrancies:
	- [StakingPool.__calcProposalTimeIntervals(address)](contracts/dao/StakingPool.sol#L872-L911)
	- [StakingPool.__calcRewards(address,uint256,uint256)](contracts/dao/StakingPool.sol#L1205-L1220)
	- [StakingPool.__getProposalVoteCount(address,uint256,uint256,uint256)](contracts/dao/StakingPool.sol#L928-L972)
	- [StakingPool.calcRewardAmount(address)](contracts/dao/StakingPool.sol#L843-L854)
	- [StakingPool.getStakeAmount(address)](contracts/dao/StakingPool.sol#L784-L786)
	- [StakingPool.getWithdrawableTime(address)](contracts/dao/StakingPool.sol#L821-L823)
	- [StakingPool.stakeInfo](contracts/dao/StakingPool.sol#L145)
	- [delete stakeInfo[msg.sender]](contracts/dao/StakingPool.sol#L386)
	[StakingPool.stakeInfo](contracts/dao/StakingPool.sol#L145) can be used in cross function reentrancies:
	- [StakingPool.__calcProposalTimeIntervals(address)](contracts/dao/StakingPool.sol#L872-L911)
	- [StakingPool.__calcRewards(address,uint256,uint256)](contracts/dao/StakingPool.sol#L1205-L1220)
	- [StakingPool.__getProposalVoteCount(address,uint256,uint256,uint256)](contracts/dao/StakingPool.sol#L928-L972)
	- [StakingPool.calcRewardAmount(address)](contracts/dao/StakingPool.sol#L843-L854)
	- [StakingPool.getStakeAmount(address)](contracts/dao/StakingPool.sol#L784-L786)
	- [StakingPool.getWithdrawableTime(address)](contracts/dao/StakingPool.sol#L821-L823)
	- [StakingPool.stakeInfo](contracts/dao/StakingPool.sol#L145)
	- [totalStakingAmount -= _amount](contracts/dao/StakingPool.sol#L383)
	[StakingPool.totalStakingAmount](contracts/dao/StakingPool.sol#L120) can be used in cross function reentrancies:
	- [StakingPool.__rewardPercent(uint256)](contracts/dao/StakingPool.sol#L1229-L1232)
	- [StakingPool.totalStakingAmount](contracts/dao/StakingPool.sol#L120)

contracts/dao/StakingPool.sol#L364-L393


 - [ ] ID-34
Reentrancy in [Property.proposalAuditor(address,string,string)](contracts/dao/Property.sol#L801-L833):
	External calls:
	- [__paidFee(proposalFeeAmount)](contracts/dao/Property.sol#L814)
		- [(success,data) = token.call(abi.encodeWithSelector(0x095ea7b3,to,value))](contracts/libraries/Helper.sol#L32)
		- [(success,data) = token.call(abi.encodeWithSelector(0x23b872dd,from,to,value))](contracts/libraries/Helper.sol#L53)
		- [Helper.safeTransferFrom(vabToken,msg.sender,address(this),expectVABAmount)](contracts/dao/Property.sol#L1212)
		- [Helper.safeApprove(vabToken,STAKING_POOL,IERC20(vabToken).totalSupply())](contracts/dao/Property.sol#L1214)
		- [IStakingPool(STAKING_POOL).addRewardToPool(expectVABAmount)](contracts/dao/Property.sol#L1216)
	- [ap.proposalID = IStakingPool(STAKING_POOL).addProposalData(msg.sender,block.timestamp,agentVotePeriod)](contracts/dao/Property.sol#L824)
	State variables written after the call(s):
	- [agentList.push(Agent(_agent,IStakingPool(STAKING_POOL).getStakeAmount(msg.sender)))](contracts/dao/Property.sol#L830)
	[Property.agentList](contracts/dao/Property.sol#L147) can be used in cross function reentrancies:
	- [Property.getAgentProposerStakeAmount(uint256)](contracts/dao/Property.sol#L1106-L1108)
	- [Property.getGovProposalList(uint256)](contracts/dao/Property.sol#L993-L1009)
	- [isGovWhitelist[1][_agent] = 1](contracts/dao/Property.sol#L828)
	[Property.isGovWhitelist](contracts/dao/Property.sol#L162) can be used in cross function reentrancies:
	- [Property.checkGovWhitelist(uint256,address)](contracts/dao/Property.sol#L1116-L1118)
	- [Property.updateGovProposal(uint256,uint256,uint256)](contracts/dao/Property.sol#L927-L962)

contracts/dao/Property.sol#L801-L833


 - [ ] ID-35
Reentrancy in [VabbleDAO.allocateFromEdgePool(uint256)](contracts/dao/VabbleDAO.sol#L580-L594):
	External calls:
	- [IOwnablee(OWNABLE).addToStudioPool(_amount)](contracts/dao/VabbleDAO.sol#L584)
	State variables written after the call(s):
	- [delete edgePoolUsers](contracts/dao/VabbleDAO.sol#L593)
	[VabbleDAO.edgePoolUsers](contracts/dao/VabbleDAO.sol#L100) can be used in cross function reentrancies:
	- [VabbleDAO.getPoolUsers(uint256)](contracts/dao/VabbleDAO.sol#L782-L785)

contracts/dao/VabbleDAO.sol#L580-L594


 - [ ] ID-36
Reentrancy in [StakingPool.__transferVABWithdraw(address)](contracts/dao/StakingPool.sol#L1177-L1190):
	External calls:
	- [Helper.safeTransfer(IOwnablee(OWNABLE).PAYOUT_TOKEN(),_to,payAmount)](contracts/dao/StakingPool.sol#L1183)
	State variables written after the call(s):
	- [userRentInfo[_to].vabAmount -= payAmount](contracts/dao/StakingPool.sol#L1185)
	[StakingPool.userRentInfo](contracts/dao/StakingPool.sol#L151) can be used in cross function reentrancies:
	- [StakingPool.checkAllocateToPool(address[],uint256[])](contracts/dao/StakingPool.sol#L653-L671)
	- [StakingPool.checkApprovePendingWithdraw(address[])](contracts/dao/StakingPool.sol#L699-L729)
	- [StakingPool.checkDenyPendingWithDraw(address[])](contracts/dao/StakingPool.sol#L679-L691)
	- [StakingPool.getRentVABAmount(address)](contracts/dao/StakingPool.sol#L794-L796)
	- [StakingPool.sendVAB(address[],address,uint256[])](contracts/dao/StakingPool.sol#L518-L540)
	- [StakingPool.userRentInfo](contracts/dao/StakingPool.sol#L151)
	- [userRentInfo[_to].withdrawAmount = 0](contracts/dao/StakingPool.sol#L1186)
	[StakingPool.userRentInfo](contracts/dao/StakingPool.sol#L151) can be used in cross function reentrancies:
	- [StakingPool.checkAllocateToPool(address[],uint256[])](contracts/dao/StakingPool.sol#L653-L671)
	- [StakingPool.checkApprovePendingWithdraw(address[])](contracts/dao/StakingPool.sol#L699-L729)
	- [StakingPool.checkDenyPendingWithDraw(address[])](contracts/dao/StakingPool.sol#L679-L691)
	- [StakingPool.getRentVABAmount(address)](contracts/dao/StakingPool.sol#L794-L796)
	- [StakingPool.sendVAB(address[],address,uint256[])](contracts/dao/StakingPool.sol#L518-L540)
	- [StakingPool.userRentInfo](contracts/dao/StakingPool.sol#L151)
	- [userRentInfo[_to].pending = false](contracts/dao/StakingPool.sol#L1187)
	[StakingPool.userRentInfo](contracts/dao/StakingPool.sol#L151) can be used in cross function reentrancies:
	- [StakingPool.checkAllocateToPool(address[],uint256[])](contracts/dao/StakingPool.sol#L653-L671)
	- [StakingPool.checkApprovePendingWithdraw(address[])](contracts/dao/StakingPool.sol#L699-L729)
	- [StakingPool.checkDenyPendingWithDraw(address[])](contracts/dao/StakingPool.sol#L679-L691)
	- [StakingPool.getRentVABAmount(address)](contracts/dao/StakingPool.sol#L794-L796)
	- [StakingPool.sendVAB(address[],address,uint256[])](contracts/dao/StakingPool.sol#L518-L540)
	- [StakingPool.userRentInfo](contracts/dao/StakingPool.sol#L151)

contracts/dao/StakingPool.sol#L1177-L1190


 - [ ] ID-37
Reentrancy in [VabbleFund.fundProcess(uint256)](contracts/dao/VabbleFund.sol#L241-L293):
	External calls:
	- [Helper.safeTransferETH(UNI_HELPER,rewardAmount)](contracts/dao/VabbleFund.sol#L268)
	- [Helper.safeApprove(assetArr[i].token,UNI_HELPER,IERC20(assetArr[i].token).totalSupply())](contracts/dao/VabbleFund.sol#L271)
	- [rewardSumAmount += IUniHelper(UNI_HELPER).swapAsset(swapArgs)](contracts/dao/VabbleFund.sol#L275)
	- [Helper.safeTransferAsset(assetArr[i].token,msg.sender,(assetArr[i].amount - rewardAmount))](contracts/dao/VabbleFund.sol#L278)
	- [Helper.safeApprove(vabToken,STAKING_POOL,IERC20(vabToken).totalSupply())](contracts/dao/VabbleFund.sol#L283)
	- [IStakingPool(STAKING_POOL).addRewardToPool(rewardSumAmount)](contracts/dao/VabbleFund.sol#L286)
	State variables written after the call(s):
	- [isFundProcessed[_filmId] = true](contracts/dao/VabbleFund.sol#L290)
	[VabbleFund.isFundProcessed](contracts/dao/VabbleFund.sol#L77) can be used in cross function reentrancies:
	- [VabbleFund.isFundProcessed](contracts/dao/VabbleFund.sol#L77)

contracts/dao/VabbleFund.sol#L241-L293


 - [ ] ID-38
Reentrancy in [Property.proposalProperty(uint256,uint256,string,string)](contracts/dao/Property.sol#L580-L698):
	External calls:
	- [__paidFee(proposalFeeAmount)](contracts/dao/Property.sol#L594)
		- [(success,data) = token.call(abi.encodeWithSelector(0x095ea7b3,to,value))](contracts/libraries/Helper.sol#L32)
		- [(success,data) = token.call(abi.encodeWithSelector(0x23b872dd,from,to,value))](contracts/libraries/Helper.sol#L53)
		- [Helper.safeTransferFrom(vabToken,msg.sender,address(this),expectVABAmount)](contracts/dao/Property.sol#L1212)
		- [Helper.safeApprove(vabToken,STAKING_POOL,IERC20(vabToken).totalSupply())](contracts/dao/Property.sol#L1214)
		- [IStakingPool(STAKING_POOL).addRewardToPool(expectVABAmount)](contracts/dao/Property.sol#L1216)
	- [pp.proposalID = IStakingPool(STAKING_POOL).addProposalData(msg.sender,block.timestamp,propertyVotePeriod)](contracts/dao/Property.sol#L691)
	State variables written after the call(s):
	- [isPropertyWhitelist[_flag][_property] = 1](contracts/dao/Property.sol#L695)
	[Property.isPropertyWhitelist](contracts/dao/Property.sol#L168) can be used in cross function reentrancies:
	- [Property.checkPropertyWhitelist(uint256,uint256)](contracts/dao/Property.sol#L1126-L1128)
	- [Property.updatePropertyProposal(uint256,uint256,uint256)](contracts/dao/Property.sol#L730-L791)

contracts/dao/Property.sol#L580-L698


 - [ ] ID-39
Reentrancy in [VabbleFund.depositToFilm(uint256,uint256,uint256,address)](contracts/dao/VabbleFund.sol#L179-L221):
	External calls:
	- [Helper.safeTransferETH(msg.sender,msg.value - tokenAmount)](contracts/dao/VabbleFund.sol#L213)
	- [Helper.safeTransferFrom(_token,msg.sender,address(this),tokenAmount)](contracts/dao/VabbleFund.sol#L215)
	State variables written after the call(s):
	- [__assignToken(_filmId,_token,tokenAmount)](contracts/dao/VabbleFund.sol#L218)
		- [assetInfo[_filmId][msg.sender][i].amount += _amount](contracts/dao/VabbleFund.sol#L532)
		- [assetInfo[_filmId][msg.sender].push(Asset({token:_token,amount:_amount}))](contracts/dao/VabbleFund.sol#L538)
	[VabbleFund.assetInfo](contracts/dao/VabbleFund.sol#L80) can be used in cross function reentrancies:
	- [VabbleFund.assetInfo](contracts/dao/VabbleFund.sol#L80)
	- [VabbleFund.getUserFundAmountPerFilm(address,uint256)](contracts/dao/VabbleFund.sol#L400-L415)

contracts/dao/VabbleFund.sol#L179-L221


 - [ ] ID-40
Reentrancy in [FactorySubNFT.lockNFT(uint256)](contracts/dao/FactorySubNFT.sol#L265-L277):
	External calls:
	- [subNFTContract.transferNFT(_tokenId,address(this))](contracts/dao/FactorySubNFT.sol#L269)
	State variables written after the call(s):
	- [lockInfo[_tokenId].lockPeriod = nftLockPeriod](contracts/dao/FactorySubNFT.sol#L273)
	[FactorySubNFT.lockInfo](contracts/dao/FactorySubNFT.sol#L87) can be used in cross function reentrancies:
	- [FactorySubNFT.getLockInfo(uint256)](contracts/dao/FactorySubNFT.sol#L308-L321)
	- [lockInfo[_tokenId].lockTime = block.timestamp](contracts/dao/FactorySubNFT.sol#L274)
	[FactorySubNFT.lockInfo](contracts/dao/FactorySubNFT.sol#L87) can be used in cross function reentrancies:
	- [FactorySubNFT.getLockInfo(uint256)](contracts/dao/FactorySubNFT.sol#L308-L321)

contracts/dao/FactorySubNFT.sol#L265-L277


 - [ ] ID-41
Reentrancy in [StakingPool.withdrawAllFund()](contracts/dao/StakingPool.sol#L578-L603):
	External calls:
	- [Helper.safeTransfer(vabToken,to,totalMigrationVAB)](contracts/dao/StakingPool.sol#L588)
	State variables written after the call(s):
	- [totalMigrationVAB = 0](contracts/dao/StakingPool.sol#L591)
	[StakingPool.totalMigrationVAB](contracts/dao/StakingPool.sol#L138) can be used in cross function reentrancies:
	- [StakingPool.totalMigrationVAB](contracts/dao/StakingPool.sol#L138)

contracts/dao/StakingPool.sol#L578-L603


 - [ ] ID-42
Reentrancy in [Property.proposalRewardFund(address,string,string)](contracts/dao/Property.sol#L845-L876):
	External calls:
	- [__paidFee(10 * proposalFeeAmount)](contracts/dao/Property.sol#L857)
		- [(success,data) = token.call(abi.encodeWithSelector(0x095ea7b3,to,value))](contracts/libraries/Helper.sol#L32)
		- [(success,data) = token.call(abi.encodeWithSelector(0x23b872dd,from,to,value))](contracts/libraries/Helper.sol#L53)
		- [Helper.safeTransferFrom(vabToken,msg.sender,address(this),expectVABAmount)](contracts/dao/Property.sol#L1212)
		- [Helper.safeApprove(vabToken,STAKING_POOL,IERC20(vabToken).totalSupply())](contracts/dao/Property.sol#L1214)
		- [IStakingPool(STAKING_POOL).addRewardToPool(expectVABAmount)](contracts/dao/Property.sol#L1216)
	- [rp.proposalID = IStakingPool(STAKING_POOL).addProposalData(msg.sender,block.timestamp,rewardVotePeriod)](contracts/dao/Property.sol#L867)
	State variables written after the call(s):
	- [isGovWhitelist[3][_rewardAddress] = 1](contracts/dao/Property.sol#L869)
	[Property.isGovWhitelist](contracts/dao/Property.sol#L162) can be used in cross function reentrancies:
	- [Property.checkGovWhitelist(uint256,address)](contracts/dao/Property.sol#L1116-L1118)
	- [Property.updateGovProposal(uint256,uint256,uint256)](contracts/dao/Property.sol#L927-L962)
	- [rewardAddressList.push(_rewardAddress)](contracts/dao/Property.sol#L873)
	[Property.rewardAddressList](contracts/dao/Property.sol#L150) can be used in cross function reentrancies:
	- [Property.getGovProposalList(uint256)](contracts/dao/Property.sol#L993-L1009)

contracts/dao/Property.sol#L845-L876


 - [ ] ID-43
Reentrancy in [StakingPool.withdrawAllFund()](contracts/dao/StakingPool.sol#L578-L603):
	External calls:
	- [Helper.safeTransfer(vabToken,to,totalMigrationVAB)](contracts/dao/StakingPool.sol#L588)
	- [sumAmount += IOwnablee(OWNABLE).withdrawVABFromEdgePool(to)](contracts/dao/StakingPool.sol#L595)
	- [sumAmount += IVabbleDAO(VABBLE_DAO).withdrawVABFromStudioPool(to)](contracts/dao/StakingPool.sol#L598)
	State variables written after the call(s):
	- [migrationStatus = 2](contracts/dao/StakingPool.sol#L600)
	[StakingPool.migrationStatus](contracts/dao/StakingPool.sol#L135) can be used in cross function reentrancies:
	- [StakingPool.calcRewardAmount(address)](contracts/dao/StakingPool.sol#L843-L854)
	- [StakingPool.migrationStatus](contracts/dao/StakingPool.sol#L135)

contracts/dao/StakingPool.sol#L578-L603


 - [ ] ID-44
Reentrancy in [Property.proposalFilmBoard(address,string,string)](contracts/dao/Property.sol#L885-L916):
	External calls:
	- [__paidFee(proposalFeeAmount)](contracts/dao/Property.sol#L897)
		- [(success,data) = token.call(abi.encodeWithSelector(0x095ea7b3,to,value))](contracts/libraries/Helper.sol#L32)
		- [(success,data) = token.call(abi.encodeWithSelector(0x23b872dd,from,to,value))](contracts/libraries/Helper.sol#L53)
		- [Helper.safeTransferFrom(vabToken,msg.sender,address(this),expectVABAmount)](contracts/dao/Property.sol#L1212)
		- [Helper.safeApprove(vabToken,STAKING_POOL,IERC20(vabToken).totalSupply())](contracts/dao/Property.sol#L1214)
		- [IStakingPool(STAKING_POOL).addRewardToPool(expectVABAmount)](contracts/dao/Property.sol#L1216)
	- [bp.proposalID = IStakingPool(STAKING_POOL).addProposalData(msg.sender,block.timestamp,boardVotePeriod)](contracts/dao/Property.sol#L907)
	State variables written after the call(s):
	- [filmBoardCandidates.push(_member)](contracts/dao/Property.sol#L913)
	[Property.filmBoardCandidates](contracts/dao/Property.sol#L153) can be used in cross function reentrancies:
	- [Property.getGovProposalList(uint256)](contracts/dao/Property.sol#L993-L1009)
	- [isGovWhitelist[2][_member] = 1](contracts/dao/Property.sol#L909)
	[Property.isGovWhitelist](contracts/dao/Property.sol#L162) can be used in cross function reentrancies:
	- [Property.checkGovWhitelist(uint256,address)](contracts/dao/Property.sol#L1116-L1118)
	- [Property.updateGovProposal(uint256,uint256,uint256)](contracts/dao/Property.sol#L927-L962)

contracts/dao/Property.sol#L885-L916


 - [ ] ID-45
Reentrancy in [VabbleDAO.__claimAllReward(uint256[])](contracts/dao/VabbleDAO.sol#L1079-L1105):
	External calls:
	- [Helper.safeTransfer(vabToken,msg.sender,rewardSum)](contracts/dao/VabbleDAO.sol#L1101)
	State variables written after the call(s):
	- [StudioPool -= rewardSum](contracts/dao/VabbleDAO.sol#L1102)
	[VabbleDAO.StudioPool](contracts/dao/VabbleDAO.sol#L72) can be used in cross function reentrancies:
	- [VabbleDAO.StudioPool](contracts/dao/VabbleDAO.sol#L72)

contracts/dao/VabbleDAO.sol#L1079-L1105


## tautology
Impact: Medium
Confidence: High
 - [ ] ID-46
[Property.proposalProperty(uint256,uint256,string,string)](contracts/dao/Property.sol#L580-L698) contains a tautology or contradiction:
	- [require(bool,string)(_property != 0 && _flag >= 0 && _flag < maxPropertyList.length,pP: bad value)](contracts/dao/Property.sol#L590)

contracts/dao/Property.sol#L580-L698


## uninitialized-local
Impact: Medium
Confidence: Medium
 - [ ] ID-47
[Property.proposalProperty(uint256,uint256,string,string).len](contracts/dao/Property.sol#L596) is a local variable never initialized

contracts/dao/Property.sol#L596


 - [ ] ID-48
[StakingPool.calculateAPR(uint256,uint256,uint256,uint256,bool).pendingRewards](contracts/dao/StakingPool.sol#L766) is a local variable never initialized

contracts/dao/StakingPool.sol#L766


 - [ ] ID-49
[StakingPool.withdrawAllFund().sumAmount](contracts/dao/StakingPool.sol#L585) is a local variable never initialized

contracts/dao/StakingPool.sol#L585


 - [ ] ID-50
[VabbleDAO.__claimAllReward(uint256[]).rewardSum](contracts/dao/VabbleDAO.sol#L1085) is a local variable never initialized

contracts/dao/VabbleDAO.sol#L1085


 - [ ] ID-51
[VabbleFund.fundProcess(uint256).rewardSumAmount](contracts/dao/VabbleFund.sol#L258) is a local variable never initialized

contracts/dao/VabbleFund.sol#L258


 - [ ] ID-52
[Subscription.activeSubscription(address,uint256).usdcAmount](contracts/dao/Subscription.sol#L149) is a local variable never initialized

contracts/dao/Subscription.sol#L149


## unused-return
Impact: Medium
Confidence: Medium
 - [ ] ID-53
[Vote.updateAgentStats(uint256)](contracts/dao/Vote.sol#L582-L608) ignores return value by [(cTime,aTime,None,agent,None,None) = IProperty(DAO_PROPERTY).getGovProposalInfo(_index,1)](contracts/dao/Vote.sol#L583)

contracts/dao/Vote.sol#L582-L608


 - [ ] ID-54
[VabbleFund.fundProcess(uint256)](contracts/dao/VabbleFund.sol#L241-L293) ignores return value by [(None,pApproveTime) = IVabbleDAO(VABBLE_DAO).getFilmProposalTime(_filmId)](contracts/dao/VabbleFund.sol#L250)

contracts/dao/VabbleFund.sol#L241-L293


 - [ ] ID-55
[VabbleFund.isRaisedFullAmount(uint256)](contracts/dao/VabbleFund.sol#L383-L392) ignores return value by [(raiseAmount,None,None,None) = IVabbleDAO(VABBLE_DAO).getFilmFund(_filmId)](contracts/dao/VabbleFund.sol#L386)

contracts/dao/VabbleFund.sol#L383-L392


 - [ ] ID-56
[VabbleFund.depositToFilm(uint256,uint256,uint256,address)](contracts/dao/VabbleFund.sol#L179-L221) ignores return value by [(None,fundPeriod,fundType,None) = IVabbleDAO(VABBLE_DAO).getFilmFund(_filmId)](contracts/dao/VabbleFund.sol#L195)

contracts/dao/VabbleFund.sol#L179-L221


 - [ ] ID-57
[VabbleFund.withdrawFunding(uint256)](contracts/dao/VabbleFund.sol#L312-L345) ignores return value by [(None,fundPeriod,None,None) = IVabbleDAO(VABBLE_DAO).getFilmFund(_filmId)](contracts/dao/VabbleFund.sol#L316)

contracts/dao/VabbleFund.sol#L312-L345


 - [ ] ID-58
[FactoryTierNFT.setTierInfo(uint256,uint256[],uint256[])](contracts/dao/FactoryTierNFT.sol#L168-L202) ignores return value by [(None,pApproveTime) = IVabbleDAO(VABBLE_DAO).getFilmProposalTime(_filmId)](contracts/dao/FactoryTierNFT.sol#L183)

contracts/dao/FactoryTierNFT.sol#L168-L202


 - [ ] ID-59
[Vote.updateProperty(uint256,uint256)](contracts/dao/Vote.sol#L436-L461) ignores return value by [(cTime,aTime,None,value,None,None) = IProperty(DAO_PROPERTY).getPropertyProposalInfo(_index,_flag)](contracts/dao/Vote.sol#L437-L438)

contracts/dao/Vote.sol#L436-L461


 - [ ] ID-60
[Vote.disputeToAgent(uint256,bool)](contracts/dao/Vote.sol#L620-L636) ignores return value by [(None,aTime,None,agent,None,stats) = IProperty(DAO_PROPERTY).getGovProposalInfo(_index,1)](contracts/dao/Vote.sol#L621)

contracts/dao/Vote.sol#L620-L636


 - [ ] ID-61
[VabbleFund.depositToFilm(uint256,uint256,uint256,address)](contracts/dao/VabbleFund.sol#L179-L221) ignores return value by [(None,pApproveTime) = IVabbleDAO(VABBLE_DAO).getFilmProposalTime(_filmId)](contracts/dao/VabbleFund.sol#L196)

contracts/dao/VabbleFund.sol#L179-L221


 - [ ] ID-62
[Vote.__approveFilm(uint256)](contracts/dao/Vote.sol#L882-L909) ignores return value by [(None,None,fundType,None) = IVabbleDAO(VABBLE_DAO).getFilmFund(_filmId)](contracts/dao/Vote.sol#L891)

contracts/dao/Vote.sol#L882-L909


 - [ ] ID-63
[Vote.voteToAgent(uint256,uint256)](contracts/dao/Vote.sol#L543-L572) ignores return value by [(cTime,None,pID,agent,creator,None) = IProperty(DAO_PROPERTY).getGovProposalInfo(_index,1)](contracts/dao/Vote.sol#L544-L545)

contracts/dao/Vote.sol#L543-L572


 - [ ] ID-64
[VabbleDAO.allocateToPool(address[],uint256[],uint256)](contracts/dao/VabbleDAO.sol#L539-L574) ignores return value by [IStakingPool(STAKING_POOL).sendVAB(_users,OWNABLE,_amounts)](contracts/dao/VabbleDAO.sol#L554)

contracts/dao/VabbleDAO.sol#L539-L574


 - [ ] ID-65
[FactoryTierNFT.setTierInfo(uint256,uint256[],uint256[])](contracts/dao/FactoryTierNFT.sol#L168-L202) ignores return value by [(raiseAmount,fundPeriod,fundType,None) = IVabbleDAO(VABBLE_DAO).getFilmFund(_filmId)](contracts/dao/FactoryTierNFT.sol#L182)

contracts/dao/FactoryTierNFT.sol#L168-L202


 - [ ] ID-66
[Vote.replaceAuditor(uint256)](contracts/dao/Vote.sol#L645-L662) ignores return value by [(None,aTime,None,agent,None,stats) = IProperty(DAO_PROPERTY).getGovProposalInfo(_index,1)](contracts/dao/Vote.sol#L646)

contracts/dao/Vote.sol#L645-L662


 - [ ] ID-67
[Vote.addFilmBoard(uint256)](contracts/dao/Vote.sol#L510-L535) ignores return value by [(cTime,aTime,None,member,None,None) = IProperty(DAO_PROPERTY).getGovProposalInfo(_index,2)](contracts/dao/Vote.sol#L511)

contracts/dao/Vote.sol#L510-L535


 - [ ] ID-68
[Vote.voteToFilmBoard(uint256,uint256)](contracts/dao/Vote.sol#L469-L501) ignores return value by [(cTime,None,pID,member,creator,None) = IProperty(DAO_PROPERTY).getGovProposalInfo(_index,2)](contracts/dao/Vote.sol#L470-L471)

contracts/dao/Vote.sol#L469-L501


 - [ ] ID-69
[Vote.voteToProperty(uint256,uint256,uint256)](contracts/dao/Vote.sol#L375-L406) ignores return value by [(cTime,None,pID,value,creator,None) = IProperty(DAO_PROPERTY).getPropertyProposalInfo(_index,_flag)](contracts/dao/Vote.sol#L376-L377)

contracts/dao/Vote.sol#L375-L406


 - [ ] ID-70
[Vote.voteToRewardAddress(uint256,uint256)](contracts/dao/Vote.sol#L670-L702) ignores return value by [(cTime,None,pID,member,creator,None) = IProperty(DAO_PROPERTY).getGovProposalInfo(_index,3)](contracts/dao/Vote.sol#L671-L672)

contracts/dao/Vote.sol#L670-L702


 - [ ] ID-71
[VabbleFund.withdrawFunding(uint256)](contracts/dao/VabbleFund.sol#L312-L345) ignores return value by [(None,pApproveTime) = IVabbleDAO(VABBLE_DAO).getFilmProposalTime(_filmId)](contracts/dao/VabbleFund.sol#L317)

contracts/dao/VabbleFund.sol#L312-L345


 - [ ] ID-72
[StakingPool.__calcProposalTimeIntervals(address)](contracts/dao/StakingPool.sol#L872-L911) ignores return value by [times_.sort()](contracts/dao/StakingPool.sol#L910)

contracts/dao/StakingPool.sol#L872-L911


 - [ ] ID-73
[VabbleFund.__depositToFilm(uint256,uint256,uint256,uint256,uint256,address)](contracts/dao/VabbleFund.sol#L482-L515) ignores return value by [(None,maxMintAmount,mintPrice,nft,None) = IFactoryFilmNFT(FILM_NFT).getMintInfo(_filmId)](contracts/dao/VabbleFund.sol#L502)

contracts/dao/VabbleFund.sol#L482-L515


 - [ ] ID-74
[Vote.__voteToFilm(uint256,uint256)](contracts/dao/Vote.sol#L828-L870) ignores return value by [(None,None,fundType,None) = IVabbleDAO(VABBLE_DAO).getFilmFund(_filmId)](contracts/dao/Vote.sol#L841)

contracts/dao/Vote.sol#L828-L870


 - [ ] ID-75
[FactoryFilmNFT.deployFilmNFTContract(uint256,string,string)](contracts/dao/FactoryFilmNFT.sol#L231-L257) ignores return value by [(None,None,fundType,None) = IVabbleDAO(VABBLE_DAO).getFilmFund(_filmId)](contracts/dao/FactoryFilmNFT.sol#L234)

contracts/dao/FactoryFilmNFT.sol#L231-L257


 - [ ] ID-76
[VabbleFund.fundProcess(uint256)](contracts/dao/VabbleFund.sol#L241-L293) ignores return value by [(None,fundPeriod,None,None) = IVabbleDAO(VABBLE_DAO).getFilmFund(_filmId)](contracts/dao/VabbleFund.sol#L249)

contracts/dao/VabbleFund.sol#L241-L293


 - [ ] ID-77
[Vote.__voteToFilm(uint256,uint256)](contracts/dao/Vote.sol#L828-L870) ignores return value by [(cTime,None) = IVabbleDAO(VABBLE_DAO).getFilmProposalTime(_filmId)](contracts/dao/Vote.sol#L836)

contracts/dao/Vote.sol#L828-L870


 - [ ] ID-78
[Vote.setDAORewardAddress(uint256)](contracts/dao/Vote.sol#L711-L739) ignores return value by [(cTime,aTime,None,member,None,None) = IProperty(DAO_PROPERTY).getGovProposalInfo(_index,3)](contracts/dao/Vote.sol#L712)

contracts/dao/Vote.sol#L711-L739


## shadowing-local
Impact: Low
Confidence: High
 - [ ] ID-79
[VabbleNFT.constructor(string,string,string,string,address)._name](contracts/dao/VabbleNFT.sol#L57) shadows:
	- [ERC721._name](node_modules/@openzeppelin/contracts/token/ERC721/ERC721.sol#L24) (state variable)

contracts/dao/VabbleNFT.sol#L57


 - [ ] ID-80
[VabbleNFT.constructor(string,string,string,string,address)._symbol](contracts/dao/VabbleNFT.sol#L58) shadows:
	- [ERC721._symbol](node_modules/@openzeppelin/contracts/token/ERC721/ERC721.sol#L27) (state variable)

contracts/dao/VabbleNFT.sol#L58


## events-access
Impact: Low
Confidence: Medium
 - [ ] ID-81
[Ownablee.setup(address,address,address)](contracts/dao/Ownablee.sol#L142-L151) should emit an event for: 
	- [VOTE = _vote](contracts/dao/Ownablee.sol#L146) 
	- [VABBLE_DAO = _dao](contracts/dao/Ownablee.sol#L148) 
	- [STAKING_POOL = _stakingPool](contracts/dao/Ownablee.sol#L150) 

contracts/dao/Ownablee.sol#L142-L151


 - [ ] ID-82
[Ownablee.replaceAuditor(address)](contracts/dao/Ownablee.sol#L168-L171) should emit an event for: 
	- [auditor = _newAuditor](contracts/dao/Ownablee.sol#L170) 

contracts/dao/Ownablee.sol#L168-L171


 - [ ] ID-83
[Vote.initialize(address,address,address,address)](contracts/dao/Vote.sol#L326-L345) should emit an event for: 
	- [STAKING_POOL = _stakingPool](contracts/dao/Vote.sol#L340) 

contracts/dao/Vote.sol#L326-L345


 - [ ] ID-84
[Ownablee.transferAuditor(address)](contracts/dao/Ownablee.sol#L157-L161) should emit an event for: 
	- [auditor = _newAuditor](contracts/dao/Ownablee.sol#L160) 

contracts/dao/Ownablee.sol#L157-L161


 - [ ] ID-85
[StakingPool.initialize(address,address,address)](contracts/dao/StakingPool.sol#L302-L310) should emit an event for: 
	- [VABBLE_DAO = _vabbleDAO](contracts/dao/StakingPool.sol#L305) 
	- [VOTE = _vote](contracts/dao/StakingPool.sol#L309) 

contracts/dao/StakingPool.sol#L302-L310


## missing-zero-check
Impact: Low
Confidence: Medium
 - [ ] ID-86
[DeployerScript.deployForLocalTesting(address,address,bool)._auditor](scripts/foundry/01_Deploy.s.sol#L85) lacks a zero-check on :
		- [auditor = _auditor](scripts/foundry/01_Deploy.s.sol#L101)

scripts/foundry/01_Deploy.s.sol#L85


 - [ ] ID-87
[VabbleDAO.constructor(address,address,address,address,address,address)._ownable](contracts/dao/VabbleDAO.sol#L273) lacks a zero-check on :
		- [OWNABLE = _ownable](contracts/dao/VabbleDAO.sol#L280)

contracts/dao/VabbleDAO.sol#L273


 - [ ] ID-88
[DeployerScript.deployForLocalTesting(address,address,bool)._vabWallet](scripts/foundry/01_Deploy.s.sol#L84) lacks a zero-check on :
		- [vabbleWallet = _vabWallet](scripts/foundry/01_Deploy.s.sol#L102)

scripts/foundry/01_Deploy.s.sol#L84


 - [ ] ID-89
[VabbleDAO.constructor(address,address,address,address,address,address)._property](contracts/dao/VabbleDAO.sol#L277) lacks a zero-check on :
		- [DAO_PROPERTY = _property](contracts/dao/VabbleDAO.sol#L284)

contracts/dao/VabbleDAO.sol#L277


 - [ ] ID-90
[VabbleDAO.constructor(address,address,address,address,address,address)._uniHelper](contracts/dao/VabbleDAO.sol#L274) lacks a zero-check on :
		- [UNI_HELPER = _uniHelper](contracts/dao/VabbleDAO.sol#L281)

contracts/dao/VabbleDAO.sol#L274


 - [ ] ID-91
[VabbleDAO.constructor(address,address,address,address,address,address)._vabbleFund](contracts/dao/VabbleDAO.sol#L278) lacks a zero-check on :
		- [VABBLE_FUND = _vabbleFund](contracts/dao/VabbleDAO.sol#L285)

contracts/dao/VabbleDAO.sol#L278


 - [ ] ID-92
[VabbleDAO.constructor(address,address,address,address,address,address)._vote](contracts/dao/VabbleDAO.sol#L275) lacks a zero-check on :
		- [VOTE = _vote](contracts/dao/VabbleDAO.sol#L282)

contracts/dao/VabbleDAO.sol#L275


 - [ ] ID-93
[VabbleDAO.constructor(address,address,address,address,address,address)._staking](contracts/dao/VabbleDAO.sol#L276) lacks a zero-check on :
		- [STAKING_POOL = _staking](contracts/dao/VabbleDAO.sol#L283)

contracts/dao/VabbleDAO.sol#L276


 - [ ] ID-94
[VabbleNFT.constructor(string,string,string,string,address)._factory](contracts/dao/VabbleNFT.sol#L59) lacks a zero-check on :
		- [FACTORY = _factory](contracts/dao/VabbleNFT.sol#L65)

contracts/dao/VabbleNFT.sol#L59


## calls-loop
Impact: Low
Confidence: Medium
 - [ ] ID-95
[VabbleFund.withdrawFunding(uint256)](contracts/dao/VabbleFund.sol#L312-L345) has external calls inside a loop: [IERC20(assetArr[i].token).balanceOf(address(this)) >= assetArr[i].amount](contracts/dao/VabbleFund.sol#L332)

contracts/dao/VabbleFund.sol#L312-L345


 - [ ] ID-96
[VabbleFund.__getExpectedUsdcAmount(address,uint256)](contracts/dao/VabbleFund.sol#L452-L457) has external calls inside a loop: [amount_ = IUniHelper(UNI_HELPER).expectedAmount(_tokenAmount,_token,IOwnablee(OWNABLE).USDC_TOKEN())](contracts/dao/VabbleFund.sol#L455)

contracts/dao/VabbleFund.sol#L452-L457


 - [ ] ID-97
[Vote.__voteToFilm(uint256,uint256)](contracts/dao/Vote.sol#L828-L870) has external calls inside a loop: [(cTime,None) = IVabbleDAO(VABBLE_DAO).getFilmProposalTime(_filmId)](contracts/dao/Vote.sol#L836)

contracts/dao/Vote.sol#L828-L870


 - [ ] ID-98
[Vote.__approveFilm(uint256)](contracts/dao/Vote.sol#L882-L909) has external calls inside a loop: [IVabbleDAO(VABBLE_DAO).approveFilmByVote(_filmId,reason)](contracts/dao/Vote.sol#L906)

contracts/dao/Vote.sol#L882-L909


 - [ ] ID-99
[Vote.__voteToFilm(uint256,uint256)](contracts/dao/Vote.sol#L828-L870) has external calls inside a loop: [require(bool,string)(msg.sender != IVabbleDAO(VABBLE_DAO).getFilmOwner(_filmId),vF: film owner)](contracts/dao/Vote.sol#L829)

contracts/dao/Vote.sol#L828-L870


 - [ ] ID-100
[Vote.__approveFilm(uint256)](contracts/dao/Vote.sol#L882-L909) has external calls inside a loop: [(pCreateTime,pApproveTime) = IVabbleDAO(VABBLE_DAO).getFilmProposalTime(_filmId)](contracts/dao/Vote.sol#L887)

contracts/dao/Vote.sol#L882-L909


 - [ ] ID-101
[StakingPool.__calcRewards(address,uint256,uint256)](contracts/dao/StakingPool.sol#L1205-L1220) has external calls inside a loop: [IProperty(DAO_PROPERTY).checkGovWhitelist(2,_user) == 2](contracts/dao/StakingPool.sol#L1217)

contracts/dao/StakingPool.sol#L1205-L1220


 - [ ] ID-102
[FactorySubNFT.__mint(address,address,uint256,uint256)](contracts/dao/FactorySubNFT.sol#L414-L438) has external calls inside a loop: [require(bool,string)(IOwnablee(OWNABLE).isDepositAsset(_token),mint: not allowed asset)](contracts/dao/FactorySubNFT.sol#L416)

contracts/dao/FactorySubNFT.sol#L414-L438


 - [ ] ID-103
[StakingPool.__rewardPercent(uint256)](contracts/dao/StakingPool.sol#L1229-L1232) has external calls inside a loop: [percent_ = IProperty(DAO_PROPERTY).rewardRate() * poolPercent / 1e10](contracts/dao/StakingPool.sol#L1231)

contracts/dao/StakingPool.sol#L1229-L1232


 - [ ] ID-104
[VabbleDAO.__setFinalFilm(uint256,uint256)](contracts/dao/VabbleDAO.sol#L990-L1017) has external calls inside a loop: [! IVabbleFund(VABBLE_FUND).isRaisedFullAmount(_filmId)](contracts/dao/VabbleDAO.sol#L1004)

contracts/dao/VabbleDAO.sol#L990-L1017


 - [ ] ID-105
[VabbleDAO.__setFinalAmountToHelpers(uint256,uint256,uint256)](contracts/dao/VabbleDAO.sol#L1043-L1058) has external calls inside a loop: [investors = IVabbleFund(VABBLE_FUND).getFilmInvestorList(_filmId)](contracts/dao/VabbleDAO.sol#L1046)

contracts/dao/VabbleDAO.sol#L1043-L1058


 - [ ] ID-106
[VabbleFund.fundProcess(uint256)](contracts/dao/VabbleFund.sol#L241-L293) has external calls inside a loop: [Helper.safeApprove(assetArr[i].token,UNI_HELPER,IERC20(assetArr[i].token).totalSupply())](contracts/dao/VabbleFund.sol#L271)

contracts/dao/VabbleFund.sol#L241-L293


 - [ ] ID-107
[Vote.__voteToFilm(uint256,uint256)](contracts/dao/Vote.sol#L828-L870) has external calls inside a loop: [stakeAmount += stakeAmount * IProperty(DAO_PROPERTY).boardVoteWeight() / 1e10](contracts/dao/Vote.sol#L846)

contracts/dao/Vote.sol#L828-L870


 - [ ] ID-108
[Vote.__voteToFilm(uint256,uint256)](contracts/dao/Vote.sol#L828-L870) has external calls inside a loop: [stakeAmount = IStakingPool(STAKING_POOL).getStakeAmount(msg.sender)](contracts/dao/Vote.sol#L840)

contracts/dao/Vote.sol#L828-L870


 - [ ] ID-109
[Helper.safeTransfer(address,address,uint256)](contracts/libraries/Helper.sol#L36-L44) has external calls inside a loop: [(success,data) = token.call(abi.encodeWithSelector(0xa9059cbb,to,value))](contracts/libraries/Helper.sol#L42)

contracts/libraries/Helper.sol#L36-L44


 - [ ] ID-110
[Vote.__voteToFilm(uint256,uint256)](contracts/dao/Vote.sol#L828-L870) has external calls inside a loop: [status = IVabbleDAO(VABBLE_DAO).getFilmStatus(_filmId)](contracts/dao/Vote.sol#L833)

contracts/dao/Vote.sol#L828-L870


 - [ ] ID-111
[StakingPool.__calcRewards(address,uint256,uint256)](contracts/dao/StakingPool.sol#L1205-L1220) has external calls inside a loop: [amount_ += amount_ * IProperty(DAO_PROPERTY).boardRewardRate() / 1e10](contracts/dao/StakingPool.sol#L1218)

contracts/dao/StakingPool.sol#L1205-L1220


 - [ ] ID-112
[Vote.__approveFilm(uint256)](contracts/dao/Vote.sol#L882-L909) has external calls inside a loop: [totalVoteCount >= IStakingPool(STAKING_POOL).getLimitCount() && fv.stakeAmount_1 > fv.stakeAmount_2](contracts/dao/Vote.sol#L894)

contracts/dao/Vote.sol#L882-L909


 - [ ] ID-113
[Vote.__voteToFilm(uint256,uint256)](contracts/dao/Vote.sol#L828-L870) has external calls inside a loop: [require(bool,string)(__isVotePeriod(IProperty(DAO_PROPERTY).filmVotePeriod(),cTime),vF: elapsed period)](contracts/dao/Vote.sol#L838)

contracts/dao/Vote.sol#L828-L870


 - [ ] ID-114
[Vote.__approveFilm(uint256)](contracts/dao/Vote.sol#L882-L909) has external calls inside a loop: [totalVoteCount < IStakingPool(STAKING_POOL).getLimitCount()](contracts/dao/Vote.sol#L897)

contracts/dao/Vote.sol#L882-L909


 - [ ] ID-115
[Vote.__voteToFilm(uint256,uint256)](contracts/dao/Vote.sol#L828-L870) has external calls inside a loop: [(None,None,fundType,None) = IVabbleDAO(VABBLE_DAO).getFilmFund(_filmId)](contracts/dao/Vote.sol#L841)

contracts/dao/Vote.sol#L828-L870


 - [ ] ID-116
[VabbleFund.fundProcess(uint256)](contracts/dao/VabbleFund.sol#L241-L293) has external calls inside a loop: [rewardAmount = assetArr[i].amount * IProperty(DAO_PROPERTY).fundFeePercent() / 1e10](contracts/dao/VabbleFund.sol#L263)

contracts/dao/VabbleFund.sol#L241-L293


 - [ ] ID-117
[FactoryFilmNFT.__mint(uint256)](contracts/dao/FactoryFilmNFT.sol#L387-L394) has external calls inside a loop: [tokenId = t.mintTo(msg.sender)](contracts/dao/FactoryFilmNFT.sol#L389)

contracts/dao/FactoryFilmNFT.sol#L387-L394


 - [ ] ID-118
[Vote.__voteToFilm(uint256,uint256)](contracts/dao/Vote.sol#L828-L870) has external calls inside a loop: [IStakingPool(STAKING_POOL).addVotedData(msg.sender,block.timestamp,proposalFilmIds[_filmId])](contracts/dao/Vote.sol#L867)

contracts/dao/Vote.sol#L828-L870


 - [ ] ID-119
[VabbleDAO.__setFinalAmountToHelpers(uint256,uint256,uint256)](contracts/dao/VabbleDAO.sol#L1043-L1058) has external calls inside a loop: [raisedAmount = IVabbleFund(VABBLE_FUND).getTotalFundAmountPerFilm(_filmId)](contracts/dao/VabbleDAO.sol#L1044)

contracts/dao/VabbleDAO.sol#L1043-L1058


 - [ ] ID-120
[VabbleFund.fundProcess(uint256)](contracts/dao/VabbleFund.sol#L241-L293) has external calls inside a loop: [IERC20(assetArr[i].token).allowance(address(this),UNI_HELPER) == 0](contracts/dao/VabbleFund.sol#L270)

contracts/dao/VabbleFund.sol#L241-L293


 - [ ] ID-121
[FactorySubNFT.getTotalSupply()](contracts/dao/FactorySubNFT.sol#L398-L400) has external calls inside a loop: [subNFTContract.totalSupply()](contracts/dao/FactorySubNFT.sol#L399)

contracts/dao/FactorySubNFT.sol#L398-L400


 - [ ] ID-122
[FactorySubNFT.__mint(address,address,uint256,uint256)](contracts/dao/FactorySubNFT.sol#L414-L438) has external calls inside a loop: [_token != IOwnablee(OWNABLE).PAYOUT_TOKEN() && _token != address(0)](contracts/dao/FactorySubNFT.sol#L415)

contracts/dao/FactorySubNFT.sol#L414-L438


 - [ ] ID-123
[VabbleDAO.__setFinalAmountToHelpers(uint256,uint256,uint256)](contracts/dao/VabbleDAO.sol#L1043-L1058) has external calls inside a loop: [userAmount = IVabbleFund(VABBLE_FUND).getUserFundAmountPerFilm(investors[i],_filmId)](contracts/dao/VabbleDAO.sol#L1048)

contracts/dao/VabbleDAO.sol#L1043-L1058


 - [ ] ID-124
[Vote.__approveFilm(uint256)](contracts/dao/Vote.sol#L882-L909) has external calls inside a loop: [(None,None,fundType,None) = IVabbleDAO(VABBLE_DAO).getFilmFund(_filmId)](contracts/dao/Vote.sol#L891)

contracts/dao/Vote.sol#L882-L909


 - [ ] ID-125
[StakingPool.__transferVABWithdraw(address)](contracts/dao/StakingPool.sol#L1177-L1190) has external calls inside a loop: [Helper.safeTransfer(IOwnablee(OWNABLE).PAYOUT_TOKEN(),_to,payAmount)](contracts/dao/StakingPool.sol#L1183)

contracts/dao/StakingPool.sol#L1177-L1190


 - [ ] ID-126
[FactorySubNFT.__mint(address,address,uint256,uint256)](contracts/dao/FactorySubNFT.sol#L414-L438) has external calls inside a loop: [tokenId = subNFTContract.mintTo(receiver)](contracts/dao/FactorySubNFT.sol#L426)

contracts/dao/FactorySubNFT.sol#L414-L438


 - [ ] ID-127
[Vote.__approveFilm(uint256)](contracts/dao/Vote.sol#L882-L909) has external calls inside a loop: [require(bool,string)(! __isVotePeriod(IProperty(DAO_PROPERTY).filmVotePeriod(),pCreateTime),aF: vote period yet)](contracts/dao/Vote.sol#L888)

contracts/dao/Vote.sol#L882-L909


 - [ ] ID-128
[Vote.__voteToFilm(uint256,uint256)](contracts/dao/Vote.sol#L828-L870) has external calls inside a loop: [IProperty(DAO_PROPERTY).checkGovWhitelist(2,msg.sender) == 2](contracts/dao/Vote.sol#L845)

contracts/dao/Vote.sol#L828-L870


 - [ ] ID-129
[VabbleFund.__getExpectedUsdcAmount(address,uint256)](contracts/dao/VabbleFund.sol#L452-L457) has external calls inside a loop: [_token != IOwnablee(OWNABLE).USDC_TOKEN()](contracts/dao/VabbleFund.sol#L454)

contracts/dao/VabbleFund.sol#L452-L457


 - [ ] ID-130
[VabbleFund.fundProcess(uint256)](contracts/dao/VabbleFund.sol#L241-L293) has external calls inside a loop: [rewardSumAmount += IUniHelper(UNI_HELPER).swapAsset(swapArgs)](contracts/dao/VabbleFund.sol#L275)

contracts/dao/VabbleFund.sol#L241-L293


## reentrancy-benign
Impact: Low
Confidence: Medium
 - [ ] ID-131
Reentrancy in [VabbleDAO.proposalFilmCreate(uint256,uint256,address)](contracts/dao/VabbleDAO.sol#L302-L324):
	External calls:
	- [__paidFee(_feeToken,_noVote)](contracts/dao/VabbleDAO.sol#L309)
		- [(success,None) = to.call{value: value}(new bytes(0))](contracts/libraries/Helper.sol#L58)
		- [(success,data) = token.call(abi.encodeWithSelector(0x095ea7b3,to,value))](contracts/libraries/Helper.sol#L32)
		- [(success,data) = token.call(abi.encodeWithSelector(0x23b872dd,from,to,value))](contracts/libraries/Helper.sol#L53)
		- [Helper.safeTransferETH(msg.sender,msg.value - expectTokenAmount)](contracts/dao/VabbleDAO.sol#L959)
		- [Helper.safeTransferETH(UNI_HELPER,expectTokenAmount)](contracts/dao/VabbleDAO.sol#L962)
		- [Helper.safeTransferFrom(_dToken,msg.sender,address(this),expectTokenAmount)](contracts/dao/VabbleDAO.sol#L964)
		- [Helper.safeApprove(_dToken,UNI_HELPER,IERC20(_dToken).totalSupply())](contracts/dao/VabbleDAO.sol#L966)
		- [vabAmount = IUniHelper(UNI_HELPER).swapAsset(swapArgs)](contracts/dao/VabbleDAO.sol#L972)
		- [Helper.safeApprove(vabToken,STAKING_POOL,IERC20(vabToken).totalSupply())](contracts/dao/VabbleDAO.sol#L975)
		- [IStakingPool(STAKING_POOL).addRewardToPool(vabAmount)](contracts/dao/VabbleDAO.sol#L977)
	External calls sending eth:
	- [__paidFee(_feeToken,_noVote)](contracts/dao/VabbleDAO.sol#L309)
		- [(success,None) = to.call{value: value}(new bytes(0))](contracts/libraries/Helper.sol#L58)
	State variables written after the call(s):
	- [fInfo.fundType = _fundType](contracts/dao/VabbleDAO.sol#L315)
	- [fInfo.noVote = _noVote](contracts/dao/VabbleDAO.sol#L316)
	- [fInfo.studio = msg.sender](contracts/dao/VabbleDAO.sol#L317)
	- [fInfo.status = Helper.Status.LISTED](contracts/dao/VabbleDAO.sol#L318)
	- [totalFilmIds[1].push(filmId)](contracts/dao/VabbleDAO.sol#L320)
	- [userFilmIds[msg.sender][1].push(filmId)](contracts/dao/VabbleDAO.sol#L321)

contracts/dao/VabbleDAO.sol#L302-L324


 - [ ] ID-132
Reentrancy in [VabbleFund.depositToFilm(uint256,uint256,uint256,address)](contracts/dao/VabbleFund.sol#L179-L221):
	External calls:
	- [Helper.safeTransferETH(msg.sender,msg.value - tokenAmount)](contracts/dao/VabbleFund.sol#L213)
	- [Helper.safeTransferFrom(_token,msg.sender,address(this),tokenAmount)](contracts/dao/VabbleFund.sol#L215)
	State variables written after the call(s):
	- [__assignToken(_filmId,_token,tokenAmount)](contracts/dao/VabbleFund.sol#L218)
		- [assetPerFilm[_filmId][i_scope_0].amount += _amount](contracts/dao/VabbleFund.sol#L545)
		- [assetPerFilm[_filmId].push(Asset({token:_token,amount:_amount}))](contracts/dao/VabbleFund.sol#L550)

contracts/dao/VabbleFund.sol#L179-L221


 - [ ] ID-133
Reentrancy in [DeployerScript.deployForLocalTesting(address,address,bool)](scripts/foundry/01_Deploy.s.sol#L83-L104):
	External calls:
	- [_getConfig()](scripts/foundry/01_Deploy.s.sol#L97)
		- [activeConfig = helperConfig.getActiveNetworkConfig()](scripts/foundry/01_Deploy.s.sol#L116)
	- [_initializeAndSetupContracts()](scripts/foundry/01_Deploy.s.sol#L99)
		- [_factoryFilmNFT.initialize(address(_vabbleDAO),address(_vabbleFund))](scripts/foundry/01_Deploy.s.sol#L186)
		- [_stakingPool.initialize(address(_vabbleDAO),address(_property),address(_vote))](scripts/foundry/01_Deploy.s.sol#L187)
		- [_vote.initialize(address(_vabbleDAO),address(_stakingPool),address(_property),address(_uniHelper))](scripts/foundry/01_Deploy.s.sol#L188)
		- [_vabbleFund.initialize(address(_vabbleDAO))](scripts/foundry/01_Deploy.s.sol#L189)
		- [_uniHelper.setWhiteList(address(_vabbleDAO),address(_vabbleFund),address(_subscription),address(_factoryFilmNFT),address(_factorySubNFT))](scripts/foundry/01_Deploy.s.sol#L190-L196)
		- [_ownablee.setup(address(_vote),address(_vabbleDAO),address(_stakingPool))](scripts/foundry/01_Deploy.s.sol#L197)
		- [_ownablee.addDepositAsset(depositAssets)](scripts/foundry/01_Deploy.s.sol#L198)
	State variables written after the call(s):
	- [auditor = _auditor](scripts/foundry/01_Deploy.s.sol#L101)
	- [vabbleWallet = _vabWallet](scripts/foundry/01_Deploy.s.sol#L102)

scripts/foundry/01_Deploy.s.sol#L83-L104


 - [ ] ID-134
Reentrancy in [Property.updateGovProposal(uint256,uint256,uint256)](contracts/dao/Property.sol#L927-L962):
	External calls:
	- [IStakingPool(STAKING_POOL).calcMigrationVAB()](contracts/dao/Property.sol#L956)
	State variables written after the call(s):
	- [filmBoardMembers.push(member)](contracts/dao/Property.sol#L960)

contracts/dao/Property.sol#L927-L962


 - [ ] ID-135
Reentrancy in [VabbleFund.fundProcess(uint256)](contracts/dao/VabbleFund.sol#L241-L293):
	External calls:
	- [Helper.safeTransferETH(UNI_HELPER,rewardAmount)](contracts/dao/VabbleFund.sol#L268)
	- [Helper.safeApprove(assetArr[i].token,UNI_HELPER,IERC20(assetArr[i].token).totalSupply())](contracts/dao/VabbleFund.sol#L271)
	- [rewardSumAmount += IUniHelper(UNI_HELPER).swapAsset(swapArgs)](contracts/dao/VabbleFund.sol#L275)
	- [Helper.safeTransferAsset(assetArr[i].token,msg.sender,(assetArr[i].amount - rewardAmount))](contracts/dao/VabbleFund.sol#L278)
	- [Helper.safeApprove(vabToken,STAKING_POOL,IERC20(vabToken).totalSupply())](contracts/dao/VabbleFund.sol#L283)
	- [IStakingPool(STAKING_POOL).addRewardToPool(rewardSumAmount)](contracts/dao/VabbleFund.sol#L286)
	State variables written after the call(s):
	- [fundProcessedFilmIds.push(_filmId)](contracts/dao/VabbleFund.sol#L289)

contracts/dao/VabbleFund.sol#L241-L293


 - [ ] ID-136
Reentrancy in [Property.proposalRewardFund(address,string,string)](contracts/dao/Property.sol#L845-L876):
	External calls:
	- [__paidFee(10 * proposalFeeAmount)](contracts/dao/Property.sol#L857)
		- [(success,data) = token.call(abi.encodeWithSelector(0x095ea7b3,to,value))](contracts/libraries/Helper.sol#L32)
		- [(success,data) = token.call(abi.encodeWithSelector(0x23b872dd,from,to,value))](contracts/libraries/Helper.sol#L53)
		- [Helper.safeTransferFrom(vabToken,msg.sender,address(this),expectVABAmount)](contracts/dao/Property.sol#L1212)
		- [Helper.safeApprove(vabToken,STAKING_POOL,IERC20(vabToken).totalSupply())](contracts/dao/Property.sol#L1214)
		- [IStakingPool(STAKING_POOL).addRewardToPool(expectVABAmount)](contracts/dao/Property.sol#L1216)
	- [rp.proposalID = IStakingPool(STAKING_POOL).addProposalData(msg.sender,block.timestamp,rewardVotePeriod)](contracts/dao/Property.sol#L867)
	State variables written after the call(s):
	- [allGovProposalInfo[3].push(_rewardAddress)](contracts/dao/Property.sol#L872)
	- [governanceProposalCount += 1](contracts/dao/Property.sol#L870)
	- [userGovProposalCount[msg.sender] += 1](contracts/dao/Property.sol#L871)

contracts/dao/Property.sol#L845-L876


 - [ ] ID-137
Reentrancy in [DeployerScript._getConfig()](scripts/foundry/01_Deploy.s.sol#L114-L129):
	External calls:
	- [activeConfig = helperConfig.getActiveNetworkConfig()](scripts/foundry/01_Deploy.s.sol#L116)
	State variables written after the call(s):
	- [auditor = activeConfig.auditor](scripts/foundry/01_Deploy.s.sol#L121)
	- [depositAssets = activeConfig.depositAssets](scripts/foundry/01_Deploy.s.sol#L128)
	- [discountPercents = activeConfig.discountPercents](scripts/foundry/01_Deploy.s.sol#L127)
	- [sushiSwapFactory = activeConfig.sushiSwapFactory](scripts/foundry/01_Deploy.s.sol#L125)
	- [sushiSwapRouter = activeConfig.sushiSwapRouter](scripts/foundry/01_Deploy.s.sol#L126)
	- [uniswapFactory = activeConfig.uniswapFactory](scripts/foundry/01_Deploy.s.sol#L123)
	- [uniswapRouter = activeConfig.uniswapRouter](scripts/foundry/01_Deploy.s.sol#L124)
	- [usdc = activeConfig.usdc](scripts/foundry/01_Deploy.s.sol#L118)
	- [usdt = activeConfig.usdt](scripts/foundry/01_Deploy.s.sol#L120)
	- [vab = activeConfig.vab](scripts/foundry/01_Deploy.s.sol#L119)
	- [vabbleWallet = activeConfig.vabbleWallet](scripts/foundry/01_Deploy.s.sol#L122)

scripts/foundry/01_Deploy.s.sol#L114-L129


 - [ ] ID-138
Reentrancy in [StakingPool.__withdrawReward(uint256)](contracts/dao/StakingPool.sol#L1105-L1119):
	External calls:
	- [Helper.safeTransfer(IOwnablee(OWNABLE).PAYOUT_TOKEN(),msg.sender,_amount)](contracts/dao/StakingPool.sol#L1106)
	State variables written after the call(s):
	- [__updateMinProposalIndex(msg.sender)](contracts/dao/StakingPool.sol#L1118)
		- [minProposalIndex[_user] = i](contracts/dao/StakingPool.sol#L1132)
	- [receivedRewardAmount[msg.sender] += _amount](contracts/dao/StakingPool.sol#L1109)
	- [stakeInfo[msg.sender].stakeTime = block.timestamp](contracts/dao/StakingPool.sol#L1112)
	- [stakeInfo[msg.sender].outstandingReward = 0](contracts/dao/StakingPool.sol#L1113)
	- [totalRewardAmount -= _amount](contracts/dao/StakingPool.sol#L1108)
	- [totalRewardIssuedAmount += _amount](contracts/dao/StakingPool.sol#L1110)

contracts/dao/StakingPool.sol#L1105-L1119


 - [ ] ID-139
Reentrancy in [Vote.updateAgentStats(uint256)](contracts/dao/Vote.sol#L582-L608):
	External calls:
	- [IProperty(DAO_PROPERTY).updateGovProposal(_index,1,1)](contracts/dao/Vote.sol#L593)
	State variables written after the call(s):
	- [govPassedVoteCount[1] += 1](contracts/dao/Vote.sol#L594)

contracts/dao/Vote.sol#L582-L608


 - [ ] ID-140
Reentrancy in [Vote.updateProperty(uint256,uint256)](contracts/dao/Vote.sol#L436-L461):
	External calls:
	- [IProperty(DAO_PROPERTY).updatePropertyProposal(_index,_flag,1)](contracts/dao/Vote.sol#L447)
	State variables written after the call(s):
	- [govPassedVoteCount[5] += 1](contracts/dao/Vote.sol#L448)

contracts/dao/Vote.sol#L436-L461


 - [ ] ID-141
Reentrancy in [Property.proposalFilmBoard(address,string,string)](contracts/dao/Property.sol#L885-L916):
	External calls:
	- [__paidFee(proposalFeeAmount)](contracts/dao/Property.sol#L897)
		- [(success,data) = token.call(abi.encodeWithSelector(0x095ea7b3,to,value))](contracts/libraries/Helper.sol#L32)
		- [(success,data) = token.call(abi.encodeWithSelector(0x23b872dd,from,to,value))](contracts/libraries/Helper.sol#L53)
		- [Helper.safeTransferFrom(vabToken,msg.sender,address(this),expectVABAmount)](contracts/dao/Property.sol#L1212)
		- [Helper.safeApprove(vabToken,STAKING_POOL,IERC20(vabToken).totalSupply())](contracts/dao/Property.sol#L1214)
		- [IStakingPool(STAKING_POOL).addRewardToPool(expectVABAmount)](contracts/dao/Property.sol#L1216)
	- [bp.proposalID = IStakingPool(STAKING_POOL).addProposalData(msg.sender,block.timestamp,boardVotePeriod)](contracts/dao/Property.sol#L907)
	State variables written after the call(s):
	- [allGovProposalInfo[2].push(_member)](contracts/dao/Property.sol#L912)
	- [governanceProposalCount += 1](contracts/dao/Property.sol#L910)
	- [userGovProposalCount[msg.sender] += 1](contracts/dao/Property.sol#L911)

contracts/dao/Property.sol#L885-L916


 - [ ] ID-142
Reentrancy in [VabbleDAO.allocateToPool(address[],uint256[],uint256)](contracts/dao/VabbleDAO.sol#L539-L574):
	External calls:
	- [IStakingPool(STAKING_POOL).sendVAB(_users,OWNABLE,_amounts)](contracts/dao/VabbleDAO.sol#L554)
	- [StudioPool += IStakingPool(STAKING_POOL).sendVAB(_users,address(this),_amounts)](contracts/dao/VabbleDAO.sol#L556)
	State variables written after the call(s):
	- [edgePoolUsers.push(_users[i])](contracts/dao/VabbleDAO.sol#L564)
	- [isEdgePoolUser[_users[i]] = true](contracts/dao/VabbleDAO.sol#L563)
	- [isStudioPoolUser[_users[i]] = true](contracts/dao/VabbleDAO.sol#L568)
	- [studioPoolUsers.push(_users[i])](contracts/dao/VabbleDAO.sol#L569)

contracts/dao/VabbleDAO.sol#L539-L574


 - [ ] ID-143
Reentrancy in [Vote.setDAORewardAddress(uint256)](contracts/dao/Vote.sol#L711-L739):
	External calls:
	- [IProperty(DAO_PROPERTY).updateGovProposal(_index,3,1)](contracts/dao/Vote.sol#L725)
	State variables written after the call(s):
	- [govPassedVoteCount[4] += 1](contracts/dao/Vote.sol#L726)

contracts/dao/Vote.sol#L711-L739


 - [ ] ID-144
Reentrancy in [Property.proposalFilmBoard(address,string,string)](contracts/dao/Property.sol#L885-L916):
	External calls:
	- [__paidFee(proposalFeeAmount)](contracts/dao/Property.sol#L897)
		- [(success,data) = token.call(abi.encodeWithSelector(0x095ea7b3,to,value))](contracts/libraries/Helper.sol#L32)
		- [(success,data) = token.call(abi.encodeWithSelector(0x23b872dd,from,to,value))](contracts/libraries/Helper.sol#L53)
		- [Helper.safeTransferFrom(vabToken,msg.sender,address(this),expectVABAmount)](contracts/dao/Property.sol#L1212)
		- [Helper.safeApprove(vabToken,STAKING_POOL,IERC20(vabToken).totalSupply())](contracts/dao/Property.sol#L1214)
		- [IStakingPool(STAKING_POOL).addRewardToPool(expectVABAmount)](contracts/dao/Property.sol#L1216)
	State variables written after the call(s):
	- [bp.title = _title](contracts/dao/Property.sol#L900)
	- [bp.description = _description](contracts/dao/Property.sol#L901)
	- [bp.createTime = block.timestamp](contracts/dao/Property.sol#L902)
	- [bp.value = _member](contracts/dao/Property.sol#L903)
	- [bp.creator = msg.sender](contracts/dao/Property.sol#L904)
	- [bp.status = Helper.Status.LISTED](contracts/dao/Property.sol#L905)

contracts/dao/Property.sol#L885-L916


 - [ ] ID-145
Reentrancy in [FactoryTierNFT.mintTierNft(uint256)](contracts/dao/FactoryTierNFT.sol#L242-L271):
	External calls:
	- [tokenId = t.mintTo(msg.sender)](contracts/dao/FactoryTierNFT.sol#L267)
	State variables written after the call(s):
	- [tierNFTTokenList[_filmId][tier].push(tokenId)](contracts/dao/FactoryTierNFT.sol#L268)

contracts/dao/FactoryTierNFT.sol#L242-L271


 - [ ] ID-146
Reentrancy in [Subscription.activeSubscription(address,uint256)](contracts/dao/Subscription.sol#L126-L200):
	External calls:
	- [Helper.safeTransferETH(msg.sender,msg.value - expectAmount)](contracts/dao/Subscription.sol#L137)
	- [Helper.safeTransferFrom(_token,msg.sender,address(this),expectAmount)](contracts/dao/Subscription.sol#L141)
	- [Helper.safeApprove(_token,UNI_HELPER,IERC20(_token).totalSupply())](contracts/dao/Subscription.sol#L145)
	- [usdcAmount = IUniHelper(UNI_HELPER).swapAsset(swapArgs)](contracts/dao/Subscription.sol#L156)
	- [Helper.safeTransfer(usdcToken,IOwnablee(OWNABLE).VAB_WALLET(),usdcAmount)](contracts/dao/Subscription.sol#L157)
	- [Helper.safeTransferETH(UNI_HELPER,amount60)](contracts/dao/Subscription.sol#L164)
	- [vabAmount = IUniHelper(UNI_HELPER).swapAsset(swapArgs_scope_0)](contracts/dao/Subscription.sol#L167)
	- [Helper.safeTransfer(vabToken,IOwnablee(OWNABLE).VAB_WALLET(),vabAmount)](contracts/dao/Subscription.sol#L169)
	- [Helper.safeTransferETH(UNI_HELPER,expectAmount - amount60)](contracts/dao/Subscription.sol#L177)
	- [usdcAmount = IUniHelper(UNI_HELPER).swapAsset(swapArgs1)](contracts/dao/Subscription.sol#L180)
	- [Helper.safeTransfer(usdcToken,IOwnablee(OWNABLE).VAB_WALLET(),usdcAmount)](contracts/dao/Subscription.sol#L184)
	State variables written after the call(s):
	- [subscription.period = oldPeriod + _period](contracts/dao/Subscription.sol#L191)
	- [subscription.expireTime = subscription.activeTime + PERIOD_UNIT * (oldPeriod + _period)](contracts/dao/Subscription.sol#L192)
	- [subscription.activeTime = block.timestamp](contracts/dao/Subscription.sol#L194)
	- [subscription.period = _period](contracts/dao/Subscription.sol#L195)
	- [subscription.expireTime = block.timestamp + PERIOD_UNIT * _period](contracts/dao/Subscription.sol#L196)

contracts/dao/Subscription.sol#L126-L200


 - [ ] ID-147
Reentrancy in [DeployerScript.deployForMainOrTestnet()](scripts/foundry/01_Deploy.s.sol#L67-L71):
	External calls:
	- [_getConfig()](scripts/foundry/01_Deploy.s.sol#L68)
		- [activeConfig = helperConfig.getActiveNetworkConfig()](scripts/foundry/01_Deploy.s.sol#L116)
	State variables written after the call(s):
	- [_deployAllContracts(vabbleWallet,auditor)](scripts/foundry/01_Deploy.s.sol#L69)
		- [contracts.factoryTierNFT = new FactoryTierNFT(_ownablee,_vabbleDAO,_vabbleFund)](scripts/foundry/01_Deploy.s.sol#L268)
		- [contracts.vote = new Vote(_ownablee)](scripts/foundry/01_Deploy.s.sol#L227)
		- [contracts.vabbleFund = new VabbleFund(_ownablee,_uniHelper,_stakingPool,_property,_factoryFilmNFT)](scripts/foundry/01_Deploy.s.sol#L251)
		- [contracts.factoryFilmNFT = new FactoryFilmNFT(_ownablee)](scripts/foundry/01_Deploy.s.sol#L235)
		- [contracts.vabbleDAO = new VabbleDAO(_ownablee,_uniHelper,_vote,_stakingPool,_property,_vabbleFund)](scripts/foundry/01_Deploy.s.sol#L264)
		- [contracts.property = new Property(_ownablee,_uniHelper,_vote,_stakingPool)](scripts/foundry/01_Deploy.s.sol#L231)
		- [contracts.uniHelper = new UniHelper(_uniswapFactory,_uniswapRouter,_sushiSwapFactory,_sushiSwapRouter,_ownablee)](scripts/foundry/01_Deploy.s.sol#L218-L219)
		- [contracts.subscription = new Subscription(_ownablee,_uniHelper,_property,discountPercents)](scripts/foundry/01_Deploy.s.sol#L272)
		- [contracts.ownablee = new Ownablee(_vabWallet,_vab,_usdc,_auditor)](scripts/foundry/01_Deploy.s.sol#L206)
		- [contracts.stakingPool = new StakingPool(_ownablee)](scripts/foundry/01_Deploy.s.sol#L223)
		- [contracts.factorySubNFT = new FactorySubNFT(_ownablee,_uniHelper)](scripts/foundry/01_Deploy.s.sol#L239)

scripts/foundry/01_Deploy.s.sol#L67-L71


 - [ ] ID-148
Reentrancy in [Property.proposalProperty(uint256,uint256,string,string)](contracts/dao/Property.sol#L580-L698):
	External calls:
	- [__paidFee(proposalFeeAmount)](contracts/dao/Property.sol#L594)
		- [(success,data) = token.call(abi.encodeWithSelector(0x095ea7b3,to,value))](contracts/libraries/Helper.sol#L32)
		- [(success,data) = token.call(abi.encodeWithSelector(0x23b872dd,from,to,value))](contracts/libraries/Helper.sol#L53)
		- [Helper.safeTransferFrom(vabToken,msg.sender,address(this),expectVABAmount)](contracts/dao/Property.sol#L1212)
		- [Helper.safeApprove(vabToken,STAKING_POOL,IERC20(vabToken).totalSupply())](contracts/dao/Property.sol#L1214)
		- [IStakingPool(STAKING_POOL).addRewardToPool(expectVABAmount)](contracts/dao/Property.sol#L1216)
	State variables written after the call(s):
	- [agentVotePeriodList.push(_property)](contracts/dao/Property.sol#L604)
	- [availableVABAmountList.push(_property)](contracts/dao/Property.sol#L660)
	- [boardRewardRateList.push(_property)](contracts/dao/Property.sol#L680)
	- [boardVotePeriodList.push(_property)](contracts/dao/Property.sol#L664)
	- [boardVoteWeightList.push(_property)](contracts/dao/Property.sol#L668)
	- [disputeGracePeriodList.push(_property)](contracts/dao/Property.sol#L608)
	- [filmRewardClaimPeriodList.push(_property)](contracts/dao/Property.sol#L624)
	- [filmVotePeriodList.push(_property)](contracts/dao/Property.sol#L600)
	- [fundFeePercentList.push(_property)](contracts/dao/Property.sol#L636)
	- [lockPeriodList.push(_property)](contracts/dao/Property.sol#L616)
	- [maxAllowPeriodList.push(_property)](contracts/dao/Property.sol#L628)
	- [maxDepositAmountList.push(_property)](contracts/dao/Property.sol#L644)
	- [maxMintFeePercentList.push(_property)](contracts/dao/Property.sol#L648)
	- [minDepositAmountList.push(_property)](contracts/dao/Property.sol#L640)
	- [minStakerCountPercentList.push(_property)](contracts/dao/Property.sol#L656)
	- [minVoteCountList.push(_property)](contracts/dao/Property.sol#L652)
	- [pp.title = _title](contracts/dao/Property.sol#L684)
	- [pp.description = _description](contracts/dao/Property.sol#L685)
	- [pp.createTime = block.timestamp](contracts/dao/Property.sol#L686)
	- [pp.value = _property](contracts/dao/Property.sol#L687)
	- [pp.creator = msg.sender](contracts/dao/Property.sol#L688)
	- [pp.status = Helper.Status.LISTED](contracts/dao/Property.sol#L689)
	- [propertyVotePeriodList.push(_property)](contracts/dao/Property.sol#L612)
	- [proposalFeeAmountList.push(_property)](contracts/dao/Property.sol#L632)
	- [rewardRateList.push(_property)](contracts/dao/Property.sol#L620)
	- [rewardVotePeriodList.push(_property)](contracts/dao/Property.sol#L672)
	- [subscriptionAmountList.push(_property)](contracts/dao/Property.sol#L676)

contracts/dao/Property.sol#L580-L698


 - [ ] ID-149
Reentrancy in [Property.proposalAuditor(address,string,string)](contracts/dao/Property.sol#L801-L833):
	External calls:
	- [__paidFee(proposalFeeAmount)](contracts/dao/Property.sol#L814)
		- [(success,data) = token.call(abi.encodeWithSelector(0x095ea7b3,to,value))](contracts/libraries/Helper.sol#L32)
		- [(success,data) = token.call(abi.encodeWithSelector(0x23b872dd,from,to,value))](contracts/libraries/Helper.sol#L53)
		- [Helper.safeTransferFrom(vabToken,msg.sender,address(this),expectVABAmount)](contracts/dao/Property.sol#L1212)
		- [Helper.safeApprove(vabToken,STAKING_POOL,IERC20(vabToken).totalSupply())](contracts/dao/Property.sol#L1214)
		- [IStakingPool(STAKING_POOL).addRewardToPool(expectVABAmount)](contracts/dao/Property.sol#L1216)
	State variables written after the call(s):
	- [ap.title = _title](contracts/dao/Property.sol#L817)
	- [ap.description = _description](contracts/dao/Property.sol#L818)
	- [ap.createTime = block.timestamp](contracts/dao/Property.sol#L819)
	- [ap.value = _agent](contracts/dao/Property.sol#L820)
	- [ap.creator = msg.sender](contracts/dao/Property.sol#L821)
	- [ap.status = Helper.Status.LISTED](contracts/dao/Property.sol#L822)

contracts/dao/Property.sol#L801-L833


 - [ ] ID-150
Reentrancy in [VabbleFund.withdrawFunding(uint256)](contracts/dao/VabbleFund.sol#L312-L345):
	External calls:
	- [Helper.safeTransferETH(msg.sender,assetArr[i].amount)](contracts/dao/VabbleFund.sol#L328)
	- [Helper.safeTransfer(assetArr[i].token,msg.sender,assetArr[i].amount)](contracts/dao/VabbleFund.sol#L333)
	State variables written after the call(s):
	- [__removeFilmInvestorList(_filmId,msg.sender)](contracts/dao/VabbleFund.sol#L341)
		- [filmInvestorList[_filmId][k] = filmInvestorList[_filmId][filmInvestorList[_filmId].length - 1]](contracts/dao/VabbleFund.sol#L564)
		- [filmInvestorList[_filmId].pop()](contracts/dao/VabbleFund.sol#L565)

contracts/dao/VabbleFund.sol#L312-L345


 - [ ] ID-151
Reentrancy in [DeployerScript.deployForLocalTesting(address,address,bool)](scripts/foundry/01_Deploy.s.sol#L83-L104):
	External calls:
	- [_getConfig()](scripts/foundry/01_Deploy.s.sol#L97)
		- [activeConfig = helperConfig.getActiveNetworkConfig()](scripts/foundry/01_Deploy.s.sol#L116)
	State variables written after the call(s):
	- [_deployAllContracts(_vabWallet,_auditor)](scripts/foundry/01_Deploy.s.sol#L98)
		- [contracts.factoryTierNFT = new FactoryTierNFT(_ownablee,_vabbleDAO,_vabbleFund)](scripts/foundry/01_Deploy.s.sol#L268)
		- [contracts.vote = new Vote(_ownablee)](scripts/foundry/01_Deploy.s.sol#L227)
		- [contracts.vabbleFund = new VabbleFund(_ownablee,_uniHelper,_stakingPool,_property,_factoryFilmNFT)](scripts/foundry/01_Deploy.s.sol#L251)
		- [contracts.factoryFilmNFT = new FactoryFilmNFT(_ownablee)](scripts/foundry/01_Deploy.s.sol#L235)
		- [contracts.vabbleDAO = new VabbleDAO(_ownablee,_uniHelper,_vote,_stakingPool,_property,_vabbleFund)](scripts/foundry/01_Deploy.s.sol#L264)
		- [contracts.property = new Property(_ownablee,_uniHelper,_vote,_stakingPool)](scripts/foundry/01_Deploy.s.sol#L231)
		- [contracts.uniHelper = new UniHelper(_uniswapFactory,_uniswapRouter,_sushiSwapFactory,_sushiSwapRouter,_ownablee)](scripts/foundry/01_Deploy.s.sol#L218-L219)
		- [contracts.subscription = new Subscription(_ownablee,_uniHelper,_property,discountPercents)](scripts/foundry/01_Deploy.s.sol#L272)
		- [contracts.ownablee = new Ownablee(_vabWallet,_vab,_usdc,_auditor)](scripts/foundry/01_Deploy.s.sol#L206)
		- [contracts.stakingPool = new StakingPool(_ownablee)](scripts/foundry/01_Deploy.s.sol#L223)
		- [contracts.factorySubNFT = new FactorySubNFT(_ownablee,_uniHelper)](scripts/foundry/01_Deploy.s.sol#L239)

scripts/foundry/01_Deploy.s.sol#L83-L104


 - [ ] ID-152
Reentrancy in [VabbleDAO.withdrawVABFromStudioPool(address)](contracts/dao/VabbleDAO.sol#L603-L614):
	External calls:
	- [Helper.safeTransfer(vabToken,_to,poolBalance)](contracts/dao/VabbleDAO.sol#L607)
	State variables written after the call(s):
	- [StudioPool = 0](contracts/dao/VabbleDAO.sol#L609)
	- [delete studioPoolUsers](contracts/dao/VabbleDAO.sol#L610)

contracts/dao/VabbleDAO.sol#L603-L614


 - [ ] ID-153
Reentrancy in [StakingPool.unstakeVAB(uint256)](contracts/dao/StakingPool.sol#L364-L393):
	External calls:
	- [__withdrawReward(rewardAmount)](contracts/dao/StakingPool.sol#L375)
		- [Helper.safeTransfer(IOwnablee(OWNABLE).PAYOUT_TOKEN(),msg.sender,_amount)](contracts/dao/StakingPool.sol#L1106)
		- [(success,data) = token.call(abi.encodeWithSelector(0xa9059cbb,to,value))](contracts/libraries/Helper.sol#L42)
	- [Helper.safeTransfer(IOwnablee(OWNABLE).PAYOUT_TOKEN(),msg.sender,_amount)](contracts/dao/StakingPool.sol#L379)
	State variables written after the call(s):
	- [__stakerRemove(msg.sender)](contracts/dao/StakingPool.sol#L389)
		- [stakerMap.indexOf[lastKey] = index](contracts/dao/StakingPool.sol#L1165)
		- [delete stakerMap.indexOf[key]](contracts/dao/StakingPool.sol#L1166)
		- [stakerMap.keys[index - 1] = lastKey](contracts/dao/StakingPool.sol#L1168)
		- [stakerMap.keys.pop()](contracts/dao/StakingPool.sol#L1169)

contracts/dao/StakingPool.sol#L364-L393


 - [ ] ID-154
Reentrancy in [Property.proposalRewardFund(address,string,string)](contracts/dao/Property.sol#L845-L876):
	External calls:
	- [__paidFee(10 * proposalFeeAmount)](contracts/dao/Property.sol#L857)
		- [(success,data) = token.call(abi.encodeWithSelector(0x095ea7b3,to,value))](contracts/libraries/Helper.sol#L32)
		- [(success,data) = token.call(abi.encodeWithSelector(0x23b872dd,from,to,value))](contracts/libraries/Helper.sol#L53)
		- [Helper.safeTransferFrom(vabToken,msg.sender,address(this),expectVABAmount)](contracts/dao/Property.sol#L1212)
		- [Helper.safeApprove(vabToken,STAKING_POOL,IERC20(vabToken).totalSupply())](contracts/dao/Property.sol#L1214)
		- [IStakingPool(STAKING_POOL).addRewardToPool(expectVABAmount)](contracts/dao/Property.sol#L1216)
	State variables written after the call(s):
	- [rp.title = _title](contracts/dao/Property.sol#L860)
	- [rp.description = _description](contracts/dao/Property.sol#L861)
	- [rp.createTime = block.timestamp](contracts/dao/Property.sol#L862)
	- [rp.value = _rewardAddress](contracts/dao/Property.sol#L863)
	- [rp.creator = msg.sender](contracts/dao/Property.sol#L864)
	- [rp.status = Helper.Status.LISTED](contracts/dao/Property.sol#L865)

contracts/dao/Property.sol#L845-L876


 - [ ] ID-155
Reentrancy in [StakingPool.addRewardToPool(uint256)](contracts/dao/StakingPool.sol#L318-L325):
	External calls:
	- [Helper.safeTransferFrom(IOwnablee(OWNABLE).PAYOUT_TOKEN(),msg.sender,address(this),_amount)](contracts/dao/StakingPool.sol#L321)
	State variables written after the call(s):
	- [totalRewardAmount = totalRewardAmount + _amount](contracts/dao/StakingPool.sol#L322)

contracts/dao/StakingPool.sol#L318-L325


 - [ ] ID-156
Reentrancy in [FactorySubNFT.__mint(address,address,uint256,uint256)](contracts/dao/FactorySubNFT.sol#L414-L438):
	External calls:
	- [tokenId = subNFTContract.mintTo(receiver)](contracts/dao/FactorySubNFT.sol#L426)
	State variables written after the call(s):
	- [sInfo.subscriptionPeriod = _subPeriod](contracts/dao/FactorySubNFT.sol#L429)
	- [sInfo.lockPeriod = nftLockPeriod](contracts/dao/FactorySubNFT.sol#L430)
	- [sInfo.minter = msg.sender](contracts/dao/FactorySubNFT.sol#L431)
	- [sInfo.category = _category](contracts/dao/FactorySubNFT.sol#L432)
	- [sInfo.lockTime = block.timestamp](contracts/dao/FactorySubNFT.sol#L433)
	- [subNFTTokenList[receiver].push(tokenId)](contracts/dao/FactorySubNFT.sol#L435)

contracts/dao/FactorySubNFT.sol#L414-L438


 - [ ] ID-157
Reentrancy in [StakingPool.withdrawAllFund()](contracts/dao/StakingPool.sol#L578-L603):
	External calls:
	- [Helper.safeTransfer(vabToken,to,totalMigrationVAB)](contracts/dao/StakingPool.sol#L588)
	State variables written after the call(s):
	- [totalRewardAmount = totalRewardAmount - totalMigrationVAB](contracts/dao/StakingPool.sol#L590)

contracts/dao/StakingPool.sol#L578-L603


 - [ ] ID-158
Reentrancy in [FactoryFilmNFT.__mint(uint256)](contracts/dao/FactoryFilmNFT.sol#L387-L394):
	External calls:
	- [tokenId = t.mintTo(msg.sender)](contracts/dao/FactoryFilmNFT.sol#L389)
	State variables written after the call(s):
	- [filmNFTTokenList[_filmId].push(tokenId)](contracts/dao/FactoryFilmNFT.sol#L391)

contracts/dao/FactoryFilmNFT.sol#L387-L394


 - [ ] ID-159
Reentrancy in [StakingPool.depositVAB(uint256)](contracts/dao/StakingPool.sol#L439-L447):
	External calls:
	- [Helper.safeTransferFrom(IOwnablee(OWNABLE).PAYOUT_TOKEN(),msg.sender,address(this),_amount)](contracts/dao/StakingPool.sol#L443)
	State variables written after the call(s):
	- [userRentInfo[msg.sender].vabAmount += _amount](contracts/dao/StakingPool.sol#L444)

contracts/dao/StakingPool.sol#L439-L447


 - [ ] ID-160
Reentrancy in [StakingPool.stakeVAB(uint256)](contracts/dao/StakingPool.sol#L334-L355):
	External calls:
	- [Helper.safeTransferFrom(IOwnablee(OWNABLE).PAYOUT_TOKEN(),msg.sender,address(this),_amount)](contracts/dao/StakingPool.sol#L340)
	State variables written after the call(s):
	- [__updateMinProposalIndex(msg.sender)](contracts/dao/StakingPool.sol#L352)
		- [minProposalIndex[_user] = i](contracts/dao/StakingPool.sol#L1132)
	- [si.outstandingReward += calcRealizedRewards(msg.sender)](contracts/dao/StakingPool.sol#L346)
	- [si.stakeAmount += _amount](contracts/dao/StakingPool.sol#L347)
	- [si.stakeTime = block.timestamp](contracts/dao/StakingPool.sol#L348)
	- [__stakerSet(msg.sender)](contracts/dao/StakingPool.sol#L344)
		- [stakerMap.indexOf[key] = stakerMap.keys.length + 1](contracts/dao/StakingPool.sol#L1148)
		- [stakerMap.keys.push(key)](contracts/dao/StakingPool.sol#L1149)
	- [totalStakingAmount += _amount](contracts/dao/StakingPool.sol#L350)

contracts/dao/StakingPool.sol#L334-L355


 - [ ] ID-161
Reentrancy in [Vote.addFilmBoard(uint256)](contracts/dao/Vote.sol#L510-L535):
	External calls:
	- [IProperty(DAO_PROPERTY).updateGovProposal(_index,2,1)](contracts/dao/Vote.sol#L521)
	State variables written after the call(s):
	- [govPassedVoteCount[3] += 1](contracts/dao/Vote.sol#L522)

contracts/dao/Vote.sol#L510-L535


 - [ ] ID-162
Reentrancy in [Property.proposalProperty(uint256,uint256,string,string)](contracts/dao/Property.sol#L580-L698):
	External calls:
	- [__paidFee(proposalFeeAmount)](contracts/dao/Property.sol#L594)
		- [(success,data) = token.call(abi.encodeWithSelector(0x095ea7b3,to,value))](contracts/libraries/Helper.sol#L32)
		- [(success,data) = token.call(abi.encodeWithSelector(0x23b872dd,from,to,value))](contracts/libraries/Helper.sol#L53)
		- [Helper.safeTransferFrom(vabToken,msg.sender,address(this),expectVABAmount)](contracts/dao/Property.sol#L1212)
		- [Helper.safeApprove(vabToken,STAKING_POOL,IERC20(vabToken).totalSupply())](contracts/dao/Property.sol#L1214)
		- [IStakingPool(STAKING_POOL).addRewardToPool(expectVABAmount)](contracts/dao/Property.sol#L1216)
	- [pp.proposalID = IStakingPool(STAKING_POOL).addProposalData(msg.sender,block.timestamp,propertyVotePeriod)](contracts/dao/Property.sol#L691)
	State variables written after the call(s):
	- [governanceProposalCount += 1](contracts/dao/Property.sol#L693)
	- [userGovProposalCount[msg.sender] += 1](contracts/dao/Property.sol#L694)

contracts/dao/Property.sol#L580-L698


 - [ ] ID-163
Reentrancy in [VabbleDAO.allocateFromEdgePool(uint256)](contracts/dao/VabbleDAO.sol#L580-L594):
	External calls:
	- [IOwnablee(OWNABLE).addToStudioPool(_amount)](contracts/dao/VabbleDAO.sol#L584)
	State variables written after the call(s):
	- [StudioPool += _amount](contracts/dao/VabbleDAO.sol#L585)
	- [studioPoolUsers.push(edgePoolUsers[i])](contracts/dao/VabbleDAO.sol#L590)

contracts/dao/VabbleDAO.sol#L580-L594


 - [ ] ID-164
Reentrancy in [Property.proposalAuditor(address,string,string)](contracts/dao/Property.sol#L801-L833):
	External calls:
	- [__paidFee(proposalFeeAmount)](contracts/dao/Property.sol#L814)
		- [(success,data) = token.call(abi.encodeWithSelector(0x095ea7b3,to,value))](contracts/libraries/Helper.sol#L32)
		- [(success,data) = token.call(abi.encodeWithSelector(0x23b872dd,from,to,value))](contracts/libraries/Helper.sol#L53)
		- [Helper.safeTransferFrom(vabToken,msg.sender,address(this),expectVABAmount)](contracts/dao/Property.sol#L1212)
		- [Helper.safeApprove(vabToken,STAKING_POOL,IERC20(vabToken).totalSupply())](contracts/dao/Property.sol#L1214)
		- [IStakingPool(STAKING_POOL).addRewardToPool(expectVABAmount)](contracts/dao/Property.sol#L1216)
	- [ap.proposalID = IStakingPool(STAKING_POOL).addProposalData(msg.sender,block.timestamp,agentVotePeriod)](contracts/dao/Property.sol#L824)
	State variables written after the call(s):
	- [allGovProposalInfo[1].push(_agent)](contracts/dao/Property.sol#L829)
	- [governanceProposalCount += 1](contracts/dao/Property.sol#L826)
	- [userGovProposalCount[msg.sender] += 1](contracts/dao/Property.sol#L827)

contracts/dao/Property.sol#L801-L833


 - [ ] ID-165
Reentrancy in [DeployerScript.run()](scripts/foundry/01_Deploy.s.sol#L58-L62):
	External calls:
	- [vm.startBroadcast()](scripts/foundry/01_Deploy.s.sol#L59)
	- [deployForMainOrTestnet()](scripts/foundry/01_Deploy.s.sol#L60)
		- [activeConfig = helperConfig.getActiveNetworkConfig()](scripts/foundry/01_Deploy.s.sol#L116)
		- [_factoryFilmNFT.initialize(address(_vabbleDAO),address(_vabbleFund))](scripts/foundry/01_Deploy.s.sol#L186)
		- [_stakingPool.initialize(address(_vabbleDAO),address(_property),address(_vote))](scripts/foundry/01_Deploy.s.sol#L187)
		- [_vote.initialize(address(_vabbleDAO),address(_stakingPool),address(_property),address(_uniHelper))](scripts/foundry/01_Deploy.s.sol#L188)
		- [_vabbleFund.initialize(address(_vabbleDAO))](scripts/foundry/01_Deploy.s.sol#L189)
		- [_uniHelper.setWhiteList(address(_vabbleDAO),address(_vabbleFund),address(_subscription),address(_factoryFilmNFT),address(_factorySubNFT))](scripts/foundry/01_Deploy.s.sol#L190-L196)
		- [_ownablee.setup(address(_vote),address(_vabbleDAO),address(_stakingPool))](scripts/foundry/01_Deploy.s.sol#L197)
		- [_ownablee.addDepositAsset(depositAssets)](scripts/foundry/01_Deploy.s.sol#L198)
	State variables written after the call(s):
	- [deployForMainOrTestnet()](scripts/foundry/01_Deploy.s.sol#L60)
		- [usdt = activeConfig.usdt](scripts/foundry/01_Deploy.s.sol#L120)

scripts/foundry/01_Deploy.s.sol#L58-L62


## timestamp
Impact: Low
Confidence: Medium
 - [ ] ID-166
[StakingPool.__updateMinProposalIndex(address)](contracts/dao/StakingPool.sol#L1127-L1136) uses timestamp for comparisons
	Dangerous comparisons:
	- [propsList[i].cTime + propsList[i].period >= stakeInfo[_user].stakeTime](contracts/dao/StakingPool.sol#L1131)

contracts/dao/StakingPool.sol#L1127-L1136


 - [ ] ID-167
[FactorySubNFT.unlockNFT(uint256)](contracts/dao/FactorySubNFT.sol#L284-L297) uses timestamp for comparisons
	Dangerous comparisons:
	- [require(bool,string)(msg.sender == lockInfo[_tokenId].minter,unlock: not token minter)](contracts/dao/FactorySubNFT.sol#L286)
	- [require(bool,string)(block.timestamp > sInfo.lockPeriod + sInfo.lockTime,unlock: locked yet)](contracts/dao/FactorySubNFT.sol#L289)

contracts/dao/FactorySubNFT.sol#L284-L297


 - [ ] ID-168
[VabbleDAO.checkSetFinalFilms(uint256[])](contracts/dao/VabbleDAO.sol#L811-L824) uses timestamp for comparisons
	Dangerous comparisons:
	- [finalFilmCalledTime[_filmIds[i]] != 0](contracts/dao/VabbleDAO.sol#L818)
	- [_valids[i] = block.timestamp - finalFilmCalledTime[_filmIds[i]] >= fPeriod](contracts/dao/VabbleDAO.sol#L819)

contracts/dao/VabbleDAO.sol#L811-L824


 - [ ] ID-169
[FactoryTierNFT.setTierInfo(uint256,uint256[],uint256[])](contracts/dao/FactoryTierNFT.sol#L168-L202) uses timestamp for comparisons
	Dangerous comparisons:
	- [require(bool,string)(fundPeriod < block.timestamp - pApproveTime,setTier: fund period yet)](contracts/dao/FactoryTierNFT.sol#L184)

contracts/dao/FactoryTierNFT.sol#L168-L202


 - [ ] ID-170
[UniHelper.__approveMaxAsNeeded(address,address,uint256)](contracts/dao/UniHelper.sol#L369-L374) uses timestamp for comparisons
	Dangerous comparisons:
	- [IERC20(_asset).allowance(address(this),_target) < _neededAmount](contracts/dao/UniHelper.sol#L370)

contracts/dao/UniHelper.sol#L369-L374


 - [ ] ID-171
[StakingPool.__getProposalVoteCount(address,uint256,uint256,uint256)](contracts/dao/StakingPool.sol#L928-L972) uses timestamp for comparisons
	Dangerous comparisons:
	- [pData.cTime <= _start && _end <= pData.cTime + pData.period](contracts/dao/StakingPool.sol#L947)
	- [_start >= stakeInfo[_user].stakeTime](contracts/dao/StakingPool.sol#L950)
	- [pData.creator == _user || votedTime[_user][pData.proposalID] <= stakeInfo[_user].stakeTime](contracts/dao/StakingPool.sol#L955)
	- [block.timestamp <= pData.cTime + pData.period](contracts/dao/StakingPool.sol#L963)

contracts/dao/StakingPool.sol#L928-L972


 - [ ] ID-172
[VabbleDAO.__setFinalFilm(uint256,uint256)](contracts/dao/VabbleDAO.sol#L990-L1017) uses timestamp for comparisons
	Dangerous comparisons:
	- [require(bool,string)(fInfo.status == Helper.Status.APPROVED_LISTING || fInfo.status == Helper.Status.APPROVED_FUNDING,sFF: Not approved)](contracts/dao/VabbleDAO.sol#L992-L995)
	- [fInfo.status == Helper.Status.APPROVED_LISTING](contracts/dao/VabbleDAO.sol#L998)
	- [fInfo.status == Helper.Status.APPROVED_FUNDING](contracts/dao/VabbleDAO.sol#L1000)
	- [rewardAmount != 0](contracts/dao/VabbleDAO.sol#L1010)
	- [payAmount != 0](contracts/dao/VabbleDAO.sol#L1013)

contracts/dao/VabbleDAO.sol#L990-L1017


 - [ ] ID-173
[VabbleDAO.isEnabledClaimer(uint256)](contracts/dao/VabbleDAO.sol#L763-L766) uses timestamp for comparisons
	Dangerous comparisons:
	- [filmInfo[_filmId].enableClaimer == 1](contracts/dao/VabbleDAO.sol#L764)

contracts/dao/VabbleDAO.sol#L763-L766


 - [ ] ID-174
[StakingPool.calcMigrationVAB()](contracts/dao/StakingPool.sol#L550-L568) uses timestamp for comparisons
	Dangerous comparisons:
	- [totalRewardAmount >= totalAmount](contracts/dao/StakingPool.sol#L563)

contracts/dao/StakingPool.sol#L550-L568


 - [ ] ID-175
[StakingPool.withdrawReward(uint256)](contracts/dao/StakingPool.sol#L401-L431) uses timestamp for comparisons
	Dangerous comparisons:
	- [require(bool,string)(stakeInfo[msg.sender].stakeAmount > 0,wR: zero amount)](contracts/dao/StakingPool.sol#L403)
	- [require(bool,string)(migrationStatus > 0 || block.timestamp > withdrawTime,wR: lock)](contracts/dao/StakingPool.sol#L406)
	- [require(bool,string)(rewardAmount > 0,wR: zero reward)](contracts/dao/StakingPool.sol#L413)
	- [require(bool,string)(totalRewardAmount >= rewardAmount,wR: insufficient total)](contracts/dao/StakingPool.sol#L427)

contracts/dao/StakingPool.sol#L401-L431


 - [ ] ID-176
[VabbleDAO.__claimAllReward(uint256[])](contracts/dao/VabbleDAO.sol#L1079-L1105) uses timestamp for comparisons
	Dangerous comparisons:
	- [finalFilmCalledTime[_filmIds[i]] == 0](contracts/dao/VabbleDAO.sol#L1088)

contracts/dao/VabbleDAO.sol#L1079-L1105


 - [ ] ID-177
[UniHelper.__swapETHToToken(uint256,uint256,address,address[])](contracts/dao/UniHelper.sol#L315-L331) uses timestamp for comparisons
	Dangerous comparisons:
	- [require(bool,string)(address(this).balance >= _depositAmount,sEToT: insufficient)](contracts/dao/UniHelper.sol#L324)

contracts/dao/UniHelper.sol#L315-L331


 - [ ] ID-178
[Vote.__isVotePeriod(uint256,uint256)](contracts/dao/Vote.sol#L946-L950) uses timestamp for comparisons
	Dangerous comparisons:
	- [_period >= block.timestamp - _startTime](contracts/dao/Vote.sol#L948)

contracts/dao/Vote.sol#L946-L950


 - [ ] ID-179
[StakingPool.__calcRewards(address,uint256,uint256)](contracts/dao/StakingPool.sol#L1205-L1220) uses timestamp for comparisons
	Dangerous comparisons:
	- [si.stakeAmount == 0](contracts/dao/StakingPool.sol#L1207)
	- [startTime == 0](contracts/dao/StakingPool.sol#L1208)

contracts/dao/StakingPool.sol#L1205-L1220


 - [ ] ID-180
[StakingPool.unstakeVAB(uint256)](contracts/dao/StakingPool.sol#L364-L393) uses timestamp for comparisons
	Dangerous comparisons:
	- [require(bool,string)(si.stakeAmount >= _amount,usVAB: insufficient)](contracts/dao/StakingPool.sol#L369)
	- [require(bool,string)(migrationStatus > 0 || block.timestamp > withdrawTime,usVAB: lock)](contracts/dao/StakingPool.sol#L370)
	- [totalRewardAmount >= rewardAmount && rewardAmount > 0](contracts/dao/StakingPool.sol#L374)
	- [si.stakeAmount == 0](contracts/dao/StakingPool.sol#L385)

contracts/dao/StakingPool.sol#L364-L393


 - [ ] ID-181
[VabbleFund.fundProcess(uint256)](contracts/dao/VabbleFund.sol#L241-L293) uses timestamp for comparisons
	Dangerous comparisons:
	- [require(bool,string)(fundPeriod < block.timestamp - pApproveTime,fundProcess: funding period)](contracts/dao/VabbleFund.sol#L251)

contracts/dao/VabbleFund.sol#L241-L293


 - [ ] ID-182
[VabbleDAO.__setFinalAmountToPayees(uint256,uint256,uint256)](contracts/dao/VabbleDAO.sol#L1026-L1035) uses timestamp for comparisons
	Dangerous comparisons:
	- [k < payeeLength](contracts/dao/VabbleDAO.sol#L1029)

contracts/dao/VabbleDAO.sol#L1026-L1035


 - [ ] ID-183
[VabbleDAO.updateEnabledClaimer(uint256,uint256)](contracts/dao/VabbleDAO.sol#L684-L688) uses timestamp for comparisons
	Dangerous comparisons:
	- [require(bool,string)(filmInfo[_filmId].studio == msg.sender,uEC: not film owner)](contracts/dao/VabbleDAO.sol#L685)

contracts/dao/VabbleDAO.sol#L684-L688


 - [ ] ID-184
[Property.removeFilmBoardMember(address)](contracts/dao/Property.sol#L975-L985) uses timestamp for comparisons
	Dangerous comparisons:
	- [require(bool,string)(maxAllowPeriod < block.timestamp - IVote(VOTE).getLastVoteTime(_member),rFBM: e1)](contracts/dao/Property.sol#L977)
	- [require(bool,string)(maxAllowPeriod > block.timestamp - IStakingPool(STAKING_POOL).lastfundProposalCreateTime(),rFBM: e2)](contracts/dao/Property.sol#L978)

contracts/dao/Property.sol#L975-L985


 - [ ] ID-185
[Subscription.isActivedSubscription(address)](contracts/dao/Subscription.sol#L273-L276) uses timestamp for comparisons
	Dangerous comparisons:
	- [subscriptionInfo[_customer].expireTime > block.timestamp](contracts/dao/Subscription.sol#L274)

contracts/dao/Subscription.sol#L273-L276


 - [ ] ID-186
[VabbleDAO.updateFilmFundPeriod(uint256,uint256)](contracts/dao/VabbleDAO.sol#L524-L531) uses timestamp for comparisons
	Dangerous comparisons:
	- [require(bool,string)(msg.sender == filmInfo[_filmId].studio,uFP: 1)](contracts/dao/VabbleDAO.sol#L525)
	- [require(bool,string)(filmInfo[_filmId].fundType != 0,uFP: 2)](contracts/dao/VabbleDAO.sol#L526)

contracts/dao/VabbleDAO.sol#L524-L531


 - [ ] ID-187
[StakingPool.calcPendingRewards(address)](contracts/dao/StakingPool.sol#L1020-L1052) uses timestamp for comparisons
	Dangerous comparisons:
	- [i < intervalCount](contracts/dao/StakingPool.sol#L1031)

contracts/dao/StakingPool.sol#L1020-L1052


 - [ ] ID-188
[FactorySubNFT.lockNFT(uint256)](contracts/dao/FactorySubNFT.sol#L265-L277) uses timestamp for comparisons
	Dangerous comparisons:
	- [require(bool,string)(msg.sender == lockInfo[_tokenId].minter,lock: not token minter)](contracts/dao/FactorySubNFT.sol#L267)

contracts/dao/FactorySubNFT.sol#L265-L277


 - [ ] ID-189
[StakingPool.calcRealizedRewards(address)](contracts/dao/StakingPool.sol#L981-L1011) uses timestamp for comparisons
	Dangerous comparisons:
	- [i < intervalCount](contracts/dao/StakingPool.sol#L992)

contracts/dao/StakingPool.sol#L981-L1011


 - [ ] ID-190
[StakingPool.calcRewardAmount(address)](contracts/dao/StakingPool.sol#L843-L854) uses timestamp for comparisons
	Dangerous comparisons:
	- [si.stakeAmount == 0](contracts/dao/StakingPool.sol#L846)

contracts/dao/StakingPool.sol#L843-L854


 - [ ] ID-191
[VabbleFund.depositToFilm(uint256,uint256,uint256,address)](contracts/dao/VabbleFund.sol#L179-L221) uses timestamp for comparisons
	Dangerous comparisons:
	- [require(bool,string)(fundPeriod >= block.timestamp - pApproveTime,depositToFilm: passed funding period)](contracts/dao/VabbleFund.sol#L200)

contracts/dao/VabbleFund.sol#L179-L221


 - [ ] ID-192
[StakingPool.__calcProposalTimeIntervals(address)](contracts/dao/StakingPool.sol#L872-L911) uses timestamp for comparisons
	Dangerous comparisons:
	- [propsList[i].cTime + propsList[i].period >= stakeInfo[_user].stakeTime](contracts/dao/StakingPool.sol#L882)
	- [pData.cTime + pData.period >= stakeTime](contracts/dao/StakingPool.sol#L897)
	- [times_[2 * count + 2] > end](contracts/dao/StakingPool.sol#L901)

contracts/dao/StakingPool.sol#L872-L911


 - [ ] ID-193
[VabbleFund.withdrawFunding(uint256)](contracts/dao/VabbleFund.sol#L312-L345) uses timestamp for comparisons
	Dangerous comparisons:
	- [require(bool,string)(fundPeriod < block.timestamp - pApproveTime,withdrawFunding: funding period)](contracts/dao/VabbleFund.sol#L318)

contracts/dao/VabbleFund.sol#L312-L345


 - [ ] ID-194
[VabbleDAO.proposalFilmUpdate(uint256,string,string,uint256[],address[],uint256,uint256,uint256,uint256)](contracts/dao/VabbleDAO.sol#L368-L442) uses timestamp for comparisons
	Dangerous comparisons:
	- [require(bool,string)(fInfo.status == Helper.Status.LISTED,pU: NL)](contracts/dao/VabbleDAO.sol#L405)
	- [require(bool,string)(fInfo.studio == msg.sender,pU: NFO)](contracts/dao/VabbleDAO.sol#L406)
	- [fInfo.fundType != 0](contracts/dao/VabbleDAO.sol#L430)
	- [fInfo.noVote == 1](contracts/dao/VabbleDAO.sol#L433)

contracts/dao/VabbleDAO.sol#L368-L442


 - [ ] ID-195
[StakingPool.withdrawAllFund()](contracts/dao/StakingPool.sol#L578-L603) uses timestamp for comparisons
	Dangerous comparisons:
	- [IERC20(vabToken).balanceOf(address(this)) >= totalMigrationVAB && totalMigrationVAB > 0](contracts/dao/StakingPool.sol#L587)

contracts/dao/StakingPool.sol#L578-L603


## assembly
Impact: Informational
Confidence: High
 - [ ] ID-196
[ERC721._checkOnERC721Received(address,address,uint256,bytes)](node_modules/@openzeppelin/contracts/token/ERC721/ERC721.sol#L399-L421) uses assembly
	- [INLINE ASM](node_modules/@openzeppelin/contracts/token/ERC721/ERC721.sol#L413-L415)

node_modules/@openzeppelin/contracts/token/ERC721/ERC721.sol#L399-L421


 - [ ] ID-197
[Arrays._swap(uint256,uint256)](contracts/libraries/Arrays.sol#L140-L147) uses assembly
	- [INLINE ASM](contracts/libraries/Arrays.sol#L141-L146)

contracts/libraries/Arrays.sol#L140-L147


 - [ ] ID-198
[Arrays._mload(uint256)](contracts/libraries/Arrays.sol#L131-L135) uses assembly
	- [INLINE ASM](contracts/libraries/Arrays.sol#L132-L134)

contracts/libraries/Arrays.sol#L131-L135


 - [ ] ID-199
[Arrays._castToBytes32Comp(function(address,address) returns(bool))](contracts/libraries/Arrays.sol#L169-L175) uses assembly
	- [INLINE ASM](contracts/libraries/Arrays.sol#L172-L174)

contracts/libraries/Arrays.sol#L169-L175


 - [ ] ID-200
[Arrays._castToBytes32Comp(function(uint256,uint256) returns(bool))](contracts/libraries/Arrays.sol#L178-L184) uses assembly
	- [INLINE ASM](contracts/libraries/Arrays.sol#L181-L183)

contracts/libraries/Arrays.sol#L178-L184


 - [ ] ID-201
[Math.mulDiv(uint256,uint256,uint256)](node_modules/@openzeppelin/contracts/utils/math/Math.sol#L55-L134) uses assembly
	- [INLINE ASM](node_modules/@openzeppelin/contracts/utils/math/Math.sol#L62-L66)
	- [INLINE ASM](node_modules/@openzeppelin/contracts/utils/math/Math.sol#L85-L92)
	- [INLINE ASM](node_modules/@openzeppelin/contracts/utils/math/Math.sol#L99-L108)

node_modules/@openzeppelin/contracts/utils/math/Math.sol#L55-L134


 - [ ] ID-202
[Arrays._begin(bytes32[])](contracts/libraries/Arrays.sol#L111-L116) uses assembly
	- [INLINE ASM](contracts/libraries/Arrays.sol#L113-L115)

contracts/libraries/Arrays.sol#L111-L116


 - [ ] ID-203
[Strings.toString(uint256)](node_modules/@openzeppelin/contracts/utils/Strings.sol#L19-L39) uses assembly
	- [INLINE ASM](node_modules/@openzeppelin/contracts/utils/Strings.sol#L25-L27)
	- [INLINE ASM](node_modules/@openzeppelin/contracts/utils/Strings.sol#L31-L33)

node_modules/@openzeppelin/contracts/utils/Strings.sol#L19-L39


 - [ ] ID-204
[Arrays._castToBytes32Array(address[])](contracts/libraries/Arrays.sol#L155-L159) uses assembly
	- [INLINE ASM](contracts/libraries/Arrays.sol#L156-L158)

contracts/libraries/Arrays.sol#L155-L159


 - [ ] ID-205
[Address._revert(bytes,string)](node_modules/@openzeppelin/contracts/utils/Address.sol#L231-L243) uses assembly
	- [INLINE ASM](node_modules/@openzeppelin/contracts/utils/Address.sol#L236-L239)

node_modules/@openzeppelin/contracts/utils/Address.sol#L231-L243


 - [ ] ID-206
[Arrays._castToBytes32Array(uint256[])](contracts/libraries/Arrays.sol#L162-L166) uses assembly
	- [INLINE ASM](contracts/libraries/Arrays.sol#L163-L165)

contracts/libraries/Arrays.sol#L162-L166


## costly-loop
Impact: Informational
Confidence: Medium
 - [ ] ID-207
[Ownablee.removeDepositAsset(address[])](contracts/dao/Ownablee.sol#L193-L209) has costly operations inside a loop:
	- [depositAssetList.pop()](contracts/dao/Ownablee.sol#L202)

contracts/dao/Ownablee.sol#L193-L209


 - [ ] ID-208
[ERC721Enumerable._removeTokenFromAllTokensEnumeration(uint256)](node_modules/@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol#L140-L158) has costly operations inside a loop:
	- [_allTokens.pop()](node_modules/@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol#L157)

node_modules/@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol#L140-L158


 - [ ] ID-209
[ERC721Enumerable._removeTokenFromAllTokensEnumeration(uint256)](node_modules/@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol#L140-L158) has costly operations inside a loop:
	- [delete _allTokensIndex[tokenId]](node_modules/@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol#L156)

node_modules/@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol#L140-L158


 - [ ] ID-210
[ERC721Enumerable._removeTokenFromOwnerEnumeration(address,uint256)](node_modules/@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol#L115-L133) has costly operations inside a loop:
	- [delete _ownedTokensIndex[tokenId]](node_modules/@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol#L131)

node_modules/@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol#L115-L133


## cyclomatic-complexity
Impact: Informational
Confidence: High
 - [ ] ID-211
[Property.updatePropertyProposal(uint256,uint256,uint256)](contracts/dao/Property.sol#L730-L791) has a high cyclomatic complexity (24).

contracts/dao/Property.sol#L730-L791


 - [ ] ID-212
[Property.proposalProperty(uint256,uint256,string,string)](contracts/dao/Property.sol#L580-L698) has a high cyclomatic complexity (22).

contracts/dao/Property.sol#L580-L698


 - [ ] ID-213
[Property.getPropertyProposalList(uint256)](contracts/dao/Property.sol#L1170-L1192) has a high cyclomatic complexity (22).

contracts/dao/Property.sol#L1170-L1192


## dead-code
Impact: Informational
Confidence: Medium
 - [ ] ID-214
[Context._contextSuffixLength()](node_modules/@openzeppelin/contracts/utils/Context.sol#L25-L27) is never used and should be removed

node_modules/@openzeppelin/contracts/utils/Context.sol#L25-L27


 - [ ] ID-215
[ERC1155._burn(address,uint256,uint256)](node_modules/@openzeppelin/contracts/token/ERC1155/ERC1155.sol#L325-L343) is never used and should be removed

node_modules/@openzeppelin/contracts/token/ERC1155/ERC1155.sol#L325-L343


 - [ ] ID-216
[ERC2981._setTokenRoyalty(uint256,address,uint96)](node_modules/@openzeppelin/contracts/token/common/ERC2981.sol#L94-L99) is never used and should be removed

node_modules/@openzeppelin/contracts/token/common/ERC2981.sol#L94-L99


 - [ ] ID-217
[ERC721._burn(uint256)](node_modules/@openzeppelin/contracts/token/ERC721/ERC721.sol#L299-L320) is never used and should be removed

node_modules/@openzeppelin/contracts/token/ERC721/ERC721.sol#L299-L320


 - [ ] ID-218
[ERC2981._deleteDefaultRoyalty()](node_modules/@openzeppelin/contracts/token/common/ERC2981.sol#L82-L84) is never used and should be removed

node_modules/@openzeppelin/contracts/token/common/ERC2981.sol#L82-L84


 - [ ] ID-219
[Context._msgData()](node_modules/@openzeppelin/contracts/utils/Context.sol#L21-L23) is never used and should be removed

node_modules/@openzeppelin/contracts/utils/Context.sol#L21-L23


 - [ ] ID-220
[ERC721.__unsafe_increaseBalance(address,uint256)](node_modules/@openzeppelin/contracts/token/ERC721/ERC721.sol#L463-L465) is never used and should be removed

node_modules/@openzeppelin/contracts/token/ERC721/ERC721.sol#L463-L465


 - [ ] ID-221
[ERC1155._burnBatch(address,uint256[],uint256[])](node_modules/@openzeppelin/contracts/token/ERC1155/ERC1155.sol#L354-L376) is never used and should be removed

node_modules/@openzeppelin/contracts/token/ERC1155/ERC1155.sol#L354-L376


 - [ ] ID-222
[ERC721._baseURI()](node_modules/@openzeppelin/contracts/token/ERC721/ERC721.sol#L105-L107) is never used and should be removed

node_modules/@openzeppelin/contracts/token/ERC721/ERC721.sol#L105-L107


 - [ ] ID-223
[ERC2981._resetTokenRoyalty(uint256)](node_modules/@openzeppelin/contracts/token/common/ERC2981.sol#L104-L106) is never used and should be removed

node_modules/@openzeppelin/contracts/token/common/ERC2981.sol#L104-L106


 - [ ] ID-224
[ERC2981._setDefaultRoyalty(address,uint96)](node_modules/@openzeppelin/contracts/token/common/ERC2981.sol#L72-L77) is never used and should be removed

node_modules/@openzeppelin/contracts/token/common/ERC2981.sol#L72-L77


 - [ ] ID-225
[ERC1155._mintBatch(address,uint256[],uint256[],bytes)](node_modules/@openzeppelin/contracts/token/ERC1155/ERC1155.sol#L291-L313) is never used and should be removed

node_modules/@openzeppelin/contracts/token/ERC1155/ERC1155.sol#L291-L313


 - [ ] ID-226
[ReentrancyGuard._reentrancyGuardEntered()](node_modules/@openzeppelin/contracts/security/ReentrancyGuard.sol#L74-L76) is never used and should be removed

node_modules/@openzeppelin/contracts/security/ReentrancyGuard.sol#L74-L76


## low-level-calls
Impact: Informational
Confidence: High
 - [ ] ID-227
Low level call in [Address.functionCallWithValue(address,bytes,uint256,string)](node_modules/@openzeppelin/contracts/utils/Address.sol#L128-L137):
	- [(success,returndata) = target.call{value: value}(data)](node_modules/@openzeppelin/contracts/utils/Address.sol#L135)

node_modules/@openzeppelin/contracts/utils/Address.sol#L128-L137


 - [ ] ID-228
Low level call in [Helper.safeTransfer(address,address,uint256)](contracts/libraries/Helper.sol#L36-L44):
	- [(success,data) = token.call(abi.encodeWithSelector(0xa9059cbb,to,value))](contracts/libraries/Helper.sol#L42)

contracts/libraries/Helper.sol#L36-L44


 - [ ] ID-229
Low level call in [Helper.safeApprove(address,address,uint256)](contracts/libraries/Helper.sol#L25-L34):
	- [(success,data) = token.call(abi.encodeWithSelector(0x095ea7b3,to,value))](contracts/libraries/Helper.sol#L32)

contracts/libraries/Helper.sol#L25-L34


 - [ ] ID-230
Low level call in [Helper.safeTransferFrom(address,address,address,uint256)](contracts/libraries/Helper.sol#L46-L55):
	- [(success,data) = token.call(abi.encodeWithSelector(0x23b872dd,from,to,value))](contracts/libraries/Helper.sol#L53)

contracts/libraries/Helper.sol#L46-L55


 - [ ] ID-231
Low level call in [Address.sendValue(address,uint256)](node_modules/@openzeppelin/contracts/utils/Address.sol#L64-L69):
	- [(success,None) = recipient.call{value: amount}()](node_modules/@openzeppelin/contracts/utils/Address.sol#L67)

node_modules/@openzeppelin/contracts/utils/Address.sol#L64-L69


 - [ ] ID-232
Low level call in [Address.functionStaticCall(address,bytes,string)](node_modules/@openzeppelin/contracts/utils/Address.sol#L155-L162):
	- [(success,returndata) = target.staticcall(data)](node_modules/@openzeppelin/contracts/utils/Address.sol#L160)

node_modules/@openzeppelin/contracts/utils/Address.sol#L155-L162


 - [ ] ID-233
Low level call in [Address.functionDelegateCall(address,bytes,string)](node_modules/@openzeppelin/contracts/utils/Address.sol#L180-L187):
	- [(success,returndata) = target.delegatecall(data)](node_modules/@openzeppelin/contracts/utils/Address.sol#L185)

node_modules/@openzeppelin/contracts/utils/Address.sol#L180-L187


 - [ ] ID-234
Low level call in [Helper.safeTransferETH(address,uint256)](contracts/libraries/Helper.sol#L57-L60):
	- [(success,None) = to.call{value: value}(new bytes(0))](contracts/libraries/Helper.sol#L58)

contracts/libraries/Helper.sol#L57-L60


## unused-import
Impact: Informational
Confidence: High
 - [ ] ID-235
The following unused import(s) in test/foundry/mocks/MockUSDC.sol should be removed:
	-import { console } from "lib/forge-std/src/console.sol"; (test/foundry/mocks/MockUSDC.sol#4)

 - [ ] ID-236
The following unused import(s) in test/foundry/utils/BaseTest.sol should be removed:
	-import { ERC20Mock } from "../mocks/ERC20Mock.sol"; (test/foundry/utils/BaseTest.sol#10)

	-import { VabbleNFT } from "../../../contracts/dao/VabbleNFT.sol"; (test/foundry/utils/BaseTest.sol#21)

	-import { MockUSDC } from "../mocks/MockUSDC.sol"; (test/foundry/utils/BaseTest.sol#9)

 - [ ] ID-237
The following unused import(s) in scripts/foundry/HelperConfigFork.s.sol should be removed:
	-import { ERC20Mock } from "../../test/foundry/mocks/ERC20Mock.sol"; (scripts/foundry/HelperConfigFork.s.sol#7)

	-import { MockUSDC } from "../../test/foundry/mocks/MockUSDC.sol"; (scripts/foundry/HelperConfigFork.s.sol#6)

	-import { console2 } from "lib/forge-std/src/console2.sol"; (scripts/foundry/HelperConfigFork.s.sol#5)

## unused-state
Impact: Informational
Confidence: High
 - [ ] ID-238
[HelperConfig.ETH_MAINNET_CHAIN_ID](scripts/foundry/HelperConfig.s.sol#L38) is never used in [HelperConfig](scripts/foundry/HelperConfig.s.sol#L23-L147)

scripts/foundry/HelperConfig.s.sol#L38


 - [ ] ID-239
[HelperConfig.BASE__CHAIN_ID](scripts/foundry/HelperConfig.s.sol#L40) is never used in [HelperConfig](scripts/foundry/HelperConfig.s.sol#L23-L147)

scripts/foundry/HelperConfig.s.sol#L40


## cache-array-length
Impact: Optimization
Confidence: High
 - [ ] ID-240
Loop condition [k < agentList.length](contracts/dao/Property.sol#L998) should use cached array length instead of referencing `length` member of the storage array.
 
contracts/dao/Property.sol#L998


## immutable-states
Impact: Optimization
Confidence: High
 - [ ] ID-241
[Ownablee.VAB_WALLET](contracts/dao/Ownablee.sol#L31) should be immutable 

contracts/dao/Ownablee.sol#L31


