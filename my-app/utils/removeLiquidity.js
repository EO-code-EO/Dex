import { Contract, providers, utils, BigNumber } from "ethers";
import { EXCHANGE_CONTRACT_ABI, EXCHANGE_CONTRACT_ADDRESS } from "../constants";

/**
 * removeLiquidity: Removes the 'removeLPTokensWei' amount of LP tokens from
 * liquidity and also the calculated amount 'ether' and 'DH' tokens
 */
export const removeLiquidity = async (signer, removeLPTokensWei) => {
    // create a new instance of the exchange contract
    const exchangeContract = new Contract(
        EXCHANGE_CONTRACT_ADDRESS,
        EXCHANGE_CONTRACT_ABI,
        signer
    );
    const tx = await exchangeContract.removeLiquidity(removeLPTokensWei);
    await tx.wait();
};

/**
 * getTokensAfterRemove: Calculates the amount 'Ether' and 'DH' tokens
 * that would be returned back to the user after the user removes
 * 'removeLPTokensWei' amount of LP tokens from the contract
 */
export const getTokensAfterRemove = async (
    provider,
    removeLPTokensWei,
    _ethBalance,
    diamondHandsTokenReserve
) => {
    try {
        // create a new instance of the exchange contract
        const exchangeContract = new Contract(
            EXCHANGE_CONTRACT_ADDRESS,
            EXCHANGE_CONTRACT_ABI,
            provider
        );
        // get the total supply of 'Diamond Hands' LP tokens
        const _totalSupply = await exchangeContract.totalSupply();
        /*
            Big Number methods of multiplication and division are used
            Amount of ether that would be sent back to the user after the user
            withdraws the LP token is calculated based on a certain ratio
            Ratio is -> (amount of ether that would be sent back to the user / eth reserves)
                        = (LP tokens withdrawn) / (total supply of LP tokens)
            So, (amount of ether that would be sent back to the user)
                    = (eth reserve * LP tokens withdrawn) / (total supply of LP tokens)
            Also maintain a ratio for the 'DH' tokens
            Ratio is -> (amount of DH tokens sent back to the user / DH token reserve)
                            = (LP tokens withdrawn) / (total supply of LP tokens)
            So, (amount of DH tokens sent back to the user)
                    = (DH token reserve * LP tokens withdrawn) / (total supply of LP tokens)
        */
        const _removeEther = _ethBalance.mul(removeLPTokensWei).div(_totalSupply);
        const _removeDH = diamondHandsTokenReserve.mul(removeLPTokensWei).div(_totalSupply);
        return {
            _removeEther, 
            _removeDH,
        };
    } catch (err) {
        console.error(err);
    }
};