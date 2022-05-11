import { Contract } from "ethers";
import {
  EXCHANGE_CONTRACT_ABI,
  EXCHANGE_CONTRACT_ADDRESS,
  TOKEN_CONTRACT_ABI,
  TOKEN_CONTRACT_ADDRESS,
} from "../constants";

/**
 * getAmountOfTokensReceivedFromSwap: Returns the number of Eth/Diamond Hands tokens that
 * can be received when the user swaps '_swapAmountWei' amount of Eth/Diamond Hands tokens
 */
export const getAmountOfTokensReceivedFromSwap = async (
    _swapAmountWei,
    provider,
    ethSelected,
    ethBalance,
    reservedDH
) => {
    // create a new instance of the exchange contract
    const exchangeContract = new Contract(
        EXCHANGE_CONTRACT_ADDRESS,
        EXCHANGE_CONTRACT_ABI,
        provider
    );
    let amountOfTokens;
    // if ETH is selected, the input value is 'Eth' and the input amount would be
    // '_swapAmountWei', the input reserve would be 'ethBalance' of the contract and
    // output reserve would be the 'Diamond Hands token' reserve
    if (ethSelected) {
        amountOfTokens = await exchangeContract.getAmountOfTokens(
            _swapAmountWei,
            ethBalance,
            reservedDH
        );
    } else {
        // if ETH is not selected, the input value is 'Diamond Hands' tokens so the input
        // amount is '_swapAmountWei', the input reserve is 'Diamond Hands token' reserve
        // of the contract and output reserve is the 'ethBalance'
        amountOfTokens = await exchangeContract.getAmountOfTokens(
            _swapAmountWei,
            reservedDH,
            ethBalance
        );
    }

    return amountOfTokens;
};

/**
 * swapTokens: Swaps 'swapAmountWei' of Eth/Diamond Hands tokens with 'tokenToBeReceivedAfterSwap'
 * amount of Eth/Diamond Hands tokens
 */
export const swapTokens = async (
    signer,
    swapAmountWei,
    tokenToBeReceivedAfterSwap,
    ethSelected
) => {
    // create a new instance of the exchange contract
    const exchangeContract = new Contract(
        EXCHANGE_CONTRACT_ADDRESS,
        EXCHANGE_CONTRACT_ABI,
        signer
    );
    const tokenContract = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_ABI,
        signer
    );
    let tx;
    // if Eth is selected, call the 'ethToDiamondsHandsToken' function else
    // call the 'diamondHandsTokenToEth' function from the contract
    // Need to pass the 'swapAmount' as a value to the function b/c it is
    // the ether we are paying to the contract, instead of a value
    // to be passed to the function
    if (ethSelected) {
        tx = await exchangeContract.ethToDiamondHandsToken(
            tokenToBeReceivedAfterSwap,
            {
                value: swapAmountWei,
            }
        );
    } else {
        // user has to approve 'swapAmountWei' for the contract b/c 'Diamond Hands token' is an ERC20
        tx = await tokenContract.approve(
            EXCHANGE_CONTRACT_ADDRESS,
            swapAmountWei.toString()
        );
        await tx.wait();
        // call diamondHandsTokenToEth function which would take in 'swapAmountWei' of Diamond Hands token
        // and would send back 'tokenToBeReceivedAfterSwap' amount of ether to the user
        tx = await exchangeContract.diamondHandsTokenToEth(
            swapAmountWei,
            tokenToBeReceivedAfterSwap
        );
    }
    await tx.wait();
};