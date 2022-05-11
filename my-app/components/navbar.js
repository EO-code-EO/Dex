import Link from 'next/link';
import Image from 'next/image';

const Navbar = () => {
    return (
        <nav>
            <div className="logo">
                <Image src="/diamondhands.svg" alt="site logo" width={128} height={77}/>
            </div>
            <Link href="/"><a>Swap</a></Link>
            <Link href="/liquidity"><a>Liquidity</a></Link>
        </nav>
    );
}
 
export default Navbar;