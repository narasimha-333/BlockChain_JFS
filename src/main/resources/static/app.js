// NOTE: This code assumes the 'qrcode.js' (for generation) and
// 'html5-qrcode.min.js' (for scanning) libraries are included in the HTML files.

const API_URL = 'http://localhost:8080/api';

// --- GLOBAL STATE ---
let CURRENT_USER_ID = null;
let ALL_USERS = [];
let html5QrCode = null;
let stockPriceChart = null; // Global variable to hold the chart instance


// ----------------------------------------------------------------------
// CORE ROUTING & INITIALIZATION
// ----------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    // Initialize QR scanner instance if the element exists
    if (document.getElementById('qr-reader')) {
        html5QrCode = new Html5Qrcode("qr-reader");
    }

    const pathname = window.location.pathname;
    const loggedInUserId = localStorage.getItem('securepay_user_id');

    // 1. GLOBAL LOGIN CHECK: Ensure CURRENT_USER_ID is set if available.
    if (loggedInUserId) {
        CURRENT_USER_ID = parseInt(loggedInUserId);
    } else if (!pathname.includes('login.html') && !pathname.includes('user.html')) {
        // If the ID is missing and we're not on the login/create page, redirect to login.
        window.location.href = 'login.html';
        return;
    }

    // 2. ROUTING LOGIC: Execute page-specific setup functions
    if (pathname.includes('login.html') || pathname === '/' || pathname.endsWith('index.html')) {
        handleLoadBasedOnPath(pathname);
    } else if (pathname.includes('user.html')) {
        handleCreateUserViewLoad();
    } else if (pathname.includes('payment.html')) {
        // If CURRENT_USER_ID is set, proceed with page load
        handlePaymentPageLoad();
    } else if (pathname.includes('profile.html')) {
        handleProfilePageLoad();
    } else if (pathname.includes('stock.html')) {
        // If loggedInUserId is present, the inline script on stock.html handles the load.
    }
});

/**
 * Routes the initial load based on the URL path.
 */
function handleLoadBasedOnPath(pathname) {
    if (localStorage.getItem('securepay_user_id') && !pathname.includes('login.html') && pathname !== '/') {
        handleDashboardLoad();
    } else if (pathname.includes('login.html') || pathname === '/') {
        handleLoginViewLoad();
    } else if (pathname.includes('index.html')) {
        if (localStorage.getItem('securepay_user_id')) {
            handleDashboardLoad();
        } else {
            window.location.href = 'login.html';
        }
    }
}

/**
 * Handles the logic for the dedicated login.html page.
 */
function handleLoginViewLoad() {
    if (localStorage.getItem('securepay_user_id')) {
        window.location.href = 'index.html';
        return;
    }

    const loginBtn = document.getElementById('login-btn');
    const loginSelect = document.getElementById('login-select');
    const createUserRedirectBtn = document.getElementById('create-user-redirect-btn');

    if (loginBtn) loginBtn.addEventListener('click', handleLogin);
    if (loginSelect) loginSelect.addEventListener('change', () => {
        if (loginBtn) loginBtn.disabled = !loginSelect.value;
    });

    if(createUserRedirectBtn) createUserRedirectBtn.addEventListener('click', () => {
        window.location.href = 'user.html';
    });

    loadLoginPanelUsers();
}

/**
 * Handles the logic for the dedicated user.html page.
 */
function handleCreateUserViewLoad() {
    const createUserBtn = document.getElementById('createUserBtn');
    const backToLoginBtn = document.getElementById('back-to-login-btn');

    if (createUserBtn) createUserBtn.addEventListener('click', handleCreateUserAndLogin);
    if (backToLoginBtn) backToLoginBtn.addEventListener('click', () => {
        window.location.href = 'login.html';
    });
}

/**
 * Handles the logic for the dedicated index.html (Dashboard).
 */
async function handleDashboardLoad() {
    // Note: Login check now happens in DOMContentLoaded block

    await loadAllUsersAndSetUserInfo();

    if (localStorage.getItem('session_refresh_needed') === 'true') {
        localStorage.removeItem('session_refresh_needed');
    }

    document.getElementById('user-info')?.classList.remove('hidden');

    setupDashboardEventListeners();
    getUserBalance(CURRENT_USER_ID);
    getTransactions();
    getBlockchain();

    // NOTE: Stock functions removed from here and moved to stock.html load logic.

    renderQuickPayContacts();
}

/**
 * Handles the logic for the dedicated payment.html page.
 */
async function handlePaymentPageLoad() {
    // Note: Login check now happens in DOMContentLoaded block

    await loadAllUsersAndSetUserInfo();

    setupPaymentEventListeners();
    loadPaymentContext();

    const paymentView = document.getElementById('payment-view');
    if (paymentView) paymentView.classList.remove('hidden');
}

/**
 * Handles the logic for the dedicated profile.html page.
 */
async function handleProfilePageLoad() {
    // Note: Login check now happens in DOMContentLoaded block

    await loadAllUsersAndSetUserInfo();

    fetchProfileData();
}

// ----------------------------------------------------------------------
// LOGIN/LOGOUT & USER CREATION LOGIC
// ----------------------------------------------------------------------

async function loadLoginPanelUsers() {
    const select = document.getElementById('login-select');
    const loginBtn = document.getElementById('login-btn');
    const errorMsg = document.getElementById('login-error');

    try {
        const users = await fetchData('/users');
        ALL_USERS = users;

        if (!users || users.length === 0) {
            if (select) select.innerHTML = '<option value="" disabled selected>No users found. Create one using the button below.</option>';
            if (loginBtn) loginBtn.disabled = true;
            return;
        }

        if (select) {
            select.innerHTML = '<option value="" disabled selected>-- Select a User ID to Log In --</option>';
            ALL_USERS.forEach(u => {
                const option = document.createElement('option');
                option.value = u.id;
                option.textContent = `ID ${u.id}: ${u.name} (Balance: ₹${parseFloat(u.balance).toFixed(2)})`;
                select.appendChild(option);
            });
            loginBtn.disabled = true;
        }


    } catch (e) {
        console.error("Failed to load users for login panel:", e);
        if (errorMsg) errorMsg.classList.remove('hidden');
        if (select) select.innerHTML = '<option value="" disabled selected>Failed to load users.</option>';
        if (loginBtn) loginBtn.disabled = true;
    }
}

async function loadAllUsersAndSetUserInfo() {
    try {
        const users = await fetchData('/users');
        ALL_USERS = users;
        const user = ALL_USERS.find(u => u.id === CURRENT_USER_ID);

        if (user) {
            // Set User Info for index.html header
            document.getElementById('user-info')?.classList.remove('hidden');
            document.getElementById('current-user-name').textContent = user.name;
            document.getElementById('current-user-id').textContent = user.id;

            // Set User Info for profile.html header (if on that page)
            const profileFullName = document.getElementById('fullName');
            if (profileFullName) profileFullName.textContent = user.name;

            const profileAccountId = document.getElementById('accountId');
            if (profileAccountId) profileAccountId.textContent = user.id;

            const profileEmail = document.getElementById('email');
            if (profileEmail) profileEmail.textContent = user.email;

            const avatar = document.getElementById('avatar');
            if (avatar) avatar.textContent = user.name.charAt(0).toUpperCase();

            // Set the profile form fields (for editing)
            const nameParts = user.name.split(' ');
            if(document.getElementById('firstName')) document.getElementById('firstName').value = nameParts[0] || '';
            if(document.getElementById('lastName')) document.getElementById('lastName').value = nameParts.slice(1).join(' ') || '';

        } else {
            // User not found, force log out
            handleLogout();
        }
    } catch (e) {
        console.error("Failed to load user list in dashboard context.", e);
        document.getElementById('user-info').textContent = 'Error loading user data.';
    }
}


function handleLogin() {
    const selectedId = document.getElementById('login-select')?.value;
    if (!selectedId) return;

    localStorage.setItem('securepay_user_id', selectedId);
    window.location.href = 'index.html';
}

function handleLogout() {
    CURRENT_USER_ID = null;
    localStorage.removeItem('securepay_user_id');

    window.location.href = 'login.html';
}


/**
 * Handles user creation from user.html and immediately logs the user in.
 */
async function handleCreateUserAndLogin() {
    const nameInput = document.getElementById("createUserName");
    const emailInput = document.getElementById("createUserEmail");
    const balanceInput = document.getElementById("createUserBalance");

    const name = nameInput?.value.trim();
    const email = emailInput?.value.trim();
    const balance = balanceInput?.value.trim() || 0;

    if (!name) return alert("Please enter a name for the new test user.");

    const createUserBtn = document.getElementById('createUserBtn');
    if (createUserBtn) {
        createUserBtn.disabled = true;
        createUserBtn.textContent = 'Creating...';
    }


    const user = await fetchData('/users', 'POST', { name, email, balance: parseFloat(balance) });
    if (user) {
        alert(`✅ Wallet created successfully! ID: ${user.id}. Redirecting to dashboard.`);

        localStorage.setItem('securepay_user_id', user.id);

        window.location.href = 'index.html';
    }
}

// ----------------------------------------------------------------------
// EVENT LISTENERS (DASHBOARD - index.html)
// ----------------------------------------------------------------------

function setupDashboardEventListeners() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

    const quickActionsBar = document.getElementById('quick-actions-bar');
    if (quickActionsBar) {
        // Scan QR button
        quickActionsBar.querySelector('a:nth-child(1)').onclick = (e) => {
            e.preventDefault();
            navigateToPayment(null, 'scan');
        };
        // Send Payment button
        quickActionsBar.querySelector('a:nth-child(2)').onclick = (e) => {
            e.preventDefault();
            navigateToPayment();
        };
    }

    if(document.getElementById('show-send-btn')) document.getElementById('show-send-btn').addEventListener('click', () => {
        navigateToPayment();
    });

    if(document.getElementById('profile-pay-btn')) document.getElementById('profile-pay-btn').addEventListener('click', function() {
        const recipientId = this.dataset.recipientId;
        document.getElementById('profile-modal')?.classList.add('hidden');
        navigateToPayment(parseInt(recipientId));
    });

    if(document.getElementById('close-profile-modal-btn')) document.getElementById('close-profile-modal-btn').addEventListener('click', () => {
        document.getElementById('profile-modal')?.classList.add('hidden');
        getTransactions(); // Refresh transactions after modal closes
    });

    if(document.getElementById('profile-history-btn')) document.getElementById('profile-history-btn').addEventListener('click', function() {
        const recipientId = parseInt(this.dataset.recipientId);
        showUserHistory(recipientId);
    });

    if(document.getElementById('show-receive-btn')) document.getElementById('show-receive-btn').addEventListener('click', showReceiveModal);
    if(document.getElementById('close-receive-modal-btn')) document.getElementById('close-receive-modal-btn').addEventListener('click', () => {
        document.getElementById('receive-modal')?.classList.add('hidden');
    });

    // NOTE: Stock listeners are now exclusively set up in the stock.html's inline script.


    // Make utility functions available globally for HTML event handlers (Admin Panel)
    window.toggleAdminPanel = () => {
        document.getElementById('admin-panel')?.classList.toggle('hidden');
    };
    window.mineBlock = mineBlock;
    window.getUsers = getUsers;
    window.getBlockchain = getBlockchain;
    window.getTransactions = getTransactions;
}


// ----------------------------------------------------------------------
// EVENT LISTENERS (PAYMENT PAGE - payment.html)
// ----------------------------------------------------------------------

function setupPaymentEventListeners() {
    if(document.getElementById('back-to-dashboard-btn')) document.getElementById('back-to-dashboard-btn').addEventListener('click', () => {
        window.location.href = 'index.html';
    });

    if(document.getElementById('scan-qr-btn')) document.getElementById('scan-qr-btn').addEventListener('click', showScanModal);
    if(document.getElementById('close-scan-modal-btn')) document.getElementById('close-scan-modal-btn').addEventListener('click', closeScanModal);

    if(document.getElementById('cancel-send-btn')) document.getElementById('cancel-send-btn').addEventListener('click', () => {
        window.location.href = 'index.html';
    });

    if(document.getElementById('close-modal-btn')) document.getElementById('close-modal-btn').addEventListener('click', () => {
        document.getElementById('confirmation-modal')?.classList.add('hidden');
    });

    if(document.getElementById('send-form')) document.getElementById('send-form').addEventListener('submit', function(e) {
        e.preventDefault();
        showConfirmationModal();
    });

    if(document.getElementById('final-confirm-btn')) document.getElementById('final-confirm-btn').addEventListener('click', function() {
        sendTransaction();
    });

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
}

// ----------------------------------------------------------------------
// CONTEXT LOADING (MPA Adaptation)
// ----------------------------------------------------------------------

function navigateToPayment(recipientId = null, action = null) {
    if (!CURRENT_USER_ID) {
        window.location.href = 'login.html';
        return;
    }
    let url = 'payment.html';
    const params = [];

    if (recipientId) {
        params.push(`recipientId=${recipientId}`);
    }
    if (action) {
        params.push(`action=${action}`);
    }

    if (params.length > 0) {
        url += '?' + params.join('&');
    }

    window.location.href = url;
}

async function loadPaymentContext() {
    if (!CURRENT_USER_ID) return;
    const params = new URLSearchParams(window.location.search);
    const recipientId = params.get('recipientId');
    const action = params.get('action');

    if (recipientId) {
        document.getElementById('receiverId').value = recipientId;
    }

    if (action === 'scan') {
        showScanModal();
    }
}

// ----------------------------------------------------------------------
// API FETCH UTILITY
// ----------------------------------------------------------------------

/**
 * Generic utility for fetching data from the API.
 */
async function fetchData(endpoint, method = 'GET', body = null) {
    try {
        const url = API_URL + endpoint;
        const options = { method, headers: { 'Content-Type': 'application/json' } };
        if (body) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);

        if (!response.ok) {
            // Handle specific successful non-OK statuses
            if (method === 'DELETE' && response.status === 204) return true;
            if (endpoint === '/mine' && response.status === 204) return null;

            // Handle stock API errors gracefully, returning the error text
            if (endpoint.includes('/stocks/price') || endpoint.includes('/stocks/search') || endpoint.includes('/stocks/series')) {
                return await response.text();
            }

            const errorText = await response.text();
            throw new Error(`API Error (${response.status}): ${errorText}`);
        }

        // Handle responses that return raw text (like the AI analysis or Stock price/search)
        if (endpoint.includes('/analyze-transaction') || endpoint.includes('/stocks/price') || endpoint.includes('/stocks/search') || endpoint.includes('/stocks/series')) {
            return response.text();
        }

        if (response.status === 204) return true; // No Content

        return response.json();
    } catch (error) {
        console.error('Fetch Error:', error);
        alert(`Operation Failed: ${error.message}`);
        return null;
    }
}

// ----------------------------------------------------------------------
// CORE DASHBOARD & PROFILE FUNCTIONS
// ----------------------------------------------------------------------

async function getUserBalance(userId) {
    if (!userId) return;

    const balanceElement = document.getElementById('user-balance');
    if (!balanceElement) return;

    balanceElement.textContent = '...';
    try {
        const balance = await fetchData(`/users/${userId}/balance`);
        if (balance !== null) {
            balanceElement.textContent = parseFloat(balance).toFixed(2);
        }
    } catch (e) {
        console.error("Failed to fetch user balance:", e);
        balanceElement.textContent = 'N/A';
    }
}

/**
 * Fetches and displays balance and history for the dedicated profile page.
 */
async function fetchProfileData() {
    if (!CURRENT_USER_ID) return;

    // 1. Fetch Balance
    const balanceElement = document.getElementById('user-balance');
    if (balanceElement) {
        balanceElement.textContent = '...';
        try {
            const balance = await fetchData(`/users/${CURRENT_USER_ID}/balance`);
            if (balance !== null) {
                balanceElement.textContent = parseFloat(balance).toFixed(2);
            }
        } catch (e) {
            console.error("Failed to fetch user balance for profile:", e);
            balanceElement.textContent = 'N/A';
        }
    }

    // 2. Fetch History (using a simplified table for profile)
    const tbody = document.getElementById("profile-transactions-tbody");
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-gray-500">Loading transactions...</td></tr>';

    const txs = await fetchData('/transactions');

    if (txs) {
        tbody.innerHTML = "";

        const userTxs = txs.filter(tx =>
            (tx.sender?.id === CURRENT_USER_ID) || (tx.receiver?.id === CURRENT_USER_ID)
        );

        userTxs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Limit to 10 for the profile page view
        userTxs.slice(0, 10).forEach(tx => {
            const isSender = tx.sender?.id === CURRENT_USER_ID;

            const counterpartyId = isSender ? tx.receiver?.id : tx.sender?.id;
            const counterparty = ALL_USERS.find(u => u.id === counterpartyId);
            // Handle mining pool (ID 0) or unknown user case
            const counterpartyName = counterparty ? counterparty.name : (counterpartyId === 0 ? 'Mining Pool' : `ID ${counterpartyId}`);

            const detail = isSender ? `Sent to ${counterpartyName}` : `Received from ${counterpartyName}`;

            const amountDisplay = isSender
                ? `<span class="tx-row-debit font-semibold">- ₹${parseFloat(tx.amount).toFixed(2)}</span>`
                : `<span class="tx-row-credit font-semibold">+ ₹${parseFloat(tx.amount).toFixed(2)}</span>`;

            let statusBadge = tx.status === "MINED" ? "CONFIRMED" : "PENDING";
            let statusColor = tx.status === "MINED" ? "text-green-600" : "text-yellow-600"; // Assuming tx-row-credit/debit classes will set the color

            const row = `
                <tr>
                    <td class="py-2 px-1 whitespace-nowrap text-xs text-gray-400">${tx.createdAt ? new Date(tx.createdAt).toLocaleTimeString() : 'N/A'}</td>
                    <td class="py-2 px-1 whitespace-nowrap text-sm text-gray-700">${detail}</td>
                    <td class="py-2 px-1 whitespace-nowrap text-sm font-bold">${amountDisplay}</td>
                    <td class="py-2 px-1 whitespace-nowrap text-xs ${statusColor}">${statusBadge}</td>
                </tr>`;
            tbody.innerHTML += row;
        });

        if (userTxs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-gray-500">No transactions recorded.</td></tr>';
        }
    }
}


async function getTransactions() {
    if (!CURRENT_USER_ID) return;

    const tbody = document.getElementById("transactions-tbody");
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-gray-500">Loading transactions...</td></tr>';

    const txs = await fetchData('/transactions');

    if (txs) {
        tbody.innerHTML = "";

        const userTxs = txs.filter(tx =>
            (tx.sender?.id === CURRENT_USER_ID) || (tx.receiver?.id === CURRENT_USER_ID)
        );

        userTxs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        userTxs.forEach(tx => {
            const isSender = tx.sender?.id === CURRENT_USER_ID;

            const counterpartyId = isSender ? tx.receiver?.id : tx.sender?.id;
            const counterparty = ALL_USERS.find(u => u.id === counterpartyId);
            // Handle mining pool (ID 0) or unknown user case
            const counterpartyName = counterparty ? counterparty.name : (counterpartyId === 0 ? 'Mining Pool' : `ID ${counterpartyId}`);

            const direction = isSender
                ? `<span class="font-medium">To: ${counterpartyName}</span>`
                : `<span class="font-medium">From: ${counterpartyName}</span>`;

            const amountDisplay = isSender
                ? `<span class="text-secondary-red">- ₹${parseFloat(tx.amount).toFixed(2)}</span>`
                : `<span class="text-green-500">+ ₹${parseFloat(tx.amount).toFixed(2)}</span>`;

            let statusBadge;
            let statusColor;

            switch(tx.status) {
                case "MINED":
                    statusBadge = "✅ CONFIRMED";
                    statusColor = "bg-primary-red text-white";
                    break;
                case "PENDING":
                    statusBadge = "⏳ PENDING";
                    statusColor = "bg-yellow-800 text-white";
                    break;
                default:
                    statusBadge = tx.status;
                    statusColor = "bg-gray-600 text-text-light";
            }

            const feeDisplay = tx.networkFee ? `₹${parseFloat(tx.networkFee).toFixed(6)}` : 'N/A';
            const detailsLink = tx.transactionHash
                ? `<button onclick="showBlockchainDetails('${tx.transactionHash}')" class="text-secondary-red hover:text-primary-red underline text-xs">View Hash</button>`
                : 'N/A';

            const row = `
                <tr class="hover:bg-gray-700 transition-colors">
                    <td class="px-3 py-2 whitespace-nowrap text-sm text-gray-400">${tx.createdAt ? new Date(tx.createdAt).toLocaleTimeString() : 'N/A'}</td>
                    <td class="px-3 py-2 whitespace-nowrap text-sm text-text-light">${direction}</td>
                    <td class="px-3 py-2 whitespace-nowrap text-sm font-semibold">${amountDisplay}</td>
                    <td class="px-3 py-2 whitespace-nowrap text-xs text-gray-400">${feeDisplay}</td>
                    <td class="px-3 py-2 whitespace-nowrap">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColor}">${statusBadge}</span>
                    </td>
                    <td class="px-3 py-2 whitespace-nowrap text-sm">${detailsLink}</td>
                </tr>`;
            tbody.innerHTML += row;
        });

        if (userTxs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-gray-400">No transactions for this user yet.</td></tr>';
        }
    }
}


/**
 * NEW: Fetches the latest stock price for AAPL and updates the Market Watch card.
 */
async function fetchStockData() {
    const symbol = "AAPL";
    const priceElement = document.getElementById("aapl-price");
    const statusElement = document.getElementById("aapl-status");

    if (!priceElement || !statusElement) return;

    priceElement.textContent = '...';
    statusElement.textContent = 'Fetching market data...';

    try {
        // Call the new Spring Boot controller endpoint
        const priceString = await fetchData(`/stocks/price/${symbol}`);

        const price = parseFloat(priceString);

        if (isNaN(price)) {
            priceElement.textContent = priceString; // Display error message or 'N/A'
            statusElement.textContent = "Data unavailable or stale.";
            statusElement.className = "text-sm text-primary-red";
        } else {
            priceElement.textContent = price.toFixed(2);
            statusElement.textContent = "Price is 1 hour cached.";
            statusElement.className = "text-sm text-gray-500";
        }

    } catch (e) {
        console.error("Failed to fetch stock data:", e);
        priceElement.textContent = 'N/A';
        statusElement.textContent = "Failed to connect to stock service.";
        statusElement.className = "text-sm text-primary-red";
    }
}

/**
 * NEW: Handles the search button click, calls the backend search endpoint, and renders results.
 */
async function handleStockSearch() {
    const input = document.getElementById('stock-search-input');
    const resultsDiv = document.getElementById('stock-search-results');

    let statusElement = document.getElementById('search-status');

    if (!resultsDiv) {
        console.error("Critical: Stock search results container not found.");
        return;
    }

    const keyword = input.value.trim();

    if (!keyword) {
        if (statusElement) {
            statusElement.textContent = "Please enter a keyword to search.";
            statusElement.className = "text-sm text-primary-red";
        } else {
            resultsDiv.innerHTML = '<p class="text-sm text-primary-red" id="search-status">Please enter a keyword to search.</p>';
            statusElement = document.getElementById('search-status');
        }
        return;
    }

    resultsDiv.innerHTML = '';

    if (!statusElement) {
        resultsDiv.innerHTML = '<p class="text-sm text-gray-500" id="search-status">Searching...</p>';
        statusElement = document.getElementById('search-status');
    } else {
        statusElement.textContent = `Searching for '${keyword}'...`;
    }
    statusElement.className = "text-sm text-gray-500";


    try {
        const responseText = await fetchData(`/stocks/search/${keyword}`);
        const data = JSON.parse(responseText);

        if (data.error || data["Error Message"]) {
            statusElement.textContent = `API Error: ${data.error || data["Error Message"]}. Check console for details.`;
            statusElement.className = "text-sm text-primary-red";
            return;
        }

        const matches = data.bestMatches;

        if (!matches || matches.length === 0) {
            statusElement.textContent = `No symbols found for '${keyword}'.`;
            statusElement.className = "text-sm text-gray-500";
            return;
        }

        // Clear results section and display final status
        resultsDiv.innerHTML = '';

        statusElement.textContent = `${matches.length} matches found. Click a result to view chart.`;
        statusElement.className = "text-sm text-green-500";
        resultsDiv.prepend(statusElement); // Put the final status back on top

        matches.forEach(match => {
            const symbol = match["1. symbol"];
            const name = match["2. name"];
            const type = match["3. type"];
            const region = match["4. region"];
            const currency = match["8. currency"];

            const resultItem = document.createElement('div');
            resultItem.className = 'p-3 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition';
            resultItem.innerHTML = `
                <span class="font-bold text-accent-dark-teal">${symbol}</span> - <span class="text-text-dark">${name}</span>
                <span class="text-xs text-gray-500 ml-2">(${region}, ${currency}, Type: ${type})</span>
            `;
            // UPDATED CLICK LISTENER: Call showStockChart
            resultItem.addEventListener('click', () => {
                showStockChart(symbol, name);
            });
            resultsDiv.appendChild(resultItem);
        });

    } catch (e) {
        console.error("Stock search failed:", e);
        statusElement.textContent = "An unexpected error occurred during search.";
        statusElement.className = "text-sm text-primary-red";
    }
}

/**
 * Fetches time series data and renders the stock chart in a modal.
 * @param {string} symbol The stock ticker symbol.
 * @param {string} name The company name.
 */
async function showStockChart(symbol, name) {
    const modal = document.getElementById('chart-modal');
    const chartTitle = document.getElementById('chart-title');
    const canvas = document.getElementById('priceChart');

    chartTitle.textContent = `Loading Price History for ${symbol} (${name})...`;
    modal.classList.remove('hidden');

    try {
        // Call the new Spring Boot endpoint for historical series data
        const responseText = await fetchData(`/stocks/series/${symbol}`);
        const data = JSON.parse(responseText);

        if (data["Error Message"] || data["Note"]) {
            chartTitle.textContent = `Error loading ${symbol}: ${data["Error Message"] || data["Note"]}`;
            if (stockPriceChart) stockPriceChart.destroy();
            return;
        }

        const timeSeriesData = data["Time Series (Daily Adjusted)"];

        if (!timeSeriesData) {
            chartTitle.textContent = `Error: No daily series data found for ${symbol}. (Check symbol or API status)`;
            if (stockPriceChart) stockPriceChart.destroy();
            return;
        }

        // 1. Extract Dates and Prices (Reverse order for chronological chart)
        const dates = Object.keys(timeSeriesData).sort();
        const prices = dates.map(date => parseFloat(timeSeriesData[date]["5. adjusted close"]));

        // 2. Prepare Chart Data
        const chartData = {
            labels: dates,
            datasets: [{
                label: `Adjusted Closing Price (${symbol})`,
                data: prices,
                borderColor: '#14B8A6', // primary-teal color
                backgroundColor: 'rgba(20, 184, 166, 0.2)',
                borderWidth: 2,
                pointRadius: 0, // No dots on data points
                tension: 0.1,
                fill: true,
            }]
        };

        // 3. Render Chart
        if (stockPriceChart) {
            stockPriceChart.destroy(); // Destroy previous chart instance
        }

        chartTitle.textContent = `Price History: ${symbol} (${name})`;

        stockPriceChart = new Chart(canvas, {
            type: 'line',
            data: chartData,
            options: {
                responsive: true,
                scales: {
                    x: { title: { display: true, text: 'Date' } },
                    y: { title: { display: true, text: 'Price ($)' } }
                }
            }
        });

    } catch (e) {
        console.error("Chart rendering error:", e);
        chartTitle.textContent = `Failed to render chart for ${symbol}. Connection failed.`;
        if (stockPriceChart) stockPriceChart.destroy();
    }
}


// ----------------------------------------------------------------------
// QUICK PAY CONTACTS FEATURE
// ----------------------------------------------------------------------

function renderQuickPayContacts() {
    const container = document.getElementById('quick-pay-contacts');
    if (!container) return;

    if (!ALL_USERS || ALL_USERS.length === 0 || !CURRENT_USER_ID) {
        container.innerHTML = `<p class="text-gray-400 col-span-full" id="quick-pay-status">No users loaded or not logged in.</p>`;
        return;
    }

    container.innerHTML = '';

    // Filter out the currently logged-in user
    const contacts = ALL_USERS.filter(user => user.id !== CURRENT_USER_ID);

    if (contacts.length === 0) {
        container.innerHTML = `<p class="text-gray-400 col-span-full" id="quick-pay-status">No other users available to pay quickly.</p>`;
        return;
    }

    contacts.slice(0, 8).forEach(contact => { // Limit to 8 contacts
        const initial = contact.name ? contact.name.charAt(0).toUpperCase() : '?';

        // Generate a random pastel background color for visual appeal
        const bgColor = `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;

        // Sanitize name for onclick function argument by escaping quotes
        const safeUserName = contact.name.replace(/'/g, "\\'");

        const contactHtml = `
            <div class="text-center cursor-pointer hover:opacity-80 transition-opacity"
                 onclick="showUserProfileModal(${contact.id}, '${safeUserName}', '${bgColor}')">
                <div class="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-1 font-bold text-xl text-white shadow-md"
                     style="background-color: ${bgColor};">
                    ${initial}
                </div>
                <div class="text-xs text-gray-400 truncate">${contact.name}</div>
            </div>
        `;
        container.innerHTML += contactHtml;
    });
}

function showUserProfileModal(userId, userName, avatarColor) {
    const modal = document.getElementById('profile-modal');
    if (!modal) return;

    const profilePayBtn = document.getElementById('profile-pay-btn');
    const profileHistoryBtn = document.getElementById('profile-history-btn');
    const avatar = document.getElementById('profile-avatar');

    document.getElementById('profile-name').textContent = userName;
    document.getElementById('profile-id').textContent = userId;

    if (avatar) {
        avatar.textContent = userName.charAt(0).toUpperCase();
        avatar.style.backgroundColor = avatarColor;
    }

    if (profilePayBtn) profilePayBtn.setAttribute('data-recipient-id', userId);
    if (profileHistoryBtn) profileHistoryBtn.setAttribute('data-recipient-id', userId);

    if (profilePayBtn) {
        if (userId !== CURRENT_USER_ID) {
            profilePayBtn.classList.remove('hidden');
        } else {
            profilePayBtn.classList.add('hidden');
        }
    }

    const historyContainer = document.getElementById('profile-history-container');
    if (historyContainer) {
        historyContainer.innerHTML = `<p class="text-gray-400 text-center py-4">Click 'View Transaction History' above to see past payments.</p>`;
    }

    modal.classList.remove('hidden');
}

async function showUserHistory(counterpartyId) {
    const historyContainer = document.getElementById('profile-history-container');
    if (!historyContainer) return;

    historyContainer.innerHTML = `<p class="text-yellow-500 text-center py-4">Loading transaction history...</p>`;

    const allTxs = await fetchData('/transactions');

    if (!allTxs) {
        historyContainer.innerHTML = `<p class="text-red-500 text-center py-4">Failed to load history.</p>`;
        return;
    }

    // Filter transactions relevant to the CURRENT_USER_ID and the counterpartyId
    const relevantTxs = allTxs.filter(tx =>
        (tx.sender?.id === CURRENT_USER_ID) || (tx.receiver?.id === counterpartyId) ||
        (tx.sender?.id === counterpartyId && tx.receiver?.id === CURRENT_USER_ID)
    ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const counterpartyUser = ALL_USERS.find(u => u.id === counterpartyId);
    const counterpartyName = counterpartyUser ? counterpartyUser.name : `ID ${counterpartyId}`;


    if (relevantTxs.length === 0) {
        historyContainer.innerHTML = `<p class="text-gray-400 text-center py-4">No direct transaction history found with ${counterpartyName}.</p>`;
        return;
    }

    historyContainer.innerHTML = `
        <table class="min-w-full divide-y divide-gray-600 text-sm">
            <thead>
                <tr class="text-left text-gray-400">
                    <th class="py-2 px-1">Amount</th>
                    <th class="px-1">Fee</th>
                    <th class="px-1">Time</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-700">
                ${relevantTxs.map(tx => {
        const isSent = tx.sender.id === CURRENT_USER_ID;
        const amountDisplay = isSent
            ? `<span class="text-secondary-red font-semibold">- ₹${tx.amount.toFixed(2)}</span>`
            : `<span class="text-green-500 font-semibold">+ ₹${tx.amount.toFixed(2)}</span>`;

        return `
                        <tr>
                            <td class="py-2 px-1">${amountDisplay}</td>
                            <td class="px-1">₹${tx.networkFee.toFixed(6)}</td>
                            <td class="text-gray-400 px-1">${new Date(tx.createdAt).toLocaleTimeString()}</td>
                        </tr>
                    `;
    }).join('')}
            </tbody>
        </table>
    `;
}

// ----------------------------------------------------------------------
// SECURE TRANSACTION FLOW
// ----------------------------------------------------------------------

async function showConfirmationModal() {
    if (!CURRENT_USER_ID) {
        return alert("Please log in before initiating a transaction.");
    }

    const receiverIdElement = document.getElementById('receiverId');
    const amountElement = document.getElementById('amount');
    const networkFeeElement = document.getElementById('networkFee');

    const receiverId = parseInt(receiverIdElement?.value);
    const amount = parseFloat(amountElement?.value);
    const networkFee = parseFloat(networkFeeElement?.value);

    if (isNaN(receiverId) || isNaN(amount) || isNaN(networkFee) || amount <= 0 || networkFee < 0) {
        return alert("Please enter valid amounts and Recipient ID.");
    }

    if (receiverId === CURRENT_USER_ID) {
        return alert("Cannot send payment to your own ID.");
    }

    const totalDeduction = amount + networkFee;
    const reviewDetailsElement = document.getElementById('review-details');
    const finalConfirmBtn = document.getElementById('final-confirm-btn');

    finalConfirmBtn.disabled = true;
    reviewDetailsElement.innerHTML = `
        <div class="text-center py-4 text-gray-700">
            <svg class="animate-spin h-6 w-6 text-primary-red mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Running AI Risk Analysis...
        </div>
    `;

    document.getElementById('confirmation-modal')?.classList.remove('hidden');

    const txData = {
        senderId: CURRENT_USER_ID,
        receiverId: receiverId,
        amount: amount,
        networkFee: networkFee
    };

    const analysisResponse = await fetchData('/analyze-transaction', 'POST', txData);

    let analysisResult = { summary: "AI analysis failed to process.", risk: "HIGH" };

    if (analysisResponse) {
        try {
            // Attempt to parse the response if it's JSON
            analysisResult = JSON.parse(analysisResponse);
        } catch (e) {
            // If it fails, treat the raw text as the summary
            console.error("Failed to parse AI response, treating as raw text:", analysisResponse);
            analysisResult.summary = analysisResponse;
        }
    }

    let riskColor = 'text-green-500';
    let riskBg = 'bg-green-900/30';
    let riskIcon = '🛡️';

    if (analysisResult.risk === 'MEDIUM') {
        riskColor = 'text-yellow-500';
        riskBg = 'bg-yellow-900/30';
        riskIcon = '⚠️';
    } else if (analysisResult.risk === 'HIGH') {
        riskColor = 'text-red-500';
        riskBg = 'bg-red-900/30';
        riskIcon = '🚨';
    }

    const finalReviewHTML = `
        <h4 class="text-lg font-bold mb-3 text-text-light flex items-center">
            ${riskIcon} AI Risk Assessment:
            <span class="ml-2 font-extrabold ${riskColor} text-2xl">${analysisResult.risk}</span>
        </h4>
        <div class="p-3 mb-4 rounded-lg ${riskBg} text-sm ${riskColor}">
            <p class="font-medium">${analysisResult.summary}</p>
        </div>

        <div class="grid grid-cols-2 gap-3 text-lg">
            <p class="font-medium text-gray-400">Sender ID:</p><p class="font-bold text-text-light">${CURRENT_USER_ID}</p>
            <p class="font-medium text-gray-400">Recipient ID:</p><p class="font-bold text-text-light">${receiverId}</p>
            <p class="font-medium text-gray-400">Amount:</p><p class="font-bold text-text-light">₹${amount.toFixed(2)}</p>
            <p class="font-medium text-gray-400">Network Fee:</p><p class="font-bold text-text-light">₹${networkFee.toFixed(6)}</p>
        </div>
        <hr class="my-3 border-gray-600">
        <p class="font-medium text-gray-400 text-xl flex justify-between">
            <span>TOTAL DEDUCTION:</span>
            <span class="text-2xl font-extrabold text-red-500">₹${totalDeduction.toFixed(6)}</span>
        </p>
    `;

    reviewDetailsElement.innerHTML = finalReviewHTML;
    finalConfirmBtn.disabled = false;
}

async function sendTransaction() {
    document.getElementById('confirmation-modal')?.classList.add('hidden');

    const txBody = {
        senderId: CURRENT_USER_ID,
        receiverId: parseInt(document.getElementById('receiverId').value),
        amount: parseFloat(document.getElementById('amount').value),
        networkFee: parseFloat(document.getElementById('networkFee').value)
    };

    const newTx = await fetchData('/transactions', 'POST', txBody);

    if (newTx) {
        alert(`✅ Payment initiated successfully! Status: ${newTx.status}. Your balance has been debited.`);
        localStorage.setItem('session_refresh_needed', 'true');
        window.location.href = 'index.html';
    }
}

function showBlockchainDetails(hash) {
    alert(`Transaction Hash (View on Chain):\n${hash}\n\nThis unique identifier allows anyone to verify the immutable transaction record on the network.`);
}

// ----------------------------------------------------------------------
// QR CODE SCANNING & GENERATION
// ----------------------------------------------------------------------

function onScanSuccess(decodedText, decodedResult) {
    const statusElement = document.getElementById('scan-status');

    if (decodedText.startsWith('SECUREPAY_ID:')) {
        const recipientId = decodedText.split(':')[1];

        statusElement.textContent = `✅ Scan Successful! ID: ${recipientId}. Stopping scanner.`;
        statusElement.classList.remove('text-secondary-red');
        statusElement.classList.add('text-primary-red');

        document.getElementById('receiverId').value = recipientId;

        closeScanModal();

    } else {
        statusElement.textContent = "⚠️ Invalid QR Code Format. Please scan a SecurePay ID code.";
        statusElement.classList.add('text-secondary-red');
    }
}

function onScanError(errorMessage) {
    document.getElementById('scan-status').textContent = `Scanning... Last error: ${errorMessage?.substring(0, 50)}...`;
}

async function showScanModal() {
    if (!CURRENT_USER_ID) {
        alert("Please log in before attempting to scan.");
        return;
    }

    document.getElementById('scan-modal')?.classList.remove('hidden');
    document.getElementById('scan-status').textContent = "Initializing camera...";

    if (!html5QrCode) {
        if (document.getElementById('qr-reader')) {
            html5QrCode = new Html5Qrcode("qr-reader");
        } else {
            alert("Scanner component not found on this page.");
            return;
        }
    }

    // Check if scanning is already active to prevent errors
    if (html5QrCode.isScanning) {
        document.getElementById('scan-status').textContent = "Scanner already active.";
        return;
    }

    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    try {
        await html5QrCode.start(
            { facingMode: "environment" },
            config,
            onScanSuccess,
            onScanError
        );
        document.getElementById('scan-status').textContent = "Camera active. Point at a SecurePay QR Code.";

    } catch (err) {
        document.getElementById('scan-status').textContent = `🚨 Failed to start camera: ${err}. Ensure camera access is allowed.`;
        console.error("Camera startup error:", err);
    }
}

async function closeScanModal() {
    document.getElementById('scan-modal')?.classList.add('hidden');
    document.getElementById('scan-status').textContent = "Camera stopped.";

    if (html5QrCode && html5QrCode.isScanning) {
        try {
            // Check if it's scanning before calling stop
            await html5QrCode.stop();
        } catch (err) {
            console.error("Error stopping camera:", err);
        }
    }
}

function showReceiveModal() {
    if (!CURRENT_USER_ID) {
        alert("Please log in to generate a QR code.");
        return;
    }

    const userName = document.getElementById('current-user-name').textContent;
    const userId = CURRENT_USER_ID;

    const qrData = `SECUREPAY_ID:${userId}`;

    const qrContainer = document.getElementById('qrcode-container');
    if (!qrContainer) return;

    qrContainer.innerHTML = '';

    document.getElementById('receive-user-name').textContent = userName;
    document.getElementById('receive-user-id').textContent = userId;

    if (typeof QRCode === 'undefined') {
        return alert("QR Code library (qrcode.js) failed to load.");
    }

    new QRCode(qrContainer, {
        text: qrData,
        width: 180,
        height: 180,
        colorDark : "#1f2937",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
    });

    document.getElementById('receive-modal')?.classList.remove('hidden');
}


// ----------------------------------------------------------------------
// ADMIN/TESTING FUNCTIONS (Globally Accessible)
// ----------------------------------------------------------------------

/**
 * Handles user creation from the Admin Panel on index.html.
 * Note: This function is made global for HTML button onClick handlers.
 */
window.createUser = async function() {
    const name = document.getElementById("userName")?.value;
    const email = document.getElementById("userEmail")?.value;
    const balance = document.getElementById("userBalance")?.value || 0;
    if (!name || !email) return alert("Enter name and email");

    const user = await fetchData('/users', 'POST', { name, email, balance: parseFloat(balance) });
    if (user) {
        alert(`✅ User created! ID: ${user.id}`);
        getUsers();
    }
}

async function getUsers() {
    const users = await fetchData('/users');
    const tbody = document.querySelector("#usersTable tbody");
    if (!tbody) return;

    tbody.innerHTML = "";
    if (users) {
        ALL_USERS = users;
        users.forEach(u => {
            const row = `<tr class="border-b">
                <td class="p-1">${u.id}</td>
                <td class="p-1">${u.name}</td>
                <td class="p-1">₹${parseFloat(u.balance).toFixed(2)}</td>
                <td class="p-1">
                    <button class="text-red-500 hover:text-red-700 text-xs font-semibold"
                            onclick="promptDeleteUser(${u.id}, '${u.name.replace(/'/g, "\\'")}')">
                        Delete
                    </button>
                </td>
            </tr>`;
            tbody.innerHTML += row;
        });
    }
}

function promptDeleteUser(userId, userName) {
    if (userId === CURRENT_USER_ID) {
        alert("🚨 Cannot delete the currently logged-in user! Please log out first.");
        return;
    }

    if (window.confirm(`WARNING: Are you sure you want to delete user ${userName} (ID ${userId})? This will also delete all their transaction history!`)) {
        deleteUser(userId);
    }
}

async function deleteUser(userId) {
    const result = await fetchData(`/users/${userId}`, 'DELETE');

    if (result === true) {
        alert(`🗑️ User ID ${userId} deleted successfully.`);
        getUsers();
    }
}

async function mineBlock() {
    const resultElement = document.getElementById("blockchain");
    if (!resultElement) return;

    resultElement.textContent = "Mining in progress...";

    const data = await fetchData('/mine', 'POST');

    if (data === null) {
        resultElement.textContent = "⛏️ No pending transactions to mine. Blockchain remains unchanged.";
        alert("No pending transactions to mine.");
        return;
    }

    if (data && data.blockIndex) {
        resultElement.textContent = JSON.stringify(data, null, 2);
        alert(`⛏️ Block ${data.blockIndex} mined successfully! Transactions confirmed.`);

        // Refresh all necessary dashboard data
        if (CURRENT_USER_ID) {
            getUserBalance(CURRENT_USER_ID);
            getTransactions();
        }
        getBlockchain();
    } else {
        resultElement.textContent = "Error or No pending transactions to mine.";
    }
}

async function getBlockchain() {
    const data = await fetchData('/blockchain');
    const blockchainElement = document.getElementById("blockchain");
    if (!blockchainElement) return;

    if (data) {
        blockchainElement.textContent = JSON.stringify(data, null, 2);
    }
}