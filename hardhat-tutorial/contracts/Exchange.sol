// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Exchange is ERC20 {
    address public diamondHandsTokenAddress;

    // exchange is inheriting ERC20 b/c our exchange has to keep track of the Diamond Hands LP tokens
    constructor(address _DiamondHandsToken)
        ERC20("DiamondHands LP Token", "DHLP")
    {
        require(
            _DiamondHandsToken != address(0),
            "Token address passed is a null address"
        );
        diamondHandsTokenAddress = _DiamondHandsToken;
    }

    /**
     * @dev Returns the amount of 'Diamond Hands Tokens' held by the contract
     */
    function getReserve() public view returns (uint256) {
        return ERC20(diamondHandsTokenAddress).balanceOf(address(this));
    }

    /**
     * @dev Adds liquidity to the exchange
     */
    function addLiquidity(uint256 _amount) public payable returns (uint256) {
        uint256 liquidity;
        uint256 ethBalance = address(this).balance;
        uint256 diamondHandsTokenReserve = getReserve();
        ERC20 diamondHandsToken = ERC20(diamondHandsTokenAddress);
        /*
            If the reserve is empty, there is currently no ratio
            So take in any user supplied values for 'Ether' and 'Diamond Hands' tokens
        */

        if (diamondHandsTokenReserve == 0) {
            // transfer the 'diamondHandsToken' address from the user's account to the contract
            diamondHandsToken.transferFrom(msg.sender, address(this), _amount);
            /*
                take the current ethBalance and mint 'ethBalance' amount of LP tokens to the user,
                'liquidity' provided is equal to 'ethBalance' because the first time user
                is adding 'Eth' to the contract, so whatever 'Eth' the contract has is equal to the
                one supplied by the user in the current 'addLiquidity' call
                'liquidity' tokens that need to be minted to the user on 'addLiquidity' call should
                always be proportional to the eth specified by the user
            */
            liquidity = ethBalance;
            _mint(msg.sender, liquidity);
        } else {
            /*
                if the reserve is not empty, take in any user supplied value for 'Ether' and determine
                how many 'Diamond Hands' tokens need to be supplied according to the ratio to prevent any
                large price impacts because of the additional liquidity
                
                ethReserve should be the current ethBalance subtracted by the value of ether sent by the user
                in the current 'addLiquidity' call
            */
            uint256 ethReserve = ethBalance - msg.value;
            // ratio should always be maintained so there are no price impacts when adding liquidity
            // ratio is -> (diamondHandsTokenAmount user can add/diamondHandsTokenReserve in the contract) = (Eth sent by the user/Eth reserve in the contract)
            // so, (diamondHandsTokenAmount user can add) = (Eth sent by the user * diamondHandsTokenReserve/Eth reserve)
            uint256 diamondHandsTokenAmount = (msg.value *
                diamondHandsTokenReserve) / (ethReserve);
            require(
                _amount >= diamondHandsTokenAmount,
                "Amount of tokens sent is less than the minimum tokens required"
            );
            // transfer only (diamondHandsTokenAmount user can add) amount of 'Diamond Hands tokens' from user's account to the contract
            diamondHandsToken.transferFrom(
                msg.sender,
                address(this),
                diamondHandsTokenAmount
            );
            // the amount of LP tokens that would be sent to the user should be proportional to the liquidity of ether added by the user
            // ratio is (LP tokens to be sent to user(liquidity) / totalSupply of LP tokens in contract) = (eth sent by the user) / (eth reserve in the contract)
            // so, liquidity = (totalSupply of LP tokens in contract * (eth sent by user)) / (ethReserve in the contract)
            liquidity = (totalSupply() * msg.value) / ethReserve;
            _mint(msg.sender, liquidity);
        }

        return liquidity;
    }

    /**
     * @dev Returns the amount of Eth/Diamond Hands Tokens that would be returned to the user in the swap
     */
    function removeLiquidity(uint256 _amount)
        public
        returns (uint256, uint256)
    {
        require(_amount > 0, "_amount should be greater than 0");
        uint256 ethReserve = address(this).balance;
        uint256 _totalSupply = totalSupply();
        // the amount of Eth that would be sent back to the user is based on a specific ratio
        // ratio is -> (Eth sent back to the user / current eth reserve) = (current eth reserve * amount of LP tokens that user wants to withdraw) / total supply of LP tokens
        // (eth sent back to the user) = (current eth reserve * amount of LP tokens that the user wants to withdraw) / total supply of LP tokens
        uint256 ethAmount = (ethReserve * _amount) / _totalSupply;
        // amount of Diamond Hands token that would be sent back to the user is based on a ratio
        // ratio is -> (Diamond Hands sent back to the user / current Diamond Hands token reserve) = (amount of LP tokens that user wants to withdraw) / total supply of LP tokens
        // so, (Diamond Hands sent back to the user) = (current Diamond Hands token reserve * amount of LP tokens the user wants to withdraw) / total supply of LP tokens
        uint256 diamondHandsTokenAmount = (getReserve() * _amount) /
            _totalSupply;
        // burn the sent LP tokens from the user's wallet b/c they are already sent to remove liquidity
        _burn(msg.sender, _amount);
        // transfer 'ethAmount' of Eth from the contract to the user's wallet
        payable(msg.sender).transfer(ethAmount);
        // transfer 'diamondHandsTokenAmount' of 'Diamond Hands' tokens from the contract to the user's wallet
        ERC20(diamondHandsTokenAddress).transfer(
            msg.sender,
            diamondHandsTokenAmount
        );
        return (ethAmount, diamondHandsTokenAmount);
    }

    /**
     * @dev Returns the amount of Eth/Diamond Hands tokens that would be returned to the user in the swap
     */
    function getAmountOfTokens(
        uint256 inputAmount,
        uint256 inputReserve,
        uint256 outputReserve
    ) public pure returns (uint256) {
        require(inputReserve > 0 && outputReserve > 0, "invalid reserves");
        // we are charging a fees of '1%'
        // input amount with fees = (input amount - (1 * (input amount) / 100)) = ((input amount) * 99) / 100
        uint256 inputAmountWithFee = inputAmount * 99;
        // need to follow the 'XY = K' curve
        // we need to make sure (X + deltaX) * (Y - deltaY) = (X) * (Y)
        // so final formula is deltaY = (Y * deltaX) / (X + deltaX)
        // deltaY in this case is 'tokens to be received'
        // deltaX = ((input amount) * 99) / 100, x = inputReserve, y = outputReserve
        // so by putting the values in formula you can get the numerator and denominator
        uint256 numerator = inputAmountWithFee * outputReserve;
        uint256 denominator = (inputReserve * 100) + inputAmountWithFee;
        return numerator / denominator;
    }

    /**
     * @dev Swaps Ether for DiamondHands tokens
     */
    function ethToDiamondHandsToken(uint256 _minTokens) public payable {
        uint256 tokenReserve = getReserve();
        // call the 'getAmountOfTokens' to get the amount of Diamond Hands tokens
        // that would be returned to the user after the swap
        // 'inputReserve' we are sending is equal to 'address(this).balance - msg.value'
        // instead of 'address(this).balance' since 'address(this).balance' already contains
        // the 'msg.value' the user has sent in the given call so we need need to subtract it
        // to get the actual input reserve
        uint256 tokensBought = getAmountOfTokens(
            msg.value,
            address(this).balance - msg.value,
            tokenReserve
        );

        require(tokensBought >= _minTokens, "insufficient output amount");
        // transfer the 'Diamond Hands' tokens to the user
        ERC20(diamondHandsTokenAddress).transfer(msg.sender, tokensBought);
    }

    /**
     * @dev Swaps DiamondHands tokens for Ether
     */
    function diamondHandsTokenToEth(uint256 _tokensSold, uint256 _minEth)
        public
    {
        uint256 tokenReserve = getReserve();
        // call the `getAmountOfTokens` to get the amount of ether
        // that would be returned to the user after the swap
        uint256 ethBought = getAmountOfTokens(
            _tokensSold,
            tokenReserve,
            address(this).balance
        );
        require(ethBought >= _minEth, "insufficient output amount");
        // Transfer `Diamond Hands` tokens from the user's address to the contract
        ERC20(diamondHandsTokenAddress).transferFrom(
            msg.sender,
            address(this),
            _tokensSold
        );
        // send the `ethBought` to the user from the contract
        payable(msg.sender).transfer(ethBought);
    }
}
