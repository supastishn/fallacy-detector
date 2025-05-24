const settingsKeys = {
    apiKey: 'openai_api_key',
    baseUrl: 'openai_base_url',
    defaultModel: 'openai_default_model',
    temperature: 'openai_temperature',
    theme: 'app_theme'
};

function saveSetting(key, value) {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (e) {
        console.error("Error saving to localStorage:", e);
        return false;
    }
}

function getSetting(key) {
    try {
        return localStorage.getItem(key);
    } catch (e) {
        console.error("Error reading from localStorage:", e);
        return null;
    }
}

function getAllSettings() {
    return {
        apiKey: getSetting(settingsKeys.apiKey),
        baseUrl: getSetting(settingsKeys.baseUrl) || 'https://api.openai.com', // Default base URL
        defaultModel: getSetting(settingsKeys.defaultModel) || 'gpt-3.5-turbo', // Default model
        temperature: parseFloat(getSetting(settingsKeys.temperature)) || 0.3 // Default temperature
    };
}

function clearStatusMessage(statusElement, delay = 3000) {
    if (statusElement) {
        setTimeout(() => {
            statusElement.textContent = '';
            statusElement.className = '';
        }, delay);
    }
}

function initializeTheme() {
    const savedTheme = getSetting(settingsKeys.theme) || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeToggleText();
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    saveSetting(settingsKeys.theme, newTheme);
    updateThemeToggleText();
}

function updateThemeToggleText() {
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        themeToggle.textContent = currentTheme === 'dark' ? '☀️ Light' : '🌙 Dark';
    }
}

function createThemeToggle() {
    const themeToggle = document.createElement('button');
    themeToggle.className = 'theme-toggle';
    themeToggle.addEventListener('click', toggleTheme);
    return themeToggle;
}
