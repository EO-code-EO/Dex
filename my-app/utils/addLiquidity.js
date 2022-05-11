import { Contract, utils } from "ethers";
import {
  EXCHANGE_CONTRACT_ABI,
  EXCHANGE_CONTRACT_ADDRESS,
  TOKEN_CONTRACT_ABI,
  TOKEN_CONTRACT_ADDRESS,
} from "../constants";

/**
 * addLiquidity will add liquidity to the exchange
 * if the user is adding initial liquidity, the user decides the ether
 * and DH tokens the user wants to add to the exchange
 * if the user adds the liquidity after the initial liquidity has already
 * been added, calculate the diamond hands tokens the user can add, given
 * the eth the user wants to add by keeping the ratios constant 
 */
export const addLiquidity = async (
    signer,
    addDHAmountWei,
    addEtherAmountWei
) => {
    try {
        // create a new instance of the token contract
        const tokenContract = new Contract(
            TOKEN_CONTRACT_ADDRESS,
            TOKEN_CONTRACT_ABI,
            signer
        );
        // create a new instance of the exchange contract
        const exchangeContract = new Contract(
            EXCHANGE_CONTRACT_ADDRESS,
            EXCHANGE_CONTRACT_ABI,
            signer
        );
        // since DH tokens are ERC20, the user needs to give the contract
        // allowance to take the required number of DH tokens out of
        // the user's contract
        let tx = await tokenContract.approve(
            EXCHANGE_CONTRACT_ADDRESS, 
            addDHAmountWei.toString()
        );
        await tx.wait();
        // after the contract has approval, add the ether and DH tokens in the liquidity
        tx = await exchangeContract.addLiquidity(addDHAmountWei, {
            value: addEtherAmountWei,
        });
        await tx.wait();
    } catch (err) {
        console.error(err);
    }
}

/**
 * calculateDH calculates the DH tokens that need to be added to the liquidity
 * given '_addEtherAmountWei' amount of ether
 */
export const calculateDH = async (
    _addEther = "0",
    etherBalanceContract,
    dhTokenReserve
) => {
    // '_addEther' is a string that needs to be converted to a Big Number before
    // calculations can be done
    // it is done using 'parseEther' from 'ethers.js'
    const _addEtherAmountWei = utils.parseEther(_addEther);
    // ratio needs to be maintained when adding liquidity
    // need to let the user know from the specific amount of Ether how many DH tokens
    // the user can add so the price impact is not large
    // ratio is -> (amount of Diamond Hands tokens to be added) / (Diamond Hands tokens balance)
    //              = (Ether to be added) / (Eth reserve in the contract)
    // so, (amount of Diamond Hands tokens to be added) 
    //      = (ether that would be added * Diamond Hands tokens balance) / (eth reserve in the contract)
    const diamondHandsTokenAmount = _addEtherAmountWei
        .mul(dhTokenReserve)
        .div(etherBalanceContract);
    return diamondHandsTokenAmount;
};